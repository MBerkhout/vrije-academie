import { describe, expect, it } from 'vitest'
import type { VathuisChapter, VathuisEpisode } from '@/lib/commerce/types'
import { extractPdpSubtitle, findVathuisTrailer } from './vathuis-trailer'

function episode(number: number, preview = false, chapter_number?: number): VathuisEpisode {
  return { number, title: `Aflevering ${number}`, preview_available: preview, chapter_number }
}

describe('findVathuisTrailer', () => {
  it('returns the first preview episode with its chapter key', () => {
    const chapters: VathuisChapter[] = [
      { number: 1, title: 'A', episodes: [episode(1), episode(2)] },
      { number: 2, title: 'B', episodes: [episode(1, true)] },
    ]
    expect(findVathuisTrailer(chapters, [])?.episodeKey).toBe('2-1')
  })

  it('falls back to the flat episode list', () => {
    expect(findVathuisTrailer([], [episode(3, true, 2)])?.episodeKey).toBe('2-3')
    expect(findVathuisTrailer(undefined, [episode(1, true)])?.episodeKey).toBe('1-1')
  })

  it('returns null without a preview episode', () => {
    expect(findVathuisTrailer([], [episode(1)])).toBeNull()
    expect(findVathuisTrailer(undefined, undefined)).toBeNull()
  })
})

describe('extractPdpSubtitle', () => {
  const subtitle = { _type: 'textBlock', subtitle: ' Kunst in de eenentwintigste eeuw ' }
  const text = { _type: 'textBlock', content: [{ _type: 'block' }] }

  it('removes a subtitle-only block and returns the trimmed subtitle', () => {
    expect(extractPdpSubtitle([subtitle, text])).toEqual({
      subtitle: 'Kunst in de eenentwintigste eeuw',
      body: [text],
    })
  })

  it('keeps a block that has a title or content, without its subtitle', () => {
    const titled = { _type: 'textBlock', title: 'Intro', subtitle: 'Sub' }
    const result = extractPdpSubtitle([titled])
    expect(result.subtitle).toBe('Sub')
    expect(result.body).toEqual([{ _type: 'textBlock', title: 'Intro', subtitle: undefined }])
  })

  it('returns the body untouched without a subtitle', () => {
    expect(extractPdpSubtitle([text])).toEqual({ subtitle: null, body: [text] })
    expect(extractPdpSubtitle(undefined)).toEqual({ subtitle: null, body: [] })
    expect(extractPdpSubtitle([{ _type: 'textBlock', subtitle: '  ' }]).subtitle).toBeNull()
  })
})
