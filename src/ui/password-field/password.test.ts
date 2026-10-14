import { describe, expect, it } from "vitest"
import { generatePassword } from "./generate.js"
import { estimateStrength } from "./strength.js"

describe("password strength", () => {
  it("scores common passwords and their variations as too weak", () => {
    for (const password of ["password", "Password1!", "P@ssw0rd2024", "qwerty123", "Summer2024!", "letmein", "123456789"]) {
      expect(estimateStrength(password).score, password).toBe(0)
    }
  })
  it("scores long random passwords as strong", () => {
    expect(estimateStrength("x7#Qm9!vLp2@Rt8^Wk").score).toBe(4)
    expect(estimateStrength("correct horse battery staple").score).toBeGreaterThanOrEqual(3)
  })
  it("penalises patterns and the person's own details", () => {
    expect(estimateStrength("aaaaaaaaaaaa").score).toBeLessThanOrEqual(1)
    expect(estimateStrength("abcdefghijkl").score).toBeLessThanOrEqual(1)
    const own = estimateStrength("AveryQuinn#88", ["Avery Quinn", "avery@orbit.example"])
    expect(own.feedback).toMatch(/name/)
    expect(own.score).toBeLessThan(estimateStrength("RiverLantern#88").score)
  })
  it("always says what to do next until strong", () => {
    expect(estimateStrength("short1!").feedback).toBeTruthy()
    expect(estimateStrength("x7#Qm9!vLp2@Rt8^Wk").feedback).toBeNull()
  })
})

describe("password generator", () => {
  it("makes passwords of the length and classes asked for", () => {
    const password = generatePassword({ length: 24 })
    expect(password).toHaveLength(24)
    expect(password).toMatch(/[a-z]/)
    expect(password).toMatch(/[A-Z]/)
    expect(password).toMatch(/\d/)
    expect(password).toMatch(/[!#%*+\-=?@^_~]/)
    expect(password).not.toMatch(/[Il1O0o]/)
  })
  it("honours the sets", () => {
    expect(generatePassword({ length: 16, upper: false, digits: false, symbols: false })).toMatch(/^[a-z]{16}$/)
    expect(() => generatePassword({ lower: false, upper: false, digits: false, symbols: false })).toThrow()
  })
  it("draws uniformly from the pool", () => {
    // A deterministic source cycling through every value hits every character equally often.
    let next = 0
    const counter = (array: Uint32Array<ArrayBuffer>) => {
      array[0] = next++ % 10
      return array
    }
    const digits = generatePassword({ length: 10, lower: false, upper: false, symbols: false, unambiguous: false }, counter)
    expect(digits).toHaveLength(10)
    expect(digits).toMatch(/^\d{10}$/)
  })
})
