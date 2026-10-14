import { describe, expect, it } from "vitest"
import { formatCoordinates, formatDms, parseCoordinates } from "./coordinates.js"

const HOBART = { lat: -42.88334, lng: 147.32688 }

const value = (text: string) => {
  const result = parseCoordinates(text)
  if (!result.ok) throw new Error(`${text}: ${result.error}`)
  return result.value
}

describe("coordinates", () => {
  it("reads decimal pairs with a comma or a space", () => {
    expect(value("-42.88334, 147.32688")).toEqual(HOBART)
    expect(value("-42.88334 147.32688")).toEqual(HOBART)
    expect(value("(-42.88334,147.32688)")).toEqual(HOBART)
  })
  it("reads hemisphere letters before or after", () => {
    expect(value("42.88334S 147.32688E")).toEqual(HOBART)
    expect(value("S42.88334 E147.32688")).toEqual(HOBART)
    expect(value("42.88334 S, 147.32688 E")).toEqual(HOBART)
  })
  it("reads degrees, minutes and seconds", () => {
    const dms = value(`42°53'0.02"S 147°19'36.77"E`)
    expect(dms.lat).toBeCloseTo(-42.88334, 4)
    expect(dms.lng).toBeCloseTo(147.32688, 4)
    expect(value("42°53′0.02″S, 147°19′36.77″E")).toEqual(dms)
    expect(value("42 53 0.02 S, 147 19 36.77 E")).toEqual(dms)
    const ddm = value("42° 53.0003′ S, 147° 19.6128′ E")
    expect(ddm.lat).toBeCloseTo(-42.88334, 4)
  })
  it("reads map links", () => {
    expect(value("https://www.google.com/maps/@-42.88334,147.32688,17z")).toEqual(HOBART)
    expect(value("https://www.google.com/maps/place/Hobart/@-42.8,147.3,12z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d-42.88334!4d147.32688")).toEqual(HOBART)
    expect(value("https://maps.google.com/?q=-42.88334,147.32688")).toEqual(HOBART)
    expect(value("https://www.openstreetmap.org/?mlat=-42.88334&mlon=147.32688#map=17/-42.88334/147.32688")).toEqual(HOBART)
    expect(value("https://www.openstreetmap.org/#map=17/-42.88334/147.32688")).toEqual(HOBART)
    expect(value("https://maps.apple.com/?ll=-42.88334,147.32688")).toEqual(HOBART)
    expect(value("geo:-42.88334,147.32688")).toEqual(HOBART)
  })
  it("reads longitude, latitude when only that order fits", () => {
    const result = parseCoordinates("147.32688, -42.88334")
    expect(result.ok && result.value).toEqual(HOBART)
    expect(result.ok && result.swapped).toBe(true)
  })
  it("validates ranges and says which", () => {
    const lat = parseCoordinates("-95, 147")
    expect(!lat.ok && lat.error).toMatch(/Latitude/)
    const lng = parseCoordinates("42, 190")
    expect(!lng.ok && lng.error).toMatch(/Longitude/)
    expect(parseCoordinates("hobart").ok).toBe(false)
    expect(parseCoordinates("https://example.com").ok).toBe(false)
    expect(parseCoordinates("").ok).toBe(false)
  })
  it("writes decimal and DMS forms", () => {
    expect(formatCoordinates(HOBART)).toBe("-42.88334, 147.32688")
    expect(formatCoordinates({ lat: 0, lng: -0.000001 })).toBe("0.00000, 0.00000")
    expect(formatDms(HOBART)).toBe("42°53′0.0″S 147°19′36.8″E")
  })
})
