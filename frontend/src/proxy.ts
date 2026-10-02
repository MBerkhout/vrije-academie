import { NextResponse, type NextRequest } from 'next/server'
import { findRedirect } from '@/lib/redirects'
import { cleanInvisiblePath } from '@/lib/clean-invisible-path'

export async function proxy(request: NextRequest) {
  // Legacy/shared links polluted with zero-width characters → canonical URL.
  const cleanPath = cleanInvisiblePath(request.nextUrl.pathname)
  if (cleanPath) {
    const url = request.nextUrl.clone()
    url.pathname = cleanPath
    return NextResponse.redirect(url, 301)
  }

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
