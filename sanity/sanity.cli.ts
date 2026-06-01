import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || '',
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  server: {
    hostname: 'localhost',
    port: 3333,
  },
  project: {
    basePath: '/studio',
  },
})
