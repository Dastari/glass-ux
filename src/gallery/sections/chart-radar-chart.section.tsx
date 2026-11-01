import { useState, type ComponentProps } from "react";
import { RadarChart, type ChartState } from "../../ui/charts/index.js";
import {
  ContainerLab,
  SectionPage,
  Specimen,
  TierBox,
  TierRow,
} from "../kit.js";
import { SkeletonSwaps } from "./charts.kit.js";

const sample = {
  measures: ["Colour", "Contrast", "Sharpness", "Framing", "Exposure", "Composition"],
  measureLabel: "Measure",
  domain: [0, 10],
  series: [
    { key: "north", label: "North studio", data: [8.2, 6.4, 7.8, 9.1, 7.2, 8.6] },
    { key: "south", label: "South studio", data: [6.1, 8.4, 6.9, 7.4, 8.8, 7.1] },
  ],
} satisfies Omit<ComponentProps<typeof RadarChart>, "label">;

const render = (state: ChartState = "ready") => (
  <RadarChart
    {...sample}
    label="RadarChart · fictional studio review scores"
    title="Review scores"
    state={state}
    emptyText="No reviews yet"
    errorText="Reviews could not load"
    onRetry={() => undefined}
  />
);

function Activated() {
  const [picked, setPicked] = useState("Colour");
  return (
    <>
      <div className="charts-pane" data-size="short" data-testid="chart-radar-chart-activate">
        <RadarChart {...sample} label="Scores by measure · fictional" title="Choose a measure" onActivate={(_, measure) => setPicked(measure)} />
      </div>
      <p className="type-caption text-fg-muted" data-testid="chart-radar-chart-picked">Selected measure: {picked}</p>
    </>
  );
}

export default function RadarChartSection() {
  return (
    <SectionPage>
      <Specimen
        title="RadarChart"
        description="Every spoke shares one scale. Hide a series in the legend, or point at it to bring it forward. Arrow keys move to the spoke in that direction."
        wide
      >
        <div className="charts-pane" data-testid="chart-radar-chart">
          {render()}
        </div>
      </Specimen>
      <Specimen
        title="A missing reading"
        description="A null breaks the outline at its spoke and drops the wash: a shape cannot close across a gap."
        wide
      >
        <div className="charts-pane" data-size="short" data-testid="chart-radar-chart-gap">
          <RadarChart
            label="Review scores with a missing reading · fictional"
            title="East studio"
            measures={sample.measures}
            domain={[0, 10]}
            series={[{ key: "east", label: "East studio", data: [7.4, 8.1, null, 6.8, 7.9, 8.3] }]}
          />
        </div>
      </Specimen>
      <Specimen
        title="Activating a spoke"
        description="With onActivate, Enter, Space or a click reports the measure under the cursor."
        wide
      >
        <Activated />
      </Specimen>
      <Specimen
        title="Responsive sizes"
        description="Labels and rings give way as the box narrows. The tooltip and table keep every measure."
        wide
      >
        <TierRow>{() => render()}</TierRow>
      </Specimen>
      <Specimen
        title="Loading, empty and error"
        description="States stay in the chart's own box. Swap the skeleton to compare its dimensions."
        wide
      >
        <SkeletonSwaps id="radar-chart" render={render} />
        <div className="gallery-tiers">
          <TierBox size="compact" label="Empty">
            {render("empty")}
          </TierBox>
          <TierBox size="full" label="Error">
            {render("error")}
          </TierBox>
        </div>
      </Specimen>
      <ContainerLab>{() => render()}</ContainerLab>
    </SectionPage>
  );
}
