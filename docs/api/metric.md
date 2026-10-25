# Metric

A number with its trend — the R7.2 container showcase. One component, three tiers chosen by
the box it is given (width AND height), so it fits a table cell, a header, a tile and a pane:

  micro    height < 5rem or width < 10rem: label, value, delta and an inline sparkline in one row
  compact  a tile: label, value, delta, and a small chart without axes when height allows
  full     ≥ 20rem × 12rem: value, delta and comparison, min/avg/max, the chart with a time
           axis and a hover crosshair whose readout replaces the value

It fills its box (container-type: size), so the parent must give it a definite height.

`import { Metric } from "glass-ux/metric"`

[Live examples](https://dastari.github.io/glass-ux/components/metric)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| better | `"none" \| "up" \| "down" \| undefined` | "none", "up", "down" | no | "up" | Which direction is good. CPU and latency: "down"; uptime: "up"; "none" for neutral. |
| data | `readonly number[] \| undefined` | See type | no | [] | The recent series, oldest first. |
| delta | `number \| undefined` | See type | no | — | Change against the comparison period, in `deltaUnit`. |
| deltaLabel | `string \| undefined` | See type | no | — | The comparison, shown where there is room: "vs previous hour". |
| deltaUnit | `string \| undefined` | See type | no | unit | Unit displayed with the change. |
| domain | `Domain \| undefined` | See type | no | — | Fixed value range, e.g. [0, 100] for percentages. |
| format | `((value: number) => string) \| undefined` | See type | no | — | Value formatter or formatting options. |
| label | `string` | See type | yes | — | What is measured: "CPU", "Memory", "Latency". |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for the value, delta and statistics. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| range | `string \| undefined` | See type | no | — | The period the series covers: "Last hour". |
| times | `readonly string[] \| undefined` | See type | no | — | A label per data point for the hover readout ("10:32"). |
| tone | `SparklineTone \| undefined` | "data", "danger", "warning", "success", "accent", "neutral", "info" | no | "data" | The series' state, when it has one (warning when a threshold is crossed). |
| unit | `string \| undefined` | See type | no | "" | Unit displayed with a numeric value. |
| value | `number \| null` | See type | yes | — | The current value; null while unknown. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
