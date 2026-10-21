export type HeroNewsletterPopupConfig =
  | { mode: 'interactive'; ctaId: string; formId?: string }
  | { mode: 'form'; formId: string }

/**
 * Hero Inschrijven pop-up: HubSpot web interactive (CTA iframe) when CTA id is set,
 * otherwise embedded form GUID.
 */
export function resolveHeroNewsletterPopup(
  formId: string | undefined,
  ctaId: string | undefined,
): HeroNewsletterPopupConfig | undefined {
  const trimmedCta = ctaId?.trim()
  const trimmedForm = formId?.trim()
  if (trimmedCta) {
    return { mode: 'interactive', ctaId: trimmedCta, formId: trimmedForm }
  }
  if (trimmedForm) {
    return { mode: 'form', formId: trimmedForm }
  }
  return undefined
}
