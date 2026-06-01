import { Module } from "@medusajs/framework/utils"

import SalesforceSyncModuleService from "./service"

export const SALESFORCE_SYNC_MODULE = "salesforceSync"

export default Module(SALESFORCE_SYNC_MODULE, {
  service: SalesforceSyncModuleService,
})
