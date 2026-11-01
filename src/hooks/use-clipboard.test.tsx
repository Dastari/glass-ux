// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useClipboard } from "./index.js"

function Demo({ text = "10.0.0.5", timeout }: { text?: string | (() => string); timeout?: number }) {
  const { copy, copied, error, reset } = useClipboard({ timeout })
  return (
    <>
      <button type="button" onClick={() => void copy(text)}>
        Copy
      </button>
      <button type="button" onClick={reset}>
        Reset
      </button>
      <output>{copied ? "copied" : error ? `failed: ${error.message}` : "idle"}</output>
    </>
  )
}

const flush = () => act(async () => { await Promise.resolve() })

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(document, "execCommand")
})

describe("useClipboard", () => {
  it("copies with the Clipboard API, shows copied for the timeout, then settles", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal("navigator", { clipboard: { writeText } })
    render(<Demo timeout={1500} />)
    fireEvent.click(screen.getByText("Copy"))
    await flush()
    expect(writeText).toHaveBeenCalledWith("10.0.0.5")
    expect(screen.getByText("copied")).toBeTruthy()
    act(() => { vi.advanceTimersByTime(1499) })
    expect(screen.getByText("copied")).toBeTruthy()
    act(() => { vi.advanceTimersByTime(2) })
    expect(screen.getByText("idle")).toBeTruthy()
  })

  it("builds the text only when copying, and restarts the timer on a second copy", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal("navigator", { clipboard: { writeText } })
    const build = vi.fn(() => "built")
    render(<Demo text={build} timeout={1000} />)
    expect(build).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText("Copy"))
    await flush()
    act(() => { vi.advanceTimersByTime(800) })
    fireEvent.click(screen.getByText("Copy"))
    await flush()
    act(() => { vi.advanceTimersByTime(800) })
    expect(screen.getByText("copied")).toBeTruthy()
    act(() => { vi.advanceTimersByTime(300) })
    expect(screen.getByText("idle")).toBeTruthy()
    expect(writeText).toHaveBeenLastCalledWith("built")
  })

  it("reports a refusal as an error and resolves false", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } })
    let result: boolean | undefined
    function Probe() {
      const { copy, error } = useClipboard()
      return (
        <button type="button" onClick={() => void copy("x").then((ok) => (result = ok))}>
          {error ? error.message : "go"}
        </button>
      )
    }
    render(<Probe />)
    fireEvent.click(screen.getByRole("button"))
    await flush()
    expect(result).toBe(false)
    expect(screen.getByText("denied")).toBeTruthy()
  })

  it("falls back to a hidden textarea where there is no Clipboard API, and fails when that cannot copy", async () => {
    vi.stubGlobal("navigator", {})
    const exec = vi.fn().mockReturnValue(true)
    Object.defineProperty(document, "execCommand", { value: exec, configurable: true })
    render(<Demo />)
    fireEvent.click(screen.getByText("Copy"))
    await flush()
    expect(exec).toHaveBeenCalledWith("copy")
    expect(screen.getByText("copied")).toBeTruthy()
    expect(document.querySelector("textarea")).toBeNull()
    exec.mockReturnValue(false)
    fireEvent.click(screen.getByText("Copy"))
    await flush()
    expect(screen.getByText("failed: Clipboard unavailable")).toBeTruthy()
    fireEvent.click(screen.getByText("Reset"))
    expect(screen.getByText("idle")).toBeTruthy()
  })

  it("stops its timer when the component unmounts", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
    const { unmount } = render(<Demo />)
    fireEvent.click(screen.getByText("Copy"))
    await flush()
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
