import { NextResponse } from 'next/server'

/** Forwards client debug logs from a phone on the LAN to the local ingest server. */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 })
  }

  const body = await request.text()
  await fetch('http://127.0.0.1:7766/ingest/daa88646-6778-4a68-b046-b8741af3d131', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': 'dc50f5',
    },
    body,
  }).catch(() => {})

  return new NextResponse(null, { status: 204 })
}
