import { MedusaService } from "@medusajs/framework/utils"

import { EventGroup } from "./models/event-group"
import { EventItem } from "./models/event-item"
import { Property } from "./models/property"

class EventsModuleService extends MedusaService({
  EventGroup,
  EventItem,
  Property,
}) {}

export default EventsModuleService
