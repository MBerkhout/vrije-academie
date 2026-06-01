'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { TabContentRenderer } from '@/components/blocks/TabContentRenderer'
import { getTitleTag, getTitleSizeClass, cleanBlockValue, type TabsBlock as TabsBlockType, anchorIdFromString } from '@/lib/cms'
import { cn } from '@/lib/utils'

function slugifyLabel(s: string | undefined | null): string {
  return anchorIdFromString(s)
}

function normalizePathForCompare(s: string): string {
  const path = s.split('?')[0].split('#')[0] || '/'
  if (path === '/') return '/'
  return path.replace(/\/$/, '') || '/'
}

/** Same document path: highlight left-nav item on this route (internal paths only). */
function isPathActive(pathname: string, href: string): boolean {
  if (!href.startsWith('/') || href.startsWith('//')) return false
  return normalizePathForCompare(pathname) === normalizePathForCompare(href)
}

function isExternalOrSpecialHref(raw: string): boolean {
  return /^(https?:|\/\/|mailto:|tel:)/i.test(raw.trim())
}

/** Internal site path, mailto, tel, or absolute URL as entered. */
function resolveNavHref(raw: string): string {
  const t = raw.trim()
  if (isExternalOrSpecialHref(t)) return t
  if (t.startsWith('/') && !t.startsWith('//')) return t
  return `/${t.replace(/^\//, '')}`
}

