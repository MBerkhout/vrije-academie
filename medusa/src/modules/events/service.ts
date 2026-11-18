import { MedusaService } from "@medusajs/framework/utils"

import { EventGroup } from "./models/event-group"
import { EventItem } from "./models/event-item"
import { EventItemDate } from "./models/event-item-date"
import { Property } from "./models/property"

class EventsModuleService extends MedusaService({
  EventGroup,
  EventItem,
  EventItemDate,
  Property,
}) {}

export default EventsModuleService
