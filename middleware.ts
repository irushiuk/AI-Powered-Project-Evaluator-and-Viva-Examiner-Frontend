import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { COOKIE_NAMES } from './src/constants/storage'
import { getPostLoginRedirect } from './src/utils/routes'

// Absolute backend base for the server-side refresh call (middleware can't use
// a relative /api URL). Matches the dev proxy target / prod internal base.
const API_BASE =
  process.env.INTERNAL_API_BASE ||
  (process.env.API_PROXY_TARGET ? `${process.env.API_PROXY_TARGET}/api` : 'http://127.0.0.1:8000/api')

type JwtPayload = { role?: string; exp?: number }

function decodeJwt(token: string): JwtPayload | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

function isExpired(payload: JwtPayload | null): boolean {
  if (!payload?.exp) return true
  // 10s skew so we refresh just before the token actually dies.
  return payload.exp * 1000 <= Date.now() + 10_000
}

function redirectTo(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone()
  url.pathname = pathname
  url.search = ''
  return NextResponse.redirect(url)
}

function enforceRole(req: NextRequest, pathname: string, role: string | undefined) {
  if (pathname.startsWith('/dashboard/teacher') && role !== 'teacher' && role !== 'examiner') {
    return redirectTo(req, getPostLoginRedirect(role))
  }
  if (pathname.startsWith('/dashboard/student') && role !== 'student') {
    return redirectTo(req, getPostLoginRedirect(role))
  }
  return NextResponse.next()
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next()
  }

  const accessToken = req.cookies.get(COOKIE_NAMES.accessToken)?.value
  const refreshToken = req.cookies.get(COOKIE_NAMES.refreshToken)?.value
  const payload = accessToken ? decodeJwt(accessToken) : null

  // Valid, unexpired access token -> guard by role and continue.
  if (accessToken && !isExpired(payload)) {
    return enforceRole(req, pathname, payload?.role)
  }

  // Access token missing/expired: try a server-side refresh so the render is
  // still flash-free. Without a refresh token there's no session.
  if (!refreshToken) {
    return redirectTo(req, '/login')
  }

  try {
    const backendRes = await fetch(`${API_BASE}/auth/token/refresh/`, {
      method: 'POST',
      headers: { Cookie: `${COOKIE_NAMES.refreshToken}=${refreshToken}` },
    })

    if (!backendRes.ok) {
      return redirectTo(req, '/login')
    }

    // Re-issue the same request so the render picks up the fresh cookies.
    const res = NextResponse.redirect(req.url)

    const setCookies =
      typeof backendRes.headers.getSetCookie === 'function'
        ? backendRes.headers.getSetCookie()
        : ([backendRes.headers.get('set-cookie')].filter(Boolean) as string[])

    for (const cookie of setCookies) {
      res.headers.append('set-cookie', cookie)
    }
    return res
  } catch {
    // Backend unreachable — don't hard-log-out on a transient error.
    return redirectTo(req, '/login')
  }
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
