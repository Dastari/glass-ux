import { describe, expect, it } from "vitest"
import { isPort, parsePort, serviceOf } from "./ports.js"

describe("ports", () => {
  it("knows common services", () => {
    expect(serviceOf(443)).toBe("HTTPS")
    expect(serviceOf(3389)).toBe("RDP")
    expect(serviceOf(161)).toBe("SNMP")
    expect(serviceOf(49152)).toBeUndefined()
    expect(serviceOf(null)).toBeUndefined()
  })
  it("bounds and parses", () => {
    expect(isPort(1)).toBe(true)
    expect(isPort(65535)).toBe(true)
    expect(isPort(0)).toBe(false)
    expect(isPort(65536)).toBe(false)
    expect(isPort(80.5)).toBe(false)
    expect(parsePort(" 8080 ")).toBe(8080)
    expect(parsePort("https")).toBe(443)
    expect(parsePort("70000")).toBeNull()
  })
})
