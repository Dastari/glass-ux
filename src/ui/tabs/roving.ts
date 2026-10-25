import { readingKey } from "../../lib/direction.js"
import type { KeyboardEvent } from "react"

export type RovingOrientation = "horizontal" | "vertical"

/**
 * Tab-strip keyboard for a list of links, matching Base UI Tabs so route tabs and local tabs
 * behave identically: arrows move focus along the orientation (wrapping), Home / End jump,
 * Space activates the focused item (Enter already follows a link). Attach it to each item;
 * the group is the nearest `[data-roving-group]` and its items are the `[data-roving]`
 * descendants that are not inside a hidden subtree.
 */
export function rovingKeyDown(event: KeyboardEvent<HTMLElement>, orientation: RovingOrientation) {
  const key = readingKey(event.key, event.currentTarget)
  const [back, forward] = orientation === "horizontal" ? ["ArrowLeft", "ArrowRight"] : ["ArrowUp", "ArrowDown"]
  const group = event.currentTarget.closest("[data-roving-group]") ?? event.currentTarget
  const items = Array.from(group.querySelectorAll<HTMLElement>("[data-roving]")).filter(
    (item) => !item.closest("[hidden]") && !item.hasAttribute("aria-disabled")
  )
  const index = items.indexOf(document.activeElement as HTMLElement)
  if (index < 0 || items.length === 0) return
  let next = -1
  if (key === back) next = (index - 1 + items.length) % items.length
  else if (key === forward) next = (index + 1) % items.length
  else if (key === "Home") next = 0
  else if (key === "End") next = items.length - 1
  else if (key === " ") {
    event.preventDefault()
    items[index]?.click()
    return
  } else return
  event.preventDefault()
  items[next]?.focus()
}
