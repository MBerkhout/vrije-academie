import { useCallback, useState } from "react"
import { TrashIcon } from "@sanity/icons"
import { Box, Button, Dialog, Flex, Stack, Text, TextInput } from "@sanity/ui"
import type { DocumentActionComponent, DocumentActionsContext } from "sanity"
import { useClient, useDocumentOperation } from "sanity"

function pageSourcePath(slug: string | undefined): string | null {
  if (!slug) return null
  return slug === "/" ? "/" : `/${slug}`
}

const DeleteWithRedirectAction: DocumentActionComponent = (props) => {
  const { id, type, draft, published, onComplete } = props
  const client = useClient({ apiVersion: "2024-01-01" })
  const { delete: deleteOp } = useDocumentOperation(id, type)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [destination, setDestination] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const source = pageSourcePath((draft ?? published)?.slug?.current as string | undefined)

  const closeDialog = useCallback(() => {
    if (busy) return
    setDialogOpen(false)
    setDestination("")
    setError(null)
  }, [busy])

  const runDelete = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      await deleteOp.execute()
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete page")
      setBusy(false)
    }
  }, [deleteOp, onComplete])

  const createRedirectAndDelete = useCallback(async () => {
    const target = destination.trim()
    if (!target) {
      setError("Enter a redirect destination or choose Delete without redirect")
      return
    }
    if (!source) {
      setError("This page has no slug; delete it without a redirect")
      return
    }

    setBusy(true)
    setError(null)
    try {
      await client.create({
        _type: "redirect",
        source,
        destinationType: "url",
        destinationUrl: target,
        permanent: true,
        enabled: true,
      })
      await deleteOp.execute()
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create redirect")
      setBusy(false)
    }
  }, [client, deleteOp, destination, onComplete, source])

  return {
    label: "Delete",
    icon: TrashIcon,
    tone: "critical",
    disabled: deleteOp.disabled,
    onHandle: () => setDialogOpen(true),
    dialog: dialogOpen && {
      type: "dialog",
      onClose: closeDialog,
      header: "Delete page",
      content: (
        <Box padding={4}>
          <Stack space={4}>
            <Text size={1} muted>
              {source
                ? `Visitors to ${source} can be redirected before this page is removed.`
                : "This page has no slug. You can only delete it without creating a redirect."}
            </Text>
            {source ? (
              <TextInput
                value={destination}
                placeholder="/new-page or https://example.com"
                onChange={(event) => setDestination(event.currentTarget.value)}
                disabled={busy}
              />
            ) : null}
            {error ? (
              <Text size={1} style={{ color: "var(--card-badge-critical-fg-color)" }}>
                {error}
              </Text>
            ) : null}
            <Flex gap={2} justify="flex-end">
              <Button mode="ghost" text="Cancel" onClick={closeDialog} disabled={busy} />
              <Button
                mode="ghost"
                tone="critical"
                text="Delete without redirect"
                onClick={runDelete}
                disabled={busy}
              />
              {source ? (
                <Button
                  tone="primary"
                  text="Create redirect & delete"
                  onClick={createRedirectAndDelete}
                  disabled={busy}
                />
              ) : null}
            </Flex>
          </Stack>
        </Box>
      ),
    },
  }
}
DeleteWithRedirectAction.action = "delete"

export function redirectAwareDocumentActions(
  prev: DocumentActionComponent[],
  context: DocumentActionsContext
): DocumentActionComponent[] {
  if (context.schemaType !== "page") return prev

  return prev.map((action) => {
    if (action.action === "delete") return DeleteWithRedirectAction
    return action
  })
}
