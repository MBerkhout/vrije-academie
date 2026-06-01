/**
 * CMS-agnostic types for content management
 * These types abstract away Sanity-specific implementation
 */

export interface Page {
  _id: string
  title: string
  slug: string
  blocks: Block[]
  seo?: SEO
}

export interface SEO {
  title?: string
  description?: string
  image?: string
}

export interface BlockLayout {
  marginTop: string
  marginTopCustom?: number
  marginBottom: string
  marginBottomCustom?: number
  paddingTop?: string
  paddingTopCustom?: number
  paddingBottom?: string
  paddingBottomCustom?: number
  width: 'full' | 'container'
  backgroundColor: 'none' | 'va-lightgray' | 'va-white' | 'va-black'
  /** In-page target; see Tabs block in-page mode and BlockWrapper `id`. */
  htmlAnchor?: string
}

export interface Block extends BlockLayout {
  _id: string
  _type: string
  [key: string]: unknown
}

export interface EventListBlock extends Block {
  _type: 'eventList'
  title?: string
  category?: string
  eventType: 'all' | 'online' | 'offline'
  limit: number
  showPastEvents: boolean
}

export interface TextBlock extends Block {
  _type: 'textBlock'
  title?: string
  titleSize?: 'h1' | 'h2' | 'h3' | 'h4'
  titleAlignment?: 'left' | 'center' | 'right'
  content?: PortableTextBlock[]
  contentWidth?: 'narrow' | 'normal' | 'wide'
}

export interface AfbeeldingBlock extends Block {
  _type: 'afbeeldingBlock'
  mediaType: 'image' | 'youtube'
  image?: { asset: { _ref: string }; alt?: string }
  youtubeUrl?: string
  placeholderImage?: { asset: { _ref: string }; alt?: string }
  caption?: string
  contentWidth?: 'narrow' | 'normal' | 'wide'
  aspectRatio?: '16:9' | '4:3' | '1:1' | 'free'
}

export interface WhitespaceBlock extends Block {
  _type: 'whitespaceBlock'
  height: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'custom'
  customHeight?: number
}

export interface AccordionBlock extends Block {
  _type: 'accordionBlock'
  title?: string
  titleSize?: 'h1' | 'h2' | 'h3' | 'h4'
  items?: { question: string; answer?: PortableTextBlock[] }[]
  allowMultipleOpen?: boolean
}

export interface TabsBlock extends Block {
  _type: 'tabsBlock'
  title?: string
  titleSize?: 'h1' | 'h2' | 'h3' | 'h4'
  /** `tabs` = panels in this block; `inPageNav` = # links to other blocks on the page. */
  interactionMode?: 'tabs' | 'inPageNav'
  tabs?: { label: string; blocks?: Block[] }[]
  inPageNavItems?: { label: string; htmlAnchor?: string; url?: string }[]
  /** In-page + left menu: optional blocks beside the nav (studio only shows when Tab labels = Left). */
  inPageNavContent?: Block[]
  contentWidth?: 'normal' | 'wide'
  /** `top` = horizontal tab bar above; `left` = vertical menu alongside content. */
  navPosition?: 'top' | 'left'
  anchorNavigation?: boolean
}

export interface FormBlock extends Block {
  _type: 'formBlock'
  title?: string
  titleSize?: 'h1' | 'h2' | 'h3' | 'h4'
  introText?: PortableTextBlock[]
  formSource?: 'sanity' | 'hubspot'
  form?: { _ref: string }
  hubSpotForm?: string
  submitButtonLabel?: string
  successMessage?: string
  errorMessage?: string
}

export interface DemandNearbyBlock extends Block {
  _type: 'demandNearbyBlock'
  title?: string
  titleSize?: 'h1' | 'h2' | 'h3' | 'h4'
  introText?: PortableTextBlock[]
}

export interface HeroBlock extends Block {
  _type: 'heroBlock'
  slides?: HeroSlide[]
  autoplay?: boolean
  autoplayInterval?: number
  topPanelTitle?: string
  topPanelTitleSize?: string
  topPanelBody?: PortableTextBlock[]
  topPanelImage?: { asset: { _ref: string }; alt?: string }
  topPanelCtaEnabled?: boolean
  topPanelCtaLabel?: string
  topPanelCtaUrl?: string
  /** Destination for the newsletter "Aanmelden" CTA. */
  newsletterSignupUrl?: string
}

export interface HeroSlide {
  backgroundImage?: { asset: { _ref: string } }
  overlayOpacity?: 'none' | 'light' | 'medium' | 'dark'
  showLogo?: boolean
  title?: string
  titleSize?: string
  subtitle?: string
  url?: string
  contentAlignment?: 'left' | 'center'
}

