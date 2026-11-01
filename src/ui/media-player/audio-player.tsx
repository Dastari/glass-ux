import { useCallback, useImperativeHandle, type KeyboardEvent, type Ref } from "react"
import { IconMusic } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/use-messages.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { Skeleton } from "../skeleton/index.js"
import { Surface } from "../surface/index.js"
import { TruncatedText } from "../truncated-text/index.js"
import { MediaAnnouncer } from "./announcer.js"
import { DEFAULT_RATES, MediaControls } from "./controls.js"
import { mediaItemId, type MediaPlayerController, type MediaPlayerOptions } from "./controller.js"
import { onMediaKeyDown } from "./keyboard.js"
import { mediaPlayerMessages } from "./messages.js"
import { SeekBar } from "./seek-bar.js"
import type { MediaErrorKind } from "./types.js"
import { useMediaPlayer, useMediaPlayerState } from "./use-media-player.js"

const ERROR_TEXT: Record<MediaErrorKind, keyof typeof mediaPlayerMessages.defaults> = {
  aborted: "errorAborted",
  network: "errorNetwork",
  decode: "errorDecode",
  unsupported: "errorUnsupported",
  stream: "errorStream",
}
const NO_CAPTION_SIZE = () => {}
const NO_MENU = () => {}

/** Props of {@link AudioPlayer}. */
export interface AudioPlayerProps extends MediaPlayerOptions {
  /** Show the playlist's entries under the controls. Default true when there are several. */
  showPlaylist?: boolean
  /** Show the skeleton while the host loads what to play. */
  loading?: boolean
  /** Speeds offered, ascending. Default 0.5 to 2. */
  rates?: readonly number[]
  /** The player's controller, for commands from outside. */
  playerRef?: Ref<MediaPlayerController>
  /** Names the player; defaults to the title. */
  "aria-label"?: string
  /** Layout only. */
  className?: string
  /** Formatting and wording locale; defaults to the nearest LocaleProvider. */
  locale?: string
  /** Wording overrides. */
  labels?: Partial<typeof mediaPlayerMessages.defaults>
}

/** The skeleton of an audio player. */
export function AudioPlayerSkeleton({ className }: Pick<AudioPlayerProps, "className">) {
  return (
    <Surface material="card" radius="tile" padding="tile" className={cx("fa-media", className)} data-kind="audio">
      <div className="fa-media-audio-head">
        <Skeleton.Block className="fa-media-artwork" radius="tile" />
        <span className="fa-media-audio-text">
          <Skeleton.Text role="label" width="60%" />
          <Skeleton.Text role="caption" width="40%" />
        </span>
      </div>
      <Skeleton.Block className="fa-media-audio-skeleton-seek" width="100%" />
      <Skeleton.Block className="fa-media-audio-skeleton-bar" width="100%" />
    </Surface>
  )
}

/**
 * An audio player sharing the video player's core: seek bar with chapters, volume, speed,
 * loop, playlists, casting and the same shortcuts while focus is inside it. It sits in the
 * page; audio has no view modes.
 */
export function AudioPlayer(props: AudioPlayerProps) {
  return props.loading ? <AudioPlayerSkeleton className={props.className} /> : <LoadedAudioPlayer {...props} />
}

function LoadedAudioPlayer({ showPlaylist, loading: _loading, rates = DEFAULT_RATES, playerRef, "aria-label": ariaLabel, className, locale: localeProp, labels, ...options }: AudioPlayerProps) {
  const player = useMediaPlayer(options)
  useImperativeHandle(playerRef, () => player, [player])
  const t = useMessages(mediaPlayerMessages, { labels, locale: localeProp })
  const locale = useLocale(localeProp)
  const item = useMediaPlayerState(player, (state) => state.item)
  const items = useMediaPlayerState(player, (state) => state.items)
  const index = useMediaPlayerState(player, (state) => state.index)
  const error = useMediaPlayerState(player, (state) => state.error)
  const list = showPlaylist ?? items.length > 1
  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => onMediaKeyDown(event, { player, rates }), [player, rates])
  return (
    <Surface
      material="card"
      radius="tile"
      padding="tile"
      className={cx("fa-media", className)}
      data-kind="audio"
      role="group"
      aria-label={ariaLabel ?? item?.title ?? t.audioPlayer}
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <audio ref={player.mediaRef} />
      <div className="fa-media-audio-head">
        <span className="fa-media-artwork">{item?.poster ? <img src={item.poster} alt="" draggable={false} /> : <IconMusic />}</span>
        <span className="fa-media-audio-text">
          <TruncatedText className="fa-media-audio-title">{item?.title ?? t.audioPlayer}</TruncatedText>
          {/* Reserved even when empty, so the next entry moves nothing. */}
          <TruncatedText className="fa-media-audio-subtitle">{error ? (t[ERROR_TEXT[error]] as string) : (item?.subtitle ?? " ")}</TruncatedText>
        </span>
      </div>
      <SeekBar player={player} t={t} locale={locale} />
      <MediaControls player={player} t={t} locale={locale} rates={rates} captionSize="medium" onCaptionSizeChange={NO_CAPTION_SIZE} onMenuChange={NO_MENU} />
      {list ? (
        <ol className="fa-media-playlist" aria-label={t.playlist}>
          {items.map((entry, position) => (
            <li key={mediaItemId(entry)}>
              <button type="button" className="fa-media-playlist-item fa-pressable" aria-current={position === index ? "true" : undefined} onClick={() => player.select(mediaItemId(entry))}>
                <TruncatedText>{entry.title ?? numberFormat(locale).format(position + 1)}</TruncatedText>
                {entry.subtitle ? <TruncatedText className="fa-media-audio-subtitle">{entry.subtitle}</TruncatedText> : null}
              </button>
            </li>
          ))}
        </ol>
      ) : null}
      <MediaAnnouncer player={player} t={t} locale={locale} mode={null} />
    </Surface>
  )
}
