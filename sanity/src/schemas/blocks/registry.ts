import { accordionBlock, surfaces as accordionSurfaces } from "./accordion"
import { afbeeldingBlock, surfaces as afbeeldingSurfaces } from "./afbeelding"
import { categoriesBlock, surfaces as categoriesSurfaces } from "./categories"
import { columnsBlock, surfaces as columnsSurfaces } from "./columns"
import { demandNearbyBlock, surfaces as demandNearbySurfaces } from "./demandNearby"
import { editorialCardsBlock, surfaces as editorialCardsSurfaces } from "./editorialCards"
import { eventList, surfaces as eventListSurfaces } from "./eventList"
import { featuredTripBlock, surfaces as featuredTripSurfaces } from "./featuredTrip"
import { giftCardBlock, surfaces as giftCardSurfaces } from "./giftCard"
import { formBlock, surfaces as formSurfaces } from "./form"
import { heroBlock, surfaces as heroSurfaces } from "./hero"
import { personsBlock, surfaces as personsSurfaces } from "./persons"
import { plpBlock, surfaces as plpSurfaces } from "./plp"
import { reviewBlock, surfaces as reviewSurfaces } from "./review"
import { tabsBlock, surfaces as tabsSurfaces } from "./tabs"
import { textBlock, surfaces as textSurfaces } from "./text"
import { uspBlock, surfaces as uspSurfaces } from "./usp"
import { whitespaceBlock, surfaces as whitespaceSurfaces } from "./whitespace"

export type BlockSurface = "page" | "pdp"

const BLOCK_MODULES: { schema: { name: string }; surfaces: readonly string[] }[] = [
  { schema: eventList, surfaces: eventListSurfaces },
  { schema: textBlock, surfaces: textSurfaces },
  { schema: afbeeldingBlock, surfaces: afbeeldingSurfaces },
  { schema: whitespaceBlock, surfaces: whitespaceSurfaces },
  { schema: accordionBlock, surfaces: accordionSurfaces },
  { schema: tabsBlock, surfaces: tabsSurfaces },
  { schema: formBlock, surfaces: formSurfaces },
  { schema: demandNearbyBlock, surfaces: demandNearbySurfaces },
  { schema: heroBlock, surfaces: heroSurfaces },
  { schema: featuredTripBlock, surfaces: featuredTripSurfaces },
  { schema: categoriesBlock, surfaces: categoriesSurfaces },
  { schema: uspBlock, surfaces: uspSurfaces },
  { schema: reviewBlock, surfaces: reviewSurfaces },
  { schema: personsBlock, surfaces: personsSurfaces },
  { schema: columnsBlock, surfaces: columnsSurfaces },
  { schema: editorialCardsBlock, surfaces: editorialCardsSurfaces },
  { schema: plpBlock, surfaces: plpSurfaces },
  { schema: giftCardBlock, surfaces: giftCardSurfaces },
]

/** Returns Sanity `of:` entries for all blocks available on the given surface. */
export function blocksForSurface(surface: BlockSurface): { type: string }[] {
  return BLOCK_MODULES
    .filter((m) => m.surfaces.includes(surface))
    .map((m) => ({ type: m.schema.name }))
}
