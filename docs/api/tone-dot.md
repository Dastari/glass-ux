# ToneDot

A tone-keyed state marker without an application-specific status vocabulary.

`import { ToneDot } from "glass-ux/tone-dot"`

[Live examples](https://dastari.github.io/glass-ux/components/tone-dot)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| label | `string \| undefined` | See type | no | — | Accessible state name; omit only beside a visible equivalent label. |
| marker | `"dot" \| "ring" \| "pulse" \| undefined` | "dot", "ring", "pulse" | no | "dot" | A solid dot, hollow ring, or compositor-only live pulse. |
| overlay | `boolean \| undefined` | false, true | no | false | Solid corner mark with a separating surface ring. |
| tone | `"data" \| BadgeTone \| undefined` | "data", "danger", "warning", "success", "neutral", "accent", "info" | no | "neutral" | Semantic state, or data for informational activity such as a running timer. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
