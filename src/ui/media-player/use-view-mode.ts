/**
 * View modes on a stable element. Two nested elements carry them, so the media element is
 * never moved or remounted:
 *
 *   shell   shown with the Popover API for maximised and windowed. The top layer ignores
 *           ancestors' clipping, transforms and backdrop filters, so no glass surface around
 *           the player can break it. Its slot in the page keeps the reserved box (R9).
 *   stage   the Fullscreen API's element. It has to be separate: an open popover cannot go
 *           full screen ("already open as a Popover"), and hiding it first would drop the
 *           player for a frame. A stage inside an open popover goes full screen and the popover
 *           waits underneath, so leaving returns to maximised or windowed untouched.
 *
 * Browser calls happen inside the handler that asked for them, while its user activation lasts.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react"
import { fullscreenSupported } from "../../windows/fullscreen.js"
import { documentPipSupported, openDocumentPip, type DocumentPipSession } from "./document-pip.js"
import { availableViewModes, resolveViewMode, type MediaViewSupport } from "./state.js"
import { MEDIA_VIEW_MODES, type MediaViewMode, type MediaViewModeChangeDetails, type MediaViewModeChangeReason } from "./types.js"

/** The modes that keep the element in the page or the top layer. */
export type MediaViewLayer = "inline" | "maximised" | "windowed"

interface WebkitVideo extends HTMLVideoElement {
  webkitEnterFullscreen?(): void
  webkitExitFullscreen?(): void
  webkitSetPresentationMode?(mode: "inline" | "picture-in-picture" | "fullscreen"): void
  webkitPresentationMode?: string
}

const SERVER_SUPPORT: MediaViewSupport = { topLayer: true, fullscreen: true, videoFullscreen: false, pip: true, documentPip: false }

/** What this browser can do with a video. */
export function detectViewSupport(): MediaViewSupport {
  if (typeof document === "undefined") return SERVER_SUPPORT
  const video = HTMLVideoElement.prototype as unknown as Record<string, unknown>
  return {
    topLayer: "showPopover" in HTMLElement.prototype,
    fullscreen: fullscreenSupported(),
    videoFullscreen: "webkitEnterFullscreen" in video,
    pip: (document.pictureInPictureEnabled === true && "requestPictureInPicture" in video) || "webkitSetPresentationMode" in video,
    documentPip: documentPipSupported(),
  }
}

let support: MediaViewSupport | undefined
const readSupport = () => {
  const next = detectViewSupport()
  if (!support || JSON.stringify(support) !== JSON.stringify(next)) support = next
  return support
}
const quiet = () => () => {}

/** Options of {@link useMediaViewMode}. */
export interface MediaViewOptions {
  /** The element that goes into the top layer. It must contain `stage`. */
  shell: RefObject<HTMLElement | null>
  /** The element that goes full screen. It must contain the media element. */
  stage: RefObject<HTMLElement | null>
  /** The media element, for picture-in-picture and the iPhone's full screen. */
  media: { readonly current: HTMLMediaElement | null }
  /** The mode shown. Pair with `onViewModeChange` to control it. */
  viewMode?: MediaViewMode
  /** The first mode when uncontrolled. Default `inline`. */
  defaultViewMode?: MediaViewMode
  /** Called when the mode changes, with why. */
  onViewModeChange?: (mode: MediaViewMode, details: MediaViewModeChangeDetails) => void
  /** The modes to offer. Default all. Unsupported modes are removed; `inline` always remains. */
  viewModes?: readonly MediaViewMode[]
  /** `native` shows the bare video; `document` keeps controls where the browser can. Default `native`. */
  pictureInPicture?: "native" | "document"
}

/** The state of {@link useMediaViewMode}. */
export interface MediaViewController {
  mode: MediaViewMode
  /** Where the element is while not full screen. */
  layer: MediaViewLayer
  /** The modes on offer here. */
  available: readonly MediaViewMode[]
  /** Change mode. Call from a user gesture: full screen and picture-in-picture need one. */
  setMode: (mode: MediaViewMode, reason?: MediaViewModeChangeReason, event?: Event) => void
  /** The Document Picture-in-Picture window's portal target, while it is open. */
  pipHost: HTMLElement | null
}

