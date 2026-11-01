// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useState } from "react"
import { afterEach, expect, it, vi } from "vitest"
import { Tabs, type TabItem } from "./index.js"

const extras = vi.hoisted(() => ({ arrive: () => {}, waiting: false }))
vi.mock("./tab-extras.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./tab-extras.js")>()
  await new Promise<void>((resolve) => {
    extras.arrive = resolve
    extras.waiting = true
  })
  return actual
})

const ITEMS: TabItem[] = [
  { value: "a", label: "Alpha", closable: true },
  { value: "b", label: "Beta", closable: true },
]

function Strip() {
  const [items, setItems] = useState(ITEMS)
  return (
    <Tabs.Root defaultValue="a">
      <Tabs.List items={items} aria-label="Files" onClose={(value) => setItems((list) => list.filter((item) => item.value !== value))} />
    </Tabs.Root>
  )
}

afterEach(cleanup)

it("hands selection on when a close lands in the same commit as the extras arriving", async () => {
  render(<Strip />)
  await waitFor(() => expect(extras.waiting).toBe(true))
  const alpha = screen.getByRole("tab", { name: "Alpha" })
  alpha.focus()
  // The strip remounts under the extras here: the close must survive that.
  await act(async () => {
    extras.arrive()
    await new Promise((resolve) => setTimeout(resolve, 0))
    fireEvent.keyDown(alpha, { key: "Delete" })
  })
  await waitFor(() => expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("aria-selected", "true"))
})
