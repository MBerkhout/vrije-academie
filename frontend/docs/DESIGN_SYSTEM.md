# Vrije Academie Design System

Complete reference for design tokens, typography, spacing, and component usage.

## Color Palette

Tokens live in **`src/lib/va-colors.js`** and are wired into Tailwind as `va-*`. Each family has **50 → 950** (light → dark) plus **`DEFAULT`** (same hex as the legacy single token).

### Using shades in Tailwind

- **Default (brand)**: `bg-va-yellow`, `text-va-gold` — uses `DEFAULT`
- **Lighter / darker**: `hover:bg-va-yellow-600`, `border-va-gold-300`, `text-va-purple-800`
- **Opacity** (any color): `bg-va-black/80` — still works alongside numbered shades

### Primary neutrals (`DEFAULT` hex)

| Family | `DEFAULT` | Typical use |
|--------|-----------|-------------|
| `va-black` | `#1A1A1A` | Primary text, strong UI |
| `va-footer` | `#1E1E1E` | Footer background |
| `va-darkgray` | `#3D3D3D` | Secondary text |
| `va-gray` | `#888888` | Muted text, metadata |
| `va-lightgray` | `#F2F2F2` | Section fills, borders |
| `va-white` | `#FFFFFF` | Cards, panels |

### Accents (`DEFAULT` hex)

| Family | `DEFAULT` | Typical use |
|--------|-----------|-------------|
| `va-yellow` | `#fde600` | Primary CTAs, active nav |
| `va-gold` | `#B89400` | Links, decorative emphasis (same hue family as yellow) |
| `va-purple` | `#6B4FA0` | Badges, labels |
| `va-orange` | `#F08300` | Errors, warnings |
| `va-brown` | `#C0773A` | Warm accents, overlays |

### Usage rules

- Prefer **shade steps** for hovers/active (`-600`, `-700`) instead of swapping unrelated families.
- **Dev palette**: `/dev/components` lists full ramps (non-production only).

## Typography

Fonts load via **`next/font/google`** in `src/app/layout.tsx` (self-hosted at build time). CSS variable `--font-sans` is set on `<html>`; `body` uses `font-sans` by default.

### Font Families

| Tailwind | Font | Weights |
|----------|------|---------|
| `font-sans` | Source Sans 3 | 400, 600, 700 |
| `font-mono` | (not loaded) — Tailwind default `ui-monospace` stack | — |

### Type Scale

#### Page / Section Title
```tsx
<h1 className="font-sans text-3xl font-bold text-va-black leading-tight">
  Page Title
</h1>
```

#### Section Heading
```tsx
<h2 className="font-sans text-2xl font-semibold text-va-black">
  Section Heading
</h2>
```

#### Card Title
```tsx
<h3 className="font-sans text-base font-semibold text-va-black">
  Card Title
</h3>
```

#### Body Text
```tsx
<p className="font-sans text-sm text-va-darkgray leading-relaxed">
  Body text content
</p>
```

#### Muted Label / Metadata
```tsx
<span className="font-sans text-xs text-va-gray uppercase tracking-wide">
  Label Text
</span>
```

#### CTA Link with Gold Arrow
```tsx
<a className="font-sans text-sm font-semibold text-va-gold hover:underline">
  Bekijk meer →
</a>
```

## Spacing & Layout

### Page Wrapper
```tsx
<div className="max-w-6xl mx-auto px-4 md:px-8">
  {/* Content */}
</div>
```

### Section Spacing
```tsx
<section className="py-12 md:py-16">
  {/* Section content */}
</section>
```

### Content Grids

**3 Columns**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {/* Grid items */}
</div>
```

**2 Columns (Featured + Sidebar)**:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
  {/* Grid items */}
</div>
```

## Components

### Button

**Primary (Yellow)**:
```tsx
<Button variant="primary" href="/events">
  Klik hier voor deze reis
</Button>
```

**Secondary (Gold)**:
```tsx
<Button variant="secondary" href="/about">
  Meer informatie
</Button>
```

### Badge

Use `@/components/ui/Badge` everywhere so colors and spacing stay consistent.

**Legacy (uppercase, rounded-sm)** — marketing / dev library: `purple`, `yellow`, `gray`.

**Content (rounded-none)** — PDP, PLP chips, checkout:

| `variant` | Use case |
|-----------|----------|
| `category` | Category label (lightgray) |
| `record` | Record type (yellow, capitalized) |
| `online` | “Nu ook online” style (green) |
| `freeTrial` | Free trial row (yellow tint; supports icon + text as children) |
| `popular` | Small highlight (e.g. “Meest gekozen” on payment method) |

**Sizes**: `compact` (PLP chips), `sm` (PDP header row), `md` (booking panel), `micro` (tiny emphasis). Legacy variants default to `compact`.

**Purple Badge**:
```tsx
<Badge variant="purple">
  Exclusief in Amsterdam
</Badge>
```

**Yellow Badge**:
```tsx
<Badge variant="yellow">
  VAthuis · On demand
</Badge>
```

**PDP category / online**:
```tsx
<Badge variant="category" size="sm">{label}</Badge>
<Badge variant="online" size="sm">{text}</Badge>
```

### Card

```tsx
<Card
  title="Colleges 8 Planeten door Govert Schilling"
  image={imageAsset}
  description="Een reeks colleges over de planeten..."
  link="/events/planeten"
  linkText="Bekijk meer"
/>
```

### Navigation

**Header Navigation**:
- **Desktop (`md+`)**: Two columns — left, the VA monogram (or CMS logo) is fixed at 125px height, vertically centered; right, stacked rows: wordmark + utility links, gold rule, then primary nav and search. Implemented in `HeaderNav`.
- **Mobile**: Single branding row with icons, gold rule, optional quick bar, drawer for the main menu.

```tsx
<nav className="bg-white border-b border-va-lightgray">
  <div className="max-w-6xl mx-auto px-4 flex items-center gap-6 h-12">
    <a className="text-sm text-va-darkgray hover:text-va-black">
      Ons aanbod
    </a>
    {/* Active state */}
    <a className="text-sm font-semibold text-va-black border-b-2 border-va-yellow">
      Home
    </a>
  </div>
</nav>
```

### Section Header with Gold Link

```tsx
<div className="flex items-center justify-between mb-6">
  <h2 className="font-sans text-xl font-bold text-va-black">
    Collegereeksen
  </h2>
  <a className="text-xs font-semibold text-va-gold hover:underline tracking-wide uppercase">
    Bekijk in de zaal & online →
  </a>
</div>
```

## Design Principles

1. **Yellow is the single accent color** — Use sparingly for focus: one button, one underline, one arrow per view
2. **No gradients** — Flat color only. Visual richness comes from photography and typography
3. **No rounded corners** — Prefer square corners (`rounded-none`) on buttons, badges, cards, and image frames. Avoid pills and soft radii unless a legacy screen still requires them; the product detail page (PDP) is fully squared.
4. **Serif for headings, sans for everything else** — Never reverse this
5. **Images carry emotional weight** — UI chrome stays neutral and steps back
6. **Section backgrounds alternate** — Between `bg-white` and `bg-va-lightgray` to create rhythm without borders
7. **Links always use gold** — `text-va-gold` with arrow indicator (→) — never underlined by default, only on hover

## Responsive Breakpoints

- **Mobile**: Default (< 768px)
- **Tablet**: `md:` (768px+)
- **Desktop**: `lg:` (1024px+)

## Accessibility

- All images require alt text
- Color contrast meets WCAG AA standards
- Semantic HTML structure
- Keyboard navigation support
