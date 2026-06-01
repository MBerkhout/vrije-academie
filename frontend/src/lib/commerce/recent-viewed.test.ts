import { describe, expect, it } from 'vitest'
import {
  handlesForRecentDisplay,
  mergeRecentViewedHandles,
  parseRecentViewedHandles,
  RECENT_VIEWED_METADATA_KEY,
} from './recent-viewed'

describe('recent-viewed', () => {
  it('parses handles from customer metadata', () => {
    expect(
      parseRecentViewedHandles({
        [RECENT_VIEWED_METADATA_KEY]: ['  foo  ', 'bar', 1, ''],
      })
    ).toEqual(['foo', 'bar'])
  })

  it('merges local before remote and dedupes', () => {
    expect(mergeRecentViewedHandles(['b', 'a'], ['a', 'c'])).toEqual(['b', 'a', 'c'])
  })

  it('excludes current handle from display list', () => {
    expect(handlesForRecentDisplay(['a', 'b', 'c'], 'b')).toEqual(['a', 'c'])
  })
})
