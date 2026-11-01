# VideoPlayer

A video player with its own controls, in five view modes that keep one media element:
in the page, maximised, a floating mini player, full screen and picture-in-picture.
Playback, buffer and position survive every change, and the page never moves: the player's
box stays reserved while it is elsewhere. The media element never remounts.

Shortcuts apply while focus is inside the player: Space or K play and pause, J and L seek ten
seconds, ← → five, ↑ ↓ change volume, M mutes, C toggles captions, F is full screen, Shift
with , or . changes speed, Home and End go to the ends, and 0 to 9 go to a tenth of the way.
Character keys respect `configureShortcuts`. Time runs left to right in every language.

`import { VideoPlayer } from "glass-ux/media-player"`

[Live examples](https://dastari.github.io/glass-ux/components/video-player)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Names the player; defaults to the title. |
| aspectRatio | `string \| undefined` | See type | no | — | The reserved shape, as CSS `aspect-ratio`. Default `16 / 9`. |
| attach | `MediaAttach \| undefined` | See type | no | — | Connect a stream engine; see {@link MediaAttach}. |
| autoAdvance | `boolean \| undefined` | false, true | no | — | Play the next entry when one ends. Default true. |
| autoPlay | `boolean \| undefined` | false, true | no | — | Start as soon as the browser allows. |
| captionSize | `"small" \| "medium" \| "large" \| "extra-large" \| undefined` | "small", "medium", "large", "extra-large" | no | — | Caption text size. Pair with `onCaptionSizeChange` to control it. |
| castAdapter | `CastAdapter \| undefined` | See type | no | — | A casting session; see {@link CastAdapter}. |
| chapters | `readonly MediaChapter[] \| undefined` | See type | no | — | Named parts: marks on the seek bar and a menu. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| controlsEnd | `ReactNode` | See type | no | — | Host controls at the end of the bar. |
| crossOrigin | `"anonymous" \| "use-credentials" \| undefined` | "anonymous", "use-credentials" | no | — | For sources and tracks on another origin. |
| defaultCaptionSize | `"small" \| "medium" \| "large" \| "extra-large" \| undefined` | "small", "medium", "large", "extra-large" | no | — | Default `medium`. |
| defaultLoop | `boolean \| undefined` | false, true | no | — | Start repeating when uncontrolled. Default false. |
| defaultMuted | `boolean \| undefined` | false, true | no | — | Start muted when uncontrolled. Default false. |
| defaultPlaybackRate | `number \| undefined` | See type | no | — | Default 1. |
| defaultSelectedId | `string \| undefined` | See type | no | — | The first entry when uncontrolled. Default: the first. |
| defaultViewMode | `"inline" \| "fullscreen" \| "maximised" \| "windowed" \| "pip" \| undefined` | "inline", "fullscreen", "maximised", "windowed", "pip" | no | — | The first mode when uncontrolled. Default `inline`. Full screen and picture-in-picture need a gesture, so a browser refuses them here and the player stays inline. |
| defaultVolume | `number \| undefined` | See type | no | — | Default 1. |
| defaultWindowRect | `MediaWindowRect \| undefined` | See type | no | — | The mini player's first rectangle. Default: the bottom corner at the reading end. |
| fill | `boolean \| undefined` | false, true | no | — | Fill a parent of definite height instead of reserving an aspect ratio: a window body, a stage. |
| labels | `Partial<{ videoPlayer: string; audioPlayer: string; play: string; pause: string; replay: string; previousItem: string; nextItem: string; seek: string; seekValue: ({ elapsed, total }: { elapsed: string; total: string; }) => string; seekLive: (behind: string) => string; atLiveEdge: string; volume: string; mute: string; unmute: string; settings: string; speed: string; rate: (rate: string) => string; normalSpeed: string; captions: string; captionsOff: string; captionSize: string; captionSizeSmall: string; captionSizeMedium: string; captionSizeLarge: string; captionSizeExtraLarge: string; chapters: string; quality: string; qualityAuto: string; qualityAutoActive: (level: string) => string; loop: string; playlist: string; view: string; viewInline: string; viewMaximised: string; viewWindowed: string; viewFullscreen: string; viewPip: string; maximise: string; restore: string; miniPlayer: string; fullscreen: string; exitFullscreen: string; pictureInPicture: string; exitPictureInPicture: string; cast: string; castConnecting: (device: string) => string; stopCasting: (device: string) => string; castingTo: (device: string) => string; castDevice: string; live: string; goLive: string; loading: string; stalled: string; retry: string; errorNetwork: string; errorDecode: string; errorUnsupported: string; errorAborted: string; errorStream: string; playingInMiniPlayer: string; playingInPip: string; returnToPage: string; closePlayer: string; movePlayer: string; moveHelp: string; playerPosition: string; topLeft: string; topRight: string; bottomLeft: string; bottomRight: string; sizeSmall: string; sizeMedium: string; sizeLarge: string; announcePlaying: string; announcePaused: string; announceMuted: string; announceUnmuted: string; announceVolume: (level: string) => string; announceSpeed: (rate: string) => string; announceCaptions: (label: string) => string; announceCaptionsOff: string; announceQuality: (label: string) => string; announceLoopOn: string; announceLoopOff: string; announceItem: (title: string) => string; announceCastEnded: string; announceView: (mode: string) => string; announceMoved: string; }> \| undefined` | See type | no | — | Wording overrides. |
| live | `boolean \| undefined` | false, true | no | — | A live stream: the timeline shows the seekable window and go-to-live appears. |
| loading | `boolean \| undefined` | false, true | no | — | Show the skeleton in the player's box while the host loads what to play. |
| locale | `string \| undefined` | See type | no | — | Formatting and wording locale; defaults to the nearest LocaleProvider. |
| loop | `boolean \| undefined` | false, true | no | — | Repeat the entry. Pair with `onLoopChange` to control it. |
| mediaSession | `boolean \| undefined` | false, true | no | — | Publish to the operating system's media controls. Default true. |
| muted | `boolean \| undefined` | false, true | no | — | Pair with `onMutedChange` to control it. |
| onCaptionSizeChange | `((size: MediaCaptionSize) => void) \| undefined` | See type | no | — | Called when the person chooses a caption size. |
| onEnded | `(() => void) \| undefined` | See type | no | — | Called when the entry ends. |
| onError | `((error: MediaErrorKind) => void) \| undefined` | See type | no | — | Called when playback fails, with what failed. |
| onLoopChange | `((loop: boolean) => void) \| undefined` | See type | no | — | Called when repeat turns on or off. |
| onMutedChange | `((muted: boolean) => void) \| undefined` | See type | no | — | Called when the player mutes or unmutes. |
| onPlaybackRateChange | `((rate: number) => void) \| undefined` | See type | no | — | Called when the speed changes. |
| onSelectedIdChange | `((id: string, details: MediaItemChangeDetails) => void) \| undefined` | See type | no | — | Called with the id of the new entry and why it changed. |
| onViewModeChange | `((mode: MediaViewMode, details: MediaViewModeChangeDetails) => void) \| undefined` | See type | no | — | Called when the mode changes, with why. |
| onVolumeChange | `((volume: number) => void) \| undefined` | See type | no | — | Called when the volume changes, from 0 to 1. |
| onWindowRectChange | `((rect: MediaWindowRect) => void) \| undefined` | See type | no | — | Called once per move or resize of the mini player, with its new rectangle. |
| pictureInPicture | `"document" \| "native" \| undefined` | "document", "native" | no | — | `native` is the browser's own window; `document` keeps play and seek controls where Document Picture-in-Picture exists. Default `native`. |
| playbackRate | `number \| undefined` | See type | no | — | Pair with `onPlaybackRateChange` to control it. |
| playerRef | `Ref<MediaPlayerController> \| undefined` | See type | no | — | The player's controller, for commands from outside. |
| playlist | `readonly MediaItem[] \| undefined` | See type | no | — | Entries to play in order, in place of `src`. |
| poster | `string \| undefined` | See type | no | — | The image shown before playback, or the artwork of audio. |
| preload | `"metadata" \| "none" \| "auto" \| undefined` | "metadata", "none", "auto" | no | — | How much the browser loads up front. Default `metadata`. |
| rates | `readonly number[] \| undefined` | See type | no | — | Speeds offered, ascending. Default 0.5 to 2. |
| selectedId | `string \| undefined` | See type | no | — | The entry in play, by `id`. Pair with `onSelectedIdChange` to control it. |
| sources | `readonly MediaSource[] \| undefined` | See type | no | — | Several encodings of the same media, best first. |
| src | `string \| undefined` | See type | no | — | One file. Use `sources` for several encodings. |
| stallAfter | `number \| undefined` | See type | no | — | Seconds playback may wait before the stall message shows. Default 8. |
| storyboard | `MediaStoryboard \| undefined` | See type | no | — | A sprite sheet for the seek bar's preview. |
| subtitle | `string \| undefined` | See type | no | — | A second line: the show, album or artist. |
| thumbnail | `MediaThumbnail \| undefined` | See type | no | — | Preview frames for the seek bar, where a `storyboard` will not do. |
| title | `string \| undefined` | See type | no | — | The name shown in the mini player, playlists and the system's media controls. |
| tracks | `readonly MediaTextTrack[] \| undefined` | See type | no | — | Caption and subtitle files. |
| viewMode | `"inline" \| "fullscreen" \| "maximised" \| "windowed" \| "pip" \| undefined` | "inline", "fullscreen", "maximised", "windowed", "pip" | no | — | The mode shown. Pair with `onViewModeChange` to control it. |
| viewModes | `readonly ("inline" \| "fullscreen" \| "maximised" \| "windowed" \| "pip")[] \| undefined` | See type | no | — | The modes to offer. Default all. Unsupported modes are hidden; `inline` always remains. |
| volume | `number \| undefined` | See type | no | — | 0 to 1. Pair with `onVolumeChange` to control it. |
| windowRect | `MediaWindowRect \| undefined` | See type | no | — | The mini player's rectangle in viewport pixels. Pair with `onWindowRectChange`, which fires once per move. |
