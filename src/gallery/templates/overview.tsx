import { useState } from "react";
import { ActivityFeed, type ActivityItem } from "../../ui/activity-feed/index.js";
import { AreaChart } from "../../ui/charts/index.js";
import { Metric, type MetricProps } from "../../ui/metric/index.js";
import { ScrollArea } from "../../ui/scroll-area/index.js";
import { Segmented } from "../../ui/segmented/index.js";
import { Panel, PanelBody, PanelHeader, Surface } from "../../ui/surface/index.js";

type Range = "week" | "quarter";

const HOUR = 3_600_000;
const NOW = Date.now();

const RANGES: Record<Range, { periods: string[]; metrics: MetricProps[]; series: { key: string; label: string; data: number[] }[] }> = {
  week: {
    periods: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    metrics: [
      { label: "Open projects", value: 18, delta: 2, better: "up", deltaLabel: "vs last week", data: [14, 15, 15, 16, 16, 18] },
      { label: "Hours logged", value: 312, unit: "h", delta: 24, better: "up", deltaLabel: "vs last week", data: [48, 62, 71, 66, 65] },
      { label: "Overdue tasks", value: 4, delta: -3, better: "down", deltaLabel: "vs last week", data: [9, 8, 8, 6, 4] },
      { label: "On schedule", value: 91, unit: "%", delta: 3, better: "up", deltaLabel: "vs last week", data: [84, 86, 88, 90, 91], domain: [0, 100] },
    ],
    series: [
      { key: "design", label: "Design", data: [28, 36, 41, 38, 35] },
      { key: "review", label: "Review", data: [20, 26, 30, 28, 30] },
    ],
  },
  quarter: {
    periods: ["Jul", "Aug", "Sep"],
    metrics: [
      { label: "Open projects", value: 26, delta: 5, better: "up", deltaLabel: "vs last quarter", data: [17, 21, 26] },
      { label: "Hours logged", value: 3840, unit: "h", delta: 210, better: "up", deltaLabel: "vs last quarter", data: [1210, 1280, 1350] },
      { label: "Overdue tasks", value: 11, delta: -6, better: "down", deltaLabel: "vs last quarter", data: [19, 14, 11] },
      { label: "On schedule", value: 88, unit: "%", delta: 2, better: "up", deltaLabel: "vs last quarter", data: [82, 85, 88], domain: [0, 100] },
    ],
    series: [
      { key: "design", label: "Design", data: [720, 760, 810] },
      { key: "review", label: "Review", data: [490, 520, 540] },
    ],
  },
};

const ACTIVITY: ActivityItem[] = [
  { id: "1", content: "Avery Quinn approved the Harbour Library floor plan", at: NOW - HOUR, tone: "success", toneLabel: "Approved" },
  { id: "2", content: "Noor Haddad uploaded 12 lighting studies", at: NOW - 3 * HOUR },
  { id: "3", content: "Mira Rowan moved Cedar Pavilion to review", at: NOW - 5 * HOUR, tone: "accent", toneLabel: "In review" },
  { id: "4", content: "Budget for Orchard House is 8% over plan", at: NOW - 26 * HOUR, tone: "warning", toneLabel: "Over budget" },
];

/** A project overview: figures, a trend and recent activity. The breadcrumb names the page. */
export default function OverviewTemplate() {
  const [range, setRange] = useState<Range>("week");
  const { periods, metrics, series } = RANGES[range];
  return (
    <ScrollArea aria-label="Overview" className="h-full">
      <div className="@container flex flex-col gap-panels p-gutter">
        <div className="flex justify-end">
          <Segmented<Range>
            aria-label="Period"
            size="sm"
            value={range}
            onValueChange={setRange}
            options={[
              { value: "week", label: "This week" },
              { value: "quarter", label: "This quarter" },
            ]}
          />
        </div>
        <div className="grid gap-panels @md:grid-cols-2 @4xl:grid-cols-4">
          {metrics.map((metric) => (
            <Surface key={metric.label} material="card" radius="tile" padding="tile" className="h-24 @md:h-36">
              <Metric {...metric} />
            </Surface>
          ))}
        </div>
        <div className="grid gap-panels @5xl:grid-cols-3">
          <Panel className="@5xl:col-span-2">
            <PanelHeader title="Hours by discipline" />
            <PanelBody>
              <div className="h-72">
                <AreaChart
                  label="Hours by discipline"
                  x={periods.map((_, index) => index)}
                  formatX={(index) => periods[index] ?? ""}
                  series={series}
                  stacked
                  unit="h"
                />
              </div>
            </PanelBody>
          </Panel>
          <Panel>
            <PanelHeader title="Recent activity" />
            <PanelBody>
              <ActivityFeed aria-label="Recent activity" items={ACTIVITY} />
            </PanelBody>
          </Panel>
        </div>
      </div>
    </ScrollArea>
  );
}
