import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react"
import { createMediaController, type MediaPlayerController, type MediaPlayerOptions, type MediaPlayerState, type MediaPlayerTime } from "./controller.js"
import { bindMediaSession } from "./media-session.js"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

/**
 * A player without a user interface: pass `mediaRef` to your own `<video>` or `<audio>`, read
 * state with `useMediaPlayerState` and `useMediaPlayerTime`, and call the controller's actions.
 * The returned controller keeps one identity for the component's lifetime.
 * @example
 * const player = useMediaPlayer({ src: "/talk.webm" })
 * const { paused } = useMediaPlayerState(player)
 * return <><video ref={player.mediaRef} /><button onClick={player.toggle}>{paused ? "Play" : "Pause"}</button></>
 */
export function useMediaPlayer(options: MediaPlayerOptions = {}): MediaPlayerController {
  const [player] = useState(() => createMediaController(options))
  useIsomorphicLayoutEffect(() => player.configure(options))
  const session = options.mediaSession !== false
  useEffect(() => (session ? bindMediaSession(player) : undefined), [player, session])
  return player
}

/** The player's state, re-rendering when it changes. A `selector` narrows that to one part. */
export function useMediaPlayerState(player: MediaPlayerController): MediaPlayerState
export function useMediaPlayerState<Selected>(player: MediaPlayerController, selector: (state: MediaPlayerState) => Selected): Selected
export function useMediaPlayerState<Selected>(player: MediaPlayerController, selector?: (state: MediaPlayerState) => Selected) {
  const read = () => (selector ? selector(player.getState()) : player.getState())
  return useSyncExternalStore(player.subscribe, read, read)
}

/** The position, re-rendering on every `timeupdate`: keep it in a small leaf component. */
export function useMediaPlayerTime(player: MediaPlayerController): MediaPlayerTime {
  return useSyncExternalStore(player.subscribeTime, player.getTime, player.getTime)
}
