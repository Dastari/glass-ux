import { useSearch, type LinkProps } from "@tanstack/react-router"
import { useState } from "react"
import { ContainerLab, OnCanvas, Rules, SectionPage, Specimen, SwapSlot, TokenTable } from "../kit.js"
import { IconActivity, IconDashboard, IconEndpoint, IconRemoteControl, IconSoftware } from "../../icons/generated/icons.js"
import { StatusBadge } from "../../ui/badge/index.js"
import { Metric } from "../../ui/metric/index.js"
import { RouteTabs, Tabs, TabsSkeleton, type RouteTabItem, type TabItem } from "../../ui/tabs/index.js"
import { ENDPOINT_TABS, clockTimes, series } from "./nav.fixtures.js"

const SHORT: TabItem[] = ENDPOINT_TABS.slice(0, 4)

const STATES: TabItem[] = [
  { value: "overview", label: "Overview", icon: <IconDashboard /> },
  { value: "software", label: "Software", icon: <IconSoftware />, count: 42 },
  { value: "remote", label: "Remote control", icon: <IconRemoteControl />, disabled: true },
  { value: "activity", label: "Activity", icon: <IconActivity />, count: 3 },
]

/**
 * In the product each tab is a path segment (/endpoints/{id}/software). The gallery owns a
 * single route, so its demo tabs are `?tab=` on this page; the design route does not type
 * that search param, hence the cast.
 */
const tabLink = (tab: string) =>
  ({ to: ".", search: tab === "overview" ? {} : { tab } }) as unknown as LinkProps

const ROUTE_TABS: RouteTabItem[] = ENDPOINT_TABS.map((tab) => ({ ...tab, link: tabLink(tab.value) }))

function EndpointHeader() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="fa-tile-icon" aria-hidden>
        <IconEndpoint />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="type-title">NST-C106</span>
          <StatusBadge status="online" size="sm" />
        </div>
        <div className="type-caption text-fg-muted">HP EliteOne 1000 G2 27-in 4K UHD AiO · Windows 11 Business</div>
      </div>
    </div>
  )
}

/** Stands in for the route's <Outlet />: names the place the URL points at. */
function Outlet() {
  const search = useSearch({ strict: false }) as { tab?: string }
  const label = ENDPOINT_TABS.find((tab) => tab.value === (search.tab ?? "overview"))?.label ?? "Overview"
  return <div className="glass-inset mt-3 h-20 rounded-tile p-tile type-caption text-fg-muted">{label} · /endpoints/nst-c106/{search.tab ?? ""}</div>
}

function LocalTabs({ initial = "overview", items = ENDPOINT_TABS, label = "NST-C106" }: { initial?: string; items?: TabItem[]; label?: string }) {
  return (
    <Tabs.Root defaultValue={initial}>
      <Tabs.List items={items} aria-label={`${label} sections`} />
    </Tabs.Root>
  )
}

const RANGES: TabItem[] = [
  { value: "1h", label: "1\u2009h" },
  { value: "24h", label: "24\u2009h" },
  { value: "7d", label: "7\u2009d" },
]
const RANGE_DATA: Record<string, number[]> = { "1h": series(60, 1.3, 34, 30), "24h": series(48, 3.1, 40, 25), "7d": series(42, 5.7, 30, 20) }

function ChartWithRange() {
  const [range, setRange] = useState("1h")
  const data = RANGE_DATA[range] ?? []
  return (
    <div className="glass-control flex w-130 max-w-full flex-col gap-2 rounded-tile p-tile">
      <div className="w-50">
        <Tabs.Root value={range} onValueChange={setRange}>
          <Tabs.List items={RANGES} aria-label="CPU chart range" />
        </Tabs.Root>
      </div>
      <div className="h-56">
        <Metric label="CPU" value={data.at(-1) ?? null} unit="%" data={data} domain={[0, 100]} times={clockTimes(data.length)} range={RANGES.find((r) => r.value === range)?.label} />
      </div>
    </div>
  )
}

