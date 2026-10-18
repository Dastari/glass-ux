// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { feedbackHold, motionScale, prefersReducedMotion, scaledDuration } from "./motion.js"
import { installPointerLight, isTransparencyReduced } from "./appearance/optics.js"
import { placeGlide } from "./glide.js"

function mockMedia(matching: string[]) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: matching.includes(query),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }))
}

afterEach(() => {
  vi.unstubAllGlobals()
  const root = document.documentElement
  delete root.dataset.motion
  delete root.dataset.glass
  root.removeAttribute("style")
  document.body.innerHTML = ""
})

describe("motion switch", () => {
  it("follows Still, Animated and the OS preference like the CSS switch", () => {
    const root = document.documentElement
    mockMedia(["(prefers-reduced-motion: reduce)"])
    expect(prefersReducedMotion()).toBe(true)
    root.dataset.motion = "full"
    expect(prefersReducedMotion()).toBe(false)
    root.dataset.motion = "reduced"
    mockMedia([])
    expect(prefersReducedMotion()).toBe(true)
    delete root.dataset.motion
    expect(prefersReducedMotion()).toBe(false)
  })

  it("reads --motion-scale and scales durations by it", () => {
    mockMedia([])
    document.documentElement.style.setProperty("--motion-scale", "0.01")
    expect(motionScale()).toBeCloseTo(0.01)
    expect(scaledDuration(1000)).toBeCloseTo(10)
    document.documentElement.style.removeProperty("--motion-scale")
    expect(motionScale()).toBe(1)
  })

  it("reads the feedback hold token in either unit", () => {
    expect(feedbackHold()).toBe(1800)
    document.documentElement.style.setProperty("--feedback-hold", "2.5s")
    expect(feedbackHold()).toBe(2500)
    document.documentElement.style.setProperty("--feedback-hold", "900ms")
    expect(feedbackHold()).toBe(900)
  })
})

describe("material switch", () => {
  it("turns optics off in Solid and for reduced transparency unless Glass is chosen", () => {
    const root = document.documentElement
    mockMedia(["(prefers-reduced-transparency: reduce)"])
    root.dataset.glass = "full"
    expect(isTransparencyReduced()).toBe(false)
    root.dataset.glass = "reduced"
    expect(isTransparencyReduced()).toBe(true)
    mockMedia([])
    expect(isTransparencyReduced()).toBe(false)
    root.dataset.glass = "solid"
    expect(isTransparencyReduced()).toBe(true)
  })
})

describe("pointer light", () => {
  function setup() {
    document.body.innerHTML = `<div id="outer"><button class="fa-lit" id="lit"><span id="label">Save</span></button></div>`
    const lit = document.getElementById("lit") as HTMLElement
    lit.getBoundingClientRect = () => ({ left: 100, top: 50, width: 80, height: 40, right: 180, bottom: 90, x: 100, y: 50, toJSON() {} })
    return lit
  }
  const frames: FrameRequestCallback[] = []
  const flush = () => frames.splice(0).forEach((frame) => frame(0))
  const move = (target: Element, x: number, y: number, pointerType = "mouse") => {
    const event = new MouseEvent("pointermove", { bubbles: true, clientX: x, clientY: y })
    Object.defineProperty(event, "pointerType", { value: pointerType })
    target.dispatchEvent(event)
    flush()
  }

  it("writes the light only to the hovered lit element, once per frame", () => {
    mockMedia(["(hover: hover) and (pointer: fine)"])
    vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => frames.push(frame))
    vi.stubGlobal("cancelAnimationFrame", () => {})
    const lit = setup()
    const remove = installPointerLight()
    move(document.getElementById("label")!, 130, 60)
    expect(lit.style.getPropertyValue("--light-x")).toBe("30px")
    expect(lit.style.getPropertyValue("--light-y")).toBe("10px")
    expect(document.getElementById("outer")!.getAttribute("style")).toBeNull()
    expect(document.documentElement.style.getPropertyValue("--light-x")).toBe("")
    remove()
    expect(lit.style.getPropertyValue("--light-x")).toBe("")
  })

  it("stays still for touch, under reduced motion and in Solid", () => {
    vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => frames.push(frame))
    vi.stubGlobal("cancelAnimationFrame", () => {})
    mockMedia(["(hover: hover) and (pointer: fine)"])
    const lit = setup()
    const remove = installPointerLight()
    move(lit, 130, 60, "touch")
    expect(lit.style.getPropertyValue("--light-x")).toBe("")
    document.documentElement.dataset.motion = "reduced"
    move(lit, 130, 60)
    expect(lit.style.getPropertyValue("--light-x")).toBe("")
    delete document.documentElement.dataset.motion
    document.documentElement.dataset.glass = "solid"
    move(lit, 130, 60)
    expect(lit.style.getPropertyValue("--light-x")).toBe("")
    remove()
  })
})

describe("glide", () => {
  function item(parent: HTMLElement, left: number, width: number) {
    const element = document.createElement("button")
    Object.defineProperties(element, { offsetLeft: { value: left }, offsetWidth: { value: width }, offsetTop: { value: 0 }, offsetHeight: { value: 32 } })
    parent.append(element)
    return element
  }

  it("places both edges on the indicator itself and records the direction", () => {
    const list = document.createElement("div")
    Object.defineProperty(list, "clientWidth", { value: 300 })
    const indicator = document.createElement("span")
    list.append(indicator)
    const first = item(list, 0, 100)
    const third = item(list, 200, 100)
    document.body.append(list)

    expect(placeGlide(indicator, first)).toBe(true)
    expect(indicator.style.getPropertyValue("--glide-start")).toBe("0px")
    expect(indicator.style.getPropertyValue("--glide-end")).toBe("200px")
    expect(indicator.hasAttribute("data-direction")).toBe(false)

    placeGlide(indicator, third)
    expect(indicator.style.getPropertyValue("--glide-start")).toBe("200px")
    expect(indicator.style.getPropertyValue("--glide-end")).toBe("0px")
    expect(indicator.dataset.direction).toBe("forward")

    placeGlide(indicator, first)
    expect(indicator.dataset.direction).toBe("backward")
    expect(list.getAttribute("style")).toBeNull()

    expect(placeGlide(indicator, null)).toBe(false)
    expect(indicator.style.getPropertyValue("--glide-start")).toBe("")
  })

  it("reaches items that scroll beyond the container", () => {
    const list = document.createElement("div")
    Object.defineProperty(list, "clientWidth", { value: 200 })
    const indicator = document.createElement("span")
    list.append(indicator)
    item(list, 0, 150)
    const last = item(list, 150, 150)
    placeGlide(indicator, last)
    expect(indicator.style.getPropertyValue("--glide-extent")).toBe("300px")
    expect(indicator.style.getPropertyValue("--glide-end")).toBe("0px")
  })
})
