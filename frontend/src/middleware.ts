import { NextResponse, type NextRequest } from 'next/server'
import { findRedirect } from '@/lib/redirects'

export async function middleware(request: NextRequest) {
  const redirect = await findRedirect(request.nextUrl.pathname)

  if (!redirect) {
    return NextResponse.next()
  }

  return NextResponse.redirect(redirect.destination, redirect.permanent ? 301 : 302)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|studio|.*\\..*).*)',
  ],
}
