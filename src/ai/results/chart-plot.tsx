import { useMessages } from "../../lib/i18n/index.js"
import { resultsMessages } from "./messages.js"
import { ColumnChart, LineChart } from "../../ui/charts/index.js";
import type { AiResult } from "../types.js";

/** The plot inside a chart result; loaded on demand by ResultChart. */
export default function ChartPlot({ result }: { result: Extract<AiResult, { type: "chart" }> }) {
 const messages = useMessages(resultsMessages)
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
  return result.chart === "bar" ? (
    <ColumnChart {...common} categories={result.labels} />
  ) : (
    <LineChart
      {...common}
      x={result.labels.map((_, index) => index)}
      xLabel={messages.sample}
      formatX={(index) => result.labels[Math.round(index)] ?? ""}
    />
  );
}
