# TurnNavigator

Jump between prompts on wide screens: a column of dashes beside the log, one per turn.
The current turn is the accent dash; neighbours of the pointer grow so the target is easy
to hit. Each dash names its prompt in a tooltip; arrow keys, Home and End move.

`import { TurnNavigator } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/turn-navigator)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| active | `number` | See type | yes | — | Marks the current destination or active choice. |
| onNavigate | `(index: number) => void` | See type | yes | — | Event callback; the typed signature specifies its arguments. |
| turns | `TurnAnchor[]` | See type | yes | — | Conversation turns represented by the view. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
