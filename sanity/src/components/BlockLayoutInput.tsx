import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { Flex, Stack, Text, TextInput } from "@sanity/ui"
import { set } from "sanity"
import type { ObjectInputProps } from "sanity"

// Brand colors from the Vrije Academie design system
const C = {
  yellow: "#F5C800",
  gold: "#D4AF37",
  black: "#1A1A1A",
  darkgray: "#3D3D3D",
  gray: "#888888",
  lightgray: "#F2F2F2",
  white: "#FFFFFF",
  border: "#E0E0E0",
  bgSection: "#FAFAFA",
}

const SPACING_OPTIONS = [
  { label: "0", value: "0" },
  { label: "8", value: "8" },
  { label: "16", value: "16" },
  { label: "24", value: "24" },
  { label: "32", value: "32" },
  { label: "48", value: "48" },
  { label: "64", value: "64" },
  { label: "Custom", value: "custom" },
]

const BACKGROUND_OPTIONS = [
  { label: "None", value: "none", hex: "transparent", border: C.border },
  { label: "Light Gray", value: "va-lightgray", hex: "#F2F2F2", border: "#C8C8C8" },
  { label: "White", value: "va-white", hex: "#FFFFFF", border: C.border },
  { label: "Black", value: "va-black", hex: "#1A1A1A", border: "#1A1A1A" },
]

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <Text size={1} weight="semibold" style={{ color: C.black, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {children}
      </Text>
    </div>
  )
}

function RowLabel({ children }: { children: ReactNode }) {
  return (
    <Text size={1} style={{ color: C.gray, marginBottom: 6, display: "block" }}>
      {children}
    </Text>
  )
}

function SpacingRow({
  label,
  value,
  customValue,
  onChange,
  onCustomChange,
}: {
  label: string
  value: string
  customValue?: number
  onChange: (v: string) => void
  onCustomChange: (v: number | undefined) => void
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <RowLabel>{label}</RowLabel>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {SPACING_OPTIONS.map((opt) => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                border: `1.5px solid ${active ? C.black : C.border}`,
                background: active ? C.yellow : C.white,
                color: C.black,
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.12s",
                lineHeight: "1.4",
                fontFamily: "inherit",
              }}
            >
              {opt.value === "custom" ? "Custom" : `${opt.label}px`}
            </button>
          )
        })}
      </div>
      {value === "custom" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <Text size={1} style={{ color: C.gray }}>Custom value (px):</Text>
          <TextInput
            type="number"
            value={customValue ?? ""}
            onChange={(e) => {
              const v = e.currentTarget.value
              onCustomChange(v ? parseInt(v, 10) : undefined)
            }}
            style={{ width: 80 }}
          />
        </div>
      )}
    </div>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: C.bgSection,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        padding: "14px 16px",
      }}
    >
      {children}
    </div>
  )
}

function WidthCard({
  type,
  selected,
  onClick,
}: {
  type: "full" | "container"
  selected: boolean
  onClick: () => void
}) {
  const isFull = type === "full"
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        background: selected ? "#FFFBE6" : C.white,
        border: `2px solid ${selected ? C.yellow : C.border}`,
        borderRadius: 6,
        padding: "10px 10px 8px",
        cursor: "pointer",
        textAlign: "center",
        transition: "all 0.12s",
      }}
    >
      {/* Illustration */}
      <div
        style={{
          background: C.lightgray,
          borderRadius: 4,
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 8px",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            height: 16,
            borderRadius: 3,
            background: selected ? C.yellow : "#C8C8C8",
            width: isFull ? "100%" : "55%",
            transition: "background 0.12s",
          }}
        />
      </div>
      <Text size={1} weight={selected ? "semibold" : "regular"} style={{ color: C.black, display: "block" }}>
        {isFull ? "Full width" : "Container"}
      </Text>
      <Text size={0} style={{ color: C.gray, display: "block", marginTop: 2 }}>
        {isFull ? "Edge to edge" : "Max width, centered"}
      </Text>
    </button>
  )
}

