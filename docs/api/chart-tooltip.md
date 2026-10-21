# ChartTooltip

The floating readout at a chart's cursor, for one series or several and for per-mark
charts: a glass overlay that follows the pointer (or the keyboard cursor) and lists every
visible series at that position — values lead, labels follow, each keyed by a short line
of the series colour. It is portalled to the body (an overlay is never a blurred layer
inside the panel's blurred layer, R4.2), carries the plot's mode and palette islands, and
never takes the pointer.

`import { ChartTooltip } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/chart-tooltip)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| anchor | `RefObject<HTMLElement \| null>` | See type | yes | — | The plot, for its mode/palette island. |
| children | `(hover: Hover) => ReactNode` | See type | yes | — | Build the content for a hover; return null for none. |
| store | `HoverStore` | See type | yes | — | External store observed by the component. |
