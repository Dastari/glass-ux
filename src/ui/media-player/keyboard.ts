import type { KeyboardEvent } from "react"
import { readingKey } from "../../lib/direction.js"
import { shortcutAllowed } from "../kbd/shortcut.js"
import type { MediaPlayerController } from "./controller.js"
import { mediaCommand, stepRate } from "./state.js"

export interface MediaKeyOptions {
  player: MediaPlayerController
  rates: readonly number[]
  /** Toggle full screen; absent where there is none. */
  fullscreen?: (() => void) | undefined
}

/**
 * The player's shortcuts. Bound to the player's own element, so they apply only while focus
 * is inside it. Arrow keys go through `readingKey` on the seek bar: the timeline keeps its
 * left-to-right direction in every language, so → is forward there too.
 */
export function onMediaKeyDown(event: KeyboardEvent<HTMLElement>, { player, rates, fullscreen }: MediaKeyOptions) {
  if (event.defaultPrevented) return
  const target = event.target as Element
  if (target.closest(".fa-menu, textarea, select, [contenteditable='true']")) return
  const input = target.closest("input")
  if (input && input.type !== "range") return
  const otherSlider = input && !input.classList.contains("fa-media-seek-input")
  const onControl = target.closest("button, a[href], [role='button']")
  const timeline = event.currentTarget.querySelector(".fa-media-seek") ?? event.currentTarget
  const key = readingKey(event.key, timeline)
  if (otherSlider && /^(?:Arrow|Home$|End$|Page)/.test(key)) return
  if (onControl && key === " ") return
  const found = mediaCommand(event, key)
  if (!found || !shortcutAllowed(found.shortcut)) return
  const { command } = found
  const state = player.getState()
  const time = player.getTime()
  switch (command.type) {
    case "toggle":
      player.toggle()
      break
    case "seek-by":
      player.seekBy(command.seconds)
      break
    case "seek-fraction":
      player.seek(time.seekableStart + command.fraction * (time.seekableEnd - time.seekableStart))
      break
    case "volume-by":
      player.setVolume((state.muted ? 0 : state.volume) + command.delta)
      break
    case "mute":
      player.toggleMuted()
      break
    case "fullscreen":
      if (!fullscreen) return
      fullscreen()
      break
    case "captions":
      if (!state.captions.length) return
      player.toggleCaptions()
      break
    case "speed":
      player.setPlaybackRate(stepRate(rates, state.playbackRate, command.delta))
      break
  }
  event.preventDefault()
}
