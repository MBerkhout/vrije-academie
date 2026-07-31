/**
 * Optional webhook to bust Next.js hard cache for default `/ons-aanbod`.
 * Set STOREFRONT_REVALIDATE_PLP_URL + STOREFRONT_REVALIDATE_SECRET in Medusa `.env`.
 */
export async function revalidateStorefrontPlpCache(): Promise<void> {
  const url = process.env.STOREFRONT_REVALIDATE_PLP_URL?.trim()
  const secret = process.env.STOREFRONT_REVALIDATE_SECRET?.trim()
  if (!url || !secret) return

  try {
    await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    /* non-blocking */
  }
}