export function TabsBlock({ block }: { block: TabsBlockType }) {
  const interactionMode = cleanBlockValue(block.interactionMode) ?? 'tabs'
  const inPage = interactionMode === 'inPageNav'
  const tabs = block.tabs ?? []
  const inPageNavItems = block.inPageNavItems ?? []
  const inPageNavContent = block.inPageNavContent ?? []
  const hasInPageAside = inPageNavContent.length > 0
  const pathname = usePathname() ?? ''
  const [activeIndex, setActiveIndex] = useState(0)
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null)
  const targetIds = useMemo(
    () =>
      inPageNavItems
        .filter((i) => {
          if (i.url?.trim()) return false
          return anchorIdFromString(i.htmlAnchor ?? '').length > 0
        })
        .map((i) => anchorIdFromString(i.htmlAnchor!)),
    [inPageNavItems]
  )
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || inPage) return
    const hash = window.location.hash.slice(1)
    if (!hash || !block.anchorNavigation) return
    const index = tabs.findIndex((t) => slugifyLabel(t.label) === hash)
    if (index >= 0) setActiveIndex(index)
  }, [block.anchorNavigation, inPage, tabs])

  useEffect(() => {
    if (inPage || !block.anchorNavigation || !tabs[activeIndex]) return
    const slug = slugifyLabel(tabs[activeIndex].label)
    const full = `${window.location.pathname}#${slug}`
    if (window.history.replaceState) {
      window.history.replaceState(null, '', full)
    }
  }, [activeIndex, block.anchorNavigation, inPage, tabs])

  useEffect(() => {
    if (!inPage || targetIds.length === 0) return
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    const fromHash = () => {
      const h = window.location.hash.slice(1)
      if (h && targetIds.includes(h)) {
        setActiveAnchor(h)
        return true
      }
      return false
    }
    if (!fromHash() && targetIds[0]) setActiveAnchor(targetIds[0])

    observerRef.current?.disconnect()
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0))
        if (vis[0]?.target.id) setActiveAnchor(vis[0].target.id)
      },
      { root: null, rootMargin: '-10% 0px -50% 0px', threshold: [0, 0.1, 0.25, 0.4] }
    )

    for (const id of targetIds) {
      const el = document.getElementById(id)
      if (el) observerRef.current?.observe(el)
    }

    const onHash = () => {
      fromHash()
    }
    window.addEventListener('hashchange', onHash)
    return () => {
      window.removeEventListener('hashchange', onHash)
      observerRef.current?.disconnect()
    }
  }, [inPage, targetIds, inPageNavItems])

  const TitleTag = getTitleTag(block.titleSize)
  const contentWidth = cleanBlockValue(block.contentWidth) ?? 'normal'
  const navPosition = cleanBlockValue(block.navPosition) ?? 'top'
  const isSideNav = navPosition === 'left'

  const inPageLinkList = (
    <div
      className={cn(
        isSideNav
          ? 'flex flex-col gap-1 w-full lg:w-56 shrink-0 border-b border-va-lightgray pb-4 lg:border-b-0 lg:border-r lg:pr-6 lg:pb-0 -mx-2 px-2 lg:mx-0 lg:px-0'
          : 'flex gap-4 overflow-x-auto pb-2 -mx-2 scrollbar-hide'
      )}
      role="navigation"
      aria-label={block.title || 'In-page links'}
    >
      {inPageNavItems.map((item, i) => {
        const urlRaw = item.url?.trim()
        if (urlRaw) {
          const href = resolveNavHref(urlRaw)
          const special = isExternalOrSpecialHref(urlRaw)
          const isActive = !special && isPathActive(pathname, href)
          const className = cn(
            'font-sans font-semibold transition-colors no-underline',
            isSideNav
              ? cn(
                  'w-full text-left px-3 py-2.5 border-l-2 -ml-px',
                  isActive
                    ? 'border-va-yellow text-va-black bg-va-lightgray/50'
                    : 'border-transparent text-va-gray hover:text-va-darkgray hover:bg-va-lightgray/35'
                )
              : cn(
                  'flex-shrink-0 px-4 py-2 border-b-2',
                  isActive
                    ? 'border-va-yellow text-va-black'
                    : 'border-transparent text-va-gray hover:text-va-darkgray'
                )
          )
          if (special) {
            return (
              <a key={`${href}-${i}`} href={href} className={className}>
                {item.label}
              </a>
            )
          }
          return (
            <Link
              key={`${href}-${i}`}
              href={href}
              className={className}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.label}
            </Link>
          )
        }

        const id = anchorIdFromString(item.htmlAnchor ?? '')
        if (!id) return null
        const isActive = activeAnchor === id || (activeAnchor == null && i === 0)
        return (
          <a
            key={`${id}-${i}`}
            href={`#${id}`}
            className={cn(
              'font-sans font-semibold transition-colors no-underline',
              isSideNav
                ? cn(
                    'w-full text-left px-3 py-2.5 border-l-2 -ml-px',
                    isActive
                      ? 'border-va-yellow text-va-black bg-va-lightgray/50'
                      : 'border-transparent text-va-gray hover:text-va-darkgray hover:bg-va-lightgray/35'
                  )
                : cn(
                    'flex-shrink-0 px-4 py-2 border-b-2',
                    isActive
                      ? 'border-va-yellow text-va-black'
                      : 'border-transparent text-va-gray hover:text-va-darkgray'
                  )
            )}
            aria-current={isActive ? 'true' : undefined}
          >
            {item.label}
          </a>
        )
      })}
    </div>
  )

  const tabList = (
    <div
      role="tablist"
      aria-orientation={isSideNav ? 'vertical' : 'horizontal'}
      className={cn(
        isSideNav
          ? 'flex flex-col gap-1 w-full lg:w-56 shrink-0 border-b border-va-lightgray pb-4 lg:border-b-0 lg:border-r lg:pr-6 lg:pb-0 -mx-2 px-2 lg:mx-0 lg:px-0'
          : 'flex gap-4 overflow-x-auto pb-2 -mx-2 scrollbar-hide'
      )}
    >
      {tabs.map((tab, i) => {
        const slug = slugifyLabel(tab.label)
        const isActive = i === activeIndex
        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${slug}`}
            id={`tab-${slug}`}
            onClick={() => setActiveIndex(i)}
            className={cn(
              'font-sans font-semibold transition-colors',
              isSideNav
                ? cn(
                    'w-full text-left px-3 py-2.5 border-l-2 -ml-px',
                    isActive
                      ? 'border-va-yellow text-va-black bg-va-lightgray/50'
                      : 'border-transparent text-va-gray hover:text-va-darkgray hover:bg-va-lightgray/35'
                  )
                : cn(
                    'flex-shrink-0 px-4 py-2 border-b-2',
                    isActive
                      ? 'border-va-yellow text-va-black'
                      : 'border-transparent text-va-gray hover:text-va-darkgray'
                  )
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )

  const tabPanels = (
    <div className={cn('space-y-6', isSideNav && 'min-w-0 flex-1')}>
      {tabs.map((tab, i) => {
        const slug = slugifyLabel(tab.label)
        const isActive = i === activeIndex
        return (
          <div
            key={i}
            role="tabpanel"
            id={block.anchorNavigation ? slug : `tabpanel-${slug}`}
            aria-labelledby={`tab-${slug}`}
            hidden={!isActive}
            className="space-y-6"
          >
            {tab.blocks?.map((b) => (b && b._type ? <TabContentRenderer key={b._id} block={b} /> : null))}
          </div>
        )
      })}
    </div>
  )

  return (
    <BlockWrapper block={block}>
      <div className={cn(contentWidth === 'wide' ? 'max-w-full' : 'max-w-3xl', 'mx-auto')}>
        {block.title && (
          <TitleTag className={cn(getTitleSizeClass(block.titleSize), 'font-sans font-bold text-va-black mb-6')}>
            {block.title}
          </TitleTag>
        )}
        {inPage ? (
          hasInPageAside ? (
            isSideNav ? (
              <div className="flex w-full flex-col gap-6 lg:flex-row lg:gap-8 lg:items-start">
                {inPageLinkList}
                <div className="min-w-0 flex-1 space-y-6">
                  {inPageNavContent.map((b) =>
                    b && b._type ? <TabContentRenderer key={b._id} block={b} /> : null
                  )}
                </div>
              </div>
            ) : (
              <>
                {inPageLinkList}
                <div className="mt-6 w-full space-y-6">
                  {inPageNavContent.map((b) =>
                    b && b._type ? <TabContentRenderer key={b._id} block={b} /> : null
                  )}
                </div>
              </>
            )
          ) : (
            inPageLinkList
          )
        ) : isSideNav ? (
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-8 lg:items-start">
            {tabList}
            {tabPanels}
          </div>
        ) : (
          <>
            {tabList}
            <div className="mt-6">{tabPanels}</div>
          </>
        )}
      </div>
    </BlockWrapper>
  )
}
