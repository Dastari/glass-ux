// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Profiler, useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ImageViewer, Lightbox, type LightboxImage } from "./index.js"

const IMAGES: LightboxImage[] = [
  { src: "data:image/gif;base64,AAAA", alt: "First", width: 1600, height: 1000 },
  { src: "data:image/gif;base64,BBBB", alt: "Second", width: 800, height: 600 },
  { src: "data:image/gif;base64,CCCC", alt: "Third", width: 600, height: 800 },
]

const stageSized = (stage: HTMLElement, width: number, height: number) => {
  Object.defineProperty(stage, "clientWidth", { configurable: true, value: width })
  Object.defineProperty(stage, "clientHeight", { configurable: true, value: height })
}
const live = () => document.querySelector('[aria-live="polite"][aria-atomic="true"]')
const key = (name: string, init: KeyboardEventInit = {}) => act(() => void fireEvent.keyDown(window, { key: name, ...init }))
const loaded = (alt: string) => act(() => void fireEvent.load(screen.getByRole("img", { name: alt })))

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })))
  vi.stubGlobal("requestAnimationFrame", (run: FrameRequestCallback) => setTimeout(() => run(performance.now()), 0) as unknown as number)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("Lightbox: view", () => {
  it("rotates with R and Shift+R, in the fit, and starts the next picture upright", async () => {
    render(<Lightbox images={IMAGES} defaultOpen />)
    const stage = await screen.findByRole("region", { name: "First" })
    stageSized(stage, 800, 800)
    const picture = () => document.querySelector<HTMLElement>(".fa-lightbox-picture")!
    const plane = () => document.querySelector<HTMLElement>(".fa-lightbox-plane")!
    expect(plane().style.width).toBe("1600px")
    key("r")
    expect(picture().style.transform).toContain("rotate(90deg)")
    expect(plane().style.width).toBe("1000px")
    expect(plane().style.height).toBe("1600px")
    expect(picture().style.width).toBe("1600px")
    key("R", { shiftKey: true })
    expect(picture().style.transform).toContain("rotate(0deg)")
    key("r")
    fireEvent.click(screen.getByRole("button", { name: "Next image" }))
    expect(picture().style.transform).toContain("rotate(0deg)")
  })

  it("flips without changing the source, and resets per picture", async () => {
    render(<Lightbox images={IMAGES} defaultOpen />)
    await screen.findByRole("region", { name: "First" })
    const source = screen.getByRole("img", { name: "First" }).getAttribute("src")
    fireEvent.click(screen.getByRole("button", { name: "Flip horizontally" }))
    expect(document.querySelector<HTMLElement>(".fa-lightbox-picture")!.style.transform).toContain("scale(-1, 1)")
    expect(screen.getByRole("img", { name: "First" }).getAttribute("src")).toBe(source)
    key("ArrowRight")
    expect(document.querySelector<HTMLElement>(".fa-lightbox-picture")!.style.transform).toContain("scale(1, 1)")
  })

  it("offers only the tool groups asked for, and ignores their keys", async () => {
    render(<Lightbox images={IMAGES} defaultOpen tools={["flip"]} />)
    await screen.findByRole("region", { name: "First" })
    expect(screen.queryByRole("button", { name: "Rotate right" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Start slideshow" })).toBeNull()
    expect(screen.getByRole("button", { name: "Flip vertically" })).toBeTruthy()
    key("r")
    expect(document.querySelector<HTMLElement>(".fa-lightbox-picture")!.style.transform).toContain("rotate(0deg)")
  })

  it("reads actual size as 1:1 and stops at maxZoom", async () => {
    render(<Lightbox images={IMAGES} defaultOpen maxZoom={2} />)
    const stage = await screen.findByRole("region", { name: "First" })
    stageSized(stage, 800, 800)
    key("0")
    expect(screen.getByText("Fit")).toBeTruthy()
    key("1")
    expect(screen.getByText("1:1", { selector: ".fa-lightbox-zoom" })).toBeTruthy()
    for (let press = 0; press < 8; press += 1) key("+")
    expect(screen.getByText("400%")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Zoom in" }).getAttribute("aria-disabled")).toBe("true")
  })

  it("commits a wheel gesture once, without rendering per event", async () => {
    vi.useFakeTimers()
    const renders = vi.fn()
    const { rerender } = render(
      <Profiler id="viewer" onRender={renders}>
        <Lightbox images={IMAGES} defaultOpen />
      </Profiler>
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })
    const stage = screen.getByRole("region", { name: "First" })
    stageSized(stage, 800, 500)
    await act(async () => {
      fireEvent.keyDown(window, { key: "0" })
      await vi.advanceTimersByTimeAsync(50)
    })
    renders.mockClear()
    await act(async () => {
      for (let tick = 0; tick < 20; tick += 1) {
        fireEvent.wheel(stage, { deltaY: -20, clientX: 400, clientY: 250 })
        await vi.advanceTimersByTimeAsync(16)
      }
    })
    expect(renders).toHaveBeenCalledTimes(0)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })
    expect(renders.mock.calls.length).toBeLessThanOrEqual(1)
    expect(document.querySelector(".fa-lightbox-zoom")!.textContent).toMatch(/^\d+%$/)
    rerender(<div />)
  })
})

describe("Lightbox: moving between pictures", () => {
  it("keeps focus on the Next button and the same stage, as neither remounts", async () => {
    render(<Lightbox images={IMAGES} defaultOpen />)
    const stage = await screen.findByRole("region", { name: "First" })
    const next = screen.getByRole("button", { name: "Next image" })
    next.focus()
    fireEvent.click(next)
    expect(document.activeElement).toBe(next)
    expect(screen.getByRole("region", { name: "Second" })).toBe(stage)
  })
})

describe("Lightbox: slideshow", () => {
  it("advances once the picture has loaded, announces the start and stop only, and stops on a key", () => {
    vi.useFakeTimers()
    const change = vi.fn()
    function Host() {
      const [index, setIndex] = useState(0)
      return <Lightbox images={IMAGES} defaultOpen slideshowInterval={1000} index={index} onIndexChange={(next) => (change(next), setIndex(next))} />
    }
    render(<Host />)
    act(() => void vi.advanceTimersByTime(0))
    fireEvent.click(screen.getByRole("button", { name: "Start slideshow" }))
    expect(live()?.textContent).toBe("Slideshow started")
    act(() => void vi.advanceTimersByTime(5000))
    expect(change).not.toHaveBeenCalled()
    loaded("First")
    act(() => void vi.advanceTimersByTime(1000))
    expect(change).toHaveBeenLastCalledWith(1)
    expect(live()?.textContent).toBe("Slideshow started")
    loaded("Second")
    key("ArrowLeft")
    expect(live()?.textContent).toBe("Slideshow stopped. Image 1 of 3: First")
    expect(screen.getByRole("button", { name: "Start slideshow" })).toBeTruthy()
    loaded("First")
    change.mockClear()
    act(() => void vi.advanceTimersByTime(5000))
    expect(change).not.toHaveBeenCalled()
  })

  it("keeps focus on its button as pictures change", () => {
    vi.useFakeTimers()
    render(<Lightbox images={IMAGES} defaultOpen slideshowInterval={1000} />)
    act(() => void vi.advanceTimersByTime(0))
    const button = screen.getByRole("button", { name: "Start slideshow" })
    button.focus()
    fireEvent.click(button)
    loaded("First")
    act(() => void vi.advanceTimersByTime(1000))
    expect(screen.getByRole("region", { name: "Second" })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Stop slideshow" }))
  })

  it("holds while the document is hidden, then waits a full interval", () => {
    vi.useFakeTimers()
    const change = vi.fn()
    render(<Lightbox images={IMAGES} defaultOpen slideshowInterval={1000} onIndexChange={change} />)
    act(() => void vi.advanceTimersByTime(0))
    fireEvent.click(screen.getByRole("button", { name: "Start slideshow" }))
    loaded("First")
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true)
    fireEvent(document, new Event("visibilitychange"))
    act(() => void vi.advanceTimersByTime(5000))
    expect(change).not.toHaveBeenCalled()
    hidden.mockReturnValue(false)
    fireEvent(document, new Event("visibilitychange"))
    act(() => void vi.advanceTimersByTime(999))
    expect(change).not.toHaveBeenCalled()
    act(() => void vi.advanceTimersByTime(1))
    expect(change).toHaveBeenCalledTimes(1)
  })

  it("stops at an item with its own content", () => {
    vi.useFakeTimers()
    const items = [IMAGES[0]!, { ...IMAGES[1]!, content: <p>Own content</p> }]
    render(<Lightbox images={items} defaultOpen slideshowInterval={1000} />)
    act(() => void vi.advanceTimersByTime(0))
    fireEvent.click(screen.getByRole("button", { name: "Start slideshow" }))
    loaded("First")
    act(() => void vi.advanceTimersByTime(1000))
    expect(screen.getByText("Own content")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Start slideshow" })).toBeTruthy()
  })
})

describe("Lightbox: loading", () => {
  it("shows a skeleton, then the picture", async () => {
    render(<Lightbox images={IMAGES} defaultOpen />)
    await screen.findByRole("region", { name: "First" })
    expect(document.querySelector(".fa-lightbox-skeleton")).toBeTruthy()
    loaded("First")
    expect(document.querySelector(".fa-lightbox-skeleton")).toBeNull()
  })

  it("shows a placeholder while the source loads, and holds it while pending", async () => {
    const { rerender } = render(<Lightbox images={[{ ...IMAGES[0]!, pending: true, placeholder: "data:image/gif;base64,DDDD" }]} defaultOpen />)
    await screen.findByRole("region", { name: "First" })
    expect(document.querySelector(".fa-lightbox-placeholder")).toBeTruthy()
    expect(screen.queryByRole("img", { name: "First" })).toBeNull()
    rerender(<Lightbox images={[{ ...IMAGES[0]!, placeholder: "data:image/gif;base64,DDDD" }]} defaultOpen />)
    expect(screen.getByRole("img", { name: "First" })).toBeTruthy()
    loaded("First")
    expect(document.querySelector(".fa-lightbox-placeholder")).toBeNull()
  })

  it("offers a retry on failure, announces it, and makes the tools say why they are unavailable", async () => {
    render(<Lightbox images={IMAGES} defaultOpen />)
    await screen.findByRole("region", { name: "First" })
    act(() => void fireEvent.error(screen.getByRole("img", { name: "First" })))
    expect(live()?.textContent).toBe("Couldn't load First")
    expect(screen.getByRole("button", { name: "Zoom in" }).getAttribute("aria-disabled")).toBe("true")
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(screen.getByRole("img", { name: "First" })).toBeTruthy()
    expect(document.querySelector(".fa-lightbox-skeleton")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull()
  })

  it("loads the neighbours and not the rest", async () => {
    const assigned = vi.spyOn(HTMLImageElement.prototype, "src", "set")
    const set = Array.from({ length: 6 }, (_, position) => ({ src: `data:image/gif;base64,${position}`, alt: `Picture ${position}` }))
    render(<Lightbox images={set} defaultOpen defaultIndex={2} thumbnails={false} />)
    await screen.findByRole("region", { name: "Picture 2" })
    // The picture on show and its neighbours; React assigns the first itself.
    expect(assigned.mock.calls.flat().sort()).toEqual(["data:image/gif;base64,1", "data:image/gif;base64,2", "data:image/gif;base64,3"])
    assigned.mockRestore()
  })

  it("does not load a neighbour that has its own content", async () => {
    const assigned = vi.spyOn(HTMLImageElement.prototype, "src", "set")
    const set = [IMAGES[0]!, { ...IMAGES[1]!, content: <p>Own content</p> }]
    render(<Lightbox images={set} defaultOpen thumbnails={false} />)
    await screen.findByRole("region", { name: "First" })
    expect(assigned.mock.calls.flat()).toEqual([IMAGES[0]!.src])
    assigned.mockRestore()
  })
})

describe("Lightbox: full screen and details", () => {
  const supported = () => {
    Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: true })
    Object.defineProperty(Element.prototype, "requestFullscreen", {
      configurable: true,
      value: vi.fn(function (this: Element) {
        Object.defineProperty(document, "fullscreenElement", { configurable: true, value: this })
        document.dispatchEvent(new Event("fullscreenchange"))
        return Promise.resolve()
      }),
    })
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: vi.fn(() => {
        Object.defineProperty(document, "fullscreenElement", { configurable: true, value: null })
        document.dispatchEvent(new Event("fullscreenchange"))
        return Promise.resolve()
      }),
    })
  }
  afterEach(() => {
    Reflect.deleteProperty(document, "fullscreenEnabled")
    Reflect.deleteProperty(document, "fullscreenElement")
    Reflect.deleteProperty(document, "exitFullscreen")
    Reflect.deleteProperty(Element.prototype, "requestFullscreen")
  })

  it("hides the control where full screen is unavailable, and ignores F", async () => {
    render(<Lightbox images={IMAGES} defaultOpen />)
    await screen.findByRole("region", { name: "First" })
    expect(screen.queryByRole("button", { name: "Full screen" })).toBeNull()
    expect(() => key("f")).not.toThrow()
  })

  it("enters with F on the viewer; Esc leaves full screen first, then closes", async () => {
    supported()
    const change = vi.fn()
    render(<Lightbox images={IMAGES} defaultOpen onOpenChange={change} />)
    await screen.findByRole("region", { name: "First" })
    key("f")
    expect((document.fullscreenElement as Element).className).toContain("fa-lightbox-viewer")
    expect(screen.getByRole("button", { name: "Exit full screen" })).toBeTruthy()
    act(() => void fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" }))
    expect(document.fullscreenElement).toBeNull()
    expect(change).not.toHaveBeenCalled()
    act(() => void fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" }))
    expect(change).toHaveBeenCalledWith(false)
  })

  it("fades the chrome after a moment in full screen, and any input brings it back", async () => {
    supported()
    render(<Lightbox images={IMAGES} defaultOpen />)
    const stage = await screen.findByRole("region", { name: "First" })
    key("f")
    vi.useFakeTimers()
    act(() => void fireEvent.pointerMove(stage))
    const viewer = document.querySelector(".fa-lightbox-viewer")!
    expect(viewer.hasAttribute("data-chrome-idle")).toBe(false)
    act(() => void vi.advanceTimersByTime(3100))
    expect(viewer.hasAttribute("data-chrome-idle")).toBe(true)
    act(() => void fireEvent.pointerMove(stage))
    expect(viewer.hasAttribute("data-chrome-idle")).toBe(false)
  })

  it("keeps the chrome when asked to", async () => {
    supported()
    render(<Lightbox images={IMAGES} defaultOpen autoHideChrome={false} />)
    await screen.findByRole("region", { name: "First" })
    key("f")
    vi.useFakeTimers()
    act(() => void vi.advanceTimersByTime(5000))
    expect(document.querySelector(".fa-lightbox-viewer")!.hasAttribute("data-chrome-idle")).toBe(false)
  })

  it("shows details for the picture on show, and toggles them", async () => {
    const onChange = vi.fn()
    render(<Lightbox images={IMAGES} defaultOpen renderInfo={(image) => <p>About {image.alt}</p>} onInfoOpenChange={onChange} />)
    await screen.findByRole("region", { name: "First" })
    const toggle = screen.getByRole("button", { name: "Details" })
    expect(toggle.getAttribute("aria-expanded")).toBe("false")
    fireEvent.click(toggle)
    expect(onChange).toHaveBeenCalledWith(true)
    expect(screen.getByRole("complementary", { name: "Details" }).textContent).toBe("About First")
    key("ArrowRight")
    expect(screen.getByRole("complementary", { name: "Details" }).textContent).toBe("About Second")
  })
})

describe("Lightbox: custom content", () => {
  const items = [{ ...IMAGES[0]!, content: <button type="button">Own control</button> }, IMAGES[1]!]

  it("puts the content in the stage and makes the view tools unavailable", async () => {
    render(<Lightbox images={items} defaultOpen />)
    await screen.findByRole("button", { name: "Own control" })
    expect(document.querySelector(".fa-lightbox-plane")).toBeNull()
    expect(screen.getByRole("button", { name: "Zoom in" }).getAttribute("aria-disabled")).toBe("true")
    expect(screen.getByRole("button", { name: "Rotate right" }).getAttribute("aria-disabled")).toBe("true")
  })

  it("leaves keys pressed inside the content to the content", async () => {
    const change = vi.fn()
    render(<Lightbox images={items} defaultOpen onIndexChange={change} />)
    const control = await screen.findByRole("button", { name: "Own control" })
    act(() => void fireEvent.keyDown(control, { key: "ArrowRight" }))
    expect(change).not.toHaveBeenCalled()
  })
})

describe("Lightbox: thumbnails", () => {
  it("is one tab stop on the current picture, and focus follows the arrow keys", async () => {
    render(<Lightbox images={IMAGES} defaultOpen />)
    await screen.findByRole("region", { name: "First" })
    const first = screen.getByRole("button", { name: "Show First" })
    const second = screen.getByRole("button", { name: "Show Second" })
    expect(first.tabIndex).toBe(0)
    expect(second.tabIndex).toBe(-1)
    first.focus()
    act(() => void fireEvent.keyDown(first, { key: "ArrowRight" }))
    expect(second.getAttribute("aria-current")).toBe("true")
    expect(document.activeElement).toBe(second)
    expect(second.tabIndex).toBe(0)
  })

  it("goes to the ends with Home and End", async () => {
    render(<Lightbox images={IMAGES} defaultOpen />)
    await screen.findByRole("region", { name: "First" })
    act(() => void fireEvent.keyDown(screen.getByRole("button", { name: "Show First" }), { key: "End" }))
    expect(screen.getByRole("button", { name: "Show Third" }).getAttribute("aria-current")).toBe("true")
  })

  it("gives a source only to thumbnails the strip reports in view", async () => {
    const observed: { callback: IntersectionObserverCallback; elements: Element[] }[] = []
    vi.stubGlobal("IntersectionObserver", class {
      elements: Element[] = []
      constructor(callback: IntersectionObserverCallback) {
        observed.push({ callback, elements: this.elements })
      }
      observe(element: Element) {
        this.elements.push(element)
      }
      unobserve() {}
      disconnect() {}
    })
    const set = Array.from({ length: 300 }, (_, position) => ({ id: `${position}`, src: `data:image/gif;base64,${position}`, alt: `Picture ${position}` }))
    render(<Lightbox images={set} defaultOpen />)
    await screen.findByRole("region", { name: "Picture 0" })
    const thumbnails = [...document.querySelectorAll<HTMLImageElement>(".fa-lightbox-thumbnail img")]
    expect(thumbnails).toHaveLength(300)
    expect(thumbnails.filter((image) => image.hasAttribute("src"))).toHaveLength(0)
    act(() => observed[0]!.callback([{ target: thumbnails[3]!, isIntersecting: true } as unknown as IntersectionObserverEntry], {} as IntersectionObserver))
    expect(thumbnails.filter((image) => image.hasAttribute("src"))).toEqual([thumbnails[3]])
  })
})

describe("ImageViewer", () => {
  it("is the viewer in the page, with its own index and no dialog", () => {
    const change = vi.fn()
    render(<ImageViewer images={IMAGES} onIndexChange={change} aria-label="Sample set" />)
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.getByRole("group", { name: "Sample set" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Next image" }))
    expect(change).toHaveBeenCalledWith(1)
    expect(screen.getByRole("region", { name: "Second" })).toBeTruthy()
  })

  it("hears its keys from inside itself, and leaves the page's alone", () => {
    const change = vi.fn()
    render(<ImageViewer images={IMAGES} onIndexChange={change} />)
    act(() => void fireEvent.keyDown(document.body, { key: "ArrowRight" }))
    expect(change).not.toHaveBeenCalled()
    act(() => void fireEvent.keyDown(screen.getByRole("region", { name: "First" }), { key: "ArrowRight" }))
    expect(change).toHaveBeenCalledWith(1)
  })

  it("renders nothing without a picture at the index", () => {
    const { container } = render(<ImageViewer images={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
