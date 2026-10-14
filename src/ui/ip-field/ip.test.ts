import { describe, expect, it } from "vitest"
import { describeRange, isNetworkAddress, networkOf, normaliseIp, parseIp, scopeOf } from "./ip.js"

const ok = (text: string, options?: Parameters<typeof parseIp>[1]) => {
  const result = parseIp(text, options)
  if (!result.ok) throw new Error(result.error)
  return result.value
}

describe("IPv4", () => {
  it("normalises leading zeros and whitespace", () => {
    expect(normaliseIp(" 010.001.002.003 ")).toBe("10.1.2.3")
    expect(normaliseIp("192.168.1.10")).toBe("192.168.1.10")
  })
  it("rejects out-of-range and malformed addresses", () => {
    expect(normaliseIp("256.1.1.1")).toBeNull()
    expect(normaliseIp("1.2.3")).toBeNull()
    expect(normaliseIp("1.2.3.4.5")).toBeNull()
    expect(normaliseIp("a.b.c.d")).toBeNull()
  })
  it("names the version it wants", () => {
    const result = parseIp("2001:db8::1", { version: 4 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/IPv4/)
  })
  it("classifies private and special ranges", () => {
    expect(scopeOf(ok("10.13.4.1"))).toBe("Private")
    expect(scopeOf(ok("172.20.0.1"))).toBe("Private")
    expect(scopeOf(ok("169.254.10.1"))).toBe("Link-local")
    expect(scopeOf(ok("8.8.8.8"))).toBeNull()
  })
})

describe("IPv6", () => {
  it("writes RFC 5952 canonical text", () => {
    expect(normaliseIp("2001:0DB8:0000:0000:0000:0000:0000:0001")).toBe("2001:db8::1")
    expect(normaliseIp("2001:db8:0:0:1:0:0:1")).toBe("2001:db8::1:0:0:1")
    expect(normaliseIp("::1")).toBe("::1")
    expect(normaliseIp("::")).toBe("::")
    expect(normaliseIp("fe80::0001")).toBe("fe80::1")
    // A single zero group is not compressed.
    expect(normaliseIp("2001:db8:0:1:1:1:1:1")).toBe("2001:db8:0:1:1:1:1:1")
  })
  it("keeps IPv4-mapped tails and drops brackets and zones", () => {
    expect(normaliseIp("::FFFF:192.0.2.1")).toBe("::ffff:192.0.2.1")
    expect(normaliseIp("[2001:db8::1]")).toBe("2001:db8::1")
    expect(normaliseIp("fe80::1%eth0")).toBe("fe80::1")
  })
  it("rejects malformed addresses", () => {
    expect(normaliseIp("2001:db8::1::2")).toBeNull()
    expect(normaliseIp("2001:db8:g::1")).toBeNull()
    expect(normaliseIp("1:2:3:4:5:6:7:8:9")).toBeNull()
  })
})

describe("CIDR", () => {
  it("refuses a prefix unless asked, and requires one when told", () => {
    expect(parseIp("10.0.0.0/8").ok).toBe(false)
    expect(normaliseIp("10.0.0.0/8", { cidr: "optional" })).toBe("10.0.0.0/8")
    expect(normaliseIp("10.0.0.1", { cidr: "optional" })).toBe("10.0.0.1")
    expect(parseIp("10.0.0.0", { cidr: "required" }).ok).toBe(false)
  })
  it("checks the prefix length per version", () => {
    expect(parseIp("10.0.0.0/33", { cidr: "required" }).ok).toBe(false)
    expect(normaliseIp("2001:DB8::/32", { cidr: "required" })).toBe("2001:db8::/32")
    expect(parseIp("2001:db8::/129", { cidr: "required" }).ok).toBe(false)
  })
  it("finds the network and describes the range", () => {
    const host = ok("192.168.1.10/24", { cidr: "required" })
    expect(isNetworkAddress(host)).toBe(false)
    expect(networkOf(host).address).toBe("192.168.1.0")
    expect(describeRange(host)).toBe("254 hosts · 192.168.1.1–192.168.1.254")
    expect(describeRange(ok("10.13.4.0/22", { cidr: "required" }))).toBe("1,022 hosts · 10.13.4.1–10.13.7.254")
    expect(describeRange(ok("10.0.0.1/32", { cidr: "required" }))).toBe("1 host")
    expect(networkOf(ok("2001:db8::abcd/64", { cidr: "required" })).address).toBe("2001:db8::")
  })
})
