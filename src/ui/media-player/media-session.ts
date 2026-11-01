/**
 * The operating system's media controls (Media Session API): lock screen, media keys and the
 * browser's own media hub. A page has one session, so a player claims it while it plays.
 */
import type { MediaPlayerController } from "./controller.js"

const ACTIONS = ["play", "pause", "stop", "seekbackward", "seekforward", "seekto", "previoustrack", "nexttrack"] as const

/** Publish a player to the Media Session; returns the cleanup. */
export function bindMediaSession(player: MediaPlayerController): () => void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return () => {}
  const session = navigator.mediaSession
  let claimed = false
  let published: unknown = null
  let lastPosition = 0

  const handlers: Record<(typeof ACTIONS)[number], MediaSessionActionHandler> = {
    play: () => player.play(),
    pause: () => player.pause(),
    stop: () => player.pause(),
    seekbackward: (details) => player.seekBy(-(details.seekOffset ?? 10)),
    seekforward: (details) => player.seekBy(details.seekOffset ?? 10),
    seekto: (details) => player.seek(details.seekTime ?? 0),
    previoustrack: () => player.previous(),
    nexttrack: () => player.next(),
  }

  const setHandlers = (on: boolean) => {
    for (const action of ACTIONS) {
      try {
        session.setActionHandler(action, on ? handlers[action] : null)
      } catch {
        // A browser may not know every action.
      }
    }
  }

  const publishPosition = () => {
    if (!claimed) return
    const { currentTime, duration } = player.getTime()
    const now = Date.now()
    if (now - lastPosition < 2000 || !Number.isFinite(duration) || duration <= 0) return
    lastPosition = now
    try {
      session.setPositionState({ duration, position: Math.min(currentTime, duration), playbackRate: player.getState().playbackRate })
    } catch {
      // An out-of-range position only skips this update.
    }
  }

  const publish = () => {
    const { paused, item } = player.getState()
    if (!paused && !claimed) {
      claimed = true
      setHandlers(true)
    }
    if (!claimed) return
    session.playbackState = paused ? "paused" : "playing"
    if (item !== published) {
      published = item
      session.metadata = item
        ? new MediaMetadata({ title: item.title ?? "", artist: item.subtitle ?? "", artwork: item.poster ? [{ src: item.poster }] : [] })
        : null
    }
    lastPosition = 0
    publishPosition()
  }

  const stopState = player.subscribe(publish)
  const stopTime = player.subscribeTime(publishPosition)
  publish()
  return () => {
    stopState()
    stopTime()
    if (!claimed) return
    setHandlers(false)
    session.metadata = null
    session.playbackState = "none"
  }
}
