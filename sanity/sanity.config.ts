import { defineConfig } from "sanity"
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

const previewOrigin = process.env.SANITY_STUDIO_PREVIEW_URL || "http://localhost:3000"
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
        origin: process.env.SANITY_STUDIO_PREVIEW_URL || "http://localhost:3000",
        draftMode: {
          enable: "/api/draft",
        },
      },
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },

  document: {
    actions: (prev, context) =>
      redirectAwareDocumentActions(mirroredDocumentActions(prev, context), context),
    newDocumentOptions: (prev, { creationContext }) => {
      // Hide mirror types from the "Create new" menu
      const MIRROR = ["product", "category", "docent"]
      if (creationContext.type === "global") {
        return prev.filter((item) => !MIRROR.includes(item.templateId))
      }
      return prev
    },
  },
})
