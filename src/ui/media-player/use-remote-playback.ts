import { useCallback, useEffect, useState, type RefObject } from "react"

/** The Remote Playback API or AirPlay, whichever the browser has. */
export interface RemotePlaybackControl {
  /** Which API this browser offers, if any. */
  kind: "remote-playback" | "airplay" | null
  /** A device is in reach. Browsers may report false while they cannot tell. */
  available: boolean
  /** Whether the media is playing on a device. */
  state: "disconnected" | "connecting" | "connected"
  /** Show the browser's device picker. Needs a user gesture. */
  prompt: () => void
}

interface AirPlayElement extends HTMLMediaElement {
  webkitShowPlaybackTargetPicker(): void
  webkitCurrentPlaybackTargetIsWireless?: boolean
}

/**
 * Casting the browser does by itself: `media.remote` where it exists, AirPlay on Safari. The
 * media element keeps driving playback, so the player's controls need nothing more. For a
 * sender SDK, use a {@link CastAdapter} instead.
 */
export function useRemotePlayback(ref: RefObject<HTMLMediaElement | null> | { readonly current: HTMLMediaElement | null }): RemotePlaybackControl {
  const [kind, setKind] = useState<RemotePlaybackControl["kind"]>(null)
  const [available, setAvailable] = useState(false)
  const [state, setState] = useState<RemotePlaybackControl["state"]>("disconnected")

  useEffect(() => {
    const media = ref.current
    if (!media) return
    if ("webkitShowPlaybackTargetPicker" in media) {
      setKind("airplay")
      const onAvailability = (event: Event) => setAvailable((event as Event & { availability?: string }).availability === "available")
      const onWireless = () => setState((media as AirPlayElement).webkitCurrentPlaybackTargetIsWireless ? "connected" : "disconnected")
      media.addEventListener("webkitplaybacktargetavailabilitychanged", onAvailability)
      media.addEventListener("webkitcurrentplaybacktargetiswirelesschanged", onWireless)
      return () => {
        media.removeEventListener("webkitplaybacktargetavailabilitychanged", onAvailability)
        media.removeEventListener("webkitcurrentplaybacktargetiswirelesschanged", onWireless)
      }
    }
    const remote = media.remote
    if (!remote) return
    setKind("remote-playback")
    const sync = () => setState(remote.state)
    let watcher: number | undefined
    let cancelled = false
    remote.addEventListener("connecting", sync)
    remote.addEventListener("connect", sync)
    remote.addEventListener("disconnect", sync)
    remote
      .watchAvailability(setAvailable)
      .then((id) => {
        watcher = id
        if (cancelled) void remote.cancelWatchAvailability(id).catch(() => {})
      })
      // Not every platform watches: a device may still be there, so the picker stays offered.
      .catch(() => setAvailable(true))
    return () => {
      cancelled = true
      remote.removeEventListener("connecting", sync)
      remote.removeEventListener("connect", sync)
      remote.removeEventListener("disconnect", sync)
      if (watcher !== undefined) void remote.cancelWatchAvailability(watcher).catch(() => {})
    }
  }, [ref])

  const prompt = useCallback(() => {
    const media = ref.current
    if (!media) return
    if ("webkitShowPlaybackTargetPicker" in media) (media as AirPlayElement).webkitShowPlaybackTargetPicker()
    else void media.remote?.prompt().catch(() => {})
  }, [ref])

  return { kind, available, state, prompt }
}
