# AudioPlayer

An audio player sharing the video player's core: seek bar with chapters, volume, speed,
loop, playlists, casting and the same shortcuts while focus is inside it. It sits in the
page; audio has no view modes.

`import { AudioPlayer } from "glass-ux/media-player"`

[Live examples](https://dastari.github.io/glass-ux/components/audio-player)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Names the player; defaults to the title. |
| attach | `MediaAttach \| undefined` | See type | no | — | Connect a stream engine; see {@link MediaAttach}. |
| autoAdvance | `boolean \| undefined` | false, true | no | — | Play the next entry when one ends. Default true. |
| autoPlay | `boolean \| undefined` | false, true | no | — | Start as soon as the browser allows. |
| castAdapter | `CastAdapter \| undefined` | See type | no | — | A casting session; see {@link CastAdapter}. |
| chapters | `readonly MediaChapter[] \| undefined` | See type | no | — | Named parts: marks on the seek bar and a menu. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| crossOrigin | `"anonymous" \| "use-credentials" \| undefined` | "anonymous", "use-credentials" | no | — | For sources and tracks on another origin. |
| defaultLoop | `boolean \| undefined` | false, true | no | — | Start repeating when uncontrolled. Default false. |
| defaultMuted | `boolean \| undefined` | false, true | no | — | Start muted when uncontrolled. Default false. |
| defaultPlaybackRate | `number \| undefined` | See type | no | — | Default 1. |
| defaultSelectedId | `string \| undefined` | See type | no | — | The first entry when uncontrolled. Default: the first. |
| defaultVolume | `number \| undefined` | See type | no | — | Default 1. |
| labels | `Partial<{ videoPlayer: string; audioPlayer: string; play: string; pause: string; replay: string; previousItem: string; nextItem: string; seek: string; seekValue: ({ elapsed, total }: { elapsed: string; total: string; }) => string; seekLive: (behind: string) => string; atLiveEdge: string; volume: string; mute: string; unmute: string; settings: string; speed: string; rate: (rate: string) => string; normalSpeed: string; captions: string; captionsOff: string; captionSize: string; captionSizeSmall: string; captionSizeMedium: string; captionSizeLarge: string; captionSizeExtraLarge: string; chapters: string; quality: string; qualityAuto: string; qualityAutoActive: (level: string) => string; loop: string; playlist: string; view: string; viewInline: string; viewMaximised: string; viewWindowed: string; viewFullscreen: string; viewPip: string; maximise: string; restore: string; miniPlayer: string; fullscreen: string; exitFullscreen: string; pictureInPicture: string; exitPictureInPicture: string; cast: string; castConnecting: (device: string) => string; stopCasting: (device: string) => string; castingTo: (device: string) => string; castDevice: string; live: string; goLive: string; loading: string; stalled: string; retry: string; errorNetwork: string; errorDecode: string; errorUnsupported: string; errorAborted: string; errorStream: string; playingInMiniPlayer: string; playingInPip: string; returnToPage: string; closePlayer: string; movePlayer: string; moveHelp: string; playerPosition: string; topLeft: string; topRight: string; bottomLeft: string; bottomRight: string; sizeSmall: string; sizeMedium: string; sizeLarge: string; announcePlaying: string; announcePaused: string; announceMuted: string; announceUnmuted: string; announceVolume: (level: string) => string; announceSpeed: (rate: string) => string; announceCaptions: (label: string) => string; announceCaptionsOff: string; announceQuality: (label: string) => string; announceLoopOn: string; announceLoopOff: string; announceItem: (title: string) => string; announceCastEnded: string; announceView: (mode: string) => string; announceMoved: string; }> \| undefined` | See type | no | — | Wording overrides. |
| live | `boolean \| undefined` | false, true | no | — | A live stream: the timeline shows the seekable window and go-to-live appears. |
| loading | `boolean \| undefined` | false, true | no | — | Show the skeleton while the host loads what to play. |
| locale | `string \| undefined` | See type | no | — | Formatting and wording locale; defaults to the nearest LocaleProvider. |
| loop | `boolean \| undefined` | false, true | no | — | Repeat the entry. Pair with `onLoopChange` to control it. |
| mediaSession | `boolean \| undefined` | false, true | no | — | Publish to the operating system's media controls. Default true. |
| muted | `boolean \| undefined` | false, true | no | — | Pair with `onMutedChange` to control it. |
| onEnded | `(() => void) \| undefined` | See type | no | — | Called when the entry ends. |
| onError | `((error: MediaErrorKind) => void) \| undefined` | See type | no | — | Called when playback fails, with what failed. |
| onLoopChange | `((loop: boolean) => void) \| undefined` | See type | no | — | Called when repeat turns on or off. |
| onMutedChange | `((muted: boolean) => void) \| undefined` | See type | no | — | Called when the player mutes or unmutes. |
| onPlaybackRateChange | `((rate: number) => void) \| undefined` | See type | no | — | Called when the speed changes. |
| onSelectedIdChange | `((id: string, details: MediaItemChangeDetails) => void) \| undefined` | See type | no | — | Called with the id of the new entry and why it changed. |
| onVolumeChange | `((volume: number) => void) \| undefined` | See type | no | — | Called when the volume changes, from 0 to 1. |
| playbackRate | `number \| undefined` | See type | no | — | Pair with `onPlaybackRateChange` to control it. |
| playerRef | `Ref<MediaPlayerController> \| undefined` | See type | no | — | The player's controller, for commands from outside. |
| playlist | `readonly MediaItem[] \| undefined` | See type | no | — | Entries to play in order, in place of `src`. |
| poster | `string \| undefined` | See type | no | — | The image shown before playback, or the artwork of audio. |
| preload | `"metadata" \| "none" \| "auto" \| undefined` | "metadata", "none", "auto" | no | — | How much the browser loads up front. Default `metadata`. |
| rates | `readonly number[] \| undefined` | See type | no | — | Speeds offered, ascending. Default 0.5 to 2. |
| selectedId | `string \| undefined` | See type | no | — | The entry in play, by `id`. Pair with `onSelectedIdChange` to control it. |
| showPlaylist | `boolean \| undefined` | false, true | no | — | Show the playlist's entries under the controls. Default true when there are several. |
| sources | `readonly MediaSource[] \| undefined` | See type | no | — | Several encodings of the same media, best first. |
| src | `string \| undefined` | See type | no | — | One file. Use `sources` for several encodings. |
| stallAfter | `number \| undefined` | See type | no | — | Seconds playback may wait before the stall message shows. Default 8. |
| storyboard | `MediaStoryboard \| undefined` | See type | no | — | A sprite sheet for the seek bar's preview. |
| subtitle | `string \| undefined` | See type | no | — | A second line: the show, album or artist. |
| title | `string \| undefined` | See type | no | — | The name shown in the mini player, playlists and the system's media controls. |
| tracks | `readonly MediaTextTrack[] \| undefined` | See type | no | — | Caption and subtitle files. |
| volume | `number \| undefined` | See type | no | — | 0 to 1. Pair with `onVolumeChange` to control it. |
