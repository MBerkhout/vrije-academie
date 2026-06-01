import { Button, Container, Text, toast } from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

type OAuthStatus = {
  authMode: string | null
  jwtConfigured: boolean
  canConnectOAuth: boolean
  connected: boolean
  refreshTokenSource: "env" | "database" | null
  instanceUrl: string | null
  connectedAt: string | null
  clientIdPreview: string | null
  callbackUrl: string | null
  oauthScopes: string | null
  loginUrl: string
}

export function SalesforceOAuthPanel() {
  const [status, setStatus] = useState<OAuthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch("/admin/salesforce/oauth/status", { credentials: "include" })
      const json = (await res.json()) as OAuthStatus & { message?: string }
      if (!res.ok) {
        throw new Error(json.message ?? `OAuth status failed (${res.status})`)
      }
      setStatus(json)
    } catch (e) {
      setStatus(null)
      setLoadError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const params = new URLSearchParams(window.location.search)
    const oauth = params.get("oauth")
    if (oauth === "success") {
      toast.success("Salesforce connected")
      window.history.replaceState({}, "", window.location.pathname)
    } else if (oauth === "error" || oauth === "expired") {
      toast.error(oauth === "expired" ? "OAuth session expired — try again" : "Salesforce connection failed")
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [load])

  const connect = async () => {
    setConnecting(true)
    try {
      const res = await fetch("/admin/salesforce/oauth/start", {
        method: "POST",
        credentials: "include",
      })
      const json = (await res.json()) as { authorizeUrl?: string; message?: string }
      if (!res.ok || !json.authorizeUrl) {
        throw new Error(json.message ?? "Could not start OAuth")
      }
      window.location.href = json.authorizeUrl
    } catch (e) {
      toast.error((e as Error).message)
      setConnecting(false)
    }
  }

  const disconnect = async () => {
    if (!confirm("Remove the stored Salesforce refresh token from Medusa? (env SALESFORCE_REFRESH_TOKEN is unchanged.)")) {
      return
    }
    await fetch("/admin/salesforce/oauth/disconnect", { method: "POST", credentials: "include" })
    toast.success("Disconnected")
    await load()
  }

  if (loading) {
    return (
      <Container className="p-4 border border-ui-border-base rounded-lg">
        <Text size="small" weight="plus">
          Salesforce connection
        </Text>
        <Text size="small" className="text-ui-fg-subtle mt-2">
          Loading connection status…
        </Text>
      </Container>
    )
  }

  if (loadError || !status) {
    return (
      <Container className="p-4 flex flex-col gap-3 border border-ui-border-base rounded-lg">
        <Text size="small" weight="plus">
          Salesforce connection
        </Text>
        <Text size="small" className="text-ui-fg-error">
          {loadError ?? "Could not load connection status."}
        </Text>
        <Text size="small" className="text-ui-fg-subtle">
          Restart Medusa after code changes (`npm run dev`). Set `SALESFORCE_CLIENT_ID` and
          `SALESFORCE_CLIENT_SECRET` in `.env`. For a dev proxy, set `SALESFORCE_OAUTH_CALLBACK_URL`.
          Run `npx medusa db:migrate` if OAuth storage is new.
        </Text>
        <Button size="small" variant="secondary" onClick={() => void load()}>
          Retry
        </Button>
      </Container>
    )
  }

  if (status.jwtConfigured) {
    return (
      <Container className="p-4 flex flex-col gap-2 border border-ui-border-base rounded-lg">
        <Text size="small" weight="plus">
          Connection
        </Text>
        <Text size="small" className="text-ui-fg-subtle">
          JWT bearer auth is configured via environment variables. OAuth connect is not used.
        </Text>
      </Container>
    )
  }

  return (
    <Container className="p-4 flex flex-col gap-3 border border-ui-border-base rounded-lg">
      <div>
        <Text size="small" weight="plus">
          Salesforce connection
        </Text>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Connect with your Connected App (Consumer Key + Secret). The refresh token is stored in Medusa after you
          approve access in Salesforce.
        </Text>
      </div>

      <div className="txt-compact-small text-ui-fg-subtle flex flex-col gap-1">
        <span>
          Status:{" "}
          {status.connected ? (
            <span className="text-ui-fg-success">Connected</span>
          ) : (
            <span className="text-ui-fg-error">Not connected</span>
          )}
          {status.refreshTokenSource ? ` (${status.refreshTokenSource})` : null}
        </span>
        {status.clientIdPreview ? <span>Client ID: {status.clientIdPreview}</span> : null}
        <span>Login: {status.loginUrl}</span>
        {status.oauthScopes ? <span>Scopes: {status.oauthScopes}</span> : null}
        {status.instanceUrl ? <span>Instance: {status.instanceUrl}</span> : null}
        {status.connectedAt ? (
          <span>Connected at: {new Date(status.connectedAt).toLocaleString()}</span>
        ) : null}
      </div>

      {status.callbackUrl ? (
        <div className="rounded-md border border-ui-border-base p-3 txt-compact-small text-ui-fg-subtle">
          <Text size="small" weight="plus" className="mb-1">
            Connected App callback URL
          </Text>
          <code className="break-all">{status.callbackUrl}</code>
          <Text size="xsmall" className="mt-2">
            Add this exact URL under OAuth settings in Salesforce before connecting.
          </Text>
        </div>
      ) : (
        <Text size="small" className="text-ui-fg-error">
          Set MEDUSA_URL or SALESFORCE_OAUTH_CALLBACK_URL in env so the OAuth callback URL can be generated.
        </Text>
      )}

      <div className="flex gap-2 flex-wrap">
        {status.canConnectOAuth && status.callbackUrl ? (
          <Button size="small" variant="primary" onClick={() => void connect()} disabled={connecting}>
            {status.connected ? "Reconnect to Salesforce" : "Connect to Salesforce"}
          </Button>
        ) : null}
        {status.refreshTokenSource === "database" ? (
          <Button size="small" variant="secondary" onClick={() => void disconnect()}>
            Disconnect
          </Button>
        ) : null}
        <Button size="small" variant="transparent" onClick={() => void load()}>
          Refresh status
        </Button>
      </div>
    </Container>
  )
}
