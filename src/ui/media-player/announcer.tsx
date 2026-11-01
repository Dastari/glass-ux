import { useEffect, useRef, useState } from "react"
import { formatPercent, numberFormat } from "../../lib/locale/intl.js"
import { VisuallyHidden } from "../visually-hidden/index.js"
import type { MediaPlayerController, MediaPlayerState } from "./controller.js"
import type { mediaPlayerMessages } from "./messages.js"
import type { MediaViewMode } from "./types.js"

const VIEW_LABEL = { inline: "viewInline", maximised: "viewMaximised", windowed: "viewWindowed", fullscreen: "viewFullscreen", pip: "viewPip" } as const
/** Volume settles before it is announced, so a slider drag says one value. */
const SETTLE_MS = 500

/** What changed between two states, as one sentence. */
function describe(before: MediaPlayerState, after: MediaPlayerState, t: typeof mediaPlayerMessages.defaults, locale: string): string | null {
  if (before.item !== after.item && after.item?.title) return t.announceItem(after.item.title)
  if (before.cast.status !== after.cast.status) {
    if (after.cast.status === "connected") return t.castingTo(after.cast.deviceName ?? t.castDevice)
    if (before.cast.status === "connected") return t.announceCastEnded
  }
  if (before.paused !== after.paused) return after.paused ? t.announcePaused : t.announcePlaying
  if (before.muted !== after.muted) return after.muted ? t.announceMuted : t.announceUnmuted
  if (before.playbackRate !== after.playbackRate) return t.announceSpeed(t.rate(numberFormat(locale, { maximumFractionDigits: 2 }).format(after.playbackRate)))
  if (before.caption !== after.caption) {
    const label = after.captions.find((track) => track.id === after.caption)?.label
    return label ? t.announceCaptions(label) : t.announceCaptionsOff
  }
  if (before.quality !== after.quality) {
    const label = after.qualities.find((level) => level.id === after.quality)?.label
    return t.announceQuality(label ?? t.qualityAuto)
  }
  if (before.loop !== after.loop) return after.loop ? t.announceLoopOn : t.announceLoopOff
  if (!before.stalled && after.stalled) return t.stalled
  return null
}

/** Announces state changes politely. Time never reaches this region (R20.9). */
export function MediaAnnouncer({ player, t, locale, mode, message }: { player: MediaPlayerController; t: typeof mediaPlayerMessages.defaults; locale: string; mode: MediaViewMode | null; message?: string }) {
  const [text, setText] = useState("")
  const latest = useRef({ t, locale })
  latest.current = { t, locale }
  useEffect(() => {
    let previous = player.getState()
    let timer: ReturnType<typeof setTimeout> | undefined
    const stop = player.subscribe(() => {
      const next = player.getState()
      const { t: words, locale: language } = latest.current
      const said = describe(previous, next, words, language)
      if (said) setText(said)
      // A receiver reporting its own volume is not a change anyone made.
      if (previous.volume !== next.volume && !next.muted && previous.cast.status === next.cast.status) {
        clearTimeout(timer)
        timer = setTimeout(() => setText(words.announceVolume(formatPercent(language, Math.round(next.volume * 100)))), SETTLE_MS)
      }
      previous = next
    })
    return () => {
      stop()
      clearTimeout(timer)
    }
  }, [player])
  const shownMode = useRef(mode)
  useEffect(() => {
    if (mode === null || shownMode.current === mode) return
    shownMode.current = mode
    setText(latest.current.t.announceView(latest.current.t[VIEW_LABEL[mode]]))
  }, [mode])
  useEffect(() => {
    if (message) setText(message)
  }, [message])
  return (
    <VisuallyHidden aria-live="polite" aria-atomic="true">
      {text}
    </VisuallyHidden>
  )
}
