import { MedusaService } from "@medusajs/framework/utils"

import { Category } from "./models/category"
import { City } from "./models/city"

class CatalogModuleService extends MedusaService({
  Category,
  City,
}) {}

export default CatalogModuleService
