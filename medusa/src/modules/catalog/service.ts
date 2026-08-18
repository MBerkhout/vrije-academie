import { MedusaService } from "@medusajs/framework/utils"

import { Category } from "./models/category"
import { City } from "./models/city"
import { Location } from "./models/location"

class CatalogModuleService extends MedusaService({
  Category,
  City,
  Location,
}) {}

export default CatalogModuleService
