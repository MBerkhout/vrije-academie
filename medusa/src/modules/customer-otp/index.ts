import { Module } from "@medusajs/framework/utils"

import CustomerOtpModuleService from "./service"

export const CUSTOMER_OTP_MODULE = "customerOtp"

export default Module(CUSTOMER_OTP_MODULE, {
  service: CustomerOtpModuleService,
})
