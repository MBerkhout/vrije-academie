import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || '',
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  // Required for `sanity deploy --yes` (CI). Defaults to project ID → https://<id>.sanity.studio
  studioHost:
    process.env.SANITY_STUDIO_HOSTNAME || process.env.SANITY_STUDIO_PROJECT_ID || undefined,
  server: {
    hostname: 'localhost',
    port: 3333,
  },
  project: {
    basePath: '/studio',
  },
})
