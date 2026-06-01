import type { BlockAnnotationProps } from "sanity"

/**
 * Renders the inline button annotation as a visible button/chip in the
 * Portable Text editor instead of plain text.
 */
export function InlineButtonAnnotation(props: BlockAnnotationProps) {
  const value = props.value as { label?: string; buttonType?: string; url?: string } | undefined
  const label = value?.label?.trim() || "Button"
  const isPrimary = value?.buttonType === "primary"
  const isSecondary = value?.buttonType === "secondary"

  const buttonStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 12px",
    margin: "0 2px",
    borderRadius: 4,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    border: "1px solid transparent",
    // Primary: yellow/gold; Secondary: outline; Text link: minimal
    ...(isPrimary && {
      backgroundColor: "#F5C800",
      color: "#1A1A1A",
      borderColor: "#D4AF37",
    }),
    ...(isSecondary && {
      backgroundColor: "transparent",
      color: "#1A1A1A",
      borderColor: "#1A1A1A",
    }),
    ...(!isPrimary && !isSecondary && {
      backgroundColor: "transparent",
      color: "#0066CC",
      textDecoration: "underline",
    }),
  }

  const wrappedTextElement = (
    <span
      contentEditable={false}
      onClick={props.onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          props.onOpen()
        }
      }}
      style={buttonStyle}
    >
      {label}
    </span>
  )

  return props.renderDefault({
    ...props,
    textElement: wrappedTextElement,
  })
}