export default function TabsSection() {
  return (
    <SectionPage>
      <OnCanvas
        title="On the canvas"
        description="Tabs are routes by default (R6.2): every tab is a link to its own URL, read back from the location. In the product the entity header and its tabs sit straight on the ambient canvas."
      >
        <div className="flex min-w-0 flex-col gap-3">
          <EndpointHeader />
          <RouteTabs items={ROUTE_TABS} aria-label="NST-C106 pages (on canvas)" />
        </div>
      </OnCanvas>

      <Specimen
        title="Route tabs (default)"
        description="Links in a nav landmark; the current one carries aria-current. A child route stays inside its tab. Arrow keys, Home, End and Space work exactly as in local tabs, and the rows in More are links too."
        wide
      >
        <div className="w-full">
          <RouteTabs items={ROUTE_TABS} aria-label="NST-C106 pages" />
          <Outlet />
        </div>
      </Specimen>

      <Specimen title="Route tabs in a narrow header" description="At 420px the strip shows what fits plus More. Following a link from More swaps that tab into the strip; the active tab is never hidden.">
        <div className="w-105 max-w-full">
          <RouteTabs items={ROUTE_TABS} aria-label="NST-C106 pages (narrow)" />
        </div>
      </Specimen>

      <Specimen
        title="Local tabs — the exception"
        description="State tabs are only for lightweight presentation toggles inside a component, where resetting on revisit loses nothing: a chart's range, JSON versus table. They look and behave identically."
      >
        <ChartWithRange />
      </Specimen>

      <Specimen title="Overflow keeps the active tab" description="The same overflow in local mode: Settings is active, so it is swapped into the strip.">
        <div className="w-105 max-w-full">
          <LocalTabs initial="settings" />
        </div>
      </Specimen>

      <Specimen title="States" description="Counts use tabular figures. A disabled tab stays in place and is skipped by the arrow keys.">
        <div className="w-full">
          <LocalTabs items={STATES} initial="software" />
        </div>
      </Specimen>

      <Specimen title="Loading" description="The skeleton strip occupies the same height and rhythm as the loaded strip. Swap them in place to compare.">
        <div className="w-105 max-w-full">
          <SwapSlot id="tabs" skeleton={<TabsSkeleton count={4} />} loaded={<LocalTabs items={SHORT} />} />
        </div>
      </Specimen>

      <Specimen title="Over imagery" description="On a card over busy content the underline and text keep their contrast." backdrop>
        <div className="glass-control w-130 max-w-full rounded-surface px-3">
          <LocalTabs items={SHORT} initial="software" />
        </div>
      </Specimen>

      <ContainerLab description="Row, header, tile, pane and tall-narrow (local mode, so each box can hold its own active tab). The strip shows what fits plus More; in the narrowest boxes only the active tab and More remain.">
        {() => <LocalTabs initial="activity" />}
      </ContainerLab>

      <Rules
        do={[
          "Make tabs routes: RouteTabs, one path segment per tab, at any depth (R6.2).",
          "Mark an index tab (Overview) exact so deeper tabs win their child routes.",
          "Keep labels to one or two words; the icon repeats the section's meaning.",
          "Use local Tabs only for presentation toggles inside a component.",
        ]}
        dont={[
          "Hold a tab that is a place in component state; it cannot be linked or restored.",
          "Wrap tabs onto a second line or let them scroll off without More.",
          "Fill the active tab with a pill; the underline marks it.",
          "Repeat the tab name as a heading inside the panel.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--control-h-md", "Tab height"],
          ["--space-3", "Tab padding"],
          ["--icon-md", "Tab icon"],
          ["--fg-muted", "Inactive label"],
          ["--accent-text", "Active label"],
          ["--accent", "Underline (start)"],
          ["--accent-2", "Underline (end)"],
          ["--fill-hover", "Hover pill"],
          ["--radius-item", "Hover pill radius"],
          ["--duration-base", "Underline slide"],
        ]}
      />
    </SectionPage>
  )
}
