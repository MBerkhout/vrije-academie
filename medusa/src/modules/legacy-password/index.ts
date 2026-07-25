import { Module } from "@medusajs/framework/utils"

import LegacyPasswordModuleService from "./service"

export const LEGACY_PASSWORD_MODULE = "legacyPassword"

export default Module(LEGACY_PASSWORD_MODULE, {
  service: LegacyPasswordModuleService,
})
