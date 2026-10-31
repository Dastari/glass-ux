import { useMessages } from "../../lib/i18n/index.js"
import { resultsMessages } from "./messages.js"
import { lazy, Suspense } from "react";
import { IconChartLine, IconReporting } from "../../icons/generated/icons.js";
import { Skeleton } from "../../ui/skeleton/index.js";
import type { AiResult, ChartSeries } from "../types.js";
import { ResultFrame } from "./frame.js";
type ChartResult = Extract<AiResult, { type: "chart" }>;
// The chart family (d3 scales and formatters) loads with the first chart result; the frame and
// its actions render at once and the plot box keeps its reserved height while it loads.
const ChartPlot = /* @__PURE__ */ lazy(() => import("./chart-plot.js"));
/** Assistant result adapted into the shared chart family, with stable series and keyboard/table access. */
export function ResultChart({ result }: {
  /** The chart result: `chart` (line or bar), x-axis `labels`, `series`, optional `unit` and `domain`; copy and CSV export use the same values. */
  result: ChartResult
}) {
  const messages = useMessages(resultsMessages)

  return (
    <ResultFrame
      result={result}
      icon={result.chart === "bar" ? <IconReporting /> : <IconChartLine />}
      copyText={[
        ["", ...result.labels].join("\t"),
        ...result.series.map((item) => [item.name, ...item.values].join("\t")),
      ].join("\n")}
      csv={[
        [messages.series, ...result.labels].join(","),
        ...result.series.map((item) => [item.name, ...item.values].join(",")),
      ].join("\n")}
    >
      <div className="fa-ai-result-chart">
        <Suspense fallback={<Skeleton.Block width="100%" height="100%" radius="tile" />}>
          <ChartPlot result={result} />
        </Suspense>
      </div>
    </ResultFrame>
  );
}
export type { ChartSeries };