export interface FeaturedTripInfoCard {
  travelDates?: string[]
  price?: string
  /** Resolved from Sanity reference. */
  guide?: Person
}

export interface EditorialCardItem {
  label?: string
  title?: string
  description?: PortableTextBlock[]
  image?: { asset?: { _ref?: string } | unknown; alt?: string }
  linkLabel?: string
  linkUrl?: string
}

/** Full-bleed background with white stacked promo cards (image on top, label, title, text, link). */
export interface EditorialCardsBlock extends Block {
  _type: 'editorialCardsBlock'
  title?: string
  /** `none` = paragraafstijl; ontbrekend in oude content = H2 op de site */
  titleSize?: 'none' | 'h1' | 'h2' | 'h3' | 'h4'
  backgroundImage?: { asset?: { _ref?: string } | unknown; alt?: string }
  overlayOpacity?: 'none' | 'light' | 'medium' | 'dark'
  cards?: EditorialCardItem[]
}

export interface FeaturedTripBlock extends Block {
  _type: 'featuredTripBlock'
  heroImage?: { asset?: { _ref?: string }; alt?: string; caption?: string }
  overlayOpacity?: 'none' | 'light' | 'medium' | 'dark'
  heroHeight?: 'sm' | 'md' | 'lg' | 'wide'
  showInfoCard?: boolean
  infoCard?: FeaturedTripInfoCard
  title?: string
  titleSize?: string
  subtitle?: string
  body?: PortableTextBlock[]
  ctaEnabled?: boolean
  ctaLabel?: string
  ctaUrl?: string
}

export interface CategoriesBlock extends Block {
  _type: 'categoriesBlock'
  title?: string
  titleSize?: string
  introText?: PortableTextBlock[]
  items?: CategoryItem[]
  columnsDesktop?: '4' | '8'
  ctaEnabled?: boolean
  ctaLabel?: string
  ctaUrl?: string
}

export interface CategoryItem {
  source: 'bibliotheek' | 'aangepast'
  category?: {
    _ref: string
  } | { _id: string; slug?: string; label?: string; image?: { asset?: unknown }; linkUrl?: string }
  label?: string
  image?: { asset: { _ref: string } } | { asset?: unknown }
  url?: string
}

export interface UspBlock extends Block {
  _type: 'uspBlock'
  title?: string
  titleSize?: string
  items?: UspItem[]
  itemsLayout?: 'horizontal' | 'vertical'
}

export interface UspItem {
  source: 'bibliotheek' | 'aangepast'
  usp?:
    | { _ref: string }
    | {
        _id?: string
        title?: string
        description?: PortableTextBlock[]
        linkEnabled?: boolean
        linkLabel?: string
        linkUrl?: string
      }
  title?: string
  description?: PortableTextBlock[]
  linkEnabled?: boolean
  linkLabel?: string
  linkUrl?: string
}

export interface ReviewBlock extends Block {
  _type: 'reviewBlock'
  title?: string
  titleSize?: string
  ratingDisplay?: boolean
  ratingValue?: number
  ratingLabel?: string
  reviews?: ReviewItem[]
  navigationStyle?: 'arrows' | 'dots' | 'both'
}

export interface ReviewItem {
  quote: string
  authorName: string
  authorSubtitle?: string
  starRating?: number
}

export interface PersonsBlock extends Block {
  _type: 'personsBlock'
  title?: string
  titleSize?: string
  introText?: PortableTextBlock[]
  dataSource?: 'manual' | 'dynamic'
  /** Resolved person documents from GROQ `persons[]->` (not raw references). */
  persons?: Person[]
  dynamicFilters?: {
    typeTags?: string[]
    subjectTags?: string[]
    exclude?: { _ref: string }[]
    maxItems?: number
    sort?: 'alphabetical' | 'recently_added' | 'manual'
  }
  columnsDesktop?: '2' | '3' | '4'
  /** Client-side filter over loaded persons */
  searchOnPage?: boolean
  searchPlaceholder?: string
  ctaEnabled?: boolean
  ctaLabel?: string
  ctaUrl?: string
}

export interface ColumnsBlock extends Block {
  _type: 'columnsBlock'
  sectionTitle?: string
  sectionTitleSize?: string
  sectionTitleAlignment?: 'left' | 'center' | 'right'
  introText?: PortableTextBlock[]
  numberOfColumns?: number
  columnGap?: 'sm' | 'md' | 'lg'
  columns?: ColumnItem[]
}

