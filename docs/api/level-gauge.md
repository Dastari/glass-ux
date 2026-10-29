# LevelGauge

A small ordered scale — Low, Moderate, High — showing where something stands: segments
fill to the level in its tone, and the level's name follows in that tone's text colour.
An earlier level (before mitigation) stays visible: segments it reached are traced in its
tone when the level came down, and the segments gained are striped when it rose. With
`onPress` the whole gauge is a button.

`import { LevelGauge } from "glass-ux/level-gauge"`

[Live examples](https://dastari.github.io/glass-ux/components/level-gauge)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Layout only. |
| fallback | `ReactNode` | See type | no | — | Shown instead of the level's name when `value` is not on the scale. Default "Not rated". |
| label | `string` | See type | yes | — | What is rated: "Final risk". Part of the accessible name; shown above the segments at `md`. |
| levels | `readonly GaugeLevel<V>[]` | See type | yes | — | The scale, lowest first: two to about six levels. |
| note | `ReactNode` | See type | no | — | One line under the label at `md`. |
| onPress | `(() => void) \| undefined` | See type | no | — | Makes the gauge a button (an explanation of the levels, normally). |
| previous | `V \| null \| undefined` | See type | no | — | An earlier level, such as before mitigation: segments down from it are traced, or striped up to `value` when it rose. |
| previousLabel | `string \| undefined` | See type | no | — | Names `previous`: "Before mitigation". Default "Previously". |
| size | `"sm" \| "md" \| undefined` | "sm", "md" | no | "sm" | `sm` (default): segments and the level's name in a line, for table cells and footers. `md`: the label, the note, full-width segments and the scale's names beneath. |
| value | `V \| null \| undefined` | See type | yes | — | The level now, or null/undefined when not rated (the `fallback` shows, in the same space). |
