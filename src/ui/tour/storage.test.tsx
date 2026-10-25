// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { markTourCompleted, resetTour, tourCompleted, useTourCompletion } from "./storage.js"

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function Status({ storageKey }: { storageKey: string }) {
  const { completed } = useTourCompletion(storageKey)
  return <p>{completed ? "done" : "new"}</p>
}

describe("tour completion", () => {
  it("records, reads and forgets completion per key", () => {
    expect(tourCompleted("intro:v1:ana")).toBe(false)
    markTourCompleted("intro:v1:ana")
    expect(tourCompleted("intro:v1:ana")).toBe(true)
    expect(tourCompleted("intro:v1:ben")).toBe(false)
    resetTour("intro:v1:ana")
    expect(tourCompleted("intro:v1:ana")).toBe(false)
  })

  it("keeps components that read it current", () => {
    render(<Status storageKey="intro:v2" />)
    expect(screen.getByText("new")).toBeTruthy()
    act(() => markTourCompleted("intro:v2"))
    expect(screen.getByText("done")).toBeTruthy()
    act(() => resetTour("intro:v2"))
    expect(screen.getByText("new")).toBeTruthy()
  })
})
