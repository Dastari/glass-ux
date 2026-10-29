import { describe, expect, it } from "vitest"
import { checkAvatarFile, clampView, cropFor, cropSide, describeAvatarRequirements, describeFormats, fitView, maxZoomFor } from "./avatar-image.js"

const LANDSCAPE = { width: 1200, height: 800 }

describe("crop geometry", () => {
  it("fits the short side, centred", () => {
    expect(cropFor(fitView(LANDSCAPE), LANDSCAPE)).toEqual({ x: 200, y: 0, size: 800 })
  })

  it("keeps the square inside the image and the zoom in range", () => {
    expect(clampView({ zoom: 1, centerX: 0, centerY: 10_000 }, LANDSCAPE)).toEqual({ zoom: 1, centerX: 400, centerY: 400 })
    expect(clampView({ zoom: 0.2, centerX: 600, centerY: 400 }, LANDSCAPE).zoom).toBe(1)
    expect(clampView({ zoom: 9, centerX: 600, centerY: 400 }, LANDSCAPE, 2).zoom).toBe(2)
    const corner = cropFor(clampView({ zoom: 2, centerX: 1200, centerY: 800 }, LANDSCAPE), LANDSCAPE)
    expect(corner).toEqual({ x: 800, y: 400, size: 400 })
  })

  it("zooms so the crop keeps the minimum dimensions", () => {
    expect(cropSide(LANDSCAPE, 2)).toBe(400)
    expect(maxZoomFor(LANDSCAPE, { minWidth: 400, minHeight: 200 })).toBe(2)
    expect(maxZoomFor(LANDSCAPE)).toBe(4)
    expect(maxZoomFor({ width: 300, height: 256 }, { minWidth: 256, minHeight: 256 })).toBe(1)
  })
})

describe("requirements wording", () => {
  it("names formats rather than media types", () => {
    expect(describeFormats(undefined, "en-US")).toBe("PNG, JPEG, or WebP")
    expect(describeFormats(".jpg,image/jpeg,image/avif", "en-US")).toBe("JPEG or AVIF")
    expect(describeFormats("image/*", "en-US")).toBe("any image")
  })

  it("joins the limits into one line", () => {
    expect(describeAvatarRequirements({ maxSize: 5 * 1024 * 1024, minWidth: 256, minHeight: 256 }, "en-US")).toBe(
      "PNG, JPEG, or WebP · Max 5\u2009MB · At least 256 × 256 px",
    )
  })
})

describe("checkAvatarFile", () => {
  it("refuses the wrong type and oversized files before decoding", async () => {
    const heic = new File(["x"], "holiday.heic", { type: "image/heic" })
    expect(await checkAvatarFile(heic, {}, "en-US")).toEqual({
      ok: false,
      rejection: { file: heic, reason: "type", message: "holiday.heic is not a supported image. Use PNG, JPEG, or WebP." },
    })
    const large = new File([new Uint8Array(2048)], "large.png", { type: "image/png" })
    const result = await checkAvatarFile(large, { maxSize: 1024 }, "en-US")
    expect(result.ok ? null : result.rejection.reason).toBe("size")
    expect(result.ok ? null : result.rejection.message).toBe("large.png is larger than 1\u2009KB.")
  })
})
