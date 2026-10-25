# MapStatusSummary

Status counts as dot · number · label chips (clusters, popups, legends).

`import { MapStatusSummary } from "glass-ux/map"`

[Live examples](https://dastari.github.io/glass-ux/components/map-status-summary)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| counts | `Readonly<Record<"danger" \| "warning" \| "healthy" \| "unknown", number>>` | See type | yes | — | Points per status; statuses with zero are left out. |
| labels | `Readonly<Record<"danger" \| "warning" \| "healthy" \| "unknown", string>> \| undefined` | See type | no | — | Label per status; defaults to `DEFAULT_STATUS_LABELS`. |
