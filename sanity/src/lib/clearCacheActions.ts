import { useCallback, useState } from "react"
import { ResetIcon } from "@sanity/icons"
import type { DocumentActionComponent, DocumentActionsContext } from "sanity"

export function pageStorefrontPath(slug: string | undefined): string | null {
  if (!slug) return null
  const trimmed = slug.trim()
  if (!trimmed) return null
  if (trimmed === "/") return "/"
  return `/${trimmed.replace(/^\/+/, "")}`
}

export function getStudioRevalidateConfig(): { origin: string; secret: string } {
  const origin = (
    process.env.SANITY_STUDIO_PREVIEW_URL || "https://v2.vrijeacademie.nl"
  )
    .trim()
    .replace(/\/$/, "")
  const secret = (process.env.SANITY_STUDIO_REVALIDATE_SECRET || "").trim()
  return { origin, secret }
}

export function buildClearPageCacheRequest(
  slug: string,
  config: { origin: string; secret: string },
): { url: string; headers: Record<string, string>; body: string } {
  return {
    url: `${config.origin}/api/revalidate/studio`,
    headers: {
      Authorization: `Bearer ${config.secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ _type: "page", slug }),
  }
}

const ClearPageCacheAction: DocumentActionComponent = (props) => {
  const { draft, published, onComplete } = props
  const [dialog, setDialog] = useState<"closed" | "confirm" | "result">("closed")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  const slug = (published ?? draft)?.slug?.current as string | undefined
  const path = pageStorefrontPath(slug)
  const config = getStudioRevalidateConfig()

  let disabledReason: string | undefined
  if (!slug || !path) disabledReason = "This page has no slug"
  else if (!config.secret) disabledReason = "Cache-clear secret is not configured"

  const close = useCallback(() => {
    if (busy) return
    setDialog("closed")
    setResult(null)
    onComplete()
  }, [busy, onComplete])

  const runClear = useCallback(async () => {
    if (!slug || !path || !config.secret) return
    setBusy(true)
    try {
      const request = buildClearPageCacheRequest(slug, config)
      const res = await fetch(request.url, {
        method: "POST",
        headers: request.headers,
        body: request.body,
      })
      const payload = (await res.json().catch(() => null)) as
        | { error?: string; path?: string }
        | null
      if (!res.ok) {
        throw new Error(payload?.error || `Request failed (${res.status})`)
      }
      setResult({ ok: true, text: `Cleared cache for ${payload?.path || path}.` })
    } catch (err) {
      setResult({
        ok: false,
        text: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setBusy(false)
      setDialog("result")
    }
  }, [config, path, slug])

  return {
    label: "Clear page cache",
    icon: ResetIcon,
    group: ["paneActions"],
    title: disabledReason ?? "Invalidate the cached website HTML for this page",
    disabled: Boolean(disabledReason) || busy,
    onHandle: () => setDialog("confirm"),
    dialog:
      dialog === "confirm"
        ? {
            type: "confirm",
            tone: "caution",
            confirmButtonText: "Clear cache",
            message: path
              ? `Clear the cached website HTML for ${path}? The next visitor gets a fresh version.`
              : "This page has no slug.",
            onCancel: close,
            onConfirm: () => {
              void runClear()
            },
          }
        : dialog === "result"
          ? {
              type: "dialog",
              header: result?.ok ? "Page cache cleared" : "Could not clear page cache",
              content: result?.text ?? "",
              onClose: close,
            }
          : false,
  }
}
ClearPageCacheAction.action = "clear-page-cache"

export function clearCacheDocumentActions(
  prev: DocumentActionComponent[],
  context: DocumentActionsContext,
): DocumentActionComponent[] {
  if (context.schemaType !== "page") return prev
  return [...prev, ClearPageCacheAction]
}
