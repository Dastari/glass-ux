import { useSearch, type LinkProps } from "@tanstack/react-router"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import {
  IconChartPie,
  IconHistory,
  IconLayers,
  IconOrganisation,
  IconPower,
  IconRefresh,
  IconSettings,
} from "../../icons/generated/icons.js"
import { RouteVerticalTabs, VerticalTabs, type RouteVerticalTabItem, type VerticalTabItem } from "../../ui/vertical-tabs/index.js"

const AGENT: VerticalTabItem[] = [
  { value: "general", label: "General", icon: <IconSettings /> },
  { value: "org", label: "Org & location", icon: <IconOrganisation /> },
  { value: "updates", label: "Updates", icon: <IconRefresh /> },
  { value: "overrides", label: "Overrides", icon: <IconLayers /> },
  { value: "audit", label: "Audit history", icon: <IconHistory />, count: 128 },
  { value: "usage", label: "Data usage", icon: <IconChartPie /> },
  { value: "lifecycle", label: "Lifecycle", icon: <IconPower /> },
]

const FOUR = AGENT.slice(0, 4)

/**
 * In the product each section is a path segment (/endpoints/orb-7c71/settings/updates). The
 * gallery owns one route, so the demo uses `?section=`; the design route does not type that
 * search param, hence the cast.
 */
const sectionLink = (section: string) =>
  ({ to: ".", search: section === "general" ? {} : { section } }) as unknown as LinkProps

const ROUTED: RouteVerticalTabItem[] = AGENT.map((item) => ({ ...item, link: sectionLink(item.value) }))

/** Stands in for the route's <Outlet />. */
function SectionOutlet() {
  const search = useSearch({ strict: false }) as { section?: string }
  const item = AGENT.find((entry) => entry.value === (search.section ?? "general"))
  return (
    <div className="glass-inset flex h-40 items-start rounded-tile p-tile type-caption text-fg-muted">
      {item?.label} · /endpoints/orb-7c71/settings/{search.section ?? "general"}
    </div>
  )
}

const STATES: VerticalTabItem[] = [
  { value: "general", label: "General", icon: <IconSettings /> },
  { value: "audit", label: "Audit history", icon: <IconHistory />, count: 128 },
  { value: "org", label: "Org & location", icon: <IconOrganisation />, disabled: true },
  { value: "updates", label: "Updates", icon: <IconRefresh />, count: 2 },
]

function Panels({ items, host = "LMN-7C71" }: { items: VerticalTabItem[]; host?: string }) {
  return items.map((item) => (
    <VerticalTabs.Panel key={item.value} value={item.value}>
      <div className="glass-inset flex h-40 items-start rounded-tile p-tile type-caption text-fg-muted">
        {item.label} · {host}
      </div>
    </VerticalTabs.Panel>
  ))
}

export default function VerticalTabsSection() {
  return (
    <SectionPage>
      <Specimen
        title="Settings rail (routes, the default)"
        description="Each section is a URL (R6.2): rows are links, the current one is read from the location and carries aria-current, and ↑ ↓, Home, End and Space move and activate as in a tab list. The current row takes the accent tint and the slim bar — the same mark as the sidebar and tree."
        wide
      >
        <div className="w-full">
          <RouteVerticalTabs items={ROUTED} aria-label="Agent settings sections">
            <SectionOutlet />
          </RouteVerticalTabs>
        </div>
      </Specimen>

      <Specimen title="Routes, narrow" description="The same route rail in a narrow container: a picker whose rows are links.">
        <div className="w-90 max-w-full">
          <RouteVerticalTabs items={ROUTED} aria-label="Agent settings sections (narrow)">
            <SectionOutlet />
          </RouteVerticalTabs>
        </div>
      </Specimen>

      <Specimen
        title="Local sections — the exception"
        description="State-held sections only for lightweight toggles inside a component, where resetting on revisit loses nothing. Identical look and keyboard; the remaining specimens use this mode so each can hold its own state."
      >
        <div className="w-full">
          <VerticalTabs.Root items={FOUR} defaultValue="updates" aria-label="Preview sections">
            <Panels items={FOUR} host="preview" />
          </VerticalTabs.Root>
        </div>
      </Specimen>

      <Specimen title="Narrow: chips" description="Under 36rem of container width, up to six sections become a scrolling chip strip above the content.">
        <div className="w-90 max-w-full">
          <VerticalTabs.Root items={FOUR} defaultValue="updates" aria-label="Agent settings sections">
            <Panels items={FOUR} />
          </VerticalTabs.Root>
        </div>
      </Specimen>

      <Specimen title="Narrow: picker" description="More than six sections in a narrow container collapse to a picker that names the current section.">
        <div className="w-90 max-w-full">
          <VerticalTabs.Root items={AGENT} defaultValue="audit" aria-label="Agent settings sections">
            <Panels items={AGENT} />
          </VerticalTabs.Root>
        </div>
      </Specimen>

      <Specimen
        title="Icons only"
        description="For a collapsed side nav: square rows with the icon centred. The label stays the accessible name and appears as a tooltip on hover and focus."
      >
        <div className="h-80 w-90 max-w-full">
          <VerticalTabs.Root items={AGENT} defaultValue="audit" layout="icons" aria-label="Agent settings sections">
            <Panels items={AGENT} />
          </VerticalTabs.Root>
        </div>
      </Specimen>

      <Specimen title="States" description="Counts sit at the trailing edge in tabular figures. Disabled sections stay in place and are skipped by the arrow keys." wide>
        <div className="w-full">
          <VerticalTabs.Root items={STATES} defaultValue="audit" aria-label="Endpoint policy sections">
            <Panels items={STATES} host="NST-C106" />
          </VerticalTabs.Root>
        </div>
      </Specimen>

      <ContainerLab title="Container lab · four sections" description="Rail in the pane; chips everywhere narrower than 36rem.">
        {() => (
          <VerticalTabs.Root items={FOUR} defaultValue="general" aria-label="Agent settings sections">
            <Panels items={FOUR} />
          </VerticalTabs.Root>
        )}
      </ContainerLab>

      <ContainerLab title="Container lab · seven sections" description="Rail in the pane; a picker everywhere narrower than 36rem.">
        {() => (
          <VerticalTabs.Root items={AGENT} defaultValue="usage" aria-label="Agent settings sections">
            <Panels items={AGENT} />
          </VerticalTabs.Root>
        )}
      </ContainerLab>

      <Rules
        do={[
          "Use the rail for L3 sections inside an L2 tab or a settings dialog.",
          "Keep the section in the URL so a section can be linked and restored.",
          "Let the container decide the layout; the same component serves dialog, pane and phone.",
        ]}
        dont={[
          "Nest a rail inside a rail; past L3 the information architecture is wrong.",
          "Put actions in the rail; it holds places only.",
          "Draw a divider between the rail and its content; the gap separates them.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--item-h", "Row height"],
          ["--radius-item", "Row radius"],
          ["--accent-soft", "Current row fill"],
          ["--accent-text", "Current row text"],
          ["--accent", "Current row bar"],
          ["--gap-section", "Rail ↔ content"],
          ["--control-h-sm", "Chip height"],
          ["--line-strong", "Chip outline"],
        ]}
      />
    </SectionPage>
  )
}
