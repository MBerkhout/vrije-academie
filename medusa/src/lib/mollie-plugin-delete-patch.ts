import { createRequire } from "node:module"
import path from "node:path"

import { wrapMollieDeleteNeverThrow } from "./mollie-safe-delete"

const PATCHED = Symbol.for("va.mollieSafeDelete")

type MollieBaseCtor = {
  prototype: {
    cancelPayment?: (input: { data?: unknown }) => Promise<unknown>
    deletePayment?: (input: { data?: unknown }) => Promise<unknown>
    [PATCHED]?: boolean
  }
}

/**
 * `@variablevic/mollie-payments-medusa` `cancelPayment` throws when
 * `input.data` is missing or Mollie GET fails (`const { id } = input.data`
 * sits outside its try/catch). Medusa then fails with
 * "Could not delete all payment sessions".
 */
export function patchMolliePluginDeletePayment(): void {
  const pluginRoot = path.resolve(
    __dirname,
    "../../node_modules/@variablevic/mollie-payments-medusa"
  )
  const nodeRequire = createRequire(path.join(pluginRoot, "package.json"))

  let Base: MollieBaseCtor
  try {
    Base = nodeRequire("./.medusa/server/src/providers/mollie/core/mollie-base.js")
      .default as MollieBaseCtor
  } catch {
    return
  }

  const proto = Base?.prototype
  if (!proto || proto[PATCHED]) return

  if (typeof proto.cancelPayment === "function") {
    proto.cancelPayment = wrapMollieDeleteNeverThrow(proto.cancelPayment, "cancelPayment")
  }
  if (typeof proto.deletePayment === "function") {
    proto.deletePayment = wrapMollieDeleteNeverThrow(proto.deletePayment, "deletePayment")
  }
  proto[PATCHED] = true
}
