import fs from "node:fs/promises"
import type { IncomingMessage, ServerResponse } from "node:http"
import type { Plugin, ViteDevServer } from "vite"

const MARKERS = [
  "rule-value-form-field/rule-value-form-field.tsx",
  "dashboard/dist/chunk-OXPE5TAY.mjs",
]

const DATE_HELPERS = `
function __vaYyyymmddToLocalDate(value) {
  const parsed =
    typeof value === "string" || typeof value === "number"
      ? Number.parseInt(String(value), 10)
      : NaN;
  if (!Number.isFinite(parsed) || parsed < 10000101) return null;
  const raw = String(parsed);
  const year = Number.parseInt(raw.slice(0, 4), 10);
  const month = Number.parseInt(raw.slice(4, 6), 10);
  const day = Number.parseInt(raw.slice(6, 8), 10);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}
function __vaLocalDateToYyyymmdd(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return \`\${year}\${month}\${day}\`;
}
function __vaIsEventStartDateRule(attribute, fieldRuleAttribute) {
  return (
    attribute?.id === "event_start_from" ||
    attribute?.id === "event_start_until" ||
    fieldRuleAttribute === "items.metadata.event_start_from" ||
    fieldRuleAttribute === "items.metadata.event_start_until"
  );
}
`

const NUMBER_FIELD_CONDITIONS = [
  'attribute?.field_type === "number"',
  "(attribute == null ? void 0 : attribute.field_type) === \"number\"",
]

function shouldPatch(code: string): boolean {
  return (
    code.includes("var RuleValueFormField = ({") &&
    MARKERS.some((marker) => code.includes(marker))
  )
}

