# ProportionStrip

A part-to-whole in one line: the micro tier of pie, donut, treemap and sunburst. Segments in
order, separated by the 2px surface gap, the whole bar's ends rounded.

`import { ProportionStrip } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/proportion-strip)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| height | `number` | See type | yes | — | Available height used for the component’s size tier. |
| items | `readonly StripItem[]` | See type | yes | — | The collection rendered by the component. Stable identifiers preserve selection and keyboard focus. |
| rem | `number` | See type | yes | — | Current pixel size of one rem used for layout measurement. |
| width | `number` | See type | yes | — | Available width or named width tier. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
