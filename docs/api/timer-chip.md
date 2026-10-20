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

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| ref | `Ref<HTMLButtonElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| value | `string \| number \| readonly string[] \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |

Also accepts the element’s standard HTML attributes and React DOM events.
