import { page } from "./page"
import { redirect } from "./redirect"
import { generalSettings } from "./generalSettings"
import { menu } from "./menu"
import { blockLayout } from "./blockLayout"
import { eventList } from "./blocks/eventList"
import { textBlock } from "./blocks/text"
import { afbeeldingBlock } from "./blocks/afbeelding"
import { whitespaceBlock } from "./blocks/whitespace"
import { accordionBlock } from "./blocks/accordion"
import { tabsBlock } from "./blocks/tabs"
import { formBlock } from "./blocks/form"
import { demandNearbyBlock } from "./blocks/demandNearby"
import { heroBlock } from "./blocks/hero"
import { featuredTripBlock } from "./blocks/featuredTrip"
import { categoriesBlock } from "./blocks/categories"
import { uspBlock } from "./blocks/usp"
import { reviewBlock } from "./blocks/review"
import { personsBlock } from "./blocks/persons"
import { columnsBlock } from "./blocks/columns"
import { editorialCardsBlock } from "./blocks/editorialCards"
import { plpBlock } from "./blocks/plp"
import { giftCardBlock } from "./blocks/giftCard"
import {
  buttonAnnotation,
  portableText,
  linkObject,
  imageWithAlt,
} from "./objects"
import { category, usp, person, product, docent, city } from "./documents"

export const schemaTypes = [
  // Documents
  page,
  redirect,
  generalSettings,
  menu,
  category,
  usp,
  person,
  product,
  docent,
  city,

  // Block building blocks
  blockLayout,

  // Shared objects
  buttonAnnotation,
  portableText,
  linkObject,
  imageWithAlt,

  // Blocks
  eventList,
  textBlock,
  afbeeldingBlock,
  whitespaceBlock,
  accordionBlock,
  tabsBlock,
  formBlock,
  demandNearbyBlock,
  heroBlock,
  featuredTripBlock,
  categoriesBlock,
  uspBlock,
  reviewBlock,
  personsBlock,
  columnsBlock,
  editorialCardsBlock,
  plpBlock,
  giftCardBlock,
]