export interface ColumnItem {
  columnType: 'text' | 'media' | 'highlightCard' | 'productCards' | 'ctaCard' | 'personCard'
  width?: 'equal' | 'narrow' | 'wide'
  verticalAlignment?: 'top' | 'center' | 'bottom'
  textTitle?: string
  textTitleSize?: string
  textContent?: PortableTextBlock[]
  mediaType?: 'image' | 'youtube'
  mediaImage?: { asset: { _ref: string }; alt?: string }
  mediaImageAlt?: string
  mediaYoutubeUrl?: string
  mediaCaption?: string
  mediaAspectRatio?: string
  highlightImage?: { asset: { _ref: string } }
  highlightTitle?: string
  highlightTitleSize?: string
  highlightTeaser?: PortableTextBlock[]
  highlightLabel?: string
  productCardsTitle?: string
  productCardsManualItems?: { _ref: string }[]
  productCardsFooterCtaEnabled?: boolean
  productCardsFooterCtaLabel?: string
  productCardsFooterCtaUrl?: string
  ctaCardBgImage?: { asset: { _ref: string } }
  ctaCardTitle?: string
  ctaCardTitleSize?: string
  ctaCardOverlay?: string
  ctaCardBody?: PortableTextBlock[]
  ctaCardCtaEnabled?: boolean
  ctaCardCtaLabel?: string
  ctaCardCtaUrl?: string
  person?: { _ref: string }
  personShowBio?: boolean
  personShowLink?: boolean
}

export interface PortableTextBlock {
  _type: string
  _key?: string
  children?: { _key: string; _type: string; text?: string; marks?: string[] }[]
  markDefs?: { _key: string; _type: string; [key: string]: unknown }[]
  listItem?: string
  style?: string
}

/** `giftCardBlock` content fields (Sanity Page block). */
export type GiftCardBlockContent = {
  pageTitle?: string
  pageTitleSize?: 'h1' | 'h2' | 'h3' | 'h4'
  intro?: PortableTextBlock[]
  amountOptions?: number[]
  minAmountEuro?: number
  maxAmountEuro?: number
  section1Title?: string
  section2Title?: string
  customAmountLabel?: string
  recipientNameLabel?: string
  recipientEmailLabel?: string
  messageLabel?: string
  senderNameLabel?: string
  orderButtonLabel?: string
}

export interface ImageAsset {
  _id: string
  url: string
  alt?: string
  metadata?: {
    dimensions?: {
      width: number
      height: number
    }
  }
}

/** Header search overlay shortcuts (“Vaak gezocht”) */
export interface PopularSearchItem {
  label: string
  link?: string
  externalLink?: string
}

