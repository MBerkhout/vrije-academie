import { Module } from "@medusajs/framework/utils"

import ProductAnalyticsModuleService from "./service"

export const PRODUCT_ANALYTICS_MODULE = "productAnalytics"

export default Module(PRODUCT_ANALYTICS_MODULE, {
  service: ProductAnalyticsModuleService,
})
