import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { VATHUIS_ACCESS_MODULE } from "../../../../../modules/vathuis-access"
import type VathuisAccessModuleService from "../../../../../modules/vathuis-access/service"

/**
 * GET /store/customer/me/vathuis-access
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const customerId = req.auth_context.actor_id
  const vathuisAccess = req.scope.resolve(VATHUIS_ACCESS_MODULE) as InstanceType<
    typeof VathuisAccessModuleService
  >

  const items = await vathuisAccess.listForCustomer(customerId)
  res.json({ items })
}
