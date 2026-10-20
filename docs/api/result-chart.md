# ResultChart

Assistant result adapted into the shared chart family, with stable series and keyboard/table access.

`import { ResultChart } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/result-chart)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| result | `ResultBase & { type: "chart"; chart: "line" \| "bar"; labels: string[]; series: ChartSeries[]; unit?: string; domain?: [number, number]; }` | See type | yes | — | The chart result: `chart` (line or bar), x-axis `labels`, `series`, optional `unit` and `domain`; copy and CSV export use the same values. |