export function BlockLayoutInput(props: ObjectInputProps) {
  const { value, onChange } = props
  const layout = (value || {}) as {
    marginTop?: string
    marginTopCustom?: number
    marginBottom?: string
    marginBottomCustom?: number
    paddingTop?: string
    paddingTopCustom?: number
    paddingBottom?: string
    paddingBottomCustom?: number
    width?: string
    backgroundColor?: string
    htmlAnchor?: string
  }

  const update = useCallback(
    (updates: Record<string, unknown>) => {
      onChange(set({ ...layout, ...updates }))
    },
    [onChange, layout]
  )

  const knownBgValues = BACKGROUND_OPTIONS.map((o) => o.value)
  const isCustomBg =
    !!layout.backgroundColor &&
    !knownBgValues.includes(layout.backgroundColor)

  // Local state for the color picker — only commits to Sanity on picker close
  const [localColor, setLocalColor] = useState(
    isCustomBg ? (layout.backgroundColor ?? "#ffffff") : "#ffffff"
  )
  const colorInputRef = useRef<HTMLInputElement>(null)
  const updateRef = useRef(update)
  updateRef.current = update

  useEffect(() => {
    const el = colorInputRef.current
    if (!el) return
    const onClose = (e: Event) => {
      updateRef.current({ backgroundColor: (e.target as HTMLInputElement).value })
    }
    el.addEventListener("change", onClose)
    return () => el.removeEventListener("change", onClose)
  }, [])

  return (
    <Stack space={3}>
      {/* Margin */}
      <Section>
        <SectionLabel>Margin</SectionLabel>
        <SpacingRow
          label="Top"
          value={layout.marginTop ?? "0"}
          customValue={layout.marginTopCustom}
          onChange={(v) => update({ marginTop: v })}
          onCustomChange={(v) => update({ marginTopCustom: v })}
        />
        <SpacingRow
          label="Bottom"
          value={layout.marginBottom ?? "0"}
          customValue={layout.marginBottomCustom}
          onChange={(v) => update({ marginBottom: v })}
          onCustomChange={(v) => update({ marginBottomCustom: v })}
        />
      </Section>

      {/* Padding */}
      <Section>
        <SectionLabel>Padding</SectionLabel>
        <SpacingRow
          label="Top"
          value={layout.paddingTop ?? "0"}
          customValue={layout.paddingTopCustom}
          onChange={(v) => update({ paddingTop: v })}
          onCustomChange={(v) => update({ paddingTopCustom: v })}
        />
        <SpacingRow
          label="Bottom"
          value={layout.paddingBottom ?? "0"}
          customValue={layout.paddingBottomCustom}
          onChange={(v) => update({ paddingBottom: v })}
          onCustomChange={(v) => update({ paddingBottomCustom: v })}
        />
      </Section>

      {/* Width */}
      <Section>
        <SectionLabel>Width</SectionLabel>
        <div style={{ display: "flex", gap: 8 }}>
          <WidthCard
            type="full"
            selected={layout.width === "full"}
            onClick={() => update({ width: "full" })}
          />
          <WidthCard
            type="container"
            selected={layout.width !== "full"}
            onClick={() => update({ width: "container" })}
          />
        </div>
      </Section>

      {/* In-page link target */}
      <Section>
        <SectionLabel>Section ID (in-page link)</SectionLabel>
        <RowLabel>
          Optional. Same value as “Link target” in an In-page navigation block on this page (no #). Example: over-ons
        </RowLabel>
        <TextInput
          value={layout.htmlAnchor ?? ""}
          onChange={(e) => update({ htmlAnchor: e.currentTarget.value || undefined })}
          placeholder="e.g. over-ons"
          style={{ maxWidth: 400 }}
        />
      </Section>

      {/* Background */}
      <Section>
        <SectionLabel>Background</SectionLabel>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {BACKGROUND_OPTIONS.map((opt) => {
            const active = layout.backgroundColor === opt.value
            const isNone = opt.value === "none"
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => update({ backgroundColor: opt.value })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "5px 10px 5px 6px",
                  borderRadius: 5,
                  border: `1.5px solid ${active ? C.black : C.border}`,
                  background: active ? "#FFFBE6" : C.white,
                  cursor: "pointer",
                  fontWeight: active ? 600 : 400,
                  transition: "all 0.12s",
                  fontFamily: "inherit",
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 3,
                    background: isNone ? "transparent" : opt.hex,
                    border: `1px solid ${opt.border}`,
                    flexShrink: 0,
                    backgroundImage: isNone
                      ? "repeating-linear-gradient(45deg, #e0e0e0 0, #e0e0e0 1px, transparent 0, transparent 50%)"
                      : undefined,
                    backgroundSize: isNone ? "4px 4px" : undefined,
                  }}
                />
                <Text size={1} style={{ color: C.black }}>
                  {opt.label}
                </Text>
              </button>
            )
          })}

          {/* Custom color picker */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "5px 10px 5px 6px",
              borderRadius: 5,
              border: `1.5px solid ${isCustomBg ? C.black : C.border}`,
              background: isCustomBg ? "#FFFBE6" : C.white,
              cursor: "pointer",
              fontWeight: isCustomBg ? 600 : 400,
              transition: "all 0.12s",
              fontFamily: "inherit",
              position: "relative",
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 3,
                backgroundColor: isCustomBg ? localColor : "transparent",
                backgroundImage: isCustomBg
                  ? "none"
                  : "linear-gradient(135deg, red, yellow, lime, cyan, blue, magenta, red)",
                border: `1px solid ${C.border}`,
                flexShrink: 0,
              }}
            />
            <Text size={1} style={{ color: C.black }}>Custom</Text>
            <input
              ref={colorInputRef}
              type="color"
              value={localColor}
              onChange={(e) => setLocalColor(e.currentTarget.value)}
              style={{
                position: "absolute",
                opacity: 0,
                width: "100%",
                height: "100%",
                top: 0,
                left: 0,
                cursor: "pointer",
              }}
            />
          </label>
        </div>
      </Section>
    </Stack>
  )
}
