import { MedusaService } from "@medusajs/framework/utils"

import { Docent } from "./models/docent"

class PeopleModuleService extends MedusaService({
  Docent,
}) {}

export default PeopleModuleService
