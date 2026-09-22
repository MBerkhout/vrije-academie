import { revalidatePath } from 'next/cache'

import { fetchSitemapEntries } from '@/lib/cms/sitemap-queries'
import { plpCategoryHref, VATHUIS_BASE_PATH } from '@/lib/routes'

/** Private chrome routes omitted from sitemap.xml but still cached with header/footer. */
export const STOREFRONT_CHROME_PATHS = [
  '/winkelwagen',
  '/zoeken',
  '/login',
  '/bedankt',
  '/afrekenen',
  '/checkout',
  '/checkout/inloggen',
  '/checkout/betaling',
  '/checkout/bevestiging',
  '/mijn-account',
  '/mijn-account/collectie',
  '/mijn-account/gegevens',
  '/mijn-account/bewaard',
  '/mijn-account/aankopen',
] as const

export const REVALIDATE_BATCH_SIZE = 50
export const REVALIDATE_BATCH_DELAY_MS = 100

/** Paths that embed category thumbnails and should bust when a category is published. */
export function categoryPublishRevalidatePaths(slug: string | undefined): string[] {
  const paths = ['/', VATHUIS_BASE_PATH]
  const trimmed = slug?.trim()
  if (trimmed) paths.push(plpCategoryHref(trimmed))
  return paths
}

export function mergeStorefrontPaths(
  sitemapPaths: string[],
  extraPaths: readonly string[] = STOREFRONT_CHROME_PATHS,
): string[] {
  return [...new Set([...sitemapPaths, ...extraPaths])]
}

export async function collectStorefrontRevalidatePaths(): Promise<string[]> {
  const entries = await fetchSitemapEntries({ includeNoIndex: true })
  return mergeStorefrontPaths(entries.map((entry) => entry.path))
}

export async function revalidatePathsInBatches(
  paths: string[],
  options: {
    revalidate?: (path: string) => void
    batchSize?: number
    delayMs?: number
    sleep?: (ms: number) => Promise<void>
  } = {},
): Promise<{ revalidated: number; batches: number }> {
  const revalidate = options.revalidate ?? ((path: string) => revalidatePath(path))
  const batchSize = options.batchSize ?? REVALIDATE_BATCH_SIZE
  const delayMs = options.delayMs ?? REVALIDATE_BATCH_DELAY_MS
  const sleep =
    options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))

  let revalidated = 0
  let batches = 0

  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize)
    batches += 1
    for (const path of batch) {
      revalidate(path)
      revalidated += 1
    }
    if (i + batchSize < paths.length) {
      await sleep(delayMs)
    }
  }

  return { revalidated, batches }
}

export async function revalidateStorefrontCacheInBackground(): Promise<{
  revalidated: number
  batches: number
}> {
  const paths = await collectStorefrontRevalidatePaths()
  return revalidatePathsInBatches(paths)
}
