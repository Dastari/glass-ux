# MapStatusSummary

Status counts as dot · number · label chips (clusters, popups, legends).

`import { MapStatusSummary } from "glass-ux/map"`

[Live examples](https://dastari.github.io/glass-ux/components/map-status-summary)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| counts | `Readonly<Record<"danger" \| "warning" \| "healthy" \| "unknown", number>>` | See type | yes | — | Counts grouped by category or status. |
| labels | `Readonly<Record<"danger" \| "warning" \| "healthy" \| "unknown", string>> \| undefined` | See type | no | DEFAULT_STATUS_LABELS | Display and accessibility labels supplied by the application. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
