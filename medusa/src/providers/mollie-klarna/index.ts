import { Modules, ModuleProvider } from "@medusajs/framework/utils"
import MollieKlarnaProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [MollieKlarnaProviderService],
})
