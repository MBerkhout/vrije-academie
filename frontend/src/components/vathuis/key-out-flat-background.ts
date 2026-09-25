const CORNER_MATCH = 4
const NEUTRAL_SPREAD = 10
const KEY_TOLERANCE = 14
const FADE_START = 0.45
const MIN_PLATE = 20
const MAX_PLATE = 70

type Rgb = { r: number; g: number; b: number }

function pixelAt(data: Uint8ClampedArray, width: number, x: number, y: number): Rgb {
  const i = (y * width + x) * 4
  return { r: data[i], g: data[i + 1], b: data[i + 2] }
}

function spread(color: Rgb): number {
  return Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b)
}

function distance(a: Rgb, b: Rgb): number {
  return Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b))
}

function isDarkGrayPlate(color: Rgb): boolean {
  return (
    spread(color) <= 6 &&
    color.r >= MIN_PLATE &&
    color.r <= MAX_PLATE &&
    color.g >= MIN_PLATE &&
    color.g <= MAX_PLATE &&
    color.b >= MIN_PLATE &&
    color.b <= MAX_PLATE
  )
}

/**
 * Makes a flat dark-gray plate transparent so a hero graphic sits on the page.
 * Returns false when the corners are not one shared plate color.
 */
export function keyOutFlatBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): boolean {
  if (width < 2 || height < 2) return false

  const corners = [
    pixelAt(data, width, 0, 0),
    pixelAt(data, width, width - 1, 0),
    pixelAt(data, width, 0, height - 1),
    pixelAt(data, width, width - 1, height - 1),
  ]
  const plate = corners[0]
  if (!isDarkGrayPlate(plate)) return false
  if (corners.some((corner) => distance(corner, plate) > CORNER_MATCH)) return false

  for (let i = 0; i < data.length; i += 4) {
    const color = { r: data[i], g: data[i + 1], b: data[i + 2] }
    const dist = distance(color, plate)
    if (spread(color) > NEUTRAL_SPREAD || dist > KEY_TOLERANCE) continue
    const t = dist / KEY_TOLERANCE
    data[i + 3] = Math.round(255 * Math.max(0, (t - FADE_START) / (1 - FADE_START)))
  }

  return true
}
