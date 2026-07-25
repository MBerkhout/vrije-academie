import { defineType, defineField, defineArrayMember } from "sanity"
import { createButtonSelectInput } from "../components/ButtonSelectInput"
import { PLP_BASE_PATH } from "../constants/storefront-paths"
import { defineCtaUrlField } from "./objects/ctaUrl"

const FOOTER_FORM_METHOD_OPTIONS = [
  { title: "GET", value: "get" },
  { title: "POST", value: "post" },
] as const

const SOCIAL_PLATFORM_OPTIONS = ["Facebook", "Twitter", "Instagram", "LinkedIn"].map((p) => ({
  title: p,
  value: p,
}))

export const generalSettings = defineType({
  name: "generalSettings",
  title: "General Settings",
  type: "document",
  __experimental_formPreviewTitle: false,
  fields: [
    defineField({
      name: "header",
      title: "Header",
      type: "object",
      fields: [
        defineField({
          name: "logo",
          title: "Logo (override)",
          type: "image",
          description:
            "Optional. When empty, the site uses the bundled VA monogram + wordmark from the frontend.",
          options: {
            hotspot: true,
          },
        }),
        defineField({
          name: "mainMenu",
          title: "Main menu (desktop + mobile drawer)",
          type: "reference",
          to: [{ type: "menu" }],
          description:
            "Full navigation, e.g. Home, Ons aanbod, Agenda, VAthuis, Over ons, Vragen?, Cadeaubon",
        }),
        defineField({
          name: "utilityMenu",
          title: "Top utility menu (desktop)",
          type: "reference",
          to: [{ type: "menu" }],
          description:
            "Text links top-right on large screens, e.g. Huis Vasari, Login, Winkelwagen",
        }),
        defineField({
          name: "mobileQuickMenu",
          title: "Mobile quick bar (3 items)",
          type: "reference",
          to: [{ type: "menu" }],
          description:
            "Yellow bar on small screens only, e.g. Ons aanbod, VA Thuis, Login",
        }),
        defineField({
          name: "searchPlaceholder",
          title: "Search placeholder",
          type: "string",
          initialValue: "Waar ben je naar op zoek?",
        }),
        defineField({
          name: "popularSearches",
          title: "Vaak gezocht",
          type: "array",
          description: "Shortcuts shown in the search overlay (desktop + mobile)",
          of: [
            {
              type: "object",
              fields: [
                defineField({
                  name: "label",
                  title: "Label",
                  type: "string",
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: "link",
                  title: "Link",
                  type: "string",
                  description: "Internal path (e.g. /aanbod)",
                }),
                defineField({
                  name: "externalLink",
                  title: "External link",
                  type: "url",
                }),
              ],
              preview: {
                select: { title: "label", link: "link", externalLink: "externalLink" },
                prepare({ title, link, externalLink }) {
                  return {
                    title: title || "Untitled",
                    subtitle: externalLink || link || "No link",
                  }
                },
              },
            },
          ],
        }),
        defineField({
          name: "cartUrl",
          title: "Cart URL",
          type: "string",
          description: "Path for the cart icon (default /winkelwagen)",
          initialValue: "/winkelwagen",
        }),
        defineField({
          name: "sticky",
          title: "Sticky Header",
          type: "boolean",
          initialValue: false,
        }),
      ],
    }),
    defineField({
      name: "plp",
      title: "Product listing page (Ons aanbod)",
      type: "object",
      fields: [
        defineField({
          name: "pageTitle",
          title: "Page title (H1)",
          type: "string",
          initialValue: "Ons aanbod",
        }),
        defineField({
          name: "searchPlaceholder",
          title: "Search placeholder",
          type: "string",
          initialValue: "Zoek naar een cursus, onderwerp of docent…",
        }),
        defineField({
          name: "searchSubmitLabel",
          title: "Search button label",
          type: "string",
          initialValue: "Zoek",
        }),
        defineField({
          name: "emptyStateHeading",
          title: "Empty state heading",
          type: "string",
          initialValue: "Geen activiteiten gevonden.",
        }),
        defineField({
          name: "emptyStateSubtext",
          title: "Empty state subtext",
          type: "string",
          initialValue: "Probeer een andere zoekopdracht of pas je filters aan.",
        }),
        defineField({
          name: "loadMoreLabel",
          title: "Load more button label",
          type: "string",
          initialValue: "Laad meer activiteiten",
        }),
      ],
    }),
    defineField({
      name: "pdp",
      title: "Product detail page (PDP)",
      type: "object",
      fields: [
        defineField({
          name: "lowStockThreshold",
          title: "Low stock threshold",
          type: "number",
          description: "Show 'Nog X plaatsen' when available_quantity ≤ this value.",
          initialValue: 5,
          validation: (Rule) => Rule.min(0).integer(),
        }),
        defineField({
          name: "deadlineWarningDays",
          title: "Deadline warning days",
          type: "number",
          description: "Show deadline warning when registration_deadline_at is within N days.",
          initialValue: 7,
          validation: (Rule) => Rule.min(0).integer(),
        }),
        defineField({
          name: "countdownWindowDays",
          title: "Countdown window (days)",
          type: "number",
          description: "Show a start-soon countdown when earliest_start_at is within N days.",
          initialValue: 30,
          validation: (Rule) => Rule.min(0).integer(),
        }),
        defineField({
          name: "signalTemplates",
          title: "Conversion signal templates",
          type: "object",
          description: "Templates for urgency/availability signals. Use {n} for count and {d} for days.",
          fields: [
            defineField({
              name: "lowStock",
              title: "Low stock",
              type: "string",
              initialValue: "Nog maar {n} plaatsen beschikbaar",
            }),
            defineField({
              name: "deadlineSoon",
              title: "Deadline soon",
              type: "string",
              initialValue: "Inschrijving sluit bijna",
            }),
            defineField({
              name: "startSoon",
              title: "Start soon",
              type: "string",
              initialValue: "Cursus start over {d} dagen",
            }),
            defineField({
              name: "soldOut",
              title: "Sold out",
              type: "string",
              initialValue: "Volgeboekt",
            }),
          ],
        }),
        defineField({
          name: "onlineBadgeDefaultText",
          title: "Default online badge text",
          type: "string",
          initialValue: "Nu ook online te volgen!",
        }),
        defineField({
          name: "trustUsps",
          title: "Trust USPs",
          type: "array",
          description: "2–3 short trust statements shown in the trust bar.",
          of: [{ type: "string" }],
          validation: (Rule) => Rule.max(4),
        }),
        defineField({
          name: "labels",
          title: "UI labels",
          type: "object",
          description: "User-facing labels. Change copy here without touching code.",
          fields: [
            defineField({ name: "primaryCta", title: "Primary CTA", type: "string", initialValue: "Direct inschrijven" }),
            defineField({
              name: "bundleCta",
              title: "Bundle CTA",
              type: "string",
              initialValue: "Koop alle lessen",
              description: "Primary button label when the course is sold as a bundle only.",
            }),
            defineField({ name: "wishlist", title: "Wishlist", type: "string", initialValue: "Bewaren" }),
            defineField({
              name: "wishlistSaved",
              title: "Wishlist — saved state",
              type: "string",
              initialValue: "Verwijderen uit bewaard",
              description: "Shown when the course is already on the wishlist.",
            }),
            defineField({
              name: "inviteSomeone",
              title: "Invite someone (booking panel)",
              type: "string",
              initialValue: "Nodig iemand uit",
              description: "Opens the user’s mail app with a prefilled message linking to this course.",
            }),
            defineField({ name: "share", title: "Share", type: "string", initialValue: "Delen" }),
            defineField({ name: "freeTrialBadge", title: "Free trial badge", type: "string", initialValue: "Gratis proefles" }),
            defineField({
              name: "physicalSessionsHeading",
              title: "Physical sessions heading",
              type: "string",
              initialValue: "Fysieke sessies",
            }),
            defineField({
              name: "onlineSessionsHeading",
              title: "Online sessions heading",
              type: "string",
              initialValue: "Bezoek deze lezing online",
            }),
            defineField({
              name: "onlineSessionsZoomInfo",
              title: "Online sessions Zoom info",
              type: "text",
              initialValue:
                "Je ontvangt 1 uur voor aanvang een link waarmee je de activiteit via het programma Zoom kunt bijwonen.",
            }),
            defineField({
              name: "onlineSessionsReplayInfo",
              title: "Online sessions replay info",
              type: "text",
              initialValue:
                "Binnen 2 werkdagen ontvang je een link waarmee je de registratie van de lezing nog 7 dagen kunt terugkijken.",
            }),
            defineField({
              name: "sessionsSortLabel",
              title: "Sessions sort label (aria)",
              type: "string",
              initialValue: "Sorteren op",
            }),
            defineField({
              name: "sessionsSortDate",
              title: "Sessions sort option: date",
              type: "string",
              initialValue: "Datum",
            }),
            defineField({
              name: "sessionsSortLocation",
              title: "Sessions sort option: location",
              type: "string",
              initialValue: "Locatie",
            }),
            defineField({
              name: "sessionsHeading",
              title: "Sessions heading (deprecated)",
              type: "string",
              initialValue: "Fysieke sessies",
              description: "Deprecated — use Physical sessions heading instead.",
            }),
            defineField({
              name: "allLocationsTab",
              title: "All locations tab",
              type: "string",
              initialValue: "Alle locaties",
              description: "First tab on the PDP sessions table when multiple cities exist; lists all sessions.",
            }),
            defineField({ name: "similarHeading", title: "Similar courses heading", type: "string", initialValue: "Vergelijkbare cursussen" }),
            defineField({ name: "relatedHeading", title: "Related products heading", type: "string", initialValue: "Gerelateerd" }),
            defineField({ name: "noSessionsMessage", title: "No sessions message", type: "string", initialValue: "Momenteel geen sessies beschikbaar." }),
            defineField({ name: "soldOutLabel", title: "Sold out label", type: "string", initialValue: "Volgeboekt" }),
            defineField({ name: "episodesHeading", title: "Episodes heading", type: "string", initialValue: "Lessen" }),
            defineField({ name: "chapterLabel", title: "Chapter label", type: "string", initialValue: "Hoofdstuk" }),
            defineField({ name: "episodeColumn", title: "Episode column", type: "string", initialValue: "Aflevering" }),
            defineField({ name: "durationColumn", title: "Duration column", type: "string", initialValue: "Duur" }),
            defineField({ name: "descriptionColumn", title: "Description column", type: "string", initialValue: "Beschrijving" }),
            defineField({ name: "watchEpisode", title: "Watch episode CTA", type: "string", initialValue: "Bekijk aflevering" }),
          ],
        }),
      ],
    }),
    defineField({
      name: "cart",
      title: "Winkelwagen",
      type: "object",
      fields: [
        defineField({
          name: "stepLabels",
          title: "Step labels (checkout stepper)",
          type: "object",
          fields: [
            defineField({ name: "overzicht", type: "string", title: "Step 1", initialValue: "Overzicht" }),
            defineField({ name: "inloggen", type: "string", title: "Step 2", initialValue: "Inloggen" }),
            defineField({ name: "betaling", type: "string", title: "Step 3", initialValue: "Betaling" }),
            defineField({ name: "bevestiging", type: "string", title: "Step 4", initialValue: "Bevestiging" }),
          ],
        }),
        defineField({ name: "continueShoppingLabel", title: "Continue shopping link label", type: "string", initialValue: "Verder winkelen" }),
        defineField({ name: "continueShoppingUrl", title: "Continue shopping URL", type: "string", initialValue: PLP_BASE_PATH }),
        defineField({ name: "groupBookingNotice", title: "Group booking notice (> 12 persons)", type: "string", initialValue: "Wil je met meer dan 12 personen deelnemen? Neem contact op via info@vrijeacademie.nl." }),
        defineField({ name: "discountCodeInstructions", title: "Discount code instructions", type: "text", rows: 2, initialValue: "Vul hier je eventuele kortingscode in en klik op toevoegen. Herhaal dit als je meerdere codes hebt. Ons systeem kiest dan de voor jou voordeligste combinatie." }),
        defineField({ name: "giftCodeNote", title: "Gift/credit code note", type: "string", initialValue: "Kortings- of cadeaubonnen kun je invullen bij stap 3." }),
        defineField({ name: "proceedCtaLabel", title: "Proceed CTA label", type: "string", initialValue: "Doorgaan met afrekenen" }),
        defineField({ name: "emptyHeading", title: "Empty cart heading", type: "string", initialValue: "Je winkelwagen is leeg." }),
        defineField({ name: "emptySubtext", title: "Empty cart subtext", type: "string", initialValue: "Ontdek ons aanbod en schrijf je in voor een activiteit." }),
        defineField({ name: "emptyCtaLabel", title: "Empty cart CTA label", type: "string", initialValue: "Bekijk ons aanbod" }),
        defineCtaUrlField({
          name: "emptyCtaUrl",
          title: "Empty cart CTA URL",
          initialValue: PLP_BASE_PATH,
        }),
        defineField({ name: "trustSecure", title: "Trust signal — secure payment", type: "string", initialValue: "Veilig betalen via Mollie." }),
        defineField({ name: "trustCancellation", title: "Trust signal — unique courses since 1990", type: "string", initialValue: "Unieke colleges sinds 1990" }),
        defineField({ name: "trustSupport", title: "Trust signal — support", type: "string", initialValue: "Vragen? Bel ons op 088-518 5000 (ma-vr 9:30-11:30)." }),
        defineField({ name: "cancellationDays", title: "Cancellation days (for trust signal)", type: "number", initialValue: 14, validation: (Rule) => Rule.min(0).integer() }),
        defineField({
          name: "supportText",
          title: "Support text (rich text)",
          type: "array",
          of: [{ type: "block" }],
        }),
        defineField({
          name: "labels",
          title: "UI labels",
          type: "object",
          fields: [
            defineField({ name: "subtotal", type: "string", title: "Subtotaal label", initialValue: "Producten" }),
            defineField({ name: "discount", type: "string", title: "Korting label", initialValue: "Korting" }),
            defineField({ name: "vat", type: "string", title: "BTW label", initialValue: "BTW (21%)" }),
            defineField({ name: "total", type: "string", title: "Totaal label", initialValue: "Totaal" }),
            defineField({ name: "discountPlaceholder", type: "string", title: "Discount code placeholder", initialValue: "Voer je code in..." }),
            defineField({ name: "discountApply", type: "string", title: "Discount apply button", initialValue: "Toevoegen" }),
            defineField({ name: "quantityMoreThan12", type: "string", title: "Quantity > 12 notice", initialValue: "Wil je met meer dan 12 personen deelnemen, neem dan contact met ons op via: info@vrijeacademie.nl" }),
            defineField({ name: "deleteItemConfirm", type: "string", title: "Delete item confirmation", initialValue: "Weet je zeker dat je dit product wilt verwijderen?" }),
          ],
        }),
      ],
    }),
    defineField({
      name: "organization",
      title: "Organization (structured data)",
      type: "object",
      description:
        "Optional overrides for Schema.org Organization JSON-LD. Footer contact and social links are used as fallbacks.",
      fields: [
        defineField({
          name: "legalName",
          title: "Legal name",
          type: "string",
          description: 'Defaults to "Vrije Academie" when empty.',
        }),
        defineField({
          name: "logo",
          title: "Logo",
          type: "image",
          description: "Used in Organization schema. Falls back to the header logo.",
          options: { hotspot: true },
        }),
        defineField({
          name: "telephone",
          title: "Telephone",
          type: "string",
          description: "Falls back to the footer phone line.",
        }),
        defineField({
          name: "email",
          title: "Email",
          type: "string",
          description: "Falls back to the footer contact email.",
        }),
        defineField({
          name: "sameAs",
          title: "Profile URLs (sameAs)",
          type: "array",
          description: "Social or official profile URLs. Falls back to footer social links.",
          of: [
            defineArrayMember({
              type: "object",
              name: "organizationProfileUrl",
              fields: [
                defineField({
                  name: "url",
                  title: "URL",
                  type: "url",
                  validation: (Rule) => Rule.required(),
                }),
              ],
              preview: {
                select: { url: "url" },
                prepare({ url }) {
                  return { title: url || "Profile URL" }
                },
              },
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: "footer",
      title: "Footer",
      type: "object",
      fields: [
        defineField({
          name: "topMenuPrimary",
          title: "Footer top — link column 1",
          type: "reference",
          to: [{ type: "menu" }],
          description:
            "First column beside the yellow divider (e.g. Ons aanbod, Agenda, Over ons, Contact, Vragen?).",
        }),
        defineField({
          name: "topMenuSecondary",
          title: "Footer — juridisch / praktisch menu",
          type: "reference",
          to: [{ type: "menu" }],
          description:
            "Links such as Voorwaarden, Privacy, Adverteren, VAthuis. Shown in the bottom footer row (not beside the primary column).",
        }),
        defineField({
          name: "legalColumnTitle",
          title: "Footer bottom — legal column heading",
          type: "string",
          description: "Heading above the juridisch menu in the bottom row.",
          initialValue: "Juridisch",
        }),
        defineField({
          name: "contact",
          title: "Contact (left column)",
          type: "object",
          fields: [
            defineField({
              name: "address",
              title: "Address",
              type: "text",
              rows: 2,
              initialValue: "Herengracht 368, 1016 CH Amsterdam",
            }),
            defineField({
              name: "phone",
              title: "Phone line",
              type: "string",
              initialValue:
                "Telefoon: 088 - 518 5000 (tegen de gebruikelijke belkosten)",
            }),
            defineField({
              name: "availability",
              title: "Availability",
              type: "string",
              initialValue:
                "Wij zijn op werkdagen telefonisch bereikbaar van 9:30-11:30 uur",
            }),
            defineField({
              name: "emailIntro",
              title: "Text before email",
              type: "string",
              initialValue: "Je kunt je vragen ook mailen naar",
            }),
            defineField({
              name: "email",
              title: "Email",
              type: "string",
              description: "Shown as a mailto link after the intro.",
              validation: (Rule) =>
                Rule.custom((v) => {
                  if (!v || !v.trim()) return true
                  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Ongeldig e-mailadres"
                }),
              initialValue: "info@vrijeacademie.nl",
            }),
          ],
        }),
        defineField({
          name: "columns",
          title: "Footer columns (bottom row)",
          type: "array",
          description:
            "Bottom row columns (e.g. Klantenservice, Populaire activiteiten). Omit “Nieuwsbrief”; juridische links komen uit het menu hierboven.",
          of: [
            defineArrayMember({
              type: "object",
              name: "footerColumn",
              title: "Column",
              fields: [
                defineField({
                  name: "title",
                  title: "Column Title",
                  type: "string",
                }),
                defineField({
                  name: "menu",
                  title: "Menu",
                  type: "reference",
                  to: [{ type: "menu" }],
                }),
              ],
            }),
          ],
        }),
        defineField({
          name: "keepInformedForm",
          title: "Footer — Blijf op de hoogte (desktop)",
          type: "object",
          description:
            "Optional signup form shown only on large screens, next to the primary footer link column.",
          fields: [
            defineField({
              name: "formAction",
              title: "Form URL",
              type: "url",
              description: "GET or POST endpoint (e.g. marketing tool). Leave empty to hide the form.",
            }),
            defineField({
              name: "formMethod",
              title: "Method",
              type: "string",
              options: { list: [...FOOTER_FORM_METHOD_OPTIONS] },
              initialValue: "get",
              components: { input: createButtonSelectInput([...FOOTER_FORM_METHOD_OPTIONS]) },
              hidden: ({ parent }) => !parent?.formAction,
            }),
            defineField({
              name: "firstNameField",
              title: "First name field name",
              type: "string",
              initialValue: "firstName",
              hidden: ({ parent }) => !parent?.formAction,
            }),
            defineField({
              name: "lastNameField",
              title: "Last name field name",
              type: "string",
              initialValue: "lastName",
              hidden: ({ parent }) => !parent?.formAction,
            }),
            defineField({
              name: "emailField",
              title: "Email field name",
              type: "string",
              initialValue: "email",
              hidden: ({ parent }) => !parent?.formAction,
            }),
          ],
        }),
        defineField({
          name: "copyright",
          title: "Copyright Text",
          type: "string",
          description:
            "Optional. Shown with the current year. Use {year} to insert the year explicitly.",
        }),
        defineField({
          name: "socialLinks",
          title: "Social Links",
          type: "array",
          of: [
            defineArrayMember({
              type: "object",
              name: "footerSocialLink",
              title: "Social link",
              fields: [
                defineField({
                  name: "platform",
                  title: "Platform",
                  type: "string",
                  options: { list: SOCIAL_PLATFORM_OPTIONS },
                  components: { input: createButtonSelectInput(SOCIAL_PLATFORM_OPTIONS) },
                }),
                defineField({
                  name: "url",
                  title: "URL",
                  type: "url",
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: "checkout",
      title: "Afrekenen (checkout)",
      type: "object",
      fields: [
        defineField({
          name: "guestCheckoutEnabled",
          title: "Afrekenen als gast toegestaan",
          type: "boolean",
          initialValue: true,
        }),
        defineField({
          name: "emailStep",
          title: "Stap 2 — E-mailadres invullen",
          type: "object",
          fields: [
            defineField({ name: "heading", type: "string", title: "Heading", initialValue: "Inloggen of account aanmaken" }),
            defineField({ name: "intro", type: "string", title: "Intro tekst" }),
            defineField({ name: "nextLabel", type: "string", title: "Knop label", initialValue: "Volgende" }),
            defineField({ name: "lookupErrorToast", type: "string", title: "Foutmelding lookup", initialValue: "Kon je e-mailadres niet controleren. Probeer het opnieuw." }),
          ],
        }),
        defineField({
          name: "knownEmail",
          title: "Stap 2b — Bekend e-mailadres (inloggen)",
          type: "object",
          fields: [
            defineField({ name: "heading", type: "string", title: "Welkom-tekst", initialValue: "Welkom terug!" }),
            defineField({ name: "passwordLabel", type: "string", title: "Wachtwoord label", initialValue: "Wachtwoord" }),
            defineField({ name: "loginLabel", type: "string", title: "Inloggen knop", initialValue: "Inloggen" }),
            defineField({ name: "otpLabel", type: "string", title: "OTP knop", initialValue: "Eenmalig wachtwoord sturen" }),
            defineField({ name: "otpSentLabel", type: "string", title: "OTP bevestiging", initialValue: "Er is een eenmalig wachtwoord verstuurd naar je e-mailadres." }),
            defineField({ name: "otpCodeLabel", type: "string", title: "OTP code label", initialValue: "Verificatiecode" }),
            defineField({ name: "otpVerifyLabel", type: "string", title: "OTP bevestigen knop", initialValue: "Bevestigen" }),
            defineField({ name: "otpResendLabel", type: "string", title: "OTP opnieuw sturen", initialValue: "Code opnieuw sturen" }),
            defineField({ name: "backLabel", type: "string", title: "Terug knop", initialValue: "Terug" }),
          ],
        }),
        defineField({
          name: "unknownEmail",
          title: "Stap 2c — Onbekend e-mailadres (account aanmaken)",
          type: "object",
          fields: [
            defineField({ name: "heading", type: "string", title: "Heading", initialValue: "Vul je gegevens in" }),
            defineField({ name: "firstNameLabel", type: "string", title: "Voornaam label", initialValue: "Voornaam" }),
            defineField({ name: "lastNameLabel", type: "string", title: "Achternaam label", initialValue: "Achternaam" }),
            defineField({ name: "phoneLabel", type: "string", title: "Telefoonnummer label", initialValue: "Telefoonnummer" }),
            defineField({ name: "streetLabel", type: "string", title: "Straat label", initialValue: "Straat" }),
            defineField({ name: "houseNumberLabel", type: "string", title: "Huisnummer label", initialValue: "Huisnummer" }),
            defineField({ name: "postalCodeLabel", type: "string", title: "Postcode label", initialValue: "Postcode" }),
            defineField({ name: "cityLabel", type: "string", title: "Stad label", initialValue: "Stad" }),
            defineField({ name: "countryLabel", type: "string", title: "Land label", initialValue: "Land" }),
            defineField({
              name: "newsletterOptInLabel",
              type: "string",
              title: "Nieuwsbrief checkbox",
              initialValue: "Blijf op de hoogte van de laatste cursussen",
            }),
            defineField({ name: "continueLabel", type: "string", title: "Doorgaan knop", initialValue: "Doorgaan" }),
          ],
        }),
        defineField({
          name: "payment",
          title: "Stap 3 — Betaling",
          type: "object",
          fields: [
            defineField({ name: "heading", type: "string", title: "Heading", initialValue: "Betaalgegevens" }),
            defineField({ name: "personalDetailsHeading", type: "string", title: "Persoonlijke gegevens heading", initialValue: "Jouw gegevens" }),
            defineField({ name: "giftCodeInstructions", type: "string", title: "Cadeaubon instructie", initialValue: "Voer je cadeaubon of tegoedboncode in." }),
            defineField({ name: "giftCodeApplyLabel", type: "string", title: "Cadeaubon toepassen knop", initialValue: "Code toepassen" }),
            defineField({ name: "methodsHeading", type: "string", title: "Betaalmethoden heading", initialValue: "Betaalmethode kiezen" }),
            defineField({ name: "payLabel", type: "string", title: "Betalen knop", initialValue: "Betalen" }),
            defineField({
              name: "paymentErrorMessage",
              title: "Betaling mislukt bericht",
              type: "array",
              of: [{ type: "block" }],
              description: "Ondersteunt vet, cursief, lijsten en links.",
            }),
          ],
        }),
        defineField({
          name: "trust",
          title: "Vertrouwenssignalen (betaalpagina)",
          type: "object",
          fields: [
            defineField({ name: "secure", type: "string", title: "Veilig betalen tekst", initialValue: "Veilig betalen met SSL-encryptie" }),
            defineField({ name: "cancellation", type: "string", title: "Annuleringsbeleid tekst", initialValue: "Gratis annuleren tot {days} dagen voor aanvang" }),
            defineField({ name: "support", type: "string", title: "Klantenservice tekst", initialValue: "Vragen? Bel 088 – 518 5000" }),
            defineField({ name: "cancellationDays", type: "number", title: "Annuleringstermijn (dagen)", initialValue: 14 }),
          ],
        }),
        defineField({
          name: "confirmation",
          title: "Stap 4 — Bevestiging",
          type: "object",
          fields: [
            defineField({ name: "heading", type: "string", title: "Heading", initialValue: "Bedankt voor je inschrijving!" }),
            defineField({ name: "subheading", type: "string", title: "Subheading", initialValue: "Je ontvangt een bevestiging per e-mail." }),
            defineField({ name: "orderNumberLabel", type: "string", title: "Bestelnummer label", initialValue: "Bestelnummer" }),
            defineField({ name: "backToOverviewLabel", type: "string", title: "Terug naar aanbod knop", initialValue: "Bekijk ons volledig aanbod" }),
            defineField({ name: "backToOverviewUrl", type: "string", title: "Terug naar aanbod URL", initialValue: PLP_BASE_PATH }),
          ],
        }),
        defineField({
          name: "orderSummary",
          title: "Bestellingsoverzicht (sidebar)",
          type: "object",
          fields: [
            defineField({ name: "heading", type: "string", title: "Heading", initialValue: "Bestellingsoverzicht" }),
            defineField({ name: "changeLabel", type: "string", title: "Wijzigen link", initialValue: "Wijzigen" }),
            defineField({ name: "subtotalLabel", type: "string", title: "Subtotaal label", initialValue: "Subtotaal" }),
            defineField({ name: "discountLabel", type: "string", title: "Korting label", initialValue: "Korting" }),
            defineField({ name: "vatLabel", type: "string", title: "BTW label", initialValue: "BTW" }),
            defineField({ name: "totalLabel", type: "string", title: "Totaal label", initialValue: "Totaal" }),
          ],
        }),
      ],
    }),
    defineField({
      name: "account",
      title: "Account (login / mijn account)",
      type: "object",
      fields: [
        defineField({ name: "loginHeading", type: "string", title: "Login heading", initialValue: "Inloggen" }),
        defineField({ name: "loginIntro", type: "string", title: "Login intro tekst" }),
        defineField({
          name: "loginImage",
          title: "Login pagina — achtergrondafbeelding",
          type: "image",
          description: "Sfeervolle foto die op de linker helft van de inlogpagina verschijnt (aanbevolen: 1200×1600px, portret).",
          options: { hotspot: true },
        }),
        defineField({
          name: "loginQuote",
          title: "Login pagina — citaat",
          type: "string",
          description: "Inspirerend citaat over de afbeelding (standaard: \"Kennis verandert je blik op de wereld.\").",
          initialValue: "Kennis verandert je blik op de wereld.",
        }),
        defineField({ name: "emailLabel", type: "string", title: "E-mail label", initialValue: "E-mailadres" }),
        defineField({ name: "passwordLabel", type: "string", title: "Wachtwoord label", initialValue: "Wachtwoord" }),
        defineField({ name: "loginCtaLabel", type: "string", title: "Inloggen knop", initialValue: "Inloggen" }),
        defineField({ name: "forgotPasswordLabel", type: "string", title: "Wachtwoord vergeten link", initialValue: "Wachtwoord vergeten?" }),
        defineField({ name: "registerLinkLabel", type: "string", title: "Registreer link", initialValue: "Nog geen account? Ga naar afrekenen." }),
        defineField({ name: "forgotPasswordSuccess", type: "string", title: "Wachtwoord reset bevestiging (altijd getoond)", initialValue: "Als dit e-mailadres bij ons bekend is, ontvang je een e-mail met een resetlink." }),
        defineField({ name: "forgotPasswordHeading", type: "string", title: "Wachtwoord vergeten heading", initialValue: "Wachtwoord vergeten" }),
        defineField({ name: "forgotPasswordEmailLabel", type: "string", title: "Wachtwoord reset e-mail label", initialValue: "E-mailadres" }),
        defineField({ name: "forgotPasswordCtaLabel", type: "string", title: "Wachtwoord reset knop", initialValue: "Verstuur link" }),
      ],
    }),
  ],
  preview: {
    prepare() {
      return {
        title: "General Settings",
      }
    },
  },
})
