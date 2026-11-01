/** How a player is shown. See {@link MediaViewModeChangeDetails} for why it changed. */
export const MEDIA_VIEW_MODES = ["inline", "maximised", "windowed", "fullscreen", "pip"] as const

/**
 * `inline` sits in the page. `maximised` fills the viewport and `windowed` floats in it, both
 * in the top layer; `fullscreen` fills the screen with the player's own controls; `pip` is the
 * browser's picture-in-picture window.
 */
export type MediaViewMode = (typeof MEDIA_VIEW_MODES)[number]

/** Why the view mode changed. */
export type MediaViewModeChangeReason =
  /** A control, or a call to `setMode`. */
  | "control"
  /** A keyboard shortcut. */
  | "shortcut"
  /** Escape, from maximised. */
  | "escape"
  /** The Close button of the mini player. */
  | "close"
  /** The browser left full screen or picture-in-picture by itself. */
  | "system"
  /** The requested mode is unavailable, or the browser refused it. */
  | "fallback"

/** The second argument of `onViewModeChange`. */
export interface MediaViewModeChangeDetails {
  /** What changed the mode. */
  reason: MediaViewModeChangeReason
  /** The mode before this change. */
  previous: MediaViewMode
  /** The mode that was asked for. Differs from the new mode after a fallback. */
  requested: MediaViewMode
  /** The DOM event behind the change, when there is one. */
  event: Event | undefined
}

/** One encoding of a file. The browser plays the first it can. */
export interface MediaSource {
  /** The file's URL. */
  src: string
  /** MIME type, with codecs where they matter: `video/webm; codecs="vp9"`. */
  type?: string
}

/** A subtitle or caption file (WebVTT). */
export interface MediaTextTrack {
  /** A stable key; defaults to `src`. */
  id?: string
  /** The WebVTT file's URL. */
  src: string
  /** The name in the captions menu, in the language it describes. */
  label: string
  /** BCP 47 language of the text. */
  language: string
  /** Default `subtitles`. */
  kind?: "subtitles" | "captions"
  /** Show this track from the start. */
  default?: boolean
}

/** A named part of the timeline. */
export interface MediaChapter {
  /** Start, in seconds. A chapter ends where the next one starts. */
  start: number
  /** The name in the menu and the seek bar's preview. */
  title: string
}

/** A sprite sheet of evenly spaced preview frames. */
export interface MediaStoryboard {
  /** The sheet's URL. */
  src: string
  /** One tile's width in pixels. */
  tileWidth: number
  /** One tile's height in pixels. */
  tileHeight: number
  /** Tiles per row. */
  columns: number
  /** Seconds of media between tiles. */
  interval: number
}

/** A preview frame: a whole image, or a crop of a sheet. */
export interface MediaPreviewFrame {
  /** The image's URL. */
  src: string
  /** Crop origin in pixels. Default 0. */
  x?: number
  /** Crop origin in pixels. Default 0. */
  y?: number
  /** The frame's width in pixels. */
  width: number
  /** The frame's height in pixels. */
  height: number
}

/** A host's preview frames: return one for a time in seconds, or null for none. */
export type MediaThumbnail = (seconds: number) => MediaPreviewFrame | null

/** One entry of a playlist, or the single piece of media a player holds. */
export interface MediaItem {
  /** A stable key; defaults to the first source. */
  id?: string
  /** One file. Use `sources` for several encodings. */
  src?: string
  /** Several encodings of the same media, best first. */
  sources?: readonly MediaSource[]
  /** The name shown in the mini player, playlists and the system's media controls. */
  title?: string
  /** A second line: the show, album or artist. */
  subtitle?: string
  /** The image shown before playback, or the artwork of audio. */
  poster?: string
  /** Caption and subtitle files. */
  tracks?: readonly MediaTextTrack[]
  /** Named parts: marks on the seek bar and a menu. */
  chapters?: readonly MediaChapter[]
  /** A sprite sheet for the seek bar's preview. */
  storyboard?: MediaStoryboard
  /** A live stream: the timeline shows the seekable window and go-to-live appears. */
  live?: boolean
}

/** A rendition a stream engine offers. */
export interface MediaQualityLevel {
  /** The engine's key for this rendition. */
  id: string
  /** The name in the quality menu, such as "1080p". */
  label: string
}

