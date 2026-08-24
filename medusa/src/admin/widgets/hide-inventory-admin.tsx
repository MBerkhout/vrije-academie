/**
 * Hides built-in Medusa inventory UI across the admin.
 * Capacity is managed via EventItem.available_quantity in product-variant-widget.tsx.
 */
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"

const STYLE_ID = "va-hide-inventory-admin"
const HIDDEN_ATTR = "data-va-inventory-hidden"

const CSS = `
  a[href^="/app/inventory"],
  a[href^="/app/reservations"],
  a[href^="/app/settings/locations"],
  a[href*="/stock"] {
    display: none !important;
  }
`

const INVENTORY_HEADING_RE =
  /^(inventory(\s+items)?|manage inventory|edit stock|stock|reservations?|locations?|stock locations?|voorraad(\s+items)?|voorraadbeheer|locaties?)$/i

const MANAGE_INVENTORY_LABEL_RE = /manage inventory|voorraadbeheer/i

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim()
}

function hideElement(element: HTMLElement) {
  if (element.getAttribute(HIDDEN_ATTR) === "true") {
    return
  }

  element.setAttribute(HIDDEN_ATTR, "true")
  element.style.setProperty("display", "none", "important")
}

function hideClosestInteractiveParent(element: HTMLElement) {
  const parent = element.closest(
    'button, [role="button"], [role="menuitem"], li, tr, td, th, label, div[class*="Container"]'
  )

  hideElement(parent instanceof HTMLElement ? parent : element)
}

function hideInventoryLinks(root: ParentNode) {
  const selectors = [
    'a[href^="/app/inventory"]',
    'a[href*="/inventory/"]',
    'a[href^="/app/reservations"]',
    'a[href^="/app/settings/locations"]',
    'a[href*="/stock"]',
  ]

  for (const selector of selectors) {
    root.querySelectorAll<HTMLElement>(selector).forEach((link) => {
      hideElement(link)
      hideClosestInteractiveParent(link)
    })
  }
}

function hideInventorySections(root: ParentNode) {
  root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, label, span, p, div").forEach((node) => {
    const text = normalizeText(node.textContent)
    if (!text || !INVENTORY_HEADING_RE.test(text)) {
      return
    }

    const section = node.closest(
      'section, article, [class*="Container"], [class*="container"], div[class*="rounded"], div[class*="border"]'
    )

    if (section instanceof HTMLElement) {
      hideElement(section)
    }
  })
}

function hideInventoryTableColumns(root: ParentNode) {
  root.querySelectorAll<HTMLTableCellElement>("th").forEach((header) => {
    const text = normalizeText(header.textContent)
    if (!/^inventory$/i.test(text) && text.toLowerCase() !== "voorraad") {
      return
    }

    hideElement(header)

    const table = header.closest("table")
    if (!table) {
      return
    }

    const columnIndex = Array.from(header.parentElement?.children ?? []).indexOf(header)
    if (columnIndex < 0) {
      return
    }

    table.querySelectorAll("tr").forEach((row) => {
      const cell = row.children.item(columnIndex)
      if (cell instanceof HTMLElement) {
        hideElement(cell)
      }
    })
  })
}

function hideManageInventoryControls(root: ParentNode) {
  root.querySelectorAll<HTMLElement>("label, span, p, div, button").forEach((node) => {
    const text = normalizeText(node.textContent)
    if (!text || !MANAGE_INVENTORY_LABEL_RE.test(text)) {
      return
    }

    const row = node.closest(
      'label, [class*="Switch"], [class*="switch"], [class*="Field"], [class*="field"], div[class*="flex"], li'
    )

    if (row instanceof HTMLElement) {
      hideElement(row)
    }
  })
}

function hideManageInventoryFilters(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[class*="Filter"], [class*="filter"], button, label, span').forEach(
    (node) => {
      const text = normalizeText(node.textContent)
      if (!text || !MANAGE_INVENTORY_LABEL_RE.test(text)) {
        return
      }

      hideElement(node)
    }
  )
}

function applyInventoryHiding(root: ParentNode = document) {
  hideInventoryLinks(root)
  hideInventorySections(root)
  hideInventoryTableColumns(root)
  hideManageInventoryControls(root)
  hideManageInventoryFilters(root)
}

function ensureStyleTag() {
  if (document.getElementById(STYLE_ID)) {
    return
  }

  const style = document.createElement("style")
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.appendChild(style)
}

const HideInventoryAdmin = () => {
  useEffect(() => {
    ensureStyleTag()
    applyInventoryHiding()

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            applyInventoryHiding(node)
          }
        })
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
    }
  }, [])

  return null
}

export const config = defineWidgetConfig({
  zone: [
    "login.after",
    "order.list.before",
    "product.list.before",
    "product.details.before",
    "product_variant.details.before",
    "customer.list.before",
  ],
})

export default HideInventoryAdmin
