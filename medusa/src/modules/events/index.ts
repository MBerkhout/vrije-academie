import { Module } from "@medusajs/framework/utils"

import EventsModuleService from "./service"

/** Registration key for the events domain module (Product Group / Product extensions). */
export const EVENTS_MODULE = "events"

export default Module(EVENTS_MODULE, {
  service: EventsModuleService,
})
