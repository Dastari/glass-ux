import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { observeElementSize, observeElementSizes } from "./resize-observer.js"

class StubObserver {
  static instances: StubObserver[] = []
  observed = new Set<Element>()
  constructor(readonly callback: ResizeObserverCallback) {
    StubObserver.instances.push(this)
  }
  observe(element: Element) {
    this.observed.add(element)
  }
  unobserve(element: Element) {
    this.observed.delete(element)
  }
  disconnect() {
    this.observed.clear()
  }
  /** Deliver one batch of entries, as the browser does once per frame. */
  deliver(...targets: Element[]) {
    this.callback(
      targets.map((target) => ({ target }) as ResizeObserverEntry),
      this as unknown as ResizeObserver
    )
  }
}

const element = () => ({}) as Element

beforeEach(() => {
  StubObserver.instances = []
  // A fresh constructor per test, so the shared observer is recreated.
  vi.stubGlobal("ResizeObserver", class extends StubObserver {})
})
afterEach(() => vi.unstubAllGlobals())

describe("shared ResizeObserver", () => {
  it("serves every subscriber from one observer", () => {
    const a = element()
    const b = element()
    const first = vi.fn()
    const second = vi.fn()
    const stopA = observeElementSize(a, first)
    observeElementSize(b, second)
    expect(StubObserver.instances).toHaveLength(1)
    const observer = StubObserver.instances[0]!
    observer.deliver(a, b)
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
    stopA()
    expect(observer.observed.has(a)).toBe(false)
    observer.deliver(a, b)
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(2)
  })

  it("keeps an element observed until its last listener leaves", () => {
    const a = element()
    const stopFirst = observeElementSize(a, () => {})
    const stopSecond = observeElementSize(a, () => {})
    const observer = StubObserver.instances[0]!
    stopFirst()
    expect(observer.observed.has(a)).toBe(true)
    stopSecond()
    expect(observer.observed.has(a)).toBe(false)
  })

  it("calls a group once per delivery however many of its elements changed", () => {
    const a = element()
    const b = element()
    const callback = vi.fn()
    const group = observeElementSizes(callback)
    group.observe(a)
    group.observe(b)
    group.observe(a)
    const observer = StubObserver.instances[0]!
    observer.deliver(a, b)
    expect(callback).toHaveBeenCalledTimes(1)
    observer.deliver(b)
    expect(callback).toHaveBeenCalledTimes(2)
    group.unobserve(b)
    observer.deliver(b)
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it("runs two groups sharing a callback once each and stops after disconnect", () => {
    const a = element()
    const callback = vi.fn()
    const one = observeElementSizes(callback)
    const two = observeElementSizes(callback)
    one.observe(a)
    two.observe(a)
    const observer = StubObserver.instances[0]!
    observer.deliver(a)
    expect(callback).toHaveBeenCalledTimes(2)
    one.disconnect()
    two.disconnect()
    observer.deliver(a)
    expect(callback).toHaveBeenCalledTimes(2)
    expect(observer.observed.size).toBe(0)
    // A disconnected group can observe again, like a ResizeObserver.
    one.observe(a)
    observer.deliver(a)
    expect(callback).toHaveBeenCalledTimes(3)
  })

  it("does nothing without ResizeObserver", () => {
    vi.stubGlobal("ResizeObserver", undefined)
    const stop = observeElementSize(element(), () => {})
    expect(stop).not.toThrow()
    const group = observeElementSizes(() => {})
    expect(() => group.observe(element())).not.toThrow()
  })
})
