import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

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

  // Create a single response object and accumulate cookies on it
  let res = NextResponse.next({
    request: { headers: req.headers },
  })

  // Track all cookies that need to be set so we don't lose them
  // when creating new response objects
  const cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        const { maxAge: _maxAge, ...rest } = options as Record<string, unknown> & { maxAge?: unknown }
        req.cookies.set(name, value)
        cookiesToSet.push({ name, value, options: rest })
      },
      remove(name: string, options: Record<string, unknown>) {
        const { maxAge: _maxAge, ...rest } = options as Record<string, unknown> & { maxAge?: unknown }
        req.cookies.set(name, '')
        cookiesToSet.push({ name, value: '', options: { ...rest, maxAge: 0 } })
      },
    },
  })

  // Helper to apply accumulated cookies onto a response
  function applyCookies(response: NextResponse) {
    for (const c of cookiesToSet) {
      response.cookies.set({ name: c.name, value: c.value, ...c.options } as any)
    }
    return response
  }

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
    return applyCookies(NextResponse.next({ request: { headers: req.headers } }))
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
          return applyCookies(NextResponse.redirect(new URL(dest, req.url)))
        }
      } catch {
        // If profile check fails, just let them stay on auth page
      }
    }
    return applyCookies(res)
  }

  // For protected routes: if getUser returned an error or null user, redirect to login
  if (authError || !user) {
    const loginUrl = new URL('/login', req.url)
    return applyCookies(NextResponse.redirect(loginUrl))
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
      return applyCookies(NextResponse.redirect(new URL('/login', req.url)))
    }
    profile = data
  } catch (err) {
    // Transient DB error — allow through rather than logging out
    console.warn('Middleware: Profile fetch failed (transient):', (err as Error)?.message)
    return applyCookies(NextResponse.next({ request: { headers: req.headers } }))
  }

  if (profile.approval_status === 'pending' && pathname !== '/pending-approval') {
    return applyCookies(NextResponse.redirect(new URL('/pending-approval', req.url)))
  }

  if (profile.approval_status === 'rejected') {
    return applyCookies(NextResponse.redirect(new URL('/login', req.url)))
  }

  if (profile.role === 'admin') {
    if (pathname === '/dashboard') {
      return applyCookies(NextResponse.redirect(new URL('/admin/dashboard', req.url)))
    }
    if (
      !pathname.startsWith('/admin') &&
      pathname !== '/pending-approval'
    ) {
      return applyCookies(NextResponse.redirect(new URL('/admin/dashboard', req.url)))
    }
  } else if (pathname.startsWith('/admin')) {
    return applyCookies(NextResponse.redirect(new URL('/dashboard', req.url)))
  }

  return applyCookies(NextResponse.next({ request: { headers: req.headers } }))
}

// Skip middleware for static files and common metadata files.
export const config = {
  matcher: ['/((?!_next|api|favicon.ico|.*\\..*).*)'],
}