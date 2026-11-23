import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { parseKlarnaMinAmount } from "../../../providers/mollie-klarna/min-amount"

export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.json({ klarna_min_amount: parseKlarnaMinAmount(process.env.KLARNA_MIN_AMOUNT) })
}
