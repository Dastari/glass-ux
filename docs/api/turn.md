# Turn

One prompt and its answers. The turn navigator jumps between turns.

`import { Turn } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/turn)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| index | `number` | See type | yes | — | The turn's number, written to `data-turn` for the navigator's TurnAnchor `index` and used in the default label "Turn {index}". |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
