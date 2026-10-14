import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react"
import type { AiAsk, ApprovalState } from "../types.js"

/**
 * The ask dock's state (R13.8). Requests that come to the person are never modal: inside a
 * conversation every pending ask is pinned above the composer until it is answered, and its
 * place in the transcript holds a one-line marker. The ConversationLog provides this; each
 * AskCard in the transcript registers its ask while it is pending, the dock renders the one
 * interactive copy, and an answer given in the dock is shared back so the marker becomes
 * the record in place.
 */

/** How an ask was resolved in the browser, before (or instead of) the server saying so. */
export interface AskResolution {
  /** Approvals: approved, denied, revoked or expired. */
  state?: ApprovalState
  /** Other asks: the answer in words for the record. */
  label?: string
  /** Unix ms. */
  at: number
}

interface DockApi {
  register: (ask: AiAsk) => void
  unregister: (id: string) => void
  resolve: (id: string, resolution: AskResolution) => void
  /** Bring an ask to the front of the dock, expand it and move focus to it. */
  show: (id: string) => void
}

export interface AskDockState {
  /** Pending asks, oldest first. */
  entries: AiAsk[]
  resolutions: ReadonlyMap<string, AskResolution>
  /** The ask in front. */
  current: AiAsk | undefined
  setCurrent: (id: string) => void
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  /** Bumped by show(): the dock moves focus to this ask. */
  focusRequest: { id: string; count: number } | null
}

const ApiContext = createContext<DockApi | null>(null)
const StateContext = createContext<AskDockState | null>(null)

/** Where an ask renders: in the transcript (or on its own), or as the dock's copy. */
export const AskPlacementContext = createContext<"inline" | "dock">("inline")

/** Still waiting for the person: an approval in `pending`, any other ask not answered. */
export function isAskPending(ask: AiAsk) {
  return ask.type === "approval" ? ask.state === "pending" : !ask.status || ask.status === "pending"
}

/** The marker's and the dock's words for what is pending. */
export function waitingLabel(ask: AiAsk) {
  return ask.type === "approval" || ask.type === "confirm" ? "Waiting for your decision" : "Waiting for your answer"
}

export interface AskDockProviderProps {
  /** A narrow conversation (the docked pane) starts with the dock folded to one line. */
  narrow?: boolean
  children: ReactNode
}

/** Share pending questions and their resolutions between transcript markers and the interactive question dock. */
export function AskDockProvider({ narrow = false, children }: AskDockProviderProps) {
  const sequence = useRef(0)
  const [registered, setRegistered] = useState<ReadonlyMap<string, { ask: AiAsk; order: number }>>(new Map())
  const [resolutions, setResolutions] = useState<ReadonlyMap<string, AskResolution>>(new Map())
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [chosenCollapsed, setChosenCollapsed] = useState<boolean | null>(null)
  const [focusRequest, setFocusRequest] = useState<{ id: string; count: number } | null>(null)

  const register = useCallback((ask: AiAsk) => {
    setRegistered((previous) => {
      const existing = previous.get(ask.id)
      if (existing?.ask === ask) return previous
      const next = new Map(previous)
      next.set(ask.id, { ask, order: existing?.order ?? (sequence.current += 1) })
      return next
    })
  }, [])
  const unregister = useCallback((id: string) => {
    setRegistered((previous) => {
      if (!previous.has(id)) return previous
      const next = new Map(previous)
      next.delete(id)
      return next
    })
  }, [])
  const resolve = useCallback((id: string, resolution: AskResolution) => {
    setResolutions((previous) => new Map(previous).set(id, resolution))
  }, [])
  const show = useCallback((id: string) => {
    setCurrentId(id)
    setChosenCollapsed(false)
    setFocusRequest((previous) => ({ id, count: (previous?.count ?? 0) + 1 }))
  }, [])

  const api = useMemo(() => ({ register, unregister, resolve, show }), [register, unregister, resolve, show])

  const state = useMemo<AskDockState>(() => {
    const entries = [...registered.values()].toSorted((a, b) => a.order - b.order).map((entry) => entry.ask)
    return {
      entries,
      resolutions,
      current: entries.find((ask) => ask.id === currentId) ?? entries[0],
      setCurrent: setCurrentId,
      collapsed: chosenCollapsed ?? narrow,
      setCollapsed: setChosenCollapsed,
      focusRequest,
    }
  }, [registered, resolutions, currentId, chosenCollapsed, narrow, focusRequest])

  return (
    <ApiContext value={api}>
      <StateContext value={state}>{children}</StateContext>
    </ApiContext>
  )
}

/** Register, resolve and show asks; null outside a conversation. */
export function useAskDockApi() {
  return useContext(ApiContext)
}

/** The dock's entries, current ask and fold; null outside a conversation. */
export function useAskDockState() {
  return useContext(StateContext)
}

/** An answer given in the dock, read wherever the same ask renders. */
export function useAskResolution(id: string) {
  return useContext(StateContext)?.resolutions.get(id)
}
