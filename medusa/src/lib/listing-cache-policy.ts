/** Live-event first-page edits, drafts, and VA Thuis updates must bust listings immediately. */
export function shouldInvalidateListingsOnProductUpdate(opts: {
  unpublished: boolean
  inPlpTopSlots: boolean
  isVathuis: boolean
}): boolean {
  return opts.unpublished || opts.inPlpTopSlots || opts.isVathuis
}
