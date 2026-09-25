import { describe, expect, it } from 'vitest'
import { keyOutFlatBackground } from './key-out-flat-background'

function image(width: number, height: number, fill: [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0]
    data[i + 1] = fill[1]
    data[i + 2] = fill[2]
    data[i + 3] = fill[3]
  }
  return data
}

function setPixel(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  rgba: [number, number, number, number],
) {
  const i = (y * width + x) * 4
  data[i] = rgba[0]
  data[i + 1] = rgba[1]
  data[i + 2] = rgba[2]
  data[i + 3] = rgba[3]
}

function pixel(data: Uint8ClampedArray, width: number, x: number, y: number) {
  const i = (y * width + x) * 4
  return [data[i], data[i + 1], data[i + 2], data[i + 3]]
}

describe('keyOutFlatBackground', () => {
  it('clears a flat dark-gray plate and keeps saturated pixels', () => {
    const data = image(6, 6, [38, 38, 38, 255])
    setPixel(data, 6, 3, 3, [245, 240, 0, 255])

    expect(keyOutFlatBackground(data, 6, 6)).toBe(true)
    expect(pixel(data, 6, 0, 0)[3]).toBe(0)
    expect(pixel(data, 6, 3, 3)).toEqual([245, 240, 0, 255])
  })

  it('softens jpeg noise around the plate', () => {
    const data = image(4, 4, [38, 38, 38, 255])
    setPixel(data, 4, 1, 1, [48, 48, 48, 255])

    expect(keyOutFlatBackground(data, 4, 4)).toBe(true)
    expect(pixel(data, 4, 1, 1)[3]).toBeLessThan(255)
    expect(pixel(data, 4, 1, 1)[3]).toBeGreaterThan(0)
  })

  it('leaves the image alone when the corners are not one plate', () => {
    const data = image(4, 4, [38, 38, 38, 255])
    setPixel(data, 4, 3, 0, [200, 20, 20, 255])

    expect(keyOutFlatBackground(data, 4, 4)).toBe(false)
    expect(pixel(data, 4, 0, 0)[3]).toBe(255)
  })

  it('does not key a light background', () => {
    const data = image(4, 4, [250, 250, 250, 255])

    expect(keyOutFlatBackground(data, 4, 4)).toBe(false)
    expect(pixel(data, 4, 0, 0)[3]).toBe(255)
  })
})
