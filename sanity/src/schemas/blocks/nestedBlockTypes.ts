/**
 * Block types allowed inside tabs (and columns if using block refs in future).
 * Same set as page blocks except hero and tabs to avoid full-width/heavy blocks and circular refs.
 */
export const NESTED_BLOCK_TYPES = [
  { type: "eventList" },
  { type: "textBlock" },
  { type: "afbeeldingBlock" },
  { type: "whitespaceBlock" },
  { type: "accordionBlock" },
  { type: "formBlock" },
  { type: "demandNearbyBlock" },
  { type: "categoriesBlock" },
  { type: "uspBlock" },
  { type: "reviewBlock" },
  { type: "personsBlock" },
  { type: "columnsBlock" },
] as const
