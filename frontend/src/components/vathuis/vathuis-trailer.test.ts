import { describe, expect, it } from 'vitest'
import type { VathuisChapter, VathuisEpisode } from '@/lib/commerce/types'
import { findVathuisTrailer, splitPdpBodyAfterSubtitle } from './vathuis-trailer'

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

describe('splitPdpBodyAfterSubtitle', () => {
  const subtitle = { _type: 'textBlock', subtitle: 'Kunst in de eenentwintigste eeuw' }
  const text = { _type: 'textBlock', content: [] }

  it('splits right after the subtitle block', () => {
    expect(splitPdpBodyAfterSubtitle([subtitle, text])).toEqual({ before: [subtitle], after: [text] })
  })

  it('puts everything after when there is no subtitle', () => {
    expect(splitPdpBodyAfterSubtitle([text])).toEqual({ before: [], after: [text] })
    expect(splitPdpBodyAfterSubtitle(undefined)).toEqual({ before: [], after: [] })
  })

  it('ignores blank subtitles', () => {
    expect(splitPdpBodyAfterSubtitle([{ _type: 'textBlock', subtitle: '  ' }]).before).toEqual([])
  })
})
