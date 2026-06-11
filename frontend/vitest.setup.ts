import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = 'test-project'
process.env.NEXT_PUBLIC_SANITY_DATASET = 'test'
process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL = 'http://localhost:9000'

vi.mock('@/lib/cms/sanity-client', () => ({
  sanityClient: {
    getPage: vi.fn(),
    getGeneralSettings: vi.fn(),
    getMenu: vi.fn(),
  },
  urlFor: () => ({
    width: () => ({
      height: () => ({
        url: () => '',
      }),
    }),
  }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
