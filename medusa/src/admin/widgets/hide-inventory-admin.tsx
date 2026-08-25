/**
 * Hides built-in Medusa inventory UI across the admin.
 * Capacity is managed via EventItem.available_quantity in product-variant-widget.tsx.
 *
 * Only hide inventory *items* (nav links, product cards). Never hide layout chrome:
 * the sidebar shell uses `border-e` / `rounded-lg`, which used to match a broad closest().
 */
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"

const STYLE_ID = "va-hide-inventory-admin"
const HIDDEN_ATTR = "data-va-inventory-hidden"

const CSS = `
  a[href^="/app/inventory"],
  a[href^="/app/reservations"],
  a[href^="/app/settings/locations"],
  a[href$="/stock"],
  a[href*="/stock?"] {
    display: none !important;
  }
`

const INVENTORY_HEADING_RE =
  /^(inventory(\s+items)?|manage inventory|edit stock|stock locations?|voorraad(\s+items)?|voorraadbeheer)$/i

const MANAGE_INVENTORY_LABEL_RE = /^(manage inventory|voorraadbeheer)$/i

const CORE_NAV_SELECTOR = [
  'a[href^="/app/orders"]',
  'a[href^="/app/products"]',
  'a[href^="/app/customers"]',
  'a[href^="/app/promotions"]',
  'a[href^="/app/price-lists"]',
].join(", ")

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim()
}

function classNameOf(element: HTMLElement): string {
  return typeof element.className === "string" ? element.className : ""
}

function isLayoutChrome(element: HTMLElement): boolean {
  if (/^(ASIDE|NAV|BODY|HTML|MAIN)$/.test(element.tagName)) {
    return true
  }

  const className = classNameOf(element)
  if (
    className.includes("h-screen") ||
    className.includes("border-e") ||
    className.includes("max-w-[304px]")
  ) {
    return true
  }

  return Boolean(element.querySelector(CORE_NAV_SELECTOR))
}

function hideElement(element: HTMLElement) {
  if (element.getAttribute(HIDDEN_ATTR) === "true") {
    return
  }

  if (isLayoutChrome(element)) {
    return
  }

  element.setAttribute(HIDDEN_ATTR, "true")
  element.style.setProperty("display", "none", "important")
}

function hideClosestInteractiveParent(element: HTMLElement) {
  const parent = element.closest(
    'button, [role="button"], [role="menuitem"], li, tr, td, th, label, div.px-3'
  )

  const target = parent instanceof HTMLElement ? parent : element
  hideElement(target)
  if (target !== element) {
    hideElement(element)
  }
}

function hideInventoryLinks(root: ParentNode) {
  const selectors = [
    'a[href^="/app/inventory"]',
    'a[href*="/inventory/"]',
    'a[href^="/app/reservations"]',
    'a[href^="/app/settings/locations"]',
    'a[href$="/stock"]',
    'a[href*="/stock?"]',
  ]

  for (const selector of selectors) {
    root.querySelectorAll<HTMLElement>(selector).forEach((link) => {
      hideClosestInteractiveParent(link)
    })
  }
}

function headingCandidates(root: ParentNode): HTMLElement[] {
  const matches = Array.from(
    root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, label, span, p, button")
  )

  if (
    root instanceof HTMLElement &&
    /^(H1|H2|H3|H4|LABEL|SPAN|P|BUTTON)$/.test(root.tagName)
  ) {
    return [root, ...matches]
  }

  return matches
}

function hideInventorySections(root: ParentNode) {
  for (const node of headingCandidates(root)) {
    const text = normalizeText(node.textContent)
    if (!text || !INVENTORY_HEADING_RE.test(text)) {
      continue
    }

    const section = node.closest("section, article, div.shadow-elevation-card-rest")
    if (section instanceof HTMLElement && !isLayoutChrome(section)) {
      hideElement(section)
      continue
    }

    const navItem = node.closest("div.px-3")
    if (navItem instanceof HTMLElement && !isLayoutChrome(navItem)) {
      hideElement(navItem)
      continue
    }

    hideElement(node)
  }
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
  root.querySelectorAll<HTMLElement>("label, span, p, button").forEach((node) => {
    const text = normalizeText(node.textContent)
    if (!text || !MANAGE_INVENTORY_LABEL_RE.test(text)) {
      return
    }

    const row = node.closest(
      'label, [class*="Switch"], [class*="switch"], [class*="Field"], [class*="field"]'
    )

    if (row instanceof HTMLElement && !isLayoutChrome(row)) {
      hideElement(row)
      return
    }

    hideElement(node)
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
