import type { MenuItem } from '@/lib/cms/types'

export function resolveMenuItemHref(item: MenuItem): string {
  if (item.externalLink) return item.externalLink
  const path = item.link?.trim()
  if (!path || path === '#') return '#'
  return path.startsWith('/') ? path : `/${path}`
}

export function isExternalHref(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://')
}
