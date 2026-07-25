import { defineType, defineField } from "sanity"
import { blocksForSurface } from "../blocks/registry"

/**
 * Product (event group) — mirrored from Medusa.
 * Mirror fields are written by the sync subscriber and are read-only in Studio.
 * Editable fields: body, onlineBadge, customUrgencyMessage, relatedProducts.
 */
export const product = defineType({
  name: "product",
  title: "Product",
  type: "document",
  groups: [
    { name: "editorial", title: "Editorial content", default: true },
    { name: "mirror", title: "Medusa data (read-only)" },
  ],
  fields: [
    // ── Editable fields ────────────────────────────────────────────────────
    defineField({
      name: "pageBodyOwnedBySanity",
      title: "Keep page body edits in Sanity",
      type: "boolean",
      group: "editorial",
      initialValue: false,
      description:
        "While off, Medusa fills Page body from the product description on each sync (overwriting blocks). Turn on after you customize Page body below so sync updates catalog data only and no longer replaces the page body.",
    }),
    defineField({
      name: "body",
      title: "Page body",
      type: "array",
      group: "editorial",
      description: "Rich content blocks shown on the product detail page. Supports text, images, columns, etc.",
      of: blocksForSurface("pdp"),
    }),
    defineField({
      name: "onlineBadge",
      title: "Online badge",
      type: "object",
      group: "editorial",
      description: "Optional badge shown in the booking panel.",
      fields: [
        defineField({
          name: "enabled",
          title: "Show badge",
          type: "boolean",
          initialValue: false,
        }),
        defineField({
          name: "text",
          title: "Badge text",
          type: "string",
          initialValue: "Nu ook online te volgen!",
          hidden: ({ parent }) => !(parent as { enabled?: boolean })?.enabled,
        }),
      ],
    }),
    defineField({
      name: "customUrgencyMessage",
      title: "Custom urgency message",
      type: "string",
      group: "editorial",
      description: "Shown in the promo banner. Max 80 characters.",
      validation: (Rule) => Rule.max(80),
    }),
    defineField({
      name: "relatedProducts",
      title: "Related products (curated)",
      type: "array",
      group: "editorial",
      description: "Editor-curated picks shown below Similar courses. Max 4.",
      of: [{ type: "reference", to: [{ type: "product" }] }],
      validation: (Rule) => Rule.max(4),
    }),
    defineField({
      name: "seo",
      title: "SEO",
      type: "seo",
      group: "editorial",
      description:
        "Optional editorial SEO overrides for the product detail page. When empty, the storefront uses Medusa catalog data.",
    }),

    // ── Medusa mirror fields (read-only) ────────────────────────────────────
    defineField({
      name: "medusaId",
      title: "Medusa ID",
      type: "string",
      group: "mirror",
      description: "Set automatically by Medusa sync. Do not edit.",
      readOnly: true,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "handle",
      title: "Handle",
      type: "string",
      group: "mirror",
      readOnly: true,
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      group: "mirror",
      readOnly: true,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "recordType",
      title: "Record type",
      type: "string",
      group: "mirror",
      readOnly: true,
    }),
    defineField({
      name: "thumbnailUrl",
      title: "Thumbnail URL",
      type: "string",
      group: "mirror",
      readOnly: true,
    }),
    defineField({
      name: "imageUrls",
      title: "Image URLs",
      type: "array",
      group: "mirror",
      of: [{ type: "string" }],
      readOnly: true,
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      group: "mirror",
      readOnly: true,
    }),
    defineField({
      name: "seoTitle",
      title: "SEO title",
      type: "string",
      group: "mirror",
      readOnly: true,
      description: "Synced from Salesforce via Medusa (`SEO_Title__c`). Used for PDP meta title when set.",
    }),
    defineField({
      name: "seoDescription",
      title: "SEO description",
      type: "text",
      group: "mirror",
      readOnly: true,
      description: "Synced from Salesforce via Medusa (`SEO_Meta_Description__c`). Used for PDP meta description when set.",
    }),
    defineField({
      name: "externalRegistrationUrl",
      title: "External registration URL",
      type: "url",
      group: "mirror",
      readOnly: true,
      description:
        "Synced from Salesforce via Medusa (`External_Registration_URL__c`). When set, storefront Direct inschrijven opens this URL.",
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      group: "mirror",
      of: [{ type: "string" }],
      readOnly: true,
    }),
    defineField({
      name: "categories",
      title: "Categories",
      type: "array",
      group: "mirror",
      of: [{ type: "reference", to: [{ type: "category" }] }],
      readOnly: true,
    }),
    defineField({
      name: "docenten",
      title: "Docenten",
      type: "array",
      group: "mirror",
      of: [{ type: "reference", to: [{ type: "docent" }] }],
      readOnly: true,
    }),
    defineField({
      name: "hasFreeTrial",
      title: "Has free trial",
      type: "boolean",
      group: "mirror",
      readOnly: true,
    }),
    defineField({
      name: "priceFrom",
      title: "Price from (cents)",
      type: "number",
      group: "mirror",
      readOnly: true,
    }),
    defineField({
      name: "cities",
      title: "Cities",
      type: "array",
      group: "mirror",
      of: [{ type: "string" }],
      readOnly: true,
    }),
    defineField({
      name: "startAt",
      title: "Earliest start date",
      type: "datetime",
      group: "mirror",
      readOnly: true,
    }),
    defineField({
      name: "badge",
      title: "Status badge",
      type: "string",
      group: "mirror",
      readOnly: true,
      description: "Mirrored from Salesforce CTA Label (product card bar text).",
    }),
    defineField({
      name: "ctaColor",
      title: "CTA color",
      type: "string",
      group: "mirror",
      readOnly: true,
    }),
    defineField({
      name: "ctaColorHover",
      title: "CTA color hover",
      type: "string",
      group: "mirror",
      readOnly: true,
    }),
  ],
  preview: {
    select: { title: "title", recordType: "recordType", medusaId: "medusaId" },
    prepare({ title, recordType, medusaId }) {
      return {
        title: title || "Product",
        subtitle: [recordType, medusaId ? `medusa:${medusaId.slice(0, 12)}…` : null]
          .filter(Boolean)
          .join(" · "),
      }
    },
  },
})
