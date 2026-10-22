import { NextResponse, type NextRequest } from 'next/server'
import { findRedirect, resolveRedirectDestination } from '@/lib/redirects'
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

  const destination = resolveRedirectDestination(redirect.destination, request.url)
  // #region agent log
  fetch('http://127.0.0.1:7766/ingest/daa88646-6778-4a68-b046-b8741af3d131',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f99d2a'},body:JSON.stringify({sessionId:'f99d2a',location:'proxy.ts:redirect',message:'Sanity redirect',data:{source:request.nextUrl.pathname,destination:redirect.destination,resolved:destination.toString(),permanent:redirect.permanent},timestamp:Date.now(),hypothesisId:'A',runId:'post-fix'})}).catch(()=>{});
  // #endregion
  return NextResponse.redirect(destination, redirect.permanent ? 301 : 302)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|studio|.*\\..*).*)',
  ],
}
