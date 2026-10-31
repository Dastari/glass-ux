import { describe, expect, it } from "vitest"
import { foldText } from "./fold.js"

describe("foldText", () => {
  it("ignores case and accents", () => {
    expect(foldText("Müller")).toBe("muller")
    expect(foldText("MULLER")).toBe(foldText("Müller"))
    expect(foldText("Crème Brûlée")).toBe("creme brulee")
    expect(foldText("Nguyễn")).toBe("nguyen")
  })
  it("leaves plain ASCII alone beyond case", () => {
    expect(foldText("NST-C106 AzureAD\\MiraRowan")).toBe("nst-c106 azuread\\mirarowan")
  })
  it("keeps marks that change a letter's identity", () => {
    expect(foldText("が")).toBe("が")
    expect(foldText("が")).not.toBe(foldText("か"))
    expect(foldText("ก็")).toBe("ก็")
  })
  it("lower-cases by the locale's rules", () => {
    expect(foldText("ISPARTA", "tr")).toBe("ısparta")
    expect(foldText("İstanbul", "tr")).toBe("istanbul")
    expect(foldText("ISPARTA", "en")).toBe("isparta")
    expect(foldText("İstanbul", "en")).toBe("istanbul")
  })
  it("keeps a folded character the same length for highlighting", () => {
    expect(foldText("Café Orford").length).toBe("Café Orford".length)
    expect(foldText("がぎ한").length).toBe(3)
  })
})