export interface GeneralSettings {
  header: {
    /** Sanity image; when absent the frontend uses bundled SVGs in `/public/branding`. */
    logo?: { asset?: ImageAsset }
    mainMenu?: Menu
    utilityMenu?: Menu
    mobileQuickMenu?: Menu
    searchPlaceholder?: string
    popularSearches?: PopularSearchItem[]
    cartUrl?: string
    sticky: boolean
  }
  footer?: {
    topMenuPrimary?: Menu
    topMenuSecondary?: Menu
    legalColumnTitle?: string
    contact?: {
      address?: string
      phone?: string
      availability?: string
      emailIntro?: string
      email?: string
    }
    columns?: {
      title?: string
      menu?: Menu
    }[]
    keepInformedForm?: {
      formAction?: string
      formMethod?: 'get' | 'post'
      firstNameField?: string
      lastNameField?: string
      emailField?: string
    }
    copyright?: string
    socialLinks?: {
      platform: string
      url: string
    }[]
  }
  plp?: {
    pageTitle?: string
    searchPlaceholder?: string
    searchSubmitLabel?: string
    emptyStateHeading?: string
    emptyStateSubtext?: string
    loadMoreLabel?: string
  }
  pdp?: {
    lowStockThreshold?: number
    deadlineWarningDays?: number
    countdownWindowDays?: number
    signalTemplates?: {
      lowStock?: string
      deadlineSoon?: string
      startSoon?: string
      soldOut?: string
    }
    onlineBadgeDefaultText?: string
    trustUsps?: string[]
    labels?: {
      primaryCta?: string
      wishlist?: string
      /** Label when the product is already on the wishlist (e.g. “Verwijderen uit bewaard”) */
      wishlistSaved?: string
      /** CTA to open an e-mail inviting someone to view this course */
      inviteSomeone?: string
      share?: string
      freeTrialBadge?: string
      sessionsHeading?: string
      /** Tab label for “all locations” on PDP session table (default: Alle locaties) */
      allLocationsTab?: string
      similarHeading?: string
      relatedHeading?: string
      noSessionsMessage?: string
      soldOutLabel?: string
    }
  }
  cart?: {
    stepLabels?: {
      summary?: string
      login?: string
      payment?: string
      confirmation?: string
    }
    continueShoppingLabel?: string
    continueShoppingUrl?: string
    groupBookingNotice?: string
    discountCodeInstructions?: string
    giftCodeNote?: string
    proceedCtaLabel?: string
    emptyHeading?: string
    emptySubtext?: string
    emptyCtaLabel?: string
    emptyCtaUrl?: string
    trustSecure?: string
    trustCancellation?: string
    trustSupport?: string
    cancellationDays?: number
    supportText?: PortableTextBlock[]
    labels?: {
      subtotal?: string
      discount?: string
      vat?: string
      total?: string
      discountPlaceholder?: string
      discountApply?: string
      quantityMoreThan12?: string
      deleteItemConfirm?: string
    }
  }
  checkout?: {
    guestCheckoutEnabled?: boolean
    emailStep?: {
      heading?: string
      intro?: string
      nextLabel?: string
      lookupErrorToast?: string
    }
    knownEmail?: {
      heading?: string
      passwordLabel?: string
      loginLabel?: string
      otpLabel?: string
      otpSentLabel?: string
      forgotPasswordLabel?: string
      guestContinueLabel?: string
      backLabel?: string
    }
    unknownEmail?: {
      heading?: string
      firstNameLabel?: string
      lastNameLabel?: string
      phoneLabel?: string
      streetLabel?: string
      houseNumberLabel?: string
      postalCodeLabel?: string
      cityLabel?: string
      countryLabel?: string
      createAccountLabel?: string
      passwordLabel?: string
      confirmPasswordLabel?: string
      continueLabel?: string
    }
    payment?: {
      heading?: string
      personalDetailsHeading?: string
      giftCodeInstructions?: string
      giftCodeApplyLabel?: string
      methodsHeading?: string
      payLabel?: string
      paymentErrorMessage?: PortableTextBlock[]
    }
    trust?: {
      secure?: string
      cancellation?: string
      support?: string
      cancellationDays?: number
    }
    confirmation?: {
      heading?: string
      subheading?: string
      orderNumberLabel?: string
      backToOverviewLabel?: string
      backToOverviewUrl?: string
    }
    orderSummary?: {
      heading?: string
      changeLabel?: string
      subtotalLabel?: string
      discountLabel?: string
      vatLabel?: string
      totalLabel?: string
    }
  }
  account?: {
    loginHeading?: string
    loginIntro?: string
    emailLabel?: string
    passwordLabel?: string
    loginCtaLabel?: string
    forgotPasswordLabel?: string
    registerLinkLabel?: string
    forgotPasswordSuccess?: string
    forgotPasswordHeading?: string
    forgotPasswordEmailLabel?: string
    forgotPasswordCtaLabel?: string
  }
}

export interface Menu {
  _id: string
  title: string
  items: MenuItem[]
}

export interface MenuItem {
  label: string
  link?: string
  externalLink?: string
  emphasized?: boolean
  children?: MenuItem[]
}

export interface Category {
  _id: string
  label: string
  image?: { asset: { _ref: string } }
  linkUrl?: string
  sortOrder?: number
}

export interface Usp {
  _id: string
  title: string
  description?: PortableTextBlock[]
  linkEnabled?: boolean
  linkLabel?: string
  linkUrl?: string
}

export type PersonType = 'docent' | 'team' | 'gastspreker'

export interface Person {
  _id: string
  name: string
  /** Set in Studio after schema change; omit on legacy documents until migrated. */
  personType?: PersonType
  photo?: { asset: { _ref: string } }
  role?: string
  bio?: string
  profileUrl?: string
}

/**
 * CMS Client Interface
 * Implementations (Sanity, etc.) must conform to this interface
 */
/** Normalized hit for `/zoeken` (Sanity-backed). */
export interface SiteSearchHit {
  kind: 'page' | 'product' | 'docent' | 'category' | 'place' | 'person'
  title: string
  href: string
  subtitle?: string
  excerpt?: string
  thumbnailUrl?: string
}

export interface SearchSuggestion {
  kind: 'product' | 'category' | 'place' | 'page'
  title: string
  href: string
  subtitle?: string
  thumbnailUrl?: string
}

export interface SearchSuggestionsResult {
  products: SearchSuggestion[]
  categories: SearchSuggestion[]
  places: SearchSuggestion[]
  pages: SearchSuggestion[]
}

export interface CMSClient {
  getPage(slug: string): Promise<Page | null>
  getGeneralSettings(): Promise<GeneralSettings | null>
  getMenu(id: string): Promise<Menu | null>
  /** Full-text style match across pages, products, docenten, categories, cities, persons. */
  searchSiteContent(query: string): Promise<SiteSearchHit[]>
  /** Grouped quick-search suggestions (products, categories, places, pages). */
  searchSuggestions(query: string): Promise<SearchSuggestionsResult>
  /** City (plaats) autocomplete suggestions. */
  searchPlaces(query: string): Promise<SearchSuggestion[]>
}
