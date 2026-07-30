import { defineField, type ImageRule } from "sanity"
import { imageSpecDescription, type ImageSpecKey } from "./imageSpecs"

type ImageFieldConfig = Parameters<typeof defineField>[0] & {
  name: string
  title?: string
  type?: "image"
}

type ImageWithAltFieldConfig = Parameters<typeof defineField>[0] & {
  name: string
  title?: string
  type?: "imageWithAlt"
}

/**
 * Image field with optional recommended-size guidance in the Studio description.
 */
export function defineImageField(
  config: ImageFieldConfig & { spec?: ImageSpecKey; extraDescription?: string },
) {
  const { spec, extraDescription, description, ...rest } = config
  const sizeDescription = spec ? imageSpecDescription(spec, extraDescription) : extraDescription

  return defineField({
    type: "image",
    ...rest,
    description: description ?? sizeDescription,
  })
}

/**
 * imageWithAlt field with optional recommended-size guidance in the Studio description.
 */
export function defineImageWithAltField(
  config: ImageWithAltFieldConfig & { spec?: ImageSpecKey; extraDescription?: string },
) {
  const { spec, extraDescription, description, ...rest } = config
  const sizeDescription = spec ? imageSpecDescription(spec, extraDescription) : extraDescription

  return defineField({
    type: "imageWithAlt",
    ...rest,
    description: description ?? sizeDescription,
  })
}

/** Re-export for schema files that need custom validation on image fields. */
export type { ImageRule }
