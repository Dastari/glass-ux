// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Image } from "./image.js"

afterEach(cleanup)

const frame = (container: HTMLElement) => container.querySelector(".fa-image") as HTMLElement

describe("Image", () => {
  it("reserves the frame and shimmers until the picture loads, then fades it in", () => {
    const { container } = render(<Image src="/pier.jpg" alt="North pier at dawn" ratio="wide" />)
    expect(frame(container).dataset.state).toBe("loading")
    expect(frame(container).style.getPropertyValue("--fa-aspect-ratio")).toBe(String(16 / 9))
    expect(container.querySelector(".fa-shimmer")).not.toBeNull()
    const img = container.querySelector("img")!
    expect(img.getAttribute("loading")).toBe("lazy")
    fireEvent.load(img)
    expect(frame(container).dataset.state).toBe("loaded")
    expect(container.querySelector(".fa-shimmer")).toBeNull()
  })

  it("uses the picture's colour instead of the shimmer", () => {
    const { container } = render(<Image src="/pier.jpg" alt="" color="#3a5a7a" />)
    expect(container.querySelector(".fa-shimmer")).toBeNull()
    expect(frame(container).style.getPropertyValue("--_image-color")).toBe("#3a5a7a")
  })

  it("shows the broken-image fallback, named by the alt text, when loading fails", () => {
    const onStateChange = vi.fn()
    const { container, getByRole } = render(<Image src="/missing.jpg" alt="Tide gauge" onStateChange={onStateChange} />)
    fireEvent.error(container.querySelector("img")!)
    expect(frame(container).dataset.state).toBe("error")
    expect(container.querySelector("img")).toBeNull()
    expect(getByRole("img", { name: "Tide gauge" }).querySelector('[data-icon="image-off"]')).not.toBeNull()
    expect(onStateChange.mock.calls.map(([state]) => state)).toEqual(["loading", "error"])
  })

  it("shows the empty fallback without a source, hidden when decorative", () => {
    const { container } = render(<Image alt="" />)
    expect(frame(container).dataset.state).toBe("empty")
    const fallback = container.querySelector(".fa-image-fallback")!
    expect(fallback.getAttribute("aria-hidden")).toBe("true")
    expect(fallback.querySelector('[data-icon="image"]')).not.toBeNull()
  })

  it("starts over when the source changes", () => {
    const { container, rerender } = render(<Image src="/a.jpg" alt="A" />)
    fireEvent.error(container.querySelector("img")!)
    rerender(<Image src="/b.jpg" alt="B" />)
    expect(frame(container).dataset.state).toBe("loading")
    act(() => void fireEvent.load(container.querySelector("img")!))
    expect(frame(container).dataset.state).toBe("loaded")
  })

  it("takes a custom fallback, a hover effect and no rim", () => {
    const { container, getByText } = render(
      <Image alt="Chart" hover="zoom" frame={false} fallback={<span>No preview</span>} />
    )
    expect(getByText("No preview")).toBeTruthy()
    expect(frame(container).dataset.hover).toBe("zoom")
    expect(frame(container).hasAttribute("data-frame")).toBe(false)
  })
})
