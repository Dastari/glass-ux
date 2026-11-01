# Media player

`glass-ux/media-player` · [Live component catalogue](https://dastari.github.io/glass-ux/)

`VideoPlayer` and `AudioPlayer` share one core; `useMediaPlayer` is that core without an
interface. The library loads no third-party scripts: stream engines and casting SDKs are the
host's, connected through `attach` and `CastAdapter`.

```tsx
import { VideoPlayer } from "glass-ux/media-player"

<VideoPlayer
  src="/talks/tide-survey.webm"
  poster="/talks/tide-survey.jpg"
  title="Tide survey"
  chapters={[{ start: 0, title: "Low water" }, { start: 8, title: "Flood" }]}
  tracks={[{ src: "/talks/tide-survey.vtt", label: "English", language: "en" }]}
  onViewModeChange={(mode, details) => console.log(mode, details.reason)}
/>
```

- **Media:** one `src`, several `sources`, or a `playlist` of `MediaItem` entries, each with its
  own `title`, `subtitle`, `poster`, `tracks`, `chapters` and `storyboard`. `selectedId`,
  `defaultSelectedId` and `onSelectedIdChange(id, details)` choose the entry; `autoAdvance`
  (default true) plays the next one. Entries change on the same element.
- **Controlled state:** `viewMode`, `volume`, `muted`, `playbackRate`, `loop`, `captionSize` and
  `windowRect` each have a `default…` and an `on…Change`. A host that refuses a change wins.
- **Host commands:** `playerRef` gives the controller: `play`, `pause`, `seek`, `setCaption` and
  the rest.
- **Loading:** `loading` shows the skeleton in the player's box, and `VideoPlayerSkeleton` and
  `AudioPlayerSkeleton` stand alone. Errors say what failed and offer Retry, which keeps the
  position. `stallAfter` (default 8 seconds) is how long buffering waits before saying so.
- **Previews:** `storyboard` is a sprite sheet; `thumbnail(seconds)` is a host's function for
  anything else, and wins.
- **Captions:** the player draws WebVTT cues itself, so they follow every view mode and take
  `captionSize` (`small`, `medium`, `large`, `extra-large`). The iPhone's system full screen
  and Safari's picture-in-picture draw their own.
- **Live:** `live` on an entry, or an infinite duration. The timeline is the seekable window and
  Live jumps to its edge. Loop and the clock give way.
- **Media Session:** a playing player publishes its entry, position and actions to the
  system's media controls. `mediaSession={false}` turns this off.

## View modes

`viewMode` is `inline`, `maximised`, `windowed`, `fullscreen` or `pip`. `viewModes` lists those
to offer. `onViewModeChange(mode, details)` reports `reason` (`control`, `shortcut`, `escape`,
`close`, `system`, `fallback`), `previous` and `requested`.

The media element never remounts or moves between parents, so playback, buffer and position
survive every change. The player's box in the page stays reserved, and shows where the picture
went, so the page never moves.

| Mode | How | Without support |
| --- | --- | --- |
| `maximised` | The Popover API, filling the viewport. Tab stays inside and Escape leaves. | Hidden |
| `windowed` | The Popover API: a mini player with its controls, dragged, resized and snapped to edges in the viewport. | Hidden |
| `fullscreen` | The Fullscreen API on the player, with its own controls. On an iPhone, `webkitEnterFullscreen` and the system's controls. | Hidden |
| `pip` | `requestPictureInPicture`, or `webkitSetPresentationMode` on Safari. | Falls back to `windowed`, else hidden |

Maximised and windowed use the top layer because it ignores every ancestor's clipping, transform
and backdrop filter, so no glass surface around a player can trap it. An open popover cannot go
full screen, so the popover and full-screen elements are nested: full screen from maximised or
windowed returns there untouched. Popups follow the player into either layer. Your own
`Menu` or `Tooltip` in `controlsEnd` does too; other portals take `popupContainer()`.

Full screen and picture-in-picture need a user gesture. Set them through a control or from a
click; on page load a browser refuses, and the player reports `fallback`.

**Mini player.** It opens in the bottom corner at the reading end and does not mirror afterwards:
it is spatial, so its corners are named as seen. Drag its bar or picture; a drag writes transforms
each frame and commits once, to `onWindowRectChange`. The handle takes the arrow keys (Shift
resizes), and the position menu reaches each corner and size with one pointer. Close pauses and
returns to the page; the other button returns and keeps playing.

**Document Picture-in-Picture.** `pictureInPicture="document"` opens a window with play, seek and
close where the browser has the API, and native picture-in-picture elsewhere. It moves the same
element: tested in Chromium 156, a playing element moved to the window and back fired no
`emptied`, `loadstart` or `pause`, and its position carried on. The default stays `native`, which
needs no copied stylesheets and has the system's own controls.

### In a managed window

`glass-ux/windows` owns a window's geometry, so give the player the window's body and leave
window-like modes out:

```tsx
<VideoPlayer {...item} fill viewModes={["fullscreen", "pip"]} />
```

`fill` takes the body's height instead of an aspect ratio. Full screen goes through the player,
so its controls stay. Keep the player mounted while
the window moves: reparenting a player between a page and a window remounts its media element, so
hand over with `playerRef` (`getTime().currentTime`) if a host needs both. The entry imports
only `fullscreenSupported` and `DRAG_THRESHOLD` from the windows code, so it adds no window
manager to a bundle.

## Casting

`useRemotePlayback(ref)` wraps the Remote Playback API and AirPlay
(`webkitShowPlaybackTargetPicker`). The media element keeps driving playback, so the player's
button is all it needs. For a sender SDK, implement `CastAdapter`:

```ts
const adapter: CastAdapter = {
  getSession: () => session,                 // status, deviceName, currentTime, duration, paused, volume
  subscribe: (listener) => …,                // call listener when any of those change
  connect: () => …,                          // show the picker
  disconnect: () => …,
  load: ({ item, startTime, autoplay }) => …,
  play, pause, seek, stop, setVolume, setMuted,
}

<VideoPlayer {...item} castAdapter={adapter} />
```

With a session connected, the controls drive the adapter. When it starts, local playback pauses
and the receiver loads from the same position; when it ends, playback resumes here from the
receiver's position, playing or paused as it was. `useCastSession(adapter)` reads the session for
your own interface. Authentication and transport belong to the host: keep tokens out of `MediaItem`.

## Stream engines

`attach` connects hls.js, dash.js or anything else. It runs once per entry, in place of setting
`src`, and may return a cleanup or a handle. Reading it per entry means an inline function is safe.

```tsx
<VideoPlayer
  src={url}
  attach={(video, stream) => {
    const hls = new Hls()
    hls.attachMedia(video)
    hls.loadSource(stream.item.src)
    hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
      stream.setQualities(data.levels.map((level, index) => ({ id: String(index), label: `${level.height}p` })))
    })
    hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => stream.setActiveQuality(String(data.level)))
    hls.on(Hls.Events.ERROR, (_, data) => data.fatal && stream.fail())
    return { detach: () => hls.destroy(), selectQuality: (id) => (hls.currentLevel = id === null ? -1 : Number(id)) }
  }}
/>
```

## Headless

```tsx
const player = useMediaPlayer({ src: "/talk.webm" })
const { paused } = useMediaPlayerState(player)
const { currentTime, duration } = useMediaPlayerTime(player)

<video ref={player.mediaRef} />
<button onClick={player.toggle}>{paused ? "Play" : "Pause"}</button>
```

`useMediaPlayerState` re-renders on discrete changes; a selector narrows it. `useMediaPlayerTime`
re-renders on every `timeupdate`, so keep it in a small leaf. `useMediaViewMode` gives a host's
own controls the same view modes, given a `shell` containing a `stage` containing the element.

## Keyboard and touch

Shortcuts apply while focus is inside the player. Character keys respect `configureShortcuts`.

| Keys | Action |
| --- | --- |
| Space, K | Play or pause. Space on a focused button presses that button. |
| J, L | Back or forward 10 seconds |
| ← → | Back or forward 5 seconds |
| ↑ ↓ | Volume |
| M | Mute |
| C | Captions |
| F | Full screen |
| Shift + , and . | Slower, faster |
| Home, End, 0 to 9 | Start, end, a tenth of the way |
| Esc | Leave maximised |

On touch, a tap shows or hides the controls and a tap in the middle plays or pauses. A double tap
on the left or right third seeks 10 seconds. Swiping on the seek bar scrubs.

The seek bar is an `input type="range"`, so its role, value text and assistive gestures are the
browser's. Its value is words ("1 minute 30 seconds of 5 minutes") and freezes while it has focus
during playback, so a screen reader is not read each tick. The clock is hidden from assistive
technology. State changes are announced in one polite region.

## Right to left

The timeline does not mirror: time runs left to right in every language, as the tape does. Its
arrow keys go through `readingKey` on that left-to-right element, so → is forward everywhere and
always moves the thumb the way the arrow points. This matches the rule that media icons keep their
shape ([right-to-left](../getting-started.md#right-to-left)). The transport buttons stay
in tape order; the bar around them, the menus and the volume slider follow reading direction.
