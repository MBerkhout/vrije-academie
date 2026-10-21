import { defineType, defineField } from "sanity"
import { createButtonSelectInput } from "../../components/ButtonSelectInput"
import { createLayoutField, type BlockLayoutDefaults } from "../../lib/blockFields"
import { portableText } from "../objects/portableText"
import { TITLE_SIZE_OPTIONS } from "../objects/mediaEnums"

const FORM_SOURCE_OPTIONS = [
  { title: "Sanity Form", value: "sanity" },
  { title: "HubSpot Form", value: "hubspot" },
] as const

export const formBlock = defineType({
  name: "formBlock",
  title: "Form",
  type: "object",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "style", title: "Style" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      group: "content",
    }),
    defineField({
      name: "titleSize",
      title: "Title Size",
      type: "string",
      group: "content",
      options: { list: [...TITLE_SIZE_OPTIONS] },
      initialValue: "h2",
      components: { input: createButtonSelectInput([...TITLE_SIZE_OPTIONS]) },
      hidden: ({ parent }) => !parent?.title,
    }),
    defineField({
      name: "introText",
      title: "Intro Text",
      type: "portableText",
      group: "content",
    }),
    defineField({
      name: "formSource",
      title: "Form Source",
      type: "string",
      group: "content",
      options: { list: [...FORM_SOURCE_OPTIONS] },
      initialValue: "sanity",
      components: { input: createButtonSelectInput([...FORM_SOURCE_OPTIONS]) },
    }),
    defineField({
      name: "form",
      title: "Form",
      type: "reference",
      to: [{ type: "form" }],
      group: "content",
      hidden: ({ parent }) => parent?.formSource !== "sanity",
      validation: (Rule) =>
        Rule.custom((form, ctx) => {
          const doc = ctx.document as { formSource?: string }
          if (doc?.formSource === "sanity" && !form) return "Selecteer een formulier."
          return true
        }),
    }),
    defineField({
      name: "hubSpotForm",
      title: "HubSpot Form",
      type: "hubSpotForm",
      group: "content",
      description: "Optioneel als je hieronder een form-ID invult.",
      hidden: ({ parent }) => parent?.formSource !== "hubspot",
      validation: (Rule) =>
        Rule.custom((val, ctx) => {
          const parent = ctx.parent as { formSource?: string; hubSpotFormId?: string }
          if (parent?.formSource !== "hubspot") return true
          if (parent.hubSpotFormId?.trim()) return true
          if (!val) return "Selecteer een HubSpot formulier of vul een form-ID in."
          return true
        }),
    }),
    defineField({
      name: "hubSpotFormId",
      title: "HubSpot form-ID",
      type: "string",
      group: "content",
      description:
        "Form GUID uit HubSpot (waarde van data-form-id in de embedcode). Heeft voorrang op de lijst hierboven.",
      hidden: ({ parent }) => parent?.formSource !== "hubspot",
      validation: (Rule) =>
        Rule.custom((val, ctx) => {
          const parent = ctx.parent as { formSource?: string; hubSpotForm?: string }
          if (parent?.formSource !== "hubspot") return true
          const trimmed = val?.trim()
          if (!trimmed) {
            if (parent.hubSpotForm) return true
            return "Vul een form-ID in of selecteer een formulier uit de lijst."
          }
          if (
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)
          ) {
            return "Form-ID moet een geldige HubSpot GUID zijn (bijv. baf56412-974b-48eb-aba4-f4c8f795fc75)."
          }
          return true
        }),
    }),
    defineField({
      name: "submitButtonLabel",
      title: "Submit Button Label",
      type: "string",
      group: "content",
      initialValue: "Versturen",
    }),
    defineField({
      name: "successMessage",
      title: "Success Message",
      type: "text",
      group: "content",
    }),
    defineField({
      name: "errorMessage",
      title: "Error Message",
      type: "text",
      group: "content",
    }),
    defineField({
      ...createLayoutField({ marginTop: "24", marginBottom: "24" } as BlockLayoutDefaults),
      group: "style",
    }),
  ],
  preview: {
    select: { title: "title", formSource: "formSource" },
    prepare({ title, formSource }) {
      return {
        title: title || "Form",
        subtitle: formSource === "hubspot" ? "HubSpot" : "Sanity",
      }
    },
  },
})
export const surfaces = ['page'] as const
