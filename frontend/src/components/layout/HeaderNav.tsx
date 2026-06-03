'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import clsx from 'clsx'
import type {
  GeneralSettings,
  MenuItem,
} from '@/lib/cms/types'
import { isExternalHref, resolveMenuItemHref } from '@/lib/menu-href'
import { useCustomer } from '@/lib/commerce/CustomerProvider'
import { QuickSearch } from '@/components/search/QuickSearch'
import { commerceClient } from '@/lib/commerce'
import { getCartId } from '@/lib/commerce/cart'
import type { Cart } from '@/lib/commerce/types'

export type HeaderConfig = GeneralSettings['header']

function normalizePath(href: string): string {
  try {
    const u = new URL(href, 'https://example.invalid')
    return (u.pathname.replace(/\/$/, '') || '/') + (u.search || '')
  } catch {
    return href.split('?')[0]?.replace(/\/$/, '') || '/'
  }
}

function pathActive(pathname: string, href: string): boolean {
  if (href === '#' || isExternalHref(href)) return false
  const base = href.split('?')[0] || '/'
  const p = base.replace(/\/$/, '') || '/'
  if (p === '/') return pathname === '/'
  return pathname === p || pathname.startsWith(`${p}/`)
}

function pathsMatch(a: string, b: string): boolean {
  return normalizePath(a) === normalizePath(b)
}

/** Until CMS menus include these; keep in sync with `frontend/src/app/(main)/` routes */
const HARDCODED_ACCOUNT_PATH = '/mijn-account'

function menuHasNormalizedPath(items: MenuItem[], path: string): boolean {
  const target = normalizePath(path)
  return items.some((item) => normalizePath(resolveMenuItemHref(item)) === target)
}

/** Appends cart + account links when missing (deduped by path). */
function withHardcodedCommerceLinks(items: MenuItem[], cartPath: string): MenuItem[] {
  const out = [...items]
  if (!menuHasNormalizedPath(out, HARDCODED_ACCOUNT_PATH)) {
    out.push({ label: 'Mijn account', link: HARDCODED_ACCOUNT_PATH })
  }
  if (!menuHasNormalizedPath(out, cartPath)) {
    out.push({ label: 'Winkelwagen', link: cartPath })
  }
  return out
}

function formatCartCount(n: number): string {
  return n > 99 ? '99+' : String(n)
}

function CartCountBadge({ count, className }: { count: number; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex min-h-[1.375rem] min-w-[1.375rem] items-center justify-center rounded-sm bg-va-yellow px-1.5',
        'text-xs font-bold leading-none text-va-black tabular-nums',
        className
      )}
      aria-hidden
    >
      {formatCartCount(count)}
    </span>
  )
}

function CartLinkLabel({ label, count }: { label: string; count: number | null }) {
  const showBadge = count !== null && count > 0
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      {showBadge ? <CartCountBadge count={count} /> : null}
    </span>
  )
}

function cartLineItemCount(cart: Cart | null): number {
  return (cart?.items ?? []).reduce((sum, line) => sum + (line.quantity ?? 0), 0)
}

/** Sums line quantities from the Medusa cart cookie; listens for `va:cart-updated`. */
function useCartItemCount(): number | null {
  const [count, setCount] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    const cartId = getCartId()
    if (!cartId) {
      setCount(0)
      return
    }
    try {
      const cart = await commerceClient.getCart(cartId)
      setCount(cartLineItemCount(cart))
    } catch {
      setCount(0)
    }
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener('va:cart-updated', refresh)
    return () => window.removeEventListener('va:cart-updated', refresh)
  }, [refresh])

  return count
}

function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15zm0-2a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z"
        fill="currentColor"
      />
      <path
        d="M20.2 21.8 15 16.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconCart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6h15l-1.5 9h-12L6 6zm0 0L5 3H2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="20" r="1.5" fill="currentColor" />
      <circle cx="18" cy="20" r="1.5" fill="currentColor" />
    </svg>
  )
}

