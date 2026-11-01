# VideoPlayerSkeleton

The skeleton of a player of the same shape.

`import { VideoPlayerSkeleton } from "glass-ux/media-player"`

[Live examples](https://dastari.github.io/glass-ux/components/video-player-skeleton)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aspectRatio | `string \| undefined` | See type | no | "16 / 9" | The reserved shape, as CSS `aspect-ratio`. Default `16 / 9`. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| fill | `boolean \| undefined` | false, true | no | — | Fill a parent of definite height instead of reserving an aspect ratio: a window body, a stage. |
