/**
 * Patches generalSettings.footer to reference mock footer menus (see README).
 * Run after menus exist (e.g. created via Studio or Sanity MCP).
 *
 * Usage (from repo root or sanity/):
 *   SANITY_STUDIO_PROJECT_ID=v4eheew2 SANITY_STUDIO_DATASET=production SANITY_API_WRITE_TOKEN=xxx node sanity/scripts/seed-footer-general-settings.mjs
 *
 * Optional env MENU_* overrides (published document IDs, not drafts.*):
 *   MENU_FOOTER_TOP_PRIMARY, MENU_FOOTER_TOP_SECONDARY,
 *   MENU_FOOTER_KLANTENSERVICE, MENU_FOOTER_POPULAIR,
 *   MENU_FOOTER_VAKGEBIEDEN, MENU_FOOTER_NIEUW
 */

import { createClient } from "@sanity/client"
import { loadEnvFromSanityDir } from "./load-env.mjs"

loadEnvFromSanityDir()

const projectId =
  process.env.SANITY_STUDIO_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset =
  process.env.SANITY_STUDIO_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN

const DEFAULT_IDS = {
  topPrimary: "1cfa07ce-cec3-484c-b87c-3e3c58d4e2af",
  topSecondary: "441cda3e-208e-4c57-84a8-0ad146b1acb9",
  klantenservice: "43442aef-7c66-4962-b6a1-4c7c0430e8c9",
  populair: "cd8645e0-2a43-4f4b-911d-b3cf46ccc7ed",
  vakgebieden: "161fffb3-34a5-46cd-986d-c2683c4db668",
  nieuw: "ff462610-7ca4-4057-b62e-81fe2c1290ac",
}

function id(envKey, fallback) {
  const v = process.env[envKey]?.trim()
  return v || fallback
}

if (!projectId || !token) {
  console.error(
    "Missing SANITY_STUDIO_PROJECT_ID (or NEXT_PUBLIC_SANITY_PROJECT_ID) and SANITY_API_WRITE_TOKEN",
  )
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2024-01-01",
  token,
  useCdn: false,
})

const settingsId = await client.fetch(`*[_type == "generalSettings"][0]._id`)

if (!settingsId) {
  console.error("No generalSettings document found.")
  process.exit(1)
}

const footer = {
  legalColumnTitle: "Juridisch",
  contact: {
    address: "Herengracht 368, 1016 CH Amsterdam",
    phone: "Telefoon: 088 - 518 5000 (tegen de gebruikelijke belkosten)",
    availability: "Wij zijn op werkdagen telefonisch bereikbaar van 9:30-11:30 uur",
    emailIntro: "Je kunt je vragen ook mailen naar",
    email: "info@vrijeacademie.nl",
  },
  topMenuPrimary: {
    _type: "reference",
    _ref: id("MENU_FOOTER_TOP_PRIMARY", DEFAULT_IDS.topPrimary),
  },
  topMenuSecondary: {
    _type: "reference",
    _ref: id("MENU_FOOTER_TOP_SECONDARY", DEFAULT_IDS.topSecondary),
  },
  columns: [
    {
      _key: "fm-col-ks",
      _type: "footerColumn",
      title: "Klantenservice",
      menu: {
        _type: "reference",
        _ref: id("MENU_FOOTER_KLANTENSERVICE", DEFAULT_IDS.klantenservice),
      },
    },
    {
      _key: "fm-col-pop",
      _type: "footerColumn",
      title: "Populaire activiteiten",
      menu: {
        _type: "reference",
        _ref: id("MENU_FOOTER_POPULAIR", DEFAULT_IDS.populair),
      },
    },
    {
      _key: "fm-col-vk",
      _type: "footerColumn",
      title: "Vakgebieden",
      menu: {
        _type: "reference",
        _ref: id("MENU_FOOTER_VAKGEBIEDEN", DEFAULT_IDS.vakgebieden),
      },
    },
    {
      _key: "fm-col-nw",
      _type: "footerColumn",
      title: "Nieuw!",
      menu: {
        _type: "reference",
        _ref: id("MENU_FOOTER_NIEUW", DEFAULT_IDS.nieuw),
      },
    },
  ],
  socialLinks: [
    {
      _key: "fm-soc-fb",
      _type: "footerSocialLink",
      platform: "Facebook",
      url: "https://www.facebook.com/",
    },
    {
      _key: "fm-soc-ig",
      _type: "footerSocialLink",
      platform: "Instagram",
      url: "https://www.instagram.com/",
    },
  ],
  copyright: "© {year} Vrije Academie. Alle rechten voorbehouden.",
}

await client.patch(settingsId).set({ footer }).commit({ visibility: "async" })

console.log(`Patched generalSettings (${settingsId}) with mock footer menus.`)
