import { Module } from "@medusajs/framework/utils"

import PeopleModuleService from "./service"

export const PEOPLE_MODULE = "people"

export default Module(PEOPLE_MODULE, {
  service: PeopleModuleService,
})
