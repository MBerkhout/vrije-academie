import {
  Badge,
  Button,
  Drawer,
  Heading,
  Input,
  Label,
  Text,
} from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

type AuthStatus = {
  email: string
  hasPassword: boolean
}

type OtpResult = {
  code: string
  expires_at: string
}

function formatExpiry(iso: string): string {
  try {
    return new Intl.DateTimeFormat("nl-NL", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

function SecretReveal(props: {
  label: string
  value: string
  hint?: string
}) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    const ok = await copyText(props.value)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
      <Text size="small" weight="plus">
        {props.label}
      </Text>
      <div className="flex items-center gap-2">
        <code className="txt-compact-large font-mono tracking-widest">{props.value}</code>
        <Button size="small" variant="secondary" type="button" onClick={() => void onCopy()}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {props.hint ? (
        <Text size="xsmall" className="text-ui-fg-subtle">
          {props.hint}
        </Text>
      ) : null}
    </div>
  )
}

export function CustomerAuthPanel(props: { customerId: string }) {
  const { customerId } = props
  const [status, setStatus] = useState<AuthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [otpBusy, setOtpBusy] = useState(false)
  const [otpResult, setOtpResult] = useState<OtpResult | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetMode, setResetMode] = useState<"temporary" | "custom">("temporary")
  const [customPassword, setCustomPassword] = useState("")
  const [resetBusy, setResetBusy] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetResult, setResetResult] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/admin/customer-auth/${customerId}`, {
        credentials: "include",
      })
      const json = (await res.json()) as AuthStatus & { message?: string }
      if (!res.ok) {
        setStatus(null)
        setError(json.message ?? "Could not load auth status")
        return
      }
      setStatus({ email: json.email, hasPassword: json.hasPassword })
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    void load()
  }, [load])

  const generateOtp = async () => {
    setOtpBusy(true)
    setError(null)
    try {
      const res = await fetch(`/admin/customer-auth/${customerId}/otp`, {
        method: "POST",
        credentials: "include",
      })
      const json = (await res.json()) as OtpResult & { message?: string }
      if (!res.ok) {
        setOtpResult(null)
        setError(json.message ?? "Could not generate verification code")
        return
      }
      setOtpResult({ code: json.code, expires_at: json.expires_at })
    } finally {
      setOtpBusy(false)
    }
  }

  const openReset = () => {
    setResetMode("temporary")
    setCustomPassword("")
    setResetError(null)
    setResetResult(null)
    setResetOpen(true)
  }

  const closeReset = () => {
    setResetOpen(false)
    setCustomPassword("")
    setResetError(null)
    setResetResult(null)
  }

  const submitReset = async () => {
    setResetBusy(true)
    setResetError(null)
    try {
      const body =
        resetMode === "custom" && customPassword.trim()
          ? { password: customPassword.trim() }
          : {}

      const res = await fetch(`/admin/customer-auth/${customerId}/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = (await res.json()) as { password?: string; message?: string }
      if (!res.ok) {
        setResetResult(null)
        setResetError(json.message ?? "Could not reset password")
        return
      }
      setResetResult(json.password ?? null)
      void load()
    } finally {
      setResetBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Heading level="h2">Account access</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Generate a one-time login code or reset the customer password for support.
        </Text>
      </div>

      {loading ? (
        <Text size="small">Loading…</Text>
      ) : error && !status ? (
        <Text size="small" className="text-ui-fg-error">
          {error}
        </Text>
      ) : status ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Text size="small">{status.email}</Text>
            <Badge color={status.hasPassword ? "green" : "orange"} size="2xsmall">
              {status.hasPassword ? "Has password" : "No password"}
            </Badge>
          </div>

          {error ? (
            <Text size="small" className="text-ui-fg-error">
              {error}
            </Text>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              size="small"
              variant="secondary"
              type="button"
              disabled={otpBusy}
              onClick={() => void generateOtp()}
            >
              {otpBusy ? "Generating…" : "Generate verification code"}
            </Button>
            <Button size="small" variant="secondary" type="button" onClick={openReset}>
              Reset password
            </Button>
          </div>

          {otpResult ? (
            <SecretReveal
              label="One-time login code"
              value={otpResult.code}
              hint={`Valid until ${formatExpiry(otpResult.expires_at)}. Share this code with the customer for OTP login on the storefront. Not emailed.`}
            />
          ) : null}
        </>
      ) : null}

      <Drawer open={resetOpen} onOpenChange={(open) => !open && closeReset()}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Reset password</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body>
            <div className="flex flex-col gap-4">
              <Text size="small" className="text-ui-fg-subtle">
                The new password is shown once after reset. Share it securely with the customer.
              </Text>

              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reset-mode"
                    checked={resetMode === "temporary"}
                    onChange={() => setResetMode("temporary")}
                  />
                  <Text size="small">Generate temporary password</Text>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reset-mode"
                    checked={resetMode === "custom"}
                    onChange={() => setResetMode("custom")}
                  />
                  <Text size="small">Set custom password</Text>
                </label>
              </div>

              {resetMode === "custom" ? (
                <div className="flex flex-col gap-2">
                  <Label size="xsmall">New password (min. 8 characters)</Label>
                  <Input
                    type="password"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              ) : null}

              {resetError ? (
                <Text size="small" className="text-ui-fg-error">
                  {resetError}
                </Text>
              ) : null}

              {resetResult ? (
                <SecretReveal
                  label="New password"
                  value={resetResult}
                  hint="Copy this password now. It will not be shown again."
                />
              ) : null}

              <div className="flex gap-2">
                {!resetResult ? (
                  <Button
                    size="small"
                    variant="primary"
                    type="button"
                    disabled={
                      resetBusy ||
                      (resetMode === "custom" && customPassword.trim().length < 8)
                    }
                    onClick={() => void submitReset()}
                  >
                    {resetBusy ? "Resetting…" : "Confirm reset"}
                  </Button>
                ) : (
                  <Button size="small" variant="secondary" type="button" onClick={closeReset}>
                    Close
                  </Button>
                )}
              </div>
            </div>
          </Drawer.Body>
        </Drawer.Content>
      </Drawer>
    </div>
  )
}
