const { createIncrementalCacheHandler } = require('@leejpsd/nextjs-cache-handler/incremental')

/** Shared Next.js data cache (unstable_cache, ISR). Prefix avoids Medusa `store:*` keys. */
module.exports = createIncrementalCacheHandler({
  client: { type: 'redis', url: process.env.REDIS_URL },
  keyPrefix: 'next:storefront:',
  buildNamespace: () =>
    process.env.DEPLOYMENT_VERSION?.trim() ||
    process.env.GIT_COMMIT?.trim() ||
    'dev',
})
