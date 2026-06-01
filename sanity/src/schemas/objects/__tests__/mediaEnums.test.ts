import { describe, it, expect } from 'vitest'
import {
  youtubeUrlRegex,
  dutchPostcodeRegex,
  extractYoutubeId,
  WIDTH_OPTIONS,
  ASPECT_RATIO_OPTIONS,
} from '../mediaEnums'

describe('mediaEnums', () => {
  describe('youtubeUrlRegex', () => {
    it('matches youtube.com/watch URLs', () => {
      expect(youtubeUrlRegex.test('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
      expect(youtubeUrlRegex.test('http://youtube.com/watch?v=abc123')).toBe(true)
    })

    it('matches youtu.be short URLs', () => {
      expect(youtubeUrlRegex.test('https://youtu.be/dQw4w9WgXcQ')).toBe(true)
    })

    it('matches embed URLs', () => {
      expect(youtubeUrlRegex.test('https://www.youtube.com/embed/abc123')).toBe(true)
    })

    it('rejects invalid URLs', () => {
      expect(youtubeUrlRegex.test('https://vimeo.com/123')).toBe(false)
      expect(youtubeUrlRegex.test('not a url')).toBe(false)
    })
  })

  describe('extractYoutubeId', () => {
    it('extracts ID from watch URL', () => {
      expect(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    })

    it('extracts ID from youtu.be URL', () => {
      expect(extractYoutubeId('https://youtu.be/abc123')).toBe('abc123')
    })

    it('extracts ID from embed URL', () => {
      expect(extractYoutubeId('https://www.youtube.com/embed/xyz789')).toBe('xyz789')
    })

    it('returns null for invalid URL', () => {
      expect(extractYoutubeId('https://vimeo.com/123')).toBeNull()
    })
  })

  describe('dutchPostcodeRegex', () => {
    it('matches 4-digit postcodes', () => {
      expect(dutchPostcodeRegex.test('1234')).toBe(true)
      expect(dutchPostcodeRegex.test('0000')).toBe(true)
    })

    it('matches postcodes with 2 letters', () => {
      expect(dutchPostcodeRegex.test('1234AB')).toBe(true)
      expect(dutchPostcodeRegex.test('1234 ab')).toBe(true)
    })

    it('rejects invalid postcodes', () => {
      expect(dutchPostcodeRegex.test('123')).toBe(false)
      expect(dutchPostcodeRegex.test('12345')).toBe(false)
      expect(dutchPostcodeRegex.test('1234ABC')).toBe(false)
    })
  })

  describe('WIDTH_OPTIONS', () => {
    it('has narrow, normal, wide', () => {
      const values = WIDTH_OPTIONS.map((o) => o.value)
      expect(values).toContain('narrow')
      expect(values).toContain('normal')
      expect(values).toContain('wide')
    })
  })

  describe('ASPECT_RATIO_OPTIONS', () => {
    it('has expected ratios', () => {
      const values = ASPECT_RATIO_OPTIONS.map((o) => o.value)
      expect(values).toContain('16:9')
      expect(values).toContain('4:3')
      expect(values).toContain('1:1')
      expect(values).toContain('free')
    })
  })
})
