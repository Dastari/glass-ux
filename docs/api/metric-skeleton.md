# MetricSkeleton

Every row of the Metric in the same tier geometry, so loading never shifts a pixel.

`import { MetricSkeleton } from "glass-ux/metric"`

[Live examples](https://dastari.github.io/glass-ux/components/metric-skeleton)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| axis | `boolean \| undefined` | false, true | no | false | Axis extent, labels and formatting specification. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| delta | `boolean \| undefined` | false, true | no | true | Change from the comparison value. |
| range | `boolean \| undefined` | false, true | no | false | Visible range or selected value interval. |
| stats | `boolean \| undefined` | false, true | no | true | Summary statistics displayed with the content. |
