# ChartTable

Every chart carries its data as a table. Hidden, it gives screen readers the values the
picture shows; visible ("View as table"), it replaces the plot in the same box and scrolls
inside it.

`import { ChartTable } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/chart-table)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| caption | `string` | See type | yes | — | Accessible caption or figure description. |
| model | `ChartTableModel` | See type | yes | — | Selected assistant model or typed view model. |
| visible | `boolean \| undefined` | false, true | no | false | Visible "View as table" mode, or the always-present visually hidden fallback. |