function extractJsxRuntime(code: string, fromIndex: number) {
  const snippet = code.slice(fromIndex, fromIndex + 400)

  const commaMatch = snippet.match(/return \(0, ([\w$]+)\.(jsx|jsxs)\)\(/)
  if (commaMatch) {
    const binding = commaMatch[1]
    const outerType = commaMatch[2]
    const innerType = "jsx"
    return {
      outer: `(0, ${binding}.${outerType})(`,
      inner: `(0, ${binding}.${innerType})(`,
    }
  }

  const pureCommaMatch = snippet.match(
    /return \/\* @__PURE__ \*\/ \(0, ([\w$]+)\.(jsx|jsxs)\)\(/
  )
  if (pureCommaMatch) {
    const binding = pureCommaMatch[1]
    const outerType = pureCommaMatch[2]
    const innerType = "jsx"
    return {
      outer: `/* @__PURE__ */ (0, ${binding}.${outerType})(`,
      inner: `/* @__PURE__ */ (0, ${binding}.${innerType})(`,
    }
  }

  const pureNamedMatch = snippet.match(
    /return \/\* @__PURE__ \*\/ ([\w$]+)\(/
  )
  if (pureNamedMatch) {
    const outerFn = pureNamedMatch[1]
    const innerFn = outerFn.includes("jsxs")
      ? outerFn.replace("jsxs", "jsx")
      : outerFn.replace(/jsx$/, "jsx") || `${outerFn}x`

    return {
      outer: `/* @__PURE__ */ ${outerFn}(`,
      inner: `/* @__PURE__ */ ${innerFn}(`,
    }
  }

  return {
    outer: "/* @__PURE__ */ jsxs(",
    inner: "/* @__PURE__ */ jsx(",
  }
}

function buildDatePickerBranch(condition: string, code: string, fromIndex: number) {
  const { outer, inner } = extractJsxRuntime(code, fromIndex)

  return `if (${condition} && isEventStartDateRule) {
          const selectedDate = __vaYyyymmddToLocalDate(field.value);
          return ${outer}Form.Item, { className: "basis-1/2", children: [
            ${inner}Form.Control, { children: ${inner}I18nProvider, {
                locale: "en-GB",
                children: ${inner}DatePicker, {
                  granularity: "day",
                  shouldCloseOnSelect: true,
                  value: selectedDate,
                  onChange: (date) => {
                    const ymd = __vaLocalDateToYyyymmdd(date);
                    onChange(ymd || "");
                  },
                  className: "bg-ui-bg-base"
                })
              })
            }),
            ${inner}Form.ErrorMessage, {})
          ] });
        } else if (${condition}) {`
}

function addI18nProviderImport(code: string): string {
  if (code.includes("I18nProvider")) {
    return code
  }

  if (/^\s+DatePicker,\n/m.test(code) && code.includes('from "./chunk-')) {
    return code.replace(/(\s+DatePicker,\n)/, "$1  I18nProvider,\n")
  }

  if (code.includes('import { jsx, jsxs } from "react/jsx-runtime";')) {
    return code.replace(
      'import { jsx, jsxs } from "react/jsx-runtime";',
      'import { I18nProvider } from "react-aria";\nimport { jsx, jsxs } from "react/jsx-runtime";'
    )
  }

  if (code.includes("(0, import_jsx_runtime.jsx)")) {
    return code.replace(
      /(import \{\s*\n(?:[^\n]*\n)*?\s*DatePicker,\n)/,
      "$1  I18nProvider,\n"
    )
  }

  return code.replace(
    /(import \{ useEffect \} from "react";)/,
    '$1\nimport { I18nProvider } from "react-aria";'
  )
}

function addDatePickerImport(code: string): string {
  let patched = code

  if (!patched.includes("DatePicker")) {
    if (patched.includes('import { Input } from "@medusajs/ui";')) {
      patched = patched.replace(
        'import { Input } from "@medusajs/ui";',
        'import { DatePicker, Input } from "@medusajs/ui";'
      )
    } else if (patched.includes("  Input,\n  Select,")) {
      patched = patched.replace(
        "  Input,\n  Select,",
        "  DatePicker,\n  Input,\n  Select,"
      )
    } else {
      patched = patched.replace(
        /(\n\s*Input,\n\s*Select,)/,
        "\n  DatePicker,$1"
      )
    }
  }

  return addI18nProviderImport(patched)
}

function injectEventDateRuleFlag(code: string): string {
  if (code.includes("const isEventStartDateRule =")) {
    return code
  }

  return code.replace(
    /const attribute = attributes(?:\?\.find|\s*==\s*null\s*\?\s*void\s*0\s*:\s*attributes\.find)\(\s*\(attr\) => attr\.value === fieldRule\.attribute\s*\);/,
    `$&\n  const isEventStartDateRule = __vaIsEventStartDateRule(attribute, fieldRule.attribute);`
  )
}

function injectDatePickerBranch(code: string): string {
  let patched = code

  for (const condition of NUMBER_FIELD_CONDITIONS) {
    const search = `        if (${condition}) {`
    const index = patched.indexOf(search)
    if (index === -1) {
      continue
    }

    patched =
      patched.slice(0, index) +
      `        ${buildDatePickerBranch(condition, patched, index)}` +
      patched.slice(index + search.length)
  }

  return patched
}

function closeEventDatePickerBranch(code: string): string {
  return code.replace(
    /(className: "bg-ui-bg-base"\s*\}\s*)\) \}\),/,
    "$1) }) }),"
  )
}

