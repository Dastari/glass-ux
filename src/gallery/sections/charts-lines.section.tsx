import { useEffect, useState } from "react"
import { ContainerLab, Rules, SectionPage, Specimen, TierBox, TierRow, TokenTable } from "../kit.js"
import { AreaChart, LineChart, type LineChartProps } from "../../ui/charts/index.js"
import { CPU, CPU_MARKERS, DISK_PCT, HOUR, MEMORY_GB, MEMORY_PARTS, NET_IN, NET_OUT, NOW, WEEK, WEEK_CPU, walk } from "./charts.fixtures.js"
import { SkeletonSwaps, Tile, TileGrid } from "./charts.kit.js"

const cpu: LineChartProps = {
  label: "CPU · NST-C106 · last hour",
  title: "CPU",
  x: HOUR,
  series: [{ key: "cpu", label: "CPU", data: CPU }],
  unit: "%",
  domain: [0, 100],
  thresholds: [
    { value: 80, tone: "warning", label: "Warning" },
    { value: 95, tone: "danger", label: "Critical" },
  ],
  markers: CPU_MARKERS,
  now: NOW,
}

const network: LineChartProps = {
  label: "Network · NST-C106 · last hour",
  title: "Network",
  x: HOUR,
  series: [
    { key: "in", label: "Received", data: NET_IN },
    { key: "out", label: "Sent", data: NET_OUT },
  ],
  unit: "Mbps",
  now: NOW,
}

const memory: LineChartProps = {
  label: "Memory composition · NST-C106 · last hour",
  title: "Memory",
  x: HOUR,
  series: [
    { key: "inuse", label: "In use", data: MEMORY_PARTS.inUse },
    { key: "modified", label: "Modified", data: MEMORY_PARTS.modified },
    { key: "standby", label: "Standby", data: MEMORY_PARTS.standby },
    { key: "free", label: "Free", data: MEMORY_PARTS.free },
  ],
  unit: "GB",
  domain: [0, 7.8],
  stacked: true,
  now: NOW,
}

/** A live feed: a new sample every two seconds, the window slides and values morph in place. */
function _LiveCpu() {
  const [data, setData] = useState(() => walk(60, 9, { base: 36, swing: 16 }))
  const [x, setX] = useState(HOUR)
  useEffect(() => {
    let tick = 0
    const timer = setInterval(() => {
      tick++
      const next = walk(1, 900 + tick, { base: 36, swing: 40 })[0] ?? 36
      setData((current) => [...current.slice(1), next])
      setX((current) => [...current.slice(1), new Date(current[current.length - 1]!.getTime() + 60_000)])
    }, 2000)
    return () => clearInterval(timer)
  }, [])
  return <LineChart label="CPU · STUDIO-VM · live" title="CPU · live" x={x} series={[{ key: "cpu", label: "CPU", data }]} unit="%" domain={[0, 100]} />
}