function IconMenu({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Mobile / small-screen branding row (bundled monogram + wordmark, or CMS image). */
function HeaderLogoMobile({ header }: { header: HeaderConfig }) {
  const cmsUrl = header.logo?.asset?.url
  const w = header.logo?.asset?.metadata?.dimensions?.width ?? 160
  const h = header.logo?.asset?.metadata?.dimensions?.height ?? 48

  return (
    <Link
      href="/"
      className="flex items-center gap-2 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-va-yellow focus-visible:ring-offset-2"
    >
      {cmsUrl ? (
        <Image
          src={cmsUrl}
          alt="Vrije Academie"
          width={w}
          height={h}
          className="h-9 w-auto max-w-[200px] object-contain object-left"
          sizes="200px"
        />
      ) : (
        <>
          <img
            src="/branding/logo.svg"
            alt=""
            width={233}
            height={167}
            className="h-10 w-auto"
          />
          <img
            src="/branding/logo_text.svg"
            alt="Vrije Academie"
            width={490}
            height={68}
            className="hidden sm:block h-8 w-auto"
          />
        </>
      )}
    </Link>
  )
}

function MenuLink({
  item,
  pathname,
  className,
  children,
}: {
  item: MenuItem
  pathname: string
  className?: string
  children?: React.ReactNode
}) {
  const href = resolveMenuItemHref(item)
  const active = pathActive(pathname, href)
  const label = children ?? item.label
  const merged = clsx(
    className,
    active && 'underline underline-offset-4 decoration-va-yellow'
  )

  if (isExternalHref(href)) {
    return (
      <a href={href} className={merged} rel="noopener noreferrer" target="_blank">
        {label}
      </a>
    )
  }

  return (
    <Link href={href} className={merged}>
      {label}
    </Link>
  )
}

export function HeaderNav({ header }: { header: HeaderConfig }) {
  const pathname = usePathname() || '/'
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { customer } = useCustomer()
  const cartItemCount = useCartItemCount()

  const placeholder = header.searchPlaceholder?.trim() || 'Zoek'
  const popularSearches = header.popularSearches ?? []
  const cartUrl = header.cartUrl?.trim() || '/winkelwagen'
  const mainItems = header.mainMenu?.items ?? []
  const baseUtilityItems = withHardcodedCommerceLinks(header.utilityMenu?.items ?? [], cartUrl)
  // Replace or inject the account/login item based on customer session
  const utilityItems: MenuItem[] = baseUtilityItems.map((item) => {
    const href = resolveMenuItemHref(item)
    if (
      normalizePath(href) === normalizePath(HARDCODED_ACCOUNT_PATH) ||
      normalizePath(href) === '/login'
    ) {
      if (customer) {
        return { label: `Hoi, ${customer.first_name ?? customer.email}`, link: HARDCODED_ACCOUNT_PATH }
      }
      return { label: 'Login', link: '/login' }
    }
    return item
  })
  // If neither /mijn-account nor /login was in the CMS menu but we added /mijn-account via withHardcoded,
  // the map above already handles it since withHardcoded added '/mijn-account'.
  const quickItems = header.mobileQuickMenu?.items ?? []
  const sticky = header.sticky

  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const openMenu = useCallback(() => setMenuOpen(true), [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])

  useEffect(() => {
    if (!menuOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  useEffect(() => {
    closeMenu()
    setSearchOpen(false)
  }, [pathname, closeMenu])

  const mid = Math.ceil(mainItems.length / 2)
  const colLeft = mainItems.slice(0, mid)
  const colRight = mainItems.slice(mid)

  const openMobileSearch = useCallback(() => {
    setSearchOpen(true)
  }, [])

  const openDesktopSearch = useCallback(() => {
    setSearchOpen(true)
  }, [])

  const cmsUrl = header.logo?.asset?.url
  const cmsLogoW = header.logo?.asset?.metadata?.dimensions?.width ?? 160
  const cmsLogoH = header.logo?.asset?.metadata?.dimensions?.height ?? 48

  const utilityLinksDesktop = (
    <div className="flex items-center gap-5 lg:gap-7 text-sm font-sans text-va-darkgray">
      {utilityItems.map((item, i) => {
        const href = resolveMenuItemHref(item)
        const isCartLink = pathsMatch(cartUrl, href)
        const linkLabel =
          isCartLink && cartItemCount !== null && cartItemCount > 0 ? (
            <CartLinkLabel label={item.label} count={cartItemCount} />
          ) : (
            item.label
          )
        return (
          <MenuLink
            key={i}
            item={item}
            pathname={pathname}
            className="whitespace-nowrap underline-offset-4 decoration-va-yellow transition-[color] hover:text-va-black hover:underline"
          >
            {linkLabel}
          </MenuLink>
        )
      })}
    </div>
  )

  const searchPortal = (
    <QuickSearch
      open={searchOpen}
      onClose={closeSearch}
      placeholder={placeholder}
      popularSearches={popularSearches}
      submitBasePath="/zoeken"
    />
  )

  return (
    <>
    <header
      className={clsx(
        'bg-va-white text-va-black',
        sticky && 'sticky top-0 z-50'
      )}
    >
      <div className="relative max-w-[1240px] mx-auto px-3 sm:px-4 min-[1240px]:px-0">
        {/* Mobile: stacked branding row + yellow rule (desktop main nav lives in column layout below) */}
        <div className="md:hidden">
          <div className="flex items-center justify-between gap-3 py-3">
            <HeaderLogoMobile header={header} />

            <div className="flex items-end justify-end gap-5 font-sans text-[11px] text-va-black">
              <button
                type="button"
                className="flex flex-col items-center gap-1 min-w-[3rem] outline-none focus-visible:ring-2 focus-visible:ring-va-yellow"
                onClick={openMobileSearch}
                aria-expanded={searchOpen}
              >
                <IconSearch className="w-6 h-6" />
                <span>Zoeken</span>
              </button>
              <Link
                href={cartUrl}
                className="flex flex-col items-center gap-1 min-w-[3rem] relative outline-none focus-visible:ring-2 focus-visible:ring-va-yellow rounded"
                aria-label={
                  cartItemCount !== null && cartItemCount > 0
                    ? `Winkelwagen, ${cartItemCount > 99 ? '99+' : cartItemCount} artikelen in mandje`
                    : 'Winkelwagen'
                }
              >
                <span className="inline-flex items-center gap-1">
                  <IconCart className="w-6 h-6" aria-hidden />
                  {cartItemCount !== null && cartItemCount > 0 ? (
                    <CartCountBadge count={cartItemCount} />
                  ) : null}
                </span>
                <span>Winkelwagen</span>
              </Link>
              <button
                type="button"
                className="flex flex-col items-center gap-1 min-w-[3rem] outline-none focus-visible:ring-2 focus-visible:ring-va-yellow"
                onClick={() => (menuOpen ? closeMenu() : openMenu())}
                aria-expanded={menuOpen}
                aria-controls="mobile-drawer-nav"
                id="mobile-menu-trigger"
              >
                {menuOpen ? <IconClose className="w-6 h-6" /> : <IconMenu className="w-6 h-6" />}
                <span>Menu</span>
              </button>
            </div>
          </div>

          <div className="h-px w-full bg-va-yellow" aria-hidden />
        </div>

        {/* Desktop: tall monogram / CMS logo at left; wordmark, utilities, rule, main nav + search to the right */}
        <div className="hidden md:flex items-stretch xl:-ml-14">
          <Link
            href="/"
            className="flex h-full min-h-0 shrink-0 items-center justify-start self-stretch outline-none focus-visible:ring-2 focus-visible:ring-va-yellow focus-visible:ring-offset-2"
          >
            {cmsUrl ? (
              <Image
                src={cmsUrl}
                alt="Vrije Academie"
                width={cmsLogoW}
                height={cmsLogoH}
                className="h-[125px] w-auto max-w-[min(240px,36vw)] object-contain object-left"
                sizes="240px"
              />
            ) : (
              <img
                src="/branding/logo.svg"
                alt=""
                width={233}
                height={167}
                className="h-[125px] w-auto object-contain object-left"
              />
            )}
          </Link>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div
              className={clsx(
                'flex items-center gap-4 pb-3 pt-4',
                cmsUrl ? 'justify-end' : 'justify-between'
              )}
            >
              {!cmsUrl ? (
                <Link
                  href="/"
                  className="shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-va-yellow focus-visible:ring-offset-2"
                >
                  <img
                    src="/branding/logo_text.svg"
                    alt="Vrije Academie"
                    width={490}
                    height={84}
                    className="lg:ml-[-24px] h-10 w-auto max-w-[min(420px,40vw)]"
                  />
                </Link>
              ) : null}
              {utilityLinksDesktop}
            </div>

            <div className="h-px w-[calc(100%+8px)] bg-va-yellow lg:mx-[-8px]" style={{ marginRight: 0 }} aria-hidden />
       
       

            <div className="flex items-center justify-between gap-6 py-3">
              <nav className="lg:ml-[-4px] flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2 text-sm font-sans text-va-darkgray">
                {mainItems.map((item, i) => (
                  <MenuLink
                    key={i}
                    item={item}
                    pathname={pathname}
                    className="whitespace-nowrap underline-offset-4 decoration-va-yellow transition-[color] hover:text-va-black hover:underline"
                  />
                ))}
              </nav>
              <button
                type="button"
                onClick={openDesktopSearch}
                aria-expanded={searchOpen}
                aria-haspopup="dialog"
                className={clsx(
                  'shrink-0 w-full max-w-[220px] rounded-none border border-va-gray-300',
                  'pl-3 pr-4 py-2 text-sm font-sans text-left',
                  'inline-flex items-center gap-2 text-va-gray bg-white',
                  'outline-none hover:border-va-gray-400 transition-colors',
                  'focus-visible:ring-2 focus-visible:ring-va-yellow'
                )}
              >
                <IconSearch className="w-4 h-4 shrink-0 text-va-darkgray" aria-hidden />
                <span className="truncate">{placeholder}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile quick bar */}
        {quickItems.length > 0 ? (
          <div className="md:hidden grid grid-cols-3 divide-x divide-white/90 bg-va-yellow">
            {quickItems.map((item, i) => (
              <div key={i} className="py-2.5 px-1 text-center text-sm font-sans font-medium">
                <MenuLink
                  item={item}
                  pathname={pathname}
                  className="text-va-black hover:opacity-80 block"
                />
              </div>
            ))}
          </div>
        ) : null}

        {/* Mobile full menu */}
        {menuOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/25 md:hidden motion-reduce:transition-none"
              aria-label="Sluit menu"
              onClick={closeMenu}
            />
            <nav
              id="mobile-drawer-nav"
              className="absolute left-0 right-0 top-full z-50 md:hidden border-b border-va-lightgray-300 bg-va-white shadow-lg animate-va-header-drawer motion-reduce:animate-none"
              aria-labelledby="mobile-menu-trigger"
            >
              <div className="max-w-[1240px] mx-auto px-3 py-6 min-[1240px]:px-0 grid grid-cols-2 gap-x-4 gap-y-0 text-sm font-sans">
                <ul className="space-y-3">
                  {colLeft.map((item, i) => (
                    <li key={i}>
                      <MenuLink
                        item={item}
                        pathname={pathname}
                        className={clsx(
                          'block py-1 underline-offset-4 decoration-va-yellow hover:underline',
                          item.emphasized && 'bg-sky-100 -mx-2 px-2 py-2 rounded-sm'
                        )}
                      />
                    </li>
                  ))}
                </ul>
                <ul className="space-y-3">
                  {colRight.map((item, i) => (
                    <li key={i}>
                      <MenuLink
                        item={item}
                        pathname={pathname}
                        className={clsx(
                          'block py-1 underline-offset-4 decoration-va-yellow hover:underline',
                          item.emphasized && 'bg-sky-100 -mx-2 px-2 py-2 rounded-sm'
                        )}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          </>
        ) : null}
      </div>

    </header>
    {searchPortal}
    </>
  )
}
