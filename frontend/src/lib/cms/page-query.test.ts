import { describe, it, expect } from 'vitest'
import { PAGE_QUERY } from './page-query'
import { GROQ_PORTABLE_TEXT_BLOCK } from './groq-portable-text-projection'

describe('PAGE_QUERY', () => {
  it('projects portable text with resolved link hrefs in tab panels', () => {
    expect(GROQ_PORTABLE_TEXT_BLOCK).toContain('internalRef->slug.current')
    expect(PAGE_QUERY).toContain('@._type == "textBlock"')
    expect(PAGE_QUERY).toContain(`content[] ${GROQ_PORTABLE_TEXT_BLOCK}`)
  })
})