import { describe, expect, it } from "vitest"
import { clampCropRect, clampCropView, cropRectFor, describeImageRequirements, fitCropView, largestCrop, maxCropZoom, outputSize, resizeCropRect, roundCropRect, viewForCrop, wholeImage } from "./crop.js"

const IMAGE = { width: 1600, height: 1000 }

describe("locked crop", () => {
  it("takes the largest rectangle of a shape", () => {
    expect(largestCrop(IMAGE, 1)).toEqual({ width: 1000, height: 1000 })
    expect(largestCrop(IMAGE, 16 / 9).width).toBe(1600)
    expect(largestCrop(IMAGE, 16 / 9).height).toBeCloseTo(900)
    expect(largestCrop(IMAGE, 3).height).toBeCloseTo(1600 / 3)
    expect(largestCrop(IMAGE, 3 / 4).height).toBe(1000)
  })

  it("zooms until a minimum dimension", () => {
    expect(maxCropZoom(IMAGE, 16 / 9, { minWidth: 800 })).toBe(2)
    expect(maxCropZoom(IMAGE, 16 / 9, { minHeight: 300 })).toBeCloseTo(3)
    expect(maxCropZoom(IMAGE, 16 / 9)).toBe(4)
    expect(maxCropZoom({ width: 100, height: 100 }, 1, { minWidth: 400 })).toBe(1)
  })

  it("keeps the crop inside the image and in whole pixels", () => {
    const aspect = 2
    expect(cropRectFor(fitCropView(IMAGE), IMAGE, aspect)).toEqual({ x: 0, y: 100, width: 1600, height: 800 })
    const view = clampCropView({ zoom: 2, centerX: 5000, centerY: -300 }, IMAGE, aspect)
    expect(cropRectFor(view, IMAGE, aspect)).toEqual({ x: 800, y: 0, width: 800, height: 400 })
    expect(clampCropView({ zoom: 9, centerX: 800, centerY: 500 }, IMAGE, aspect, 3).zoom).toBe(3)
  })

  it("reads a crop back into a view", () => {
    const crop = { x: 200, y: 100, width: 800, height: 400 }
    expect(cropRectFor(viewForCrop(crop, IMAGE, 2), IMAGE, 2)).toEqual(crop)
  })
})

describe("free crop", () => {
  const box = { x: 100, y: 100, width: 400, height: 300 }

  it("moves only the edges a handle holds", () => {
    expect(resizeCropRect(box, "e", 50, 99, IMAGE)).toEqual({ x: 100, y: 100, width: 450, height: 300 })
    expect(resizeCropRect(box, "nw", -20, 40, IMAGE)).toEqual({ x: 80, y: 140, width: 420, height: 260 })
    expect(resizeCropRect(box, "s", 0, 5000, IMAGE)).toEqual({ x: 100, y: 100, width: 400, height: 900 })
  })

  it("stops at the image and the minimum size", () => {
    expect(resizeCropRect(box, "w", -500, 0, IMAGE)).toEqual({ x: 0, y: 100, width: 500, height: 300 })
    expect(resizeCropRect(box, "e", -1000, 0, IMAGE, { minWidth: 64 })).toEqual({ x: 100, y: 100, width: 64, height: 300 })
    expect(resizeCropRect(box, "n", 0, 1000, IMAGE, { minHeight: 64 })).toEqual({ x: 100, y: 336, width: 400, height: 64 })
  })

  it("keeps a moved box whole and inside", () => {
    expect(clampCropRect({ ...box, x: 1500, y: -20 }, IMAGE)).toEqual({ x: 1200, y: 0, width: 400, height: 300 })
    expect(clampCropRect({ x: 0, y: 0, width: 4000, height: 10 }, IMAGE, { minHeight: 200 })).toEqual({ x: 0, y: 0, width: 1600, height: 200 })
    expect(roundCropRect({ x: 1200.4, y: 0.4, width: 399.6, height: 299.5 }, IMAGE)).toEqual({ x: 1200, y: 0, width: 400, height: 300 })
    expect(wholeImage(IMAGE)).toEqual({ x: 0, y: 0, width: 1600, height: 1000 })
  })
})

describe("output", () => {
  const crop = { x: 0, y: 0, width: 800, height: 450 }

  it("follows the crop's shape unless both sides are given", () => {
    expect(outputSize(crop)).toEqual({ width: 800, height: 450 })
    expect(outputSize(crop, { width: 1600 })).toEqual({ width: 1600, height: 900 })
    expect(outputSize(crop, { height: 90 })).toEqual({ width: 160, height: 90 })
    expect(outputSize(crop, { width: 512, height: 512 })).toEqual({ width: 512, height: 512 })
  })
})

describe("wording", () => {
  it("speaks of images by default", () => {
    expect(describeImageRequirements({ minWidth: 64, minHeight: 64 }, "en-US")).toBe("PNG, JPEG, or WebP · At least 64 × 64 px")
  })
})
