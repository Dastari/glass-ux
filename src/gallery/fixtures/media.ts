/**
 * Fictional media for the media player's page and specs. Everything under assets/media is
 * drawn or synthesised by scripts/build-media-fixtures.mjs and stays out of the release pack.
 */
import type { CastAdapter, CastLoadRequest, CastSession, MediaAttach, MediaChapter, MediaItem, MediaStoryboard, MediaTextTrack } from "../../ui/media-player/index.js"

export const TIDE_SRC = new URL("../assets/media/tide-survey.webm", import.meta.url).href
export const TIDE_POSTER = new URL("../assets/media/tide-survey-poster.jpg", import.meta.url).href
export const RIDGE_SRC = new URL("../assets/media/ridge-walk.webm", import.meta.url).href
export const RIDGE_POSTER = new URL("../assets/media/ridge-walk-poster.jpg", import.meta.url).href
export const TONE_SRC = new URL("../assets/media/tone.webm", import.meta.url).href

export const TIDE_CHAPTERS: MediaChapter[] = [
  { start: 0, title: "Low water" },
  { start: 8, title: "Flood" },
  { start: 16, title: "High water" },
]

export const TIDE_TRACKS: MediaTextTrack[] = [
  { id: "en", src: new URL("../assets/media/tide-survey.en.vtt", import.meta.url).href, label: "English", language: "en" },
  { id: "fr", src: new URL("../assets/media/tide-survey.fr.vtt", import.meta.url).href, label: "Français", language: "fr" },
]

export const TIDE_STORYBOARD: MediaStoryboard = {
  src: new URL("../assets/media/tide-survey-storyboard.jpg", import.meta.url).href,
  tileWidth: 160,
  tileHeight: 90,
  columns: 5,
  interval: 2,
}

export const TIDE: MediaItem = {
  id: "tide-survey",
  src: TIDE_SRC,
  title: "Tide survey, Cedar Inlet",
  subtitle: "Field notes",
  poster: TIDE_POSTER,
  chapters: TIDE_CHAPTERS,
  tracks: TIDE_TRACKS,
  storyboard: TIDE_STORYBOARD,
}

export const RIDGE: MediaItem = { id: "ridge-walk", src: RIDGE_SRC, title: "Ridge walk", subtitle: "Field notes", poster: RIDGE_POSTER }

export const FIELD_NOTES: MediaItem[] = [TIDE, RIDGE]

export const TONES: MediaItem[] = [
  { id: "tide-tone", src: TIDE_SRC, title: "Harbour bells", subtitle: "Cedar Inlet recordings", chapters: TIDE_CHAPTERS },
  { id: "ridge-tone", src: TONE_SRC, title: "Ridge wind", subtitle: "Cedar Inlet recordings" },
]

/** A stream engine in miniature: it plays the file and reports renditions it does not have. */
export const demoStream: MediaAttach = (media, stream) => {
  media.src = stream.item?.src ?? ""
  stream.setQualities([
    { id: "1080", label: "1080p" },
    { id: "720", label: "720p" },
    { id: "360", label: "360p" },
  ])
  stream.setActiveQuality("720")
  return { selectQuality: (id) => stream.setActiveQuality(id ?? "720") }
}

/** An in-memory receiver: a clock instead of a device, so the whole flow shows without hardware. */
export interface DemoCastAdapter extends CastAdapter {
  /** The calls the player made, newest last. */
  calls: string[]
}

/** A fictional receiver. Connecting takes a moment, as with a real device. */
export function createDemoCastAdapter(deviceName = "Harbour Room display"): DemoCastAdapter {
  let session: CastSession = { status: "available" }
  let timer: ReturnType<typeof setInterval> | undefined
  const listeners = new Set<() => void>()
  const calls: string[] = []
  const set = (patch: Partial<CastSession>) => {
    session = { ...session, ...patch }
    for (const listener of listeners) listener()
  }
  const run = (playing: boolean) => {
    clearInterval(timer)
    if (playing) {
      timer = setInterval(() => {
        const next = (session.currentTime ?? 0) + 0.25
        set({ currentTime: Math.min(next, session.duration ?? next) })
      }, 250)
    }
  }
  return {
    calls,
    getSession: () => session,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    connect() {
      calls.push("connect")
      set({ status: "connecting", deviceName })
      setTimeout(() => set({ status: "connected" }), 300)
    },
    disconnect() {
      calls.push("disconnect")
      run(false)
      set({ status: "available" })
    },
    load({ item, startTime, autoplay }: CastLoadRequest) {
      calls.push(`load ${item.title} at ${startTime.toFixed(1)}`)
      set({ currentTime: startTime, duration: 24, paused: !autoplay, volume: 0.6, muted: false })
      run(autoplay)
    },
    play() {
      calls.push("play")
      set({ paused: false })
      run(true)
    },
    pause() {
      calls.push("pause")
      set({ paused: true })
      run(false)
    },
    seek(seconds) {
      calls.push(`seek ${seconds.toFixed(1)}`)
      set({ currentTime: seconds })
    },
    stop() {
      calls.push("stop")
      run(false)
      set({ paused: true, currentTime: 0 })
    },
    setVolume(volume) {
      calls.push(`volume ${volume.toFixed(2)}`)
      set({ volume })
    },
    setMuted(muted) {
      calls.push(`muted ${muted}`)
      set({ muted })
    },
  }
}
