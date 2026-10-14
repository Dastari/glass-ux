import { IconChartLine, IconReporting } from "../../icons/generated/icons.js";
import { ColumnChart, LineChart } from "../../ui/charts/index.js";
import type { AiResult, ChartSeries } from "../types.js";
import { ResultFrame } from "./frame.js";
type ChartResult = Extract<AiResult, { type: "chart" }>;
/** Assistant result adapted into the shared chart family, with stable series and keyboard/table access. */
export function ResultChart({ result }: { result: ChartResult }) {
  const series = result.series.map((item, index) => ({
    key: `series-${index}`,
    label: item.name,
    data: item.values,
    tone: item.tone === "accent" ? undefined : item.tone,
  }));
  const common = {
    label: result.title,
    series,
    domain: result.domain,
    unit: result.unit,
  };
  return (
    <ResultFrame
      result={result}
      icon={result.chart === "bar" ? <IconReporting /> : <IconChartLine />}
      copyText={[
        ["", ...result.labels].join("\t"),
        ...result.series.map((item) => [item.name, ...item.values].join("\t")),
      ].join("\n")}
      csv={[
        ["Series", ...result.labels].join(","),
        ...result.series.map((item) => [item.name, ...item.values].join(",")),
      ].join("\n")}
    >
      <div className="fa-ai-result-chart">
        {result.chart === "bar" ? (
          <ColumnChart {...common} categories={result.labels} />
        ) : (
          <LineChart
            {...common}
            x={result.labels.map((_, index) => index)}
            xLabel="Sample"
            formatX={(index) => result.labels[Math.round(index)] ?? ""}
          />
        )}
      </div>
    </ResultFrame>
  );
}
export type { ChartSeries };
