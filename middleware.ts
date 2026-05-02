import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl

    // Trim variables just in case trailing spaces were copied from the Vercel dashboard
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

    if (!url || !anonKey) return NextResponse.next()

    // Skip auth check for public routes
    const isAuthPage = pathname === '/login' || pathname === '/signup'
    const isPublicRoot = pathname === '/'
    const isStatic = pathname.startsWith('/_next') || pathname.includes('.')

    if (isPublicRoot || isStatic) {
      return NextResponse.next()
    }

    let res = NextResponse.next({
      request: { headers: request.headers },
    })

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          res = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    })

    // Helper to preserve cookies during redirects
    const redirect = (path: string) => {
      const redirectRes = NextResponse.redirect(new URL(path, request.url))
      // Copy over any cookies set by Supabase (e.g., refreshed tokens)
      res.cookies.getAll().forEach(cookie => {
        redirectRes.cookies.set(cookie.name, cookie.value)
      })
      return redirectRes
    }

    let user = null
    let authError = null

    try {
      const { data, error } = await supabase.auth.getUser()
      user = data?.user ?? null
      authError = error
    } catch (err) {
      console.warn('Middleware: Supabase auth request failed (transient):', (err as Error)?.message)
      return res
    }

    if (isAuthPage) {
      if (user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, approval_status')
            .eq('id', user.id)
            .single()

          if (profile?.approval_status === 'approved') {
            const dest = profile.role === 'admin' ? '/admin/dashboard' : '/dashboard'
            return redirect(dest)
          }
        } catch {
          // If profile check fails, just let them stay on auth page
        }
      }
      return res
    }

    if (authError || !user) {
      return redirect('/login')
    }

    let profile = null
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('role, approval_status')
        .eq('id', user.id)
        .single()

      if (profileError || !data) {
        return redirect('/login')
      }
      profile = data
    } catch (err) {
      console.warn('Middleware: Profile fetch failed (transient):', (err as Error)?.message)
      return res
    }

    if (profile.approval_status === 'pending' && pathname !== '/pending-approval') {
      return redirect('/pending-approval')
    }

    if (profile.approval_status === 'rejected') {
      return redirect('/login')
    }

    if (profile.role === 'admin') {
      if (pathname === '/dashboard') {
        return redirect('/admin/dashboard')
      }
      if (!pathname.startsWith('/admin') && pathname !== '/pending-approval') {
        return redirect('/admin/dashboard')
      }
    } else if (pathname.startsWith('/admin')) {
      return redirect('/dashboard')
    }

    return res
  } catch (error) {
    // Failsafe: If anything in the middleware crashes on Edge Runtime,
    // catch it here so the entire app doesn't throw a 500 error.
    console.error('Middleware crash:', error)
    return NextResponse.next()
  }
}

// Skip middleware for static files and common metadata files.
export const config = {
  matcher: ['/((?!_next|api|favicon.ico|.*\\..*).*)'],
}