import { defineRouteConfig } from "@medusajs/admin-sdk"
import { GiftCards } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Label,
  Table,
} from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"

type GiftCardRow = {
  id: string
  code: string
  initial_value: number
  balance: number
  currency_code: string
  status: string
  recipient_name: string
  recipient_email: string
  sender_name: string | null
  message: string | null
  purchased_by_order_id: string | null
  expires_at: string | null
  created_at?: string
}

type GiftCardTx = {
  id: string
  type: string
  amount: number
  cart_id: string | null
  order_id: string | null
  note: string | null
  created_at?: string
}

function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`
  }
}

const GiftCardsPage = () => {
  const [rows, setRows] = useState<GiftCardRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [codeInput, setCodeInput] = useState("")
  const [emailInput, setEmailInput] = useState("")
  const [orderInput, setOrderInput] = useState("")
  const [applied, setApplied] = useState({ code: "", email: "", order_id: "" })
  const [offset, setOffset] = useState(0)
  const limit = 50

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailCard, setDetailCard] = useState<GiftCardRow | null>(null)
  const [detailTx, setDetailTx] = useState<GiftCardTx[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      })
      if (applied.code.trim()) params.set("code", applied.code.trim())
      if (applied.email.trim()) params.set("email", applied.email.trim())
      if (applied.order_id.trim()) params.set("order_id", applied.order_id.trim())

      const res = await fetch(`/admin/gift-cards?${params}`, { credentials: "include" })
      const data = await res.json()
      if (!res.ok) {
        setRows([])
        setTotal(0)
        return
      }
      setRows(data.gift_cards ?? [])
      setTotal(typeof data.count === "number" ? data.count : 0)
    } finally {
      setLoading(false)
    }
  }, [offset, applied])

  useEffect(() => {
    void load()
  }, [load])

  const openDetail = async (id: string) => {
    setDetailOpen(true)
    setDetailLoading(true)
    setDetailCard(null)
    setDetailTx([])
    try {
      const res = await fetch(`/admin/gift-cards/${id}`, { credentials: "include" })
      const data = await res.json()
      if (res.ok) {
        setDetailCard(data.gift_card ?? null)
        setDetailTx(data.transactions ?? [])
      }
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-6 px-6 py-4">
        <div>
          <Heading level="h1">Gift cards</Heading>
          <p className="text-ui-fg-subtle txt-compact-small mt-2">
            Digitale cadeaubonnen: saldo, ontvanger, aankooporder en transacties.
          </p>
        </div>

        <div className="flex flex-col gap-3 max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <Label size="xsmall">Code</Label>
              <Input
                placeholder="GIFT-…"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label size="xsmall">Recipient email</Label>
              <Input
                type="email"
                placeholder="exact match"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label size="xsmall">Purchase order id</Label>
              <Input
                placeholder="order_…"
                value={orderInput}
                onChange={(e) => setOrderInput(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="small"
              variant="primary"
              onClick={() => {
                setApplied({
                  code: codeInput,
                  email: emailInput,
                  order_id: orderInput,
                })
                setOffset(0)
              }}
            >
              Search
            </Button>
            <Button
              size="small"
              variant="secondary"
              onClick={() => {
                setCodeInput("")
                setEmailInput("")
                setOrderInput("")
                setApplied({ code: "", email: "", order_id: "" })
                setOffset(0)
              }}
            >
              Clear
            </Button>
          </div>
        </div>

        {loading ? (
          <span className="txt-compact-small">Loading…</span>
        ) : (
          <>
            <p className="txt-compact-small text-ui-fg-subtle">
              {total} card{total === 1 ? "" : "s"}
              {offset > 0 ? ` (offset ${offset})` : ""}
            </p>
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Code</Table.HeaderCell>
                  <Table.HeaderCell>Balance</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Recipient</Table.HeaderCell>
                  <Table.HeaderCell>Purchase order</Table.HeaderCell>
                  <Table.HeaderCell>Expires</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {rows.map((row) => (
                  <Table.Row
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => void openDetail(row.id)}
                  >
                    <Table.Cell className="font-mono txt-compact-small">{row.code}</Table.Cell>
                    <Table.Cell>
                      {formatMoney(row.balance, row.currency_code)}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge size="2xsmall" color="grey">
                        {row.status}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="txt-compact-small">
                        {row.recipient_name}
                        <br />
                        <span className="text-ui-fg-subtle">{row.recipient_email}</span>
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      {row.purchased_by_order_id ? (
                        <Link
                          className="text-ui-fg-interactive hover:underline txt-compact-small"
                          to={`/orders/${row.purchased_by_order_id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {row.purchased_by_order_id}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </Table.Cell>
                    <Table.Cell className="txt-compact-small">
                      {row.expires_at
                        ? new Date(row.expires_at).toLocaleDateString("nl-NL")
                        : "—"}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>

            <div className="flex gap-2">
              <Button
                size="small"
                variant="secondary"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                Previous
              </Button>
              <Button
                size="small"
                variant="secondary"
                disabled={offset + limit >= total}
                onClick={() => setOffset(offset + limit)}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </div>

      <Drawer open={detailOpen} onOpenChange={setDetailOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Gift card</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body>
            {detailLoading ? (
              <span className="txt-compact-small">Loading…</span>
            ) : detailCard ? (
              <div className="flex flex-col gap-4">
                <div className="grid gap-2 txt-compact-small">
                  <div>
                    <span className="text-ui-fg-subtle">Code</span>
                    <p className="font-mono">{detailCard.code}</p>
                  </div>
                  <div>
                    <span className="text-ui-fg-subtle">Balance / initial</span>
                    <p>
                      {formatMoney(detailCard.balance, detailCard.currency_code)} /{" "}
                      {formatMoney(detailCard.initial_value, detailCard.currency_code)}
                    </p>
                  </div>
                  <div>
                    <span className="text-ui-fg-subtle">Status</span>
                    <p>{detailCard.status}</p>
                  </div>
                  <div>
                    <span className="text-ui-fg-subtle">Recipient</span>
                    <p>
                      {detailCard.recipient_name} ({detailCard.recipient_email})
                    </p>
                  </div>
                  {detailCard.sender_name ? (
                    <div>
                      <span className="text-ui-fg-subtle">Sender</span>
                      <p>{detailCard.sender_name}</p>
                    </div>
                  ) : null}
                  {detailCard.message ? (
                    <div>
                      <span className="text-ui-fg-subtle">Message</span>
                      <p>{detailCard.message}</p>
                    </div>
                  ) : null}
                  {detailCard.purchased_by_order_id ? (
                    <div>
                      <span className="text-ui-fg-subtle">Purchase order</span>
                      <p>
                        <Link
                          className="text-ui-fg-interactive hover:underline"
                          to={`/orders/${detailCard.purchased_by_order_id}`}
                        >
                          {detailCard.purchased_by_order_id}
                        </Link>
                      </p>
                    </div>
                  ) : null}
                </div>

                <Heading level="h3">Transactions</Heading>
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell>Type</Table.HeaderCell>
                      <Table.HeaderCell>Amount</Table.HeaderCell>
                      <Table.HeaderCell>Order</Table.HeaderCell>
                      <Table.HeaderCell>Note</Table.HeaderCell>
                      <Table.HeaderCell>When</Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {detailTx.map((tx) => (
                      <Table.Row key={tx.id}>
                        <Table.Cell className="txt-compact-small">{tx.type}</Table.Cell>
                        <Table.Cell className="txt-compact-small">
                          {formatMoney(tx.amount, detailCard.currency_code)}
                        </Table.Cell>
                        <Table.Cell className="txt-compact-small">
                          {tx.order_id ? (
                            <Link
                              className="text-ui-fg-interactive hover:underline"
                              to={`/orders/${tx.order_id}`}
                            >
                              {tx.order_id}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </Table.Cell>
                        <Table.Cell className="txt-compact-small">{tx.note ?? "—"}</Table.Cell>
                        <Table.Cell className="txt-compact-small">
                          {tx.created_at
                            ? new Date(tx.created_at).toLocaleString("nl-NL")
                            : "—"}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>
            ) : (
              <span className="txt-compact-small">Could not load card.</span>
            )}
          </Drawer.Body>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Gift cards",
  icon: GiftCards,
  nested: "/orders",
  rank: 20,
})

export default GiftCardsPage
