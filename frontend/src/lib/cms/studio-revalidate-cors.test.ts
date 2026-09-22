import { afterEach, describe, expect, it } from 'vitest'

import {
  allowStudioRevalidateOrigin,
  studioRevalidateCorsHeaders,
} from './studio-revalidate-cors'

describe('allowStudioRevalidateOrigin', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SANITY_STUDIO_URL
  })

  it('allows local Studio and hosted sanity.studio origins', () => {
    expect(allowStudioRevalidateOrigin('http://localhost:3333')).toBe(true)
    expect(allowStudioRevalidateOrigin('http://127.0.0.1:3333')).toBe(true)
    expect(allowStudioRevalidateOrigin('https://v4eheew2.sanity.studio')).toBe(true)
    expect(allowStudioRevalidateOrigin('https://evil.example')).toBe(false)
    expect(allowStudioRevalidateOrigin(null)).toBe(false)
  })

  it('allows the configured Studio origin when it is not sanity.studio', () => {
    process.env.NEXT_PUBLIC_SANITY_STUDIO_URL = 'https://cms.vrijeacademie.nl/studio'
    expect(allowStudioRevalidateOrigin('https://cms.vrijeacademie.nl')).toBe(true)
  })
})

describe('studioRevalidateCorsHeaders', () => {
  it('echoes an allowed origin and lists POST preflight headers', () => {
    expect(studioRevalidateCorsHeaders('http://localhost:3333')).toMatchObject({
      'Access-Control-Allow-Origin': 'http://localhost:3333',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    })
    expect(studioRevalidateCorsHeaders('https://evil.example')).toEqual({})
  })
})
