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
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plp: true, agenda: true }),
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    /* non-blocking */
  }
}

/** Bust Next.js `unstable_cache` entries for PDP Medusa fetches (`pdp:{handle}` tags). */
export async function revalidateStorefrontPdpHandles(handles: string[]): Promise<void> {
  const url = process.env.STOREFRONT_REVALIDATE_PLP_URL?.trim()
  const secret = process.env.STOREFRONT_REVALIDATE_SECRET?.trim()
  const unique = [...new Set(handles.map((h) => h.trim()).filter(Boolean))]
  if (!url || !secret || unique.length === 0) return

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pdpHandles: unique, plp: false, agenda: false }),
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    /* non-blocking */
  }
}
