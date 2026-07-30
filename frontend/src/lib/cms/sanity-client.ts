/**
 * Sanity implementation of CMS client.
 * Uses sanityFetch for draft-aware, stega-encoded fetches (visual editing & live updates).
 */

import type { CMSClient, Page, GeneralSettings, Menu, SiteSearchHit, SearchSuggestionsResult, SearchSuggestion } from './types'
import { cache } from 'react'
import { draftMode } from 'next/headers'
import { sanityFetch } from './live'
import { sanityPreviewClient } from './sanity-preview-client'
import { PAGE_QUERY } from './page-query'
import { PLP_BASE_PATH, plpCategoryHref, plpCityHref, plpProductPath } from '@/lib/routes'
import { isExternalHref } from '@/lib/menu-href'
import {
  SITE_SEARCH_QUERY,
  SUGGEST_SEARCH_QUERY,
  PLACES_LIST_QUERY,
  PLACES_MATCH_QUERY,
  searchGlobPattern,
  groupSuggestRows,
  placeRowToSuggestion,
  type SiteSearchRow,
  type PlaceSuggestRow,
} from './search-query'

/** CDN-backed client for published settings (PLP/layout); draft mode still uses sanityFetch. */
const staticSettingsClient = sanityPreviewClient.withConfig({
  useCdn: true,
  stega: { enabled: false },
})

function truncateExcerpt(s: string | null | undefined, max: number): string | undefined {
  if (!s) return undefined
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trimEnd()}…`
}

function searchRowToHit(row: SiteSearchRow): SiteSearchHit | null {
  const title = row.title?.trim()
  if (!title) return null

  switch (row._type) {
    case 'page': {
      const slug = row.pageSlug
      if (slug == null || slug === '') return null
      const href = slug === '/' ? '/' : slug.startsWith('/') ? slug : `/${slug}`
      return {
        kind: 'page',
        title,
        href,
        subtitle: 'Pagina',
        excerpt: truncateExcerpt(row.seoDescription, 200),
      }
    }
    case 'product': {
      const handle = row.handle
      if (!handle) return null
      return {
        kind: 'product',
        title,
        href: plpProductPath(handle),
        subtitle: row.recordType?.trim() || 'Activiteit',
        excerpt: truncateExcerpt(row.description, 200),
        thumbnailUrl: row.thumbnailUrl ?? undefined,
      }
    }
    case 'docent': {
      const slug = row.docentSlug
      if (!slug) return null
      const p = new URLSearchParams()
      p.set('docent', slug)
      return {
        kind: 'docent',
        title,
        href: `${PLP_BASE_PATH}?${p.toString()}`,
        subtitle: row.role?.trim() || 'Docent',
      }
    }
    case 'category': {
      const slug = row.categorySlug
      if (!slug) return null
      const raw = row.linkUrl?.trim()
      let href = plpCategoryHref(slug)
      if (raw) {
        href = isExternalHref(raw)
          ? raw
          : raw.startsWith('/')
            ? raw
            : `/${raw.replace(/^\//, '')}`
      }
      return {
        kind: 'category',
        title,
        href,
        subtitle: 'Categorie',
        excerpt: truncateExcerpt(row.categoryDescription, 200),
        thumbnailUrl: row.categoryThumbnailUrl ?? undefined,
      }
    }
    case 'city': {
      const slug = row.citySlug
      if (!slug) return null
      return {
        kind: 'place',
        title,
        href: plpCityHref(slug),
        subtitle: 'Plaats',
      }
    }
    case 'person': {
      const url = row.profileUrl?.trim()
      if (!url) return null
      return {
        kind: 'person',
        title,
        href: url,
        subtitle: row.role?.trim() || 'Team',
      }
    }
    default:
      return null
  }
}