export default function ChartsLinesSection() {
  return (
    <SectionPage>
      <Specimen
        title="Three tiers, one chart"
        description="The box decides, on both axes: the lines alone with the latest value in a row; a passive tile with its top gridline and first and last times; the full chart with axes, threshold bands, markers and the crosshair. The tooltip shows the value at the cursor for one series or several; with one series the head also shows it in place of the latest, as in Metric. The full head ends with View as table and Copy as CSV (raw values, ISO 8601 times)."
        wide
      >
        <TierRow testId="line-cpu">{() => <LineChart {...cpu} />}</TierRow>
      </Specimen>

      <Specimen title="Several series" description="The legend toggles series (one tab stop, arrows move, Space toggles); colours stay with their series. The tooltip lists every series at the crosshair: values lead, labels follow." wide>
        <div className="charts-split">
          <div className="charts-pane" data-testid="line-network">
            <LineChart {...network} />
          </div>
          <div className="charts-pane" data-testid="area-memory">
            <AreaChart {...memory} />
          </div>
        </div>
      </Specimen>

      <Specimen title="Dashboard tiles" description="Compact tiles in an auto-fill grid, beside each other and beside Metric tiles. Tiles are glanceable; open the pane to inspect." wide>
        <TileGrid>
          <Tile>
            <LineChart {...cpu} />
          </Tile>
          <Tile>
            <AreaChart label="Memory · NST-C106" title="Memory" x={HOUR} series={[{ key: "mem", label: "Memory", data: MEMORY_GB }]} unit="GB" domain={[0, 7.8]} />
          </Tile>
          <Tile>
            <LineChart {...network} />
          </Tile>
          <Tile>
            <AreaChart label="Disk active time · NST-C106" title="Disk active time" x={HOUR} series={[{ key: "disk", label: "Disk", data: DISK_PCT }]} unit="%" domain={[0, 100]} />
          </Tile>
        </TileGrid>
      </Specimen>

      <Specimen title="Long series" description="10,080 one-minute samples (a week). Drawing uses largest-triangle decimation so peaks survive; the readout and the table stay exact." wide>
        <div className="charts-pane" data-size="short" data-testid="line-week">
          <AreaChart label="CPU · NST-C106 · last 7 days" title="CPU · 7 days" x={WEEK} series={[{ key: "cpu", label: "CPU", data: WEEK_CPU }]} unit="%" domain={[0, 100]} now={NOW} />
        </div>
      </Specimen>

<Specimen title="Loading, empty and error" description="In place, in the chart's own box: the skeleton is the plot's exact shape, so loading moves nothing. Swap to compare." wide>
        <SkeletonSwaps id="line" render={(state) => <LineChart {...cpu} state={state} />} />
        <div className="gallery-tiers">
          <TierBox size="compact" label="empty · compact">
            <LineChart {...cpu} state="empty" emptyText="No samples in the last hour" />
          </TierBox>
          <TierBox size="full" label="error · full">
            <LineChart {...cpu} state="error" errorText="Agent offline — retry when NST-C106 reconnects" onRetry={() => undefined} />
          </TierBox>
          <TierBox size="micro" label="error · micro">
            <LineChart {...cpu} state="error" errorText="Agent offline" />
          </TierBox>
        </div>
      </Specimen>

      <Specimen title="Over imagery" description="Inside .over-imagery the chart inherits the imagery context: halos on lines and labels, frosted fills." backdrop>
        <TierBox size="compact" label="compact">
          <LineChart {...network} />
        </TierBox>
        <TierBox size="micro" label="micro">
          <LineChart {...cpu} />
        </TierBox>
      </Specimen>

      <ContainerLab description="micro in the row and header, compact in the tile and the tall column, full in the pane and the free frame.">
        {() => <LineChart {...network} />}
      </ContainerLab>

      <Rules
        do={[
          "Give a chart a box with a definite height; it fills it and picks its tier.",
          "Fix the domain for percentages ([0, 100]) so tiles compare.",
          "Use a threshold when a value means a state; the line takes the tone above it.",
          "Stack only parts of a total, and say so in the label.",
        ]}
        dont={[
          "Put two units on one chart; use two charts.",
          "Colour a series green or red for decoration; status tones mean a state.",
          "Add a legend to a single series; the title names it.",
          "Label every point; the crosshair, the table and the end value carry them.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--chart-h", "The palette's data hue (themes.css), never the accent"],
          ["--chart-1", "Series slot 1: the data colour"],
          ["--chart-2", "Slot 2: --chart-h + 290°, deeper tier"],
          ["--chart-3", "Slot 3: + 50°, lighter tier"],
          ["--chart-4", "Slot 4: + 220°, lighter tier"],
          ["--chart-wash", "Area wash at the line"],
          ["--chart-stroke", "Every line"],
          ["--chart-dot", "End and hover dots"],
          ["--chart-grid", "Gridlines"],
          ["--chart-baseline", "Zero line and crosshair"],
          ["--warning-soft", "Warning band"],
          ["--warning-line", "Warning threshold"],
          ["--surface-3", "Dot ring"],
        ]}
      />
    </SectionPage>
  )
}