function upgradeDatePickerLocale(code: string): string | null {
  if (
    !code.includes("__vaIsEventStartDateRule") ||
    code.includes('locale: "en-GB"')
  ) {
    return null
  }

  let patched = addI18nProviderImport(code)
  let wrapped = false

  const sourceNeedle =
    "jsx(Form.Control, { children: /* @__PURE__ */ jsx(DatePicker, {"
  if (patched.includes(sourceNeedle)) {
    patched = patched.replace(
      sourceNeedle,
      "jsx(Form.Control, { children: /* @__PURE__ */ jsx(I18nProvider, { locale: \"en-GB\", children: /* @__PURE__ */ jsx(DatePicker, {"
    )
    wrapped = true
  }

  const prebundleNeedle =
    /(\(0, import_jsx_runtime\.jsx\)\(Form\.Control, \{ children: )\(0, import_jsx_runtime\.jsx\)\(\s*\n\s*DatePicker,/
  if (!wrapped && prebundleNeedle.test(patched)) {
    patched = patched.replace(
      prebundleNeedle,
      '$1(0, import_jsx_runtime.jsx)(I18nProvider, { locale: "en-GB", children: (0, import_jsx_runtime.jsx)(\n              DatePicker,'
    )
    wrapped = true
  }

  if (!wrapped) {
    return null
  }

  patched = closeEventDatePickerBranch(patched)

  return patched === code ? null : patched
}

export function patchPromotionRuleDatePicker(code: string): string | null {
  const localeUpgrade = upgradeDatePickerLocale(code)
  if (localeUpgrade) {
    return localeUpgrade
  }

  if (!shouldPatch(code) || code.includes("__vaIsEventStartDateRule")) {
    return null
  }

  let patched = addDatePickerImport(code)

  patched = patched.replace(
    "var RuleValueFormField = ({",
    `${DATE_HELPERS}\nvar RuleValueFormField = ({`
  )

  patched = injectEventDateRuleFlag(patched)
  patched = injectDatePickerBranch(patched)

  return patched === code ? null : patched
}

export function promotionRuleDatePickerEsbuildPlugin() {
  return {
    name: "va-promotion-rule-date-picker-esbuild",
    setup(build: {
      onLoad: (
        args: { filter: RegExp },
        callback: (
          args: { path: string }
        ) => Promise<{ contents: string; loader: "js" } | null | undefined>
      ) => void
    }) {
      build.onLoad(
        { filter: /node_modules[/\\]@medusajs[/\\]dashboard[/\\]dist[/\\]chunk-.*\.mjs$/ },
        async (args: { path: string }) => {
          const contents = await fs.readFile(args.path, "utf8")
          const patched = patchPromotionRuleDatePicker(contents)
          if (!patched) {
            return undefined
          }
          return { contents: patched, loader: "js" as const }
        }
      )
    },
  }
}

function shouldInspectModuleUrl(url: string): boolean {
  return (
    url.includes(".vite/deps/") ||
    url.includes("@medusajs/dashboard/dist/chunk-") ||
    url.includes("chunk-OXPE5TAY.mjs")
  )
}

function installPromotionRulePatchMiddleware(server: ViteDevServer) {
  server.middlewares.use(
    (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const url = req.url?.split("?")[0] ?? ""
      if (
        !shouldInspectModuleUrl(url) ||
        !(url.endsWith(".js") || url.endsWith(".mjs"))
      ) {
        next()
        return
      }

      const originalWrite = res.write.bind(res)
      const originalEnd = res.end.bind(res)
      const chunks: Buffer[] = []

      res.write = ((chunk: string | Uint8Array) => {
        chunks.push(Buffer.from(chunk))
        return true
      }) as typeof res.write

      res.end = ((chunk?: string | Uint8Array) => {
        if (chunk) {
          chunks.push(Buffer.from(chunk))
        }

        let body = Buffer.concat(chunks).toString("utf8")
        if (
          body.includes("var RuleValueFormField") ||
          body.includes("__vaIsEventStartDateRule")
        ) {
          body = patchPromotionRuleDatePicker(body) ?? body
        }

        res.write = originalWrite
        res.end = originalEnd
        res.setHeader("Content-Length", Buffer.byteLength(body))
        originalEnd(body)
      }) as typeof res.end

      next()
    }
  )
}

/** Patch prebuilt @medusajs/dashboard promotion rule value field for event date pickers. */
export function promotionRuleDatePickerPlugin(): Plugin {
  return {
    name: "va-promotion-rule-date-picker",
    configureServer(server) {
      installPromotionRulePatchMiddleware(server)
    },
    transform(code, id) {
      if (!id.includes("@medusajs/dashboard/dist/")) {
        return null
      }

      const patched = patchPromotionRuleDatePicker(code)
      if (!patched) {
        return null
      }

      return { code: patched, map: null }
    },
  }
}
