import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) return NextResponse.next()

  // Skip auth check for public routes
  const isAuthPage = pathname === '/login' || pathname === '/signup'
  const isPublicRoot = pathname === '/'
  const isStatic = pathname.startsWith('/_next') || pathname.includes('.')

  if (isPublicRoot || isStatic) {
    return NextResponse.next()
  }

  let res = NextResponse.next({
    request,
  })

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        res = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options)
        )
      },
    },
  })

  // Use getUser() for auth verification — this also refreshes the session
  let user = null
  let authError = null

  try {
    const { data, error } = await supabase.auth.getUser()
    user = data?.user ?? null
    authError = error
  } catch (err) {
    // Network / DNS error — don't log the user out for transient failures
    console.warn('Middleware: Supabase auth request failed (transient):', (err as Error)?.message)
    // Allow the request through — the page-level auth check will handle it
    return res
  }

  // If on auth page, allow through (but still apply cookie refreshes)
  if (isAuthPage) {
    // If user is already authenticated and on login/signup, redirect them
    if (user) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, approval_status')
          .eq('id', user.id)
          .single()

        if (profile?.approval_status === 'approved') {
          const dest = profile.role === 'admin' ? '/admin/dashboard' : '/dashboard'
          return NextResponse.redirect(new URL(dest, request.url))
        }
      } catch {
        // If profile check fails, just let them stay on auth page
      }
    }
    return res
  }

  // For protected routes: if getUser returned an error or null user, redirect to login
  if (authError || !user) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Fetch profile for role-based routing
  let profile = null
  try {
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('role, approval_status')
      .eq('id', user.id)
      .single()

    if (profileError || !data) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    profile = data
  } catch (err) {
    // Transient DB error — allow through rather than logging out
    console.warn('Middleware: Profile fetch failed (transient):', (err as Error)?.message)
    return res
  }

  if (profile.approval_status === 'pending' && pathname !== '/pending-approval') {
    return NextResponse.redirect(new URL('/pending-approval', request.url))
  }

  if (profile.approval_status === 'rejected') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (profile.role === 'admin') {
    if (pathname === '/dashboard') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
    if (
      !pathname.startsWith('/admin') &&
      pathname !== '/pending-approval'
    ) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
  } else if (pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return res
}

// Skip middleware for static files and common metadata files.
export const config = {
  matcher: ['/((?!_next|api|favicon.ico|.*\\..*).*)'],
}