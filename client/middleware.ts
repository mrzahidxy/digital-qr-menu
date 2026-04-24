import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth/options';


const AUTH_ROUTES = new Set<string>(['login', 'register'])

const ROUTE_ROLES: Record<string, ReadonlySet<string>> = {
  SUPER_ADMIN: new Set(['SUPER_ADMIN']),
  OWNER: new Set(['SUPER_ADMIN', 'OWNER', 'STAFF']),
}

function firstSegment(pathname: string) {
  const seg = pathname.split('/')[1] || ''
  return seg.toLowerCase()
}

function safeCallback(nextUrl: NextRequest['nextUrl']) {
  // relative-only to avoid open redirects; keep query
  const rel = `${nextUrl.pathname}${nextUrl.search || ''}`
  return rel.startsWith('/') ? rel : '/'
}

function redirectToLogin(req: NextRequest) {
  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('callbackUrl', safeCallback(req.nextUrl))
  return NextResponse.redirect(loginUrl)
}

function roleAllowed(role: string | undefined, segment: string) {
  const allowed = ROUTE_ROLES[segment]
  if (!allowed) return true // no role requirement
  return role ? allowed.has(role) : false
}

function homeForRole(role?: string) {
  if (role && ROUTE_ROLES['SUPER_ADMIN'].has(role)) return '/SUPER_ADMIN'
  if (role && ROUTE_ROLES['OWNER'].has(role)) return '/business'
  return '/'
}

export default auth((req) => {
  const accessTokenExpired = req.auth?.accessTokenExpired === true
  const isAuthed = Boolean(req.auth) && !accessTokenExpired
  const { pathname } = req.nextUrl
  const seg = firstSegment(pathname)
  const userRole = req.auth?.user?.role

  if (accessTokenExpired) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('reason', 'expired')
    loginUrl.searchParams.set('callbackUrl', safeCallback(req.nextUrl))
    return NextResponse.redirect(loginUrl)
  }

  // Block direct access to auth pages for signed-in users
  if (isAuthed && AUTH_ROUTES.has(seg)) {
    return NextResponse.redirect(new URL(homeForRole(userRole), req.url))
  }

  // Protected segments
  if (seg in ROUTE_ROLES) {
    if (!isAuthed) return redirectToLogin(req)
    if (!roleAllowed(userRole, seg)) {
      return NextResponse.redirect(new URL(homeForRole(userRole), req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  // Run only where needed. Static and api excluded by default here.
  matcher: ['/login', '/register', '/SUPER_ADMIN/:path*', '/business/:path*'],
}
