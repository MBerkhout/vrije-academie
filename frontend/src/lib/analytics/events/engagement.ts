import { pushEvent } from '@/lib/analytics/data-layer'
import type { PageType, UserData } from '@/lib/analytics/types'

export function trackSearch(searchTerm: string, resultsCount: number): void {
  pushEvent({
    event: 'search',
    search_term: searchTerm.trim(),
    results_count: Math.max(0, resultsCount),
  })
}

export function trackScroll(percentScrolled: number, pageType: PageType): void {
  pushEvent({
    event: 'scroll',
    percent_scrolled: percentScrolled,
    page_type: pageType,
  })
}

export function trackOutboundClick(linkUrl: string, linkDomain: string, linkText: string): void {
  pushEvent({
    event: 'click',
    link_url: linkUrl,
    link_domain: linkDomain,
    link_text: linkText.trim() || linkDomain,
    outbound: true,
  })
}

export function trackSelectContent(contentType: string, contentId: string): void {
  pushEvent({
    event: 'select_content',
    content_type: contentType,
    content_id: contentId,
  })
}

export function trackNewsletterSignup(formLocation: string, email: string): void {
  pushEvent({
    event: 'newsletter_signup',
    form_location: formLocation,
    user_data: { email: email.trim() },
  })
}

export function trackGenerateLead(
  leadType: string,
  email: string,
  onderwerp?: string
): void {
  pushEvent({
    event: 'generate_lead',
    lead_type: leadType,
    ...(onderwerp?.trim() ? { onderwerp: onderwerp.trim() } : {}),
    user_data: { email: email.trim() },
  })
}

export function trackLogin(email: string, method = 'email'): void {
  pushEvent({
    event: 'login',
    method,
    user_data: { email: email.trim() },
  })
}

export function trackSignUp(email: string, method = 'email'): void {
  pushEvent({
    event: 'sign_up',
    method,
    user_data: { email: email.trim() },
  })
}

export function trackPasswordResetRequest(email: string): void {
  pushEvent({
    event: 'password_reset_request',
    user_data: { email: email.trim() },
  })
}

export function trackShare(method: string, contentType: string, itemId: string): void {
  pushEvent({
    event: 'share',
    method,
    content_type: contentType,
    item_id: itemId,
  })
}

export function trackLogout(): void {
  pushEvent({ event: 'logout' })
}

export function trackFormError(formName: string, fieldName: string, errorCode: string): void {
  pushEvent({
    event: 'form_error',
    form_name: formName,
    field_name: fieldName,
    error_code: errorCode,
  })
}

export type { UserData }