/**
 * The view modes of a player, for hosts with their own controls. Pairs with `useMediaPlayer`:
 * render the media element inside `stage`, inside `shell`.
 */
export function useMediaViewMode({
  shell,
  stage,
  media,
  viewMode,
  defaultViewMode = "inline",
  onViewModeChange,
  viewModes = MEDIA_VIEW_MODES,
  pictureInPicture = "native",
}: MediaViewOptions): MediaViewController {
  const supported = useSyncExternalStore(quiet, readSupport, () => SERVER_SUPPORT)
  const allowedKey = viewModes.join()
  const available = useRef<MediaViewMode[]>([])
  available.current = availableViewModes(viewModes, supported)
  const [inner, setInner] = useState(defaultViewMode)
  const [layer, setLayer] = useState<MediaViewLayer>("inline")
  const [pipHost, setPipHost] = useState<HTMLElement | null>(null)
  const [tick, refresh] = useState(0)
  const mode = resolveViewMode(viewMode ?? inner, available.current)

  const applied = useRef<MediaViewMode>("inline")
  const base = useRef<MediaViewLayer>("inline")
  const pip = useRef<DocumentPipSession | null>(null)
  const latest = useRef({ onViewModeChange, pictureInPicture })
  latest.current = { onViewModeChange, pictureInPicture }

  const report = useCallback((next: MediaViewMode, previous: MediaViewMode, reason: MediaViewModeChangeReason, requested: MediaViewMode, event?: Event) => {
    setInner(next)
    latest.current.onViewModeChange?.(next, { reason, previous, requested, event })
    refresh((count) => count + 1)
  }, [])

  const setTopLayer = useCallback(
    (target: MediaViewLayer) => {
      const element = shell.current
      base.current = target
      setLayer(target)
      if (!element || !("showPopover" in element)) return
      const open = element.matches(":popover-open")
      if (target === "inline") {
        if (open) element.hidePopover()
        element.removeAttribute("popover")
      } else if (!open) {
        element.popover = "manual"
        element.showPopover()
      }
    },
    [shell],
  )

  /** A browser refused: go back to where the element is and say so. */
  const refused = useCallback(
    (requested: MediaViewMode) => {
      if (applied.current !== requested) return
      const fallback = requested === "pip" ? resolveViewMode("pip", available.current.filter((item) => item !== "pip")) : base.current
      applied.current = fallback
      if (fallback !== "fullscreen" && fallback !== "pip") setTopLayer(fallback)
      report(fallback, requested, "fallback", requested)
    },
    [report, setTopLayer],
  )

  const transition = useCallback(
    (target: MediaViewMode) => {
      const previous = applied.current
      if (target === previous) return
      applied.current = target
      const element = media.current as WebkitVideo | null
      if (previous === "fullscreen") {
        if (document.fullscreenElement === stage.current) void document.exitFullscreen().catch(() => {})
        else element?.webkitExitFullscreen?.()
      }
      if (previous === "pip") {
        if (pip.current) pip.current.close()
        else if (document.pictureInPictureElement === element) void document.exitPictureInPicture().catch(() => {})
        else element?.webkitSetPresentationMode?.("inline")
      }
      if (target === "inline" || target === "maximised" || target === "windowed") setTopLayer(target)
      else if (target === "pip") setTopLayer("inline")

      if (target === "fullscreen") {
        const frame = stage.current
        if (fullscreenSupported() && frame) {
          void frame.requestFullscreen({ navigationUI: "hide" }).catch(() => refused("fullscreen"))
        } else if (element?.webkitEnterFullscreen) {
          try {
            element.webkitEnterFullscreen()
          } catch {
            refused("fullscreen")
          }
        } else refused("fullscreen")
      } else if (target === "pip" && element) {
        if (latest.current.pictureInPicture === "document" && documentPipSupported()) {
          openDocumentPip(element, () => {
            pip.current = null
            setPipHost(null)
            if (applied.current === "pip") {
              applied.current = "inline"
              report("inline", "pip", "system", "inline")
            }
          })
            .then((session) => {
              pip.current = session
              setPipHost(session.host)
              // The mode may have moved on while the window opened.
              if (applied.current !== "pip") session.close()
            })
            .catch(() => refused("pip"))
        } else if (typeof element.requestPictureInPicture === "function") {
          void element.requestPictureInPicture().catch(() => refused("pip"))
        } else if (element.webkitSetPresentationMode) {
          element.webkitSetPresentationMode("picture-in-picture")
        } else refused("pip")
      }
    },
    [media, stage, refused, report, setTopLayer],
  )

  const setMode = useCallback(
    (requested: MediaViewMode, reason: MediaViewModeChangeReason = "control", event?: Event) => {
      const previous = applied.current
      const target = resolveViewMode(requested, available.current)
      if (target === previous) return
      transition(target)
      // A refusal inside `transition` has already reported where the player went.
      if (applied.current === target) report(target, previous, target === requested ? reason : "fallback", requested, event)
    },
    [report, transition],
  )

  // A host's `viewMode` and `defaultViewMode` take effect here, after commit. Without a gesture a
  // browser refuses full screen and picture-in-picture, which `refused` reports.
  const wanted = viewMode ?? inner
  const fellBack = useRef<MediaViewMode | null>(null)
  useLayoutEffect(() => {
    const previous = applied.current
    if (mode !== previous) transition(mode)
    if (mode === wanted) fellBack.current = null
    else if (fellBack.current !== wanted) {
      // Asked for a mode this browser or host does not offer: say where the player went.
      fellBack.current = wanted
      report(mode, previous, "fallback", wanted)
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- `allowedKey` covers `available`
  }, [mode, wanted, tick, allowedKey, supported, report, transition])

  useEffect(() => {
    const onFullscreen = () => {
      const inside = document.fullscreenElement === stage.current
      if (applied.current === "fullscreen" && !inside) {
        applied.current = base.current
        report(base.current, "fullscreen", "system", base.current)
      } else if (applied.current !== "fullscreen" && inside) {
        const previous = applied.current
        applied.current = "fullscreen"
        report("fullscreen", previous, "system", "fullscreen")
      }
    }
    document.addEventListener("fullscreenchange", onFullscreen)
    return () => document.removeEventListener("fullscreenchange", onFullscreen)
  }, [report, stage])

  useEffect(() => {
    const element = media.current as WebkitVideo | null
    if (!element) return
    const leftPip = () => {
      if (applied.current !== "pip" || pip.current) return
      applied.current = "inline"
      report("inline", "pip", "system", "inline")
    }
    const enteredPip = () => {
      if (applied.current === "pip") return
      const previous = applied.current
      applied.current = "pip"
      setTopLayer("inline")
      report("pip", previous, "system", "pip")
    }
    const onPresentation = () => {
      if (element.webkitPresentationMode === "picture-in-picture") enteredPip()
      else leftPip()
    }
    const leftFullscreen = () => {
      if (applied.current !== "fullscreen") return
      applied.current = base.current
      report(base.current, "fullscreen", "system", base.current)
    }
    element.addEventListener("enterpictureinpicture", enteredPip)
    element.addEventListener("leavepictureinpicture", leftPip)
    element.addEventListener("webkitpresentationmodechanged", onPresentation)
    element.addEventListener("webkitendfullscreen", leftFullscreen)
    return () => {
      element.removeEventListener("enterpictureinpicture", enteredPip)
      element.removeEventListener("leavepictureinpicture", leftPip)
      element.removeEventListener("webkitpresentationmodechanged", onPresentation)
      element.removeEventListener("webkitendfullscreen", leftFullscreen)
    }
  }, [media, report, setTopLayer])

  useLayoutEffect(
    () => () => {
      pip.current?.close()
    },
    [],
  )

  return { mode, layer, available: available.current, setMode, pipHost }
}
