import { describe, expect, it } from 'vitest'
import type { ErrorEvent, EventHint } from '@sentry/nextjs'

import { filterSentryEvent } from '@/lib/sentry-filter'

function eventWithFrames(frames: { filename?: string }[]): ErrorEvent {
  return {
    exception: {
      values: [
        {
          type: 'Error',
          value: 'test',
          stacktrace: { frames: frames.map((f) => ({ filename: f.filename, in_app: true })) },
        },
      ],
    },
  }
}

describe('filterSentryEvent', () => {
  it('drops errors with a gtm.js stack frame', () => {
    const event = eventWithFrames([
      { filename: 'app:///gtm.js:833:209' },
      { filename: 'src/lib/analytics/data-layer.ts' },
    ])
    expect(filterSentryEvent(event, {} as EventHint)).toBeNull()
  })

  it('drops errors with a browser-extension stack frame', () => {
    const event = eventWithFrames([{ filename: 'chrome-extension://abc/content.js' }])
    expect(filterSentryEvent(event, {} as EventHint)).toBeNull()
  })

  it('passes normal application errors', () => {
    const event = eventWithFrames([{ filename: 'webpack://_N_E/src/components/Foo.tsx' }])
    expect(filterSentryEvent(event, {} as EventHint)).toBe(event)
  })

  it('downgrades medusa network errors to warning', () => {
    const event: ErrorEvent = {
      transaction: '/mijn-account',
      exception: {
        values: [{ type: 'TypeError', value: 'Load failed (medusa.vrijeacademie.nl)' }],
      },
    }
    const filtered = filterSentryEvent(event, {
      originalException: new TypeError('Load failed (medusa.vrijeacademie.nl)'),
    } as EventHint)
    expect(filtered?.level).toBe('warning')
  })
})
