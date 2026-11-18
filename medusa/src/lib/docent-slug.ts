/** Docent URL slug derived from the display name (`Annette van der Elst` -> `annette-van-der-elst`). */
export function slugifyDocentName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * True when `slug` is the name slug, optionally followed by a 6-char uniqueness suffix
 * (`-abc123`, or legacy `-sf-abc123`). A slug that was created from an earlier/incorrect name
 * (e.g. `camus` for "Annette van der Elst") is out of sync.
 */
export function isDocentSlugInSync(slug: string, name: string): boolean {
  const base = slugifyDocentName(name) || "docent"
  if (slug === base) return true
  return new RegExp(`^${base.replace(/[^a-z0-9-]/g, "")}-(sf-)?[a-z0-9]{6}$`).test(slug)
}

/** Pick a free slug for `name`: clean base first, else base + short id suffix, else numbered. */
export function pickDocentSlug(
  name: string,
  uniqueSuffix: string,
  isTaken: (slug: string) => boolean
): string {
  const base = slugifyDocentName(name) || "docent"
  if (!isTaken(base)) return base
  const suffix = uniqueSuffix.slice(-6).toLowerCase()
  const suffixed = `${base}-${suffix}`
  if (!isTaken(suffixed)) return suffixed
  let n = 2
  while (isTaken(`${suffixed}-${n}`)) n += 1
  return `${suffixed}-${n}`
}
