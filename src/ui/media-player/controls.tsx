import { useLayoutEffect, useRef, type ReactNode } from "react"
import {
  IconCaptions,
  IconCaptionsOff,
  IconCast,
  IconFullscreen,
  IconFullscreenExit,
  IconList,
  IconListOrdered,
  IconMaximise,
  IconMiniPlayer,
  IconPause,
  IconPictureInPicture,
  IconPlay,
  IconPlaybackSpeed,
  IconRefresh,
  IconRestore,
  IconSettings,
  IconSkipBack,
  IconSkipForward,
  IconSliders,
  IconTheaterMode,
  IconVolume,
  IconVolumeLow,
  IconVolumeOff,
} from "../../icons/generated/icons.js"
import { formatPercent, numberFormat } from "../../lib/locale/intl.js"
import { Button } from "../button/index.js"
import { Menu } from "../menu/index.js"
import { Slider } from "../slider/index.js"
import { mediaItemId, type MediaPlayerController } from "./controller.js"
import type { mediaPlayerMessages } from "./messages.js"
import { formatMediaTime } from "./state.js"
import { MEDIA_CAPTION_SIZES, type MediaCaptionSize, type MediaViewMode } from "./types.js"
import { useMediaPlayerState } from "./use-media-player.js"
import type { RemotePlaybackControl } from "./use-remote-playback.js"
import type { MediaViewController } from "./use-view-mode.js"

/** The rates in the speed menu and of Shift with comma and period. */
export const DEFAULT_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

const SIZE_LABEL = { small: "captionSizeSmall", medium: "captionSizeMedium", large: "captionSizeLarge", "extra-large": "captionSizeExtraLarge" } as const
const VIEW_LABEL = { inline: "viewInline", maximised: "viewMaximised", windowed: "viewWindowed", fullscreen: "viewFullscreen", pip: "viewPip" } as const

type Messages = typeof mediaPlayerMessages.defaults

/** The elapsed and remaining clock. It writes its own text, and stays out of the accessibility tree: the seek bar speaks. */
export function MediaClock({ player, locale }: { player: MediaPlayerController; locale: string }) {
  const elapsed = useRef<HTMLSpanElement>(null)
  const remaining = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const paint = () => {
      const { currentTime, duration } = player.getTime()
      const end = Number.isFinite(duration) ? duration : 0
      const text = formatMediaTime(currentTime, locale, end)
      const left = formatMediaTime(Math.max(0, end - currentTime), locale, end)
      if (elapsed.current && elapsed.current.textContent !== text) elapsed.current.textContent = text
      if (remaining.current && remaining.current.textContent !== `−${left}`) remaining.current.textContent = `−${left}`
      // Room for the longest text, so ticking digits never nudge the controls.
      const length = formatMediaTime(end, locale, end).length
      for (const part of [elapsed.current, remaining.current]) part?.style.setProperty("--_chars", String(length))
    }
    paint()
    return player.subscribeTime(paint)
  }, [player, locale])
  return (
    <span className="fa-media-clock" dir="ltr" aria-hidden data-numeric>
      <span ref={elapsed} className="fa-media-clock-part" />
      <span ref={remaining} className="fa-media-clock-part" data-remaining />
    </span>
  )
}

export interface MediaControlsProps {
  player: MediaPlayerController
  t: Messages
  locale: string
  rates: readonly number[]
  captionSize: MediaCaptionSize
  onCaptionSizeChange: (size: MediaCaptionSize) => void
  /** Absent on audio. */
  view?: MediaViewController | undefined
  remote?: RemotePlaybackControl | undefined
  /** Host controls at the end of the bar. */
  extra?: ReactNode
  /** Called as a menu opens and closes: controls stay while one is open. */
  onMenuChange: (open: boolean) => void
  /** Run a view change from a control. */
  onViewChange?: ((mode: MediaViewMode) => void) | undefined
}

