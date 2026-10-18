# TurnNavigator

Jump between prompts on wide screens: a column of dashes beside the log, one per turn.
The current turn is the accent dash; neighbours of the pointer grow so the target is easy
to hit. Each dash names its prompt in a tooltip; arrow keys, Home and End move.

`import { TurnNavigator } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/turn-navigator)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| active | `number` | See type | yes | — | The `index` of the current turn; its dash is the accent and the one Tab reaches. |
| onNavigate | `(index: number) => void` | See type | yes | — | Called with a turn's `index` (not its position in `turns`) when its dash is clicked or reached with the arrow keys, Home or End. |
| turns | `TurnAnchor[]` | See type | yes | — | One dash per prompt, in order: the turn's `index` (its Turn `index`) and a one-line preview for the tooltip. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
