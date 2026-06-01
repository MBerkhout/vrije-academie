import { describe, it, expect } from 'vitest'
import {
  getBlockContainerStyles,
  getBlockContainerWidthClass,
  getBlockBackgroundClass,
  getBlockSectionDomId,
} from '../blockLayout'

describe('blockLayout', () => {
  describe('getBlockContainerStyles', () => {
    it('returns px values for preset spacing', () => {
      const styles = getBlockContainerStyles({
        marginTop: '24',
        marginBottom: '16',
        paddingTop: '8',
        paddingBottom: '32',
        width: 'container',
        backgroundColor: 'none',
      })
      expect(styles.marginTop).toBe('24px')
      expect(styles.marginBottom).toBe('16px')
      expect(styles.paddingTop).toBe('8px')
      expect(styles.paddingBottom).toBe('32px')
    })

    it('uses custom values when layout has custom fields', () => {
      const styles = getBlockContainerStyles({
        marginTop: 'custom',
        marginTopCustom: 40,
        marginBottom: 'custom',
        marginBottomCustom: 60,
        paddingTop: '0',
        paddingBottom: '0',
        width: 'container',
        backgroundColor: 'none',
      })
      expect(styles.marginTop).toBe('40px')
      expect(styles.marginBottom).toBe('60px')
    })

    it('handles unknown preset as 0', () => {
      const styles = getBlockContainerStyles({
        marginTop: 'invalid',
        marginBottom: '0',
        paddingTop: '0',
        paddingBottom: '0',
        width: 'container',
        backgroundColor: 'none',
      })
      expect(styles.marginTop).toBe('0px')
    })
  })

  describe('getBlockContainerWidthClass', () => {
    it('returns w-full for full width (edge-to-edge; padding applied per container block)', () => {
      expect(getBlockContainerWidthClass({ width: 'full' })).toBe('w-full')
    })

    it('returns max-w centered for container', () => {
      expect(getBlockContainerWidthClass({ width: 'container' })).toBe(
        'max-w-[1240px] mx-auto px-4 md:px-8 min-[1240px]:px-0'
      )
    })
  })

  describe('getBlockBackgroundClass', () => {
    it('returns empty string for none', () => {
      expect(getBlockBackgroundClass({ backgroundColor: 'none' })).toBe('')
    })

    it('returns bg- class for each color', () => {
      expect(getBlockBackgroundClass({ backgroundColor: 'va-lightgray' })).toBe('bg-va-lightgray')
      expect(getBlockBackgroundClass({ backgroundColor: 'va-white' })).toBe('bg-va-white')
      expect(getBlockBackgroundClass({ backgroundColor: 'va-black' })).toBe('bg-va-black')
    })
  })

  describe('getBlockSectionDomId', () => {
    it('returns undefined when no anchor', () => {
      expect(getBlockSectionDomId({})).toBeUndefined()
    })

    it('normalizes flat htmlAnchor', () => {
      expect(getBlockSectionDomId({ htmlAnchor: 'Over ons' })).toBe('over-ons')
    })

    it('reads nested layout.htmlAnchor', () => {
      expect(getBlockSectionDomId({ layout: { htmlAnchor: 'foo_bar' } })).toBe('foo_bar')
    })
  })
})