/** What a stream engine reports through. Passed as the second argument of `attach`. */
export interface MediaStreamContext {
  /** The entry being played. */
  item: MediaItem | null
  /** Report the renditions on offer. An empty list hides the quality menu. */
  setQualities(levels: readonly MediaQualityLevel[]): void
  /** Report the rendition playing now, which "Auto" names in the menu. */
  setActiveQuality(id: string | null): void
  /** Report that the stream is live, once the manifest says so. */
  setLive(live: boolean): void
  /** Report a fatal stream error. The player shows its error state with Retry. */
  fail(): void
}

/** What `attach` may return: a cleanup, or a cleanup with quality selection. */
export interface MediaStreamHandle {
  /** Tear the engine down. Runs on a new entry, on Retry and on unmount. */
  detach?(): void
  /** Switch rendition; null is automatic. */
  selectQuality?(id: string | null): void
}

/**
 * Connects a stream engine such as hls.js or dash.js to the media element. The library imports
 * neither. Runs once per entry, in place of setting `src`.
 */
export type MediaAttach = (media: HTMLMediaElement, stream: MediaStreamContext) => void | (() => void) | MediaStreamHandle

/** What went wrong with playback. */
export type MediaErrorKind = "aborted" | "network" | "decode" | "unsupported" | "stream"

/** A range of media in seconds. */
export interface MediaRange {
  /** Where the range starts, in seconds. */
  start: number
  /** Where the range ends, in seconds. */
  end: number
}

/** Rough text sizes for captions. */
export const MEDIA_CAPTION_SIZES = ["small", "medium", "large", "extra-large"] as const
/** A caption text size. */
export type MediaCaptionSize = (typeof MEDIA_CAPTION_SIZES)[number]

/** Why the entry changed. */
export type MediaItemChangeReason = "item-press" | "next" | "previous" | "ended"

/** The second argument of `onSelectedIdChange`. */
export interface MediaItemChangeDetails {
  /** What changed the entry. */
  reason: MediaItemChangeReason
  /** The entry now selected. */
  item: MediaItem | null
}

/** The state of a casting session. */
export type CastStatus = "unavailable" | "available" | "connecting" | "connected"

/** A host's casting session as the player reads it. */
export interface CastSession {
  /** How far the session has got. */
  status: CastStatus
  /** The receiver's name, while connecting or connected. */
  deviceName?: string
  /** The receiver's position in seconds. */
  currentTime?: number
  /** The receiver's duration in seconds. */
  duration?: number
  /** Whether the receiver is paused. */
  paused?: boolean
  /** The receiver's volume, 0 to 1. */
  volume?: number
  /** Whether the receiver is muted. */
  muted?: boolean
}

/** What the player asks a receiver to load. */
export interface CastLoadRequest {
  /** The entry to load. */
  item: MediaItem
  /** Where to start, in seconds: the local position when the session began. */
  startTime: number
  /** Whether to play at once: the local player was playing. */
  autoplay: boolean
}

/**
 * The seam between the player and a casting sender SDK (Google Cast or any other), which the
 * host loads and authenticates. An adapter holds the session and calls its listeners when
 * anything in `getSession()` changes, including position. All calls may return a promise.
 */
export interface CastAdapter {
  /** The current session. Return the same object until something changes. */
  getSession(): CastSession
  /** Listen for changes; returns the unsubscribe. */
  subscribe(listener: () => void): () => void
  /** Show the device picker and connect. */
  connect(): void | Promise<void>
  /** End the session. The player resumes locally from the receiver's position. */
  disconnect(): void | Promise<void>
  /** Load an entry on the receiver. */
  load(request: CastLoadRequest): void | Promise<void>
  /** Resume the receiver. */
  play(): void | Promise<void>
  /** Pause the receiver. */
  pause(): void | Promise<void>
  /** Seek, in seconds. */
  seek(seconds: number): void | Promise<void>
  /** Stop the receiver's media without ending the session. */
  stop(): void | Promise<void>
  /** Set the volume, 0 to 1. */
  setVolume(volume: number): void | Promise<void>
  /** Mute or unmute the receiver. */
  setMuted?(muted: boolean): void | Promise<void>
}
