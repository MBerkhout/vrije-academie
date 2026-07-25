import { Module } from "@medusajs/framework/utils"

import VathuisAccessModuleService from "./service"

export const VATHUIS_ACCESS_MODULE = "vathuisAccess"

export default Module(VATHUIS_ACCESS_MODULE, {
  service: VathuisAccessModuleService,
})
