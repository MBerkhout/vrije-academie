import { PatchEvent, set } from "sanity"
import type { InputProps } from "sanity"

const C = {
  yellow: "#F5C800",
  black: "#1A1A1A",
  border: "#E0E0E0",
  white: "#FFFFFF",
  bgSection: "#FAFAFA",
}

type StringOption = { title: string; value: string }
type NumberOption = { title: string; value: number }

const buttonStyle = (active: boolean) =>
  ({
    padding: "6px 12px",
    borderRadius: 4,
    border: `1.5px solid ${active ? C.black : C.border}`,
    background: active ? C.yellow : C.white,
    color: C.black,
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    transition: "all 0.12s",
    fontFamily: "inherit",
  }) as const

const wrapperStyle = {
  background: C.bgSection,
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "10px 12px",
} as const

export function createButtonSelectInput(options: StringOption[]) {
  return function ButtonSelectInput(props: InputProps<string>) {
    const { value, onChange, schemaType } = props
    const list = (schemaType.options?.list as StringOption[]) || options
    const current = value ?? list[0]?.value

    return (
      <div style={wrapperStyle}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {list.map((opt) => {
            const active = current === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(PatchEvent.from(set(opt.value)))}
                style={buttonStyle(active)}
              >
                {opt.title}
              </button>
            )
          })}
        </div>
      </div>
    )
  }
}

/**
 * For `number` fields with a list of allowed values (e.g. 1–5 star rating, column count).
 * Avoids the default dropdown’s blank “unset” row.
 */
export function createButtonNumberSelectInput(
  options: NumberOption[] | (() => NumberOption[]),
) {
  const getOptions = typeof options === "function" ? options : () => options
  return function ButtonNumberSelectInput(props: InputProps<number>) {
    const { value, onChange, schemaType } = props
    const raw = schemaType.options?.list
    const list: NumberOption[] = Array.isArray(raw)
      ? (raw as unknown[]).map((v) => {
          if (typeof v === "number") return { title: String(v), value: v }
          if (v && typeof v === "object" && "value" in v) {
            const o = v as { title: string; value: number }
            return { title: o.title, value: o.value }
          }
          return { title: String(v), value: Number(v) }
        })
      : getOptions()
    const current = value ?? list[0]?.value

    return (
      <div style={wrapperStyle}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {list.map((opt) => {
            const active = current === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(PatchEvent.from(set(opt.value)))}
                style={buttonStyle(active)}
              >
                {opt.title}
              </button>
            )
          })}
        </div>
      </div>
    )
  }
}
