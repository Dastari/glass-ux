import type { ComponentProps } from "react";
import { Histogram, type ChartState } from "../../ui/charts/index.js";
import {
  ContainerLab,
  SectionPage,
  Specimen,
  TierBox,
  TierRow,
} from "../kit.js";
import { SkeletonSwaps } from "./charts.kit.js";

const sample = {
  values: [12, 14, 18, 20, 22, 18, 17, 16, 25, 24, 28, 32, 21, 19, 15, 27],
  bins: 6,
  unit: "h",
  countLabel: "Projects",
} satisfies Omit<ComponentProps<typeof Histogram>, "label">;
const render = (state: ChartState = "ready") => (
  <Histogram
    {...sample}
    label="Histogram · fictional studio projects"
    title="Studio projects"
    state={state}
    emptyText="No project measurements yet"
    errorText="Measurements could not load"
    onRetry={() => undefined}
  />
);

export default function HistogramSection() {
  return (
    <SectionPage>
      <Specimen
        title="Histogram"
        description="A focused example using fictional studio project measurements. Hover or use the keyboard to inspect values; the chart's table preserves the exact data."
        wide
      >
        <div className="charts-pane" data-testid="chart-histogram">
          {render()}
        </div>
      </Specimen>
      <Specimen
        title="Responsive sizes"
        description="The same Histogram adapts to row, tile and full-panel sizes."
        wide
      >
        <TierRow>{() => render()}</TierRow>
      </Specimen>
      <Specimen
        title="Loading, empty and error"
        description="States stay in the chart's own box. Swap the skeleton to compare its dimensions."
        wide
      >
        <SkeletonSwaps id="histogram" render={render} />
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