/** The row of controls under the seek bar. Every control here has a keyboard shortcut or a tab stop. */
export function MediaControls({ player, t, locale, rates, captionSize, onCaptionSizeChange, view, remote, extra, onMenuChange, onViewChange }: MediaControlsProps) {
  const state = useMediaPlayerState(player)
  const { paused, ended, muted, volume, playbackRate, loop, live, captions, caption, chapters, qualities, quality, activeQuality, items, index, cast } = state
  const rateText = (rate: number) => t.rate(numberFormat(locale, { maximumFractionDigits: 2 }).format(rate))
  const many = items.length > 1
  const device = cast.deviceName ?? t.castDevice
  const castConnected = cast.status === "connected"
  const castOffered = cast.status !== "unavailable"
  const remoteOffered = Boolean(remote?.kind && remote.available)
  const mode = view?.mode ?? "inline"
  const has = (target: MediaViewMode) => view?.available.includes(target) ?? false
  const go = (target: MediaViewMode) => onViewChange?.(target)
  const qualityName = (id: string | null) => qualities.find((level) => level.id === id)?.label

  const PlayIcon = paused ? (ended ? IconRefresh : IconPlay) : IconPause
  const VolumeIcon = muted || volume === 0 ? IconVolumeOff : volume < 0.5 ? IconVolumeLow : IconVolume

  return (
    <div className="fa-media-bar">
      <div className="fa-media-group" dir="ltr">
        {many ? (
          <Button
            variant="ghost"
            size="sm"
            className="fa-media-skip"
            icon={<IconSkipBack />}
            aria-label={t.previousItem}
            disabledReason={index === 0 ? t.previousItem : undefined}
            onClick={() => player.previous()}
          />
        ) : null}
        <Button variant="ghost" size="sm" icon={<PlayIcon />} aria-label={paused ? (ended ? t.replay : t.play) : t.pause} shortcut="k" onClick={() => player.toggle()} />
        {many ? (
          <Button
            variant="ghost"
            size="sm"
            className="fa-media-skip"
            icon={<IconSkipForward />}
            aria-label={t.nextItem}
            disabledReason={index === items.length - 1 ? t.nextItem : undefined}
            onClick={() => player.next()}
          />
        ) : null}
      </div>
      <div className="fa-media-volume">
        <Button variant="ghost" size="sm" icon={<VolumeIcon />} aria-label={muted ? t.unmute : t.mute} shortcut="m" onClick={() => player.toggleMuted()} />
        <Slider
          className="fa-media-volume-slider"
          size="sm"
          bubble="never"
          aria-label={t.volume}
          value={Math.round((muted ? 0 : volume) * 100)}
          format={(value) => formatPercent(locale, value)}
          onValueChange={(value) => player.setVolume(Number(value) / 100)}
        />
      </div>
      {live ? <LiveButton player={player} t={t} /> : <MediaClock player={player} locale={locale} />}
      <span className="fa-media-spacer" />
      <div className="fa-media-group">
        {captions.length ? (
          <Button
            variant="ghost"
            size="sm"
            className="fa-media-captions-toggle"
            icon={caption ? <IconCaptions /> : <IconCaptionsOff />}
            aria-label={t.captions}
            aria-pressed={caption !== null}
            shortcut="c"
            onClick={() => player.toggleCaptions()}
          />
        ) : null}
        <Menu.Root onOpenChange={(open) => onMenuChange(open)}>
          <Menu.Trigger render={<Button variant="ghost" size="sm" icon={<IconSettings />} aria-label={t.settings} />} />
          <Menu.Popup side="top" align="end">
            <Menu.Submenu icon={<IconPlaybackSpeed />} label={t.speed}>
              <Menu.RadioGroup value={String(playbackRate)} onValueChange={(value: string) => player.setPlaybackRate(Number(value))}>
                {rates.map((rate) => (
                  <Menu.RadioItem key={rate} value={String(rate)}>
                    {rate === 1 ? t.normalSpeed : rateText(rate)}
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            </Menu.Submenu>
            {captions.length ? (
              <Menu.Submenu icon={<IconCaptions />} label={t.captions}>
                <Menu.RadioGroup value={caption ?? ""} onValueChange={(value: string) => player.setCaption(value || null)}>
                  <Menu.RadioItem value="">{t.captionsOff}</Menu.RadioItem>
                  {captions.map((track) => (
                    <Menu.RadioItem key={track.id} value={track.id}>
                      {track.label}
                    </Menu.RadioItem>
                  ))}
                </Menu.RadioGroup>
                <Menu.Separator />
                <Menu.Group>
                  <Menu.GroupLabel>{t.captionSize}</Menu.GroupLabel>
                  <Menu.RadioGroup value={captionSize} onValueChange={(value: string) => onCaptionSizeChange(value as MediaCaptionSize)}>
                    {MEDIA_CAPTION_SIZES.map((size) => (
                      <Menu.RadioItem key={size} value={size}>
                        {t[SIZE_LABEL[size]]}
                      </Menu.RadioItem>
                    ))}
                  </Menu.RadioGroup>
                </Menu.Group>
              </Menu.Submenu>
            ) : null}
            {chapters.length ? (
              <Menu.Submenu icon={<IconListOrdered />} label={t.chapters}>
                {chapters.map((chapter) => (
                  <Menu.Item key={chapter.start} trail={formatMediaTime(chapter.start, locale)} onClick={() => player.seek(chapter.start)}>
                    {chapter.title}
                  </Menu.Item>
                ))}
              </Menu.Submenu>
            ) : null}
            {qualities.length ? (
              <Menu.Submenu icon={<IconSliders />} label={t.quality}>
                <Menu.RadioGroup value={quality ?? ""} onValueChange={(value: string) => player.setQuality(value || null)}>
                  <Menu.RadioItem value="">{activeQuality && qualityName(activeQuality) ? t.qualityAutoActive(qualityName(activeQuality)!) : t.qualityAuto}</Menu.RadioItem>
                  {qualities.map((level) => (
                    <Menu.RadioItem key={level.id} value={level.id}>
                      {level.label}
                    </Menu.RadioItem>
                  ))}
                </Menu.RadioGroup>
              </Menu.Submenu>
            ) : null}
            {many ? (
              <Menu.Submenu icon={<IconList />} label={t.playlist}>
                <Menu.RadioGroup value={String(index)} onValueChange={(value: string) => player.select(mediaItemId(items[Number(value)]))}>
                  {items.map((item, position) => (
                    <Menu.RadioItem key={mediaItemId(item)} value={String(position)}>
                      {item.title ?? numberFormat(locale).format(position + 1)}
                    </Menu.RadioItem>
                  ))}
                </Menu.RadioGroup>
              </Menu.Submenu>
            ) : null}
            {live ? null : (
              <Menu.CheckboxItem checked={loop} onCheckedChange={(next: boolean) => player.setLoop(next)}>
                {t.loop}
              </Menu.CheckboxItem>
            )}
            {view && view.available.length > 1 ? (
              <>
                <Menu.Separator />
                <Menu.Submenu icon={<IconTheaterMode />} label={t.view}>
                  <Menu.RadioGroup value={mode} onValueChange={(value: string) => go(value as MediaViewMode)}>
                    {view.available.map((target) => (
                      <Menu.RadioItem key={target} value={target} closeOnClick>
                        {t[VIEW_LABEL[target]]}
                      </Menu.RadioItem>
                    ))}
                  </Menu.RadioGroup>
                </Menu.Submenu>
              </>
            ) : null}
            {castOffered || remoteOffered ? (
              <Menu.Item icon={<IconCast />} onClick={() => (castOffered ? player.toggleCast() : remote?.prompt())}>
                {castConnected ? t.stopCasting(device) : t.cast}
              </Menu.Item>
            ) : null}
          </Menu.Popup>
        </Menu.Root>
        {castOffered || remoteOffered ? (
          <Button
            variant="ghost"
            size="sm"
            className="fa-media-wide"
            icon={<IconCast />}
            aria-pressed={castConnected || remote?.state === "connected"}
            aria-label={cast.status === "connecting" ? t.castConnecting(device) : castConnected ? t.stopCasting(device) : t.cast}
            onClick={() => (castOffered ? player.toggleCast() : remote?.prompt())}
          />
        ) : null}
        {has("pip") ? (
          <Button
            variant="ghost"
            size="sm"
            className="fa-media-wide"
            icon={<IconPictureInPicture />}
            aria-label={mode === "pip" ? t.exitPictureInPicture : t.pictureInPicture}
            onClick={() => go(mode === "pip" ? "inline" : "pip")}
          />
        ) : null}
        {has("windowed") ? (
          <Button
            variant="ghost"
            size="sm"
            className="fa-media-wide"
            icon={<IconMiniPlayer />}
            aria-label={mode === "windowed" ? t.returnToPage : t.miniPlayer}
            onClick={() => go(mode === "windowed" ? "inline" : "windowed")}
          />
        ) : null}
        {has("maximised") ? (
          <Button
            variant="ghost"
            size="sm"
            className="fa-media-wide"
            icon={mode === "maximised" ? <IconRestore /> : <IconMaximise />}
            aria-label={mode === "maximised" ? t.restore : t.maximise}
            onClick={() => go(mode === "maximised" ? "inline" : "maximised")}
          />
        ) : null}
        {has("fullscreen") ? (
          <Button
            variant="ghost"
            size="sm"
            icon={mode === "fullscreen" ? <IconFullscreenExit /> : <IconFullscreen />}
            aria-label={mode === "fullscreen" ? t.exitFullscreen : t.fullscreen}
            shortcut="f"
            onClick={() => go(mode === "fullscreen" ? (view?.layer ?? "inline") : "fullscreen")}
          />
        ) : null}
        {extra}
      </div>
    </div>
  )
}

function LiveButton({ player, t }: { player: MediaPlayerController; t: Messages }) {
  const dot = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const paint = () => {
      if (dot.current) dot.current.dataset.edge = String(player.getTime().atLiveEdge)
    }
    paint()
    return player.subscribeTime(paint)
  }, [player])
  return (
    <Button variant="ghost" size="sm" className="fa-media-live" aria-label={t.goLive} tooltip={t.goLive} onClick={() => player.goLive()}>
      <span ref={dot} className="fa-media-live-dot" aria-hidden />
      {t.live}
    </Button>
  )
}
