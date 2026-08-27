import { defineConfig } from "sanity"
import { assist } from "@sanity/assist"
import { structureTool } from "sanity/structure"
import { structure } from "./src/structure"
import { presentationTool } from "sanity/presentation"
import { visionTool } from "@sanity/vision"
import { formSchema } from "@sanity/form-toolkit/form-schema"
import { hubSpotInput } from "@sanity/form-toolkit/hubspot"
import { schemaTypes } from "./src/schemas"
import { resolve } from "./src/presentation/resolve"
import { mirroredDocumentActions } from "./src/lib/mirrorActions"
import { redirectAwareDocumentActions } from "./src/lib/redirectActions"
import { PAGE_IN_FOLDER_TEMPLATE } from "./src/structure/page-tree"

const previewOrigin =
  process.env.SANITY_STUDIO_PREVIEW_URL || "https://v2.vrijeacademie.nl"
const hubspotApiUrl = `${previewOrigin}/api/hubspot`

export default defineConfig({
  name: "vrije-academie",
  title: "Vrije Academie CMS",

  projectId: process.env.SANITY_STUDIO_PROJECT_ID || "",
  dataset: process.env.SANITY_STUDIO_DATASET || "production",

  basePath: "/studio",

  plugins: [
    structureTool({ structure }),
    formSchema(),
    hubSpotInput({ url: hubspotApiUrl }),
    presentationTool({
      resolve,
      previewUrl: {
        origin: previewOrigin,
        draftMode: {
          enable: "/api/draft",
        },
      },
    }),
    visionTool(),
    assist(),
  ],

  schema: {
    types: schemaTypes,
    templates: (prev) => [
      ...prev,
      {
        id: PAGE_IN_FOLDER_TEMPLATE,
        title: "Page in folder",
        schemaType: "page",
        parameters: [
          { name: "isVaThuis", title: "VA Thuis page", type: "boolean" },
          { name: "slugPrefix", title: "Slug prefix", type: "string" },
        ],
        value: ({
          isVaThuis,
          slugPrefix,
        }: {
          isVaThuis?: boolean
          slugPrefix?: string
        }) => ({
          isVaThuis: isVaThuis ?? false,
          slug: { _type: "slug", current: slugPrefix ?? "" },
        }),
      },
    ],
  },

  document: {
    actions: (prev, context) =>
      redirectAwareDocumentActions(mirroredDocumentActions(prev, context), context),
    newDocumentOptions: (prev, { creationContext }) => {
      // Hide mirror types and contextual page templates from the global "Create new" menu
      const HIDDEN_GLOBAL_TEMPLATES = ["product", "category", "docent", PAGE_IN_FOLDER_TEMPLATE]
      if (creationContext.type === "global") {
        return prev.filter((item) => !HIDDEN_GLOBAL_TEMPLATES.includes(item.templateId))
      }
      return prev
    },
  },
})