export const sanityClient: CMSClient = {
  async getPage(slug: string): Promise<Page | null> {
    const { data } = await sanityFetch({ query: PAGE_QUERY, params: { slug } })
    return data || null
  },

  async getGeneralSettings(): Promise<GeneralSettings | null> {
    const query = `*[_type == "generalSettings"][0] {
      header {
        logo {
          asset-> {
            _id,
            url,
            metadata {
              dimensions
            }
          }
        },
        searchPlaceholder,
        popularSearches[] {
          label,
          link,
          externalLink
        },
        cartUrl,
        mainMenu-> {
          _id,
          title,
          items[] {
            label,
            link,
            externalLink,
            emphasized,
            children[] {
              label,
              link,
              externalLink,
              emphasized
            }
          }
        },
        utilityMenu-> {
          _id,
          title,
          items[] {
            label,
            link,
            externalLink,
            emphasized,
            children[] {
              label,
              link,
              externalLink,
              emphasized
            }
          }
        },
        mobileQuickMenu-> {
          _id,
          title,
          items[] {
            label,
            link,
            externalLink,
            emphasized
          }
        },
        sticky
      },
      organization {
        legalName,
        logo {
          asset-> {
            _id,
            url,
            metadata {
              dimensions
            }
          }
        },
        telephone,
        email,
        sameAs[] {
          url
        }
      },
      footer {
        topMenuPrimary-> {
          _id,
          title,
          items[] {
            label,
            link,
            externalLink
          }
        },
        topMenuSecondary-> {
          _id,
          title,
          items[] {
            label,
            link,
            externalLink
          }
        },
        legalColumnTitle,
        contact {
          address,
          phone,
          availability,
          emailIntro,
          email
        },
        columns[] {
          title,
          menu-> {
            _id,
            title,
            items[] {
              label,
              link,
              externalLink
            }
          }
        },
        keepInformedForm {
          formAction,
          formMethod,
          firstNameField,
          lastNameField,
          emailField
        },
        copyright,
        socialLinks[]
      },
      plp {
        pageTitle,
        searchPlaceholder,
        searchSubmitLabel,
        emptyStateHeading,
        emptyStateSubtext,
        loadMoreLabel
      },
      pdp {
        lowStockThreshold,
        deadlineWarningDays,
        countdownWindowDays,
        signalTemplates {
          lowStock,
          deadlineSoon,
          startSoon,
          soldOut
        },
        onlineBadgeDefaultText,
        trustUsps,
        labels {
          primaryCta,
          bundleCta,
          wishlist,
          wishlistSaved,
          inviteSomeone,
          share,
          freeTrialBadge,
          sessionsHeading,
          physicalSessionsHeading,
          onlineSessionsHeading,
          onlineSessionsZoomInfo,
          onlineSessionsReplayInfo,
          sessionsSortLabel,
          sessionsSortDate,
          sessionsSortLocation,
          allLocationsTab,
          similarHeading,
          relatedHeading,
          noSessionsMessage,
          soldOutLabel,
          episodesHeading,
          chapterLabel,
          episodeColumn,
          durationColumn,
          descriptionColumn,
          watchEpisode
        }
      },
      cart {
        stepLabels {
          "summary": overzicht,
          "login": inloggen,
          "payment": betaling,
          "confirmation": bevestiging
        },
        continueShoppingLabel,
        continueShoppingUrl,
        groupBookingNotice,
        discountCodeInstructions,
        giftCodeNote,
        proceedCtaLabel,
        emptyHeading,
        emptySubtext,
        emptyCtaLabel,
        emptyCtaUrl,
        trustSecure,
        trustCancellation,
        trustSupport,
        cancellationDays,
        supportText,
        labels {
          subtotal,
          discount,
          vat,
          total,
          discountPlaceholder,
          discountApply,
          quantityMoreThan12,
          deleteItemConfirm
        }
      },
      checkout {
        guestCheckoutEnabled,
        emailStep {
          heading,
          intro,
          nextLabel,
          lookupErrorToast
        },
        knownEmail {
          heading,
          passwordLabel,
          loginLabel,
          otpLabel,
          otpSentLabel,
          forgotPasswordLabel,
          guestContinueLabel,
          backLabel
        },
        unknownEmail {
          heading,
          firstNameLabel,
          lastNameLabel,
          phoneLabel,
          streetLabel,
          houseNumberLabel,
          postalCodeLabel,
          cityLabel,
          countryLabel,
          createAccountLabel,
          newsletterOptInLabel,
          passwordLabel,
          confirmPasswordLabel,
          continueLabel
        },
        payment {
          heading,
          personalDetailsHeading,
          giftCodeInstructions,
          giftCodeApplyLabel,
          methodsHeading,
          payLabel,
          paymentErrorMessage
        },
        trust {
          secure,
          cancellation,
          support,
          cancellationDays
        },
        confirmation {
          heading,
          subheading,
          orderNumberLabel,
          backToOverviewLabel,
          backToOverviewUrl
        },
        orderSummary {
          heading,
          changeLabel,
          subtotalLabel,
          discountLabel,
          vatLabel,
          totalLabel
        }
      },
      account {
        loginHeading,
        loginIntro,
        loginImage { asset-> { _id, url } },
        loginQuote,
        emailLabel,
        passwordLabel,
        loginCtaLabel,
        forgotPasswordLabel,
        registerLinkLabel,
        forgotPasswordSuccess,
        forgotPasswordHeading,
        forgotPasswordEmailLabel,
        forgotPasswordCtaLabel
      }
    }`

    const { isEnabled } = await draftMode()
    if (isEnabled) {
      const { data } = await sanityFetch({ query })
      return data || null
    }
    try {
      return (await staticSettingsClient.fetch<GeneralSettings | null>(query)) ?? null
    } catch {
      return null
    }
  },

  async getMenu(id: string): Promise<Menu | null> {
    const query = `*[_type == "menu" && _id == $id][0] {
      _id,
      title,
      items[] {
        label,
        link,
        externalLink,
        children[] {
          label,
          link,
          externalLink
        }
      }
    }`

    const { data } = await sanityFetch({ query, params: { id } })
    return data || null
  },

  async searchSiteContent(query: string): Promise<SiteSearchHit[]> {
    const pat = searchGlobPattern(query)
    if (!pat) return []

    const { data } = await sanityFetch({
      query: SITE_SEARCH_QUERY,
      params: { pat },
    })

    const rows = (data ?? []) as SiteSearchRow[]
    const hits: SiteSearchHit[] = []
    for (const row of rows) {
      const hit = searchRowToHit(row)
      if (hit) hits.push(hit)
    }
    return hits
  },

  async searchSuggestions(query: string): Promise<SearchSuggestionsResult> {
    const pat = searchGlobPattern(query)
    if (!pat) {
      return { products: [], categories: [], places: [], pages: [] }
    }

    const { data } = await sanityFetch({
      query: SUGGEST_SEARCH_QUERY,
      params: { pat },
    })

    return groupSuggestRows((data ?? []) as SiteSearchRow[])
  },

  async searchPlaces(query: string): Promise<SearchSuggestion[]> {
    const trimmed = query.trim()
    if (!trimmed) {
      const { data } = await sanityFetch({ query: PLACES_LIST_QUERY })
      return ((data ?? []) as PlaceSuggestRow[]).map(placeRowToSuggestion)
    }

    const pat = searchGlobPattern(trimmed)
    if (!pat) return []

    const { data } = await sanityFetch({
      query: PLACES_MATCH_QUERY,
      params: { pat },
    })
    return ((data ?? []) as PlaceSuggestRow[]).map(placeRowToSuggestion)
  },
}
