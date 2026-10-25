import { ContainerLab, Example, Rules, SectionPage, Specimen, SwapSlot, tierBoxClass, TierRow, TokenTable } from "../kit.js"
import { DetailGrid } from "../../ui/detail-tile/index.js"
import { Metric, MetricSkeleton, type MetricProps } from "../../ui/metric/index.js"
import { Sparkline } from "../../ui/sparkline/index.js"
import { clockTimes, series } from "./nav.fixtures.js"

const CPU = series(60, 1.3, 34, 30)
const TIMES = clockTimes(60)

const METRICS: MetricProps[] = [
  {
    label: "CPU",
    value: CPU[CPU.length - 1] ?? 34,
    unit: "%",
    delta: 6,
    better: "down",
    deltaLabel: "vs previous hour",
    data: CPU,
    times: TIMES,
    range: "Last hour",
    domain: [0, 100],
  },
  {
    label: "Memory",
    value: 7.4,
    unit: "GB",
    delta: 0.3,
    better: "down",
    deltaLabel: "vs previous hour",
    data: series(60, 4.2, 82, 8).map((v) => Math.round(v * 7.8) / 100),
    times: TIMES,
    range: "Last hour",
    domain: [0, 7.8],
    tone: "warning",
  },
  {
    label: "Latency",
    value: 28,
    unit: "ms",
    delta: -12,
    better: "down",
    deltaLabel: "vs yesterday",
    data: series(60, 2.7, 40, 30),
    times: TIMES,
    range: "Last hour",
  },
  {
    label: "Uptime",
    value: 99.98,
    unit: "%",
    format: (value) => value.toFixed(2),
    delta: 0,
    better: "up",
    deltaLabel: "vs last week",
    data: series(30, 5.1, 99, 1).map((v) => Math.min(100, 99 + v / 100)),
    range: "30 days",
  },
]

const cpu = METRICS[0]!

export default function MetricSection() {
  return (
    <SectionPage>
      <Specimen
        title="Three tiers, one component"
        description="The box decides: micro in a row or header, compact in a tile, full in a pane. Hover the full chart: the crosshair snaps to the nearest sample and the readout replaces the value."
        wide
      >
        <TierRow testId="metric">{() => <Metric {...cpu} />}</TierRow>
      </Specimen>

      <Specimen title="Dashboard tiles" description="Compact tiles in an auto-fill grid. Tone follows state: memory has crossed its warning threshold." wide>
        <DetailGrid min="md" className="w-full">
          {METRICS.map((metric) => (
            <div key={metric.label} className="glass-control h-40 rounded-tile p-tile">
              <Metric {...metric} />
            </div>
          ))}
        </DetailGrid>
      </Specimen>

      <Specimen title="In a table row" description="Micro tier at row height: value, delta and the inline sparkline in one line." layout="stack">
        <div className="flex w-150 max-w-full flex-col">
          {["NST-C106", "LMN-4E5E", "STUDIO-VM"].map((host, index) => (
            <div key={host} className="flex h-12 items-center gap-4 border-b border-line px-2 last:border-b-0">
              <span className="type-body w-36 shrink-0 tabular-nums">{host}</span>
              <div className="h-10 min-w-0 flex-1">
                <Metric {...cpu} value={[34, 71, 12][index] ?? 34} delta={[6, 18, -4][index]} data={series(24, index + 2, [34, 64, 14][index] ?? 30, 20)} />
              </div>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen title="Sparkline" description="Usable alone: 2px line in the data colour, a wash under it and a ringed dot on the latest sample. Status tones only when the series is in that state. thresholds draw hairlines at values: a status tone for a limit, dashed for a soft reference.">
        {(["data", "success", "warning", "danger", "neutral"] as const).map((tone, index) => (
          <Example key={tone} label={tone}>
            <div className="h-10 w-40">
              <Sparkline data={series(24, index * 1.7, 50, 30)} tone={tone} label={`${tone} series`} />
            </div>
          </Example>
        ))}
        <Example label="thresholds">
          <div className="h-10 w-40" data-testid="sparkline-thresholds">
            <Sparkline data={series(24, 2.4, 50, 30)} thresholds={[{ value: 70, tone: "warning" }, { value: 50, dashed: true }]} label="Series with a warning limit at 70 and a dashed target at 50" />
          </div>
        </Example>
      </Specimen>

      <Specimen title="Loading" description="The skeleton takes the same rows in every tier. Swap in place to compare." wide>
        <div className="gallery-tiers">
          <SwapSlot id="metric-compact" className={tierBoxClass("compact")} skeleton={<MetricSkeleton />} loaded={<Metric {...cpu} />} />
          <SwapSlot id="metric-full" className={tierBoxClass("full")} skeleton={<MetricSkeleton range axis />} loaded={<Metric {...cpu} />} />
          <SwapSlot id="metric-micro" className={tierBoxClass("micro")} skeleton={<MetricSkeleton />} loaded={<Metric {...cpu} />} />
        </div>
      </Specimen>

      <ContainerLab description="micro in the row and header, compact in the tile and tall-narrow column, full in the pane and the free frame.">
        {() => <Metric {...cpu} />}
      </ContainerLab>

      <Rules
        do={[
          "Give a Metric a box with a definite height; it fills it and picks its tier.",
          "Say which direction is good so the delta colours itself correctly.",
          "Fix the domain for percentages ([0, 100]) so lines compare across tiles.",
          "Name the comparison (“vs previous hour”) where the tier has room.",
        ]}
        dont={[
          "Pick the tier by viewport or by prop; the container decides.",
          "Colour a healthy series green or red; status tones mean a state.",
          "Add a legend or axis box to a single series; the label names it.",
          "Put a number on every point; the crosshair and stats carry them.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--chart-1", "Line: the data colour, never the accent"],
          ["--chart-wash", "Area wash (top), a share of the line colour"],
          ["--surface-3", "End-dot ring"],
          ["--line-strong", "Crosshair and average hairline"],
          ["--success-text", "Good delta"],
          ["--danger-text", "Bad delta"],
          ["--type-display-size", "Full value"],
          ["--type-headline-size", "Compact value"],
          ["--type-body-size", "Micro value"],
        ]}
      />
    </SectionPage>
  )
}
