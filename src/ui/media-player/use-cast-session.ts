import { useSyncExternalStore } from "react"
import type { CastAdapter, CastSession } from "./types.js"

const NONE: CastSession = { status: "unavailable" }
const quiet = () => () => {}

/** A {@link CastAdapter}'s session as React state, for host interfaces around the player. */
export function useCastSession(adapter: CastAdapter | null | undefined): CastSession {
  const read = () => adapter?.getSession() ?? NONE
  return useSyncExternalStore(adapter ? (notify) => adapter.subscribe(notify) : quiet, read, () => NONE)
}
