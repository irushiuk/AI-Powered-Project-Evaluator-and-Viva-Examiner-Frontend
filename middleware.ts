import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { COOKIE_NAMES } from './src/constants/storage'
import { getPostLoginRedirect } from './src/utils/routes'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only guard dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const session = req.cookies.get(COOKIE_NAMES.hasSession)?.value === 'true'
    const role = req.cookies.get(COOKIE_NAMES.userRole)?.value

    if (!session) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (!role) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Prevent students from viewing teacher dashboard
    if (pathname.startsWith('/dashboard/teacher') && role !== 'teacher' && role !== 'examiner') {
      const url = req.nextUrl.clone()
      url.pathname = getPostLoginRedirect(role)
      return NextResponse.redirect(url)
    }

    // Prevent teachers/examiners from viewing student dashboard
    if (pathname.startsWith('/dashboard/student') && role !== 'student') {
      const url = req.nextUrl.clone()
      url.pathname = getPostLoginRedirect(role)
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
