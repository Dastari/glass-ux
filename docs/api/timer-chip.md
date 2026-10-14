# TimerChip

A running timer in the top bar: "0:42 · #4821", shown only while it runs (R5.2). It ticks
every second in tabular figures inside a reserved width, so nothing beside it moves; it
hands over to an hours width only once, at the first hour. Click it to open what it runs
against.

`import { TimerChip } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/timer-chip)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| label | `string` | See type | yes | — | What it runs against: "#4821". |
| name | `string \| undefined` | See type | no | — | Accessible noun: "Timer on ticket #4821". |
| startedAt | `number` | See type | yes | — | When the timer started (epoch ms). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
