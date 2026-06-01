import { defineConfig } from "@medusajs/utils"

function requireEnv(name: string): string {
  const v = process.env[name]?.trim()
  if (!v) {
    throw new Error(`${name} must be set in the environment (no default URL).`)
  }
  return v
}

/** Used by the product admin widget to build "Open in Sanity" when GET omits `openInSanityUrl`. */
function adminSanityStudioBase(): string {
  const explicit = process.env.SANITY_STUDIO_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, "")
  const projectId = process.env.SANITY_PROJECT_ID?.trim()
  if (projectId) return `https://${projectId}.sanity.studio/studio`
  return ""
}

/** Used by admin widgets for "Open in Salesforce" when GET omits URL. */
function adminSalesforceInstanceBase(): string {
  const v = process.env.SALESFORCE_INSTANCE_URL?.trim()
  return v ? v.replace(/\/$/, "") : ""
}

const mollieOpts = {
  apiKey: process.env.MOLLIE_API_KEY ?? "",
  redirectUrl: process.env.MOLLIE_REDIRECT_URL ?? "http://localhost:3000/checkout/bevestiging",
  medusaUrl: requireEnv("MEDUSA_URL"),
}

export default defineConfig({
  modules: {
    ...(process.env.REDIS_URL
      ? {
          workflows: {
            resolve: "@medusajs/medusa/workflow-engine-redis",
            options: {
              redis: { url: process.env.REDIS_URL },
            },
          },
        }
      : {}),
    events: {
      resolve: "./src/modules/events",
    },
    catalog: {
      resolve: "./src/modules/catalog",
    },
    giftCard: {
      resolve: "./src/modules/gift-card",
    },
    people: {
      resolve: "./src/modules/people",
    },
    salesforceSync: {
      resolve: "./src/modules/salesforce-sync",
    },
    payment: {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@variablevic/mollie-payments-medusa/providers/mollie",
            id: "mollie",
            options: mollieOpts,
          },
        ],
      },
    },
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL || "postgresql://medusa:medusa@localhost:5432/medusa",

    redisUrl: process.env.REDIS_URL,

    jwtSecret: process.env.JWT_SECRET || "supersecret",
    cookieSecret: process.env.COOKIE_SECRET || "supersecret",

    adminCors: process.env.ADMIN_CORS || "http://localhost:7001,http://localhost:9000",
    // Include :3000 so Next.js storefront works without a custom .env in dev.
    storeCors: process.env.STORE_CORS || "http://localhost:3000,http://localhost:8000",
    authCors: process.env.AUTH_CORS || "http://localhost:7001,http://localhost:9000,http://localhost:3000",
  },
  admin: {
    path: "/app",
    // Do not spread `...config` here — mergeConfig would merge duplicate `plugins`
    // arrays and register @vitejs/plugin-react twice (duplicate React Refresh / inWebWorker).
    vite: (config) => ({
      define: {
        ...(config.define ?? {}),
        __MEDUSA_ADMIN_SANITY_STUDIO_BASE__: JSON.stringify(adminSanityStudioBase()),
        __MEDUSA_ADMIN_SALESFORCE_INSTANCE_BASE__: JSON.stringify(adminSalesforceInstanceBase()),
      },
    }),
  },
})
