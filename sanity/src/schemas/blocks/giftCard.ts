import { defineType, defineField, defineArrayMember } from "sanity"
import { TITLE_SIZE_OPTIONS } from "../objects/mediaEnums"
import { createButtonSelectInput } from "../../components/ButtonSelectInput"

/**
 * Gift card purchase UI copy and limits for `/cadeaubon`.
 * Lives on Page `pageCadeaubon` (see `CADEAUBON_CMS_PAGE_ID`); page `seo` covers meta/OG.
 */
export const giftCardBlock = defineType({
  name: "giftCardBlock",
  title: "Cadeaubon (koop)",
  type: "object",
  fields: [
    defineField({
      name: "pageTitle",
      title: "Paginatitel",
      type: "string",
      initialValue: "Digitale cadeaubon",
    }),
    defineField({
      name: "pageTitleSize",
      title: "Grootte paginatitel",
      type: "string",
      initialValue: "h1",
      options: { list: [...TITLE_SIZE_OPTIONS] },
      components: { input: createButtonSelectInput([...TITLE_SIZE_OPTIONS]) },
    }),
    defineField({
      name: "intro",
      title: "Intro (rich text)",
      type: "array",
      of: [
        defineArrayMember({
          type: "block",
          marks: { annotations: [{ type: "link" }] },
        }),
      ],
    }),
    defineField({
      name: "amountOptions",
      title: "Voorbeeldbedragen (euro, gehele getallen)",
      type: "array",
      of: [defineArrayMember({ type: "number" })],
      initialValue: [15, 25, 50, 75, 100, 150],
    }),
    defineField({
      name: "minAmountEuro",
      title: "Minimumbedrag (euro)",
      type: "number",
      initialValue: 5,
      validation: (Rule) => Rule.min(1).integer(),
    }),
    defineField({
      name: "maxAmountEuro",
      title: "Maximumbedrag (euro)",
      type: "number",
      initialValue: 500,
      validation: (Rule) => Rule.min(1).integer(),
    }),
    defineField({
      name: "section1Title",
      title: "Kop — stap 1 (waarde)",
      type: "string",
      initialValue: "1. Kies een waarde",
    }),
    defineField({
      name: "section2Title",
      title: "Kop — stap 2 (gegevens)",
      type: "string",
      initialValue: "2. Gegevens voor de digitale cadeaubon",
    }),
    defineField({
      name: "customAmountLabel",
      title: "Label eigen bedrag",
      type: "string",
      initialValue: "Of vul zelf een waarde in",
    }),
    defineField({
      name: "recipientNameLabel",
      title: "Label naam ontvanger",
      type: "string",
      initialValue: "Naam ontvanger",
    }),
    defineField({
      name: "recipientEmailLabel",
      title: "Label e-mail ontvanger",
      type: "string",
      initialValue: "Emailadres ontvanger",
    }),
    defineField({
      name: "messageLabel",
      title: "Label bericht",
      type: "string",
      initialValue: "Bericht",
    }),
    defineField({
      name: "senderNameLabel",
      title: "Label naam koper (optioneel)",
      type: "string",
      initialValue: "Je naam (optioneel)",
    }),
    defineField({
      name: "orderButtonLabel",
      title: "Bestelknop",
      type: "string",
      initialValue: "BESTEL",
    }),
  ],
  preview: {
    prepare() {
      return { title: "Cadeaubon (koop)" }
    },
  },
})

export const surfaces = ["page"] as const
