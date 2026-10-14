import { describe, expect, it } from "vitest"
import { isCompleteOtp, normaliseOtp } from "./otp.js"

describe("one-time code paste", () => {
  it("fills every box from grouped and prefixed codes", () => {
    expect(normaliseOtp("123456", 6)).toBe("123456")
    expect(normaliseOtp("123 456", 6)).toBe("123456")
    expect(normaliseOtp("123-456", 6)).toBe("123456")
    expect(normaliseOtp("12 34 56", 6)).toBe("123456")
    expect(normaliseOtp("G-123456", 6)).toBe("123456")
    expect(normaliseOtp(" 123456\n", 6)).toBe("123456")
  })
  it("finds the code inside a message", () => {
    expect(normaliseOtp("Your Orbit Workspace code is 482913. It expires in 10 minutes.", 6)).toBe("482913")
    expect(normaliseOtp("In 5 min, use 482913", 6)).toBe("482913")
  })
  it("keeps what fits when the paste is partial or long", () => {
    expect(normaliseOtp("1234", 6)).toBe("1234")
    expect(normaliseOtp("12345678", 6)).toBe("123456")
  })
  it("reads letter codes in upper case", () => {
    expect(normaliseOtp("ab3-xy9", 6, "alphanumeric")).toBe("AB3XY9")
    expect(normaliseOtp("Recovery code: k7m2qz", 6, "alphanumeric")).toBe("K7M2QZ")
  })
  it("knows a complete code", () => {
    expect(isCompleteOtp("123456", 6)).toBe(true)
    expect(isCompleteOtp("12345", 6)).toBe(false)
    expect(isCompleteOtp("AB3XY9", 6, "alphanumeric")).toBe(true)
  })
})
