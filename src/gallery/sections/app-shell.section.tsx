import { useContext, useState, type ReactNode } from "react"
import { DemoScope } from "../demo-scope.js"
import { MOCK_ORGANISATIONS, PORTRAITS, toContextItem } from "../fixtures/organisations.js"
import { WORKSPACE_SETTINGS, ORGANISATION_SETTINGS, moduleRail } from "../fixtures/brand.js"
import { ContainerLab, Example, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { IconAi, IconArchive, IconAlerts, IconCalendar, IconDashboard, IconEndpoint, IconFolder, IconHistory, IconInbox, IconNewChat, IconOrganisation, IconReporting, IconSearch, IconSettings, IconTickets, IconUsers,  } from "../../icons/generated/icons.js"
import { AccountButton, EntityHeader, EntityHeaderSkeleton, Rail, SearchTrigger, SectionDrawer, TabBar, TopBar, TopBarSettingsButton,  } from "../../shell/index.js"
import { ContextSwitcher } from "../../shell/context-switcher/index.js"
import { ActionBar } from "../../ui/actions/index.js"
import { CountBadge, StatusBadge, StatusDot } from "../../ui/badge/index.js"
import { BrandMark } from "../../ui/brand/index.js"
import { Breadcrumb } from "../../ui/breadcrumb/index.js"
import { Button } from "../../ui/button/index.js"
import { EmptyState } from "../../ui/empty-state/index.js"
import { Menu } from "../../ui/menu/index.js"
import { Segmented } from "../../ui/segmented/index.js"
import { ENDPOINTS, endpointActions } from "./overlays.fixtures.js"

/* ── Anatomy diagrams ────────────────────────────────────────────────────── */

function DesktopDiagram() {
  return (
    <div className="gallery-shell-diagram" role="img" aria-label="Desktop shell: brand and rail on the left, top bar across, section drawer, workspace with the primary window and a tiled window, dock, and inspector on the right">
      <span data-part="brand" data-canvas="">Mark</span>
      <span data-part="top" data-canvas="">Top bar (application) · organisation · breadcrumb · search · Glass UX settings · account</span>
      <span data-part="rail" data-canvas="">Rail</span>
      <span data-part="drawer" data-glass="">Section drawer</span>
      <span data-part="work">
        <span data-part="primary" data-canvas="">Primary window: page header and tabs on the canvas, content in panels</span>
        <span data-part="tile" data-glass="">Tiled window</span>
        <span data-part="dock" data-glass="">Dock</span>
      </span>
      <span data-part="inspector" data-glass="">Inspector</span>
    </div>
  )
}

function PhoneDiagram() {
  return (
    <div className="gallery-shell-diagram" data-phone="" role="img" aria-label="Phone shell: top bar, workspace and a floating tab bar">
      <span data-part="top" data-canvas="">Top bar</span>
      <span data-part="work" data-canvas="">Workspace</span>
      <span data-part="tabbar" data-glass="">Tab bar</span>
    </div>
  )
}

/* ── Live parts ──────────────────────────────────────────────────────────── */

const RAIL_ITEMS: Array<{ label: string; icon: ReactNode; shortcut: string }> = moduleRail("rmm").map((item) => ({
  label: item.label,
  icon: <item.icon />,
  shortcut: item.shortcut,
}))

const SPECIMEN_ITEMS = [
  { label: "Conversation history", icon: <IconHistory />, count: 0 },
  { label: "Archived chats", icon: <IconArchive />, count: 6 },
]
const SPECIMEN_PROJECTS = ["Northstar Studio migration", "Patch Tuesday · October"]

const OVERFLOW_ITEMS = [
  { label: "Projects", icon: <IconFolder /> },
  { label: "Search", icon: <IconSearch /> },
  { label: "History", icon: <IconHistory /> },
  { label: "Archive", icon: <IconArchive /> },
  { label: "Calendar", icon: <IconCalendar /> },
  { label: "Reports", icon: <IconReporting /> },
  { label: "Team", icon: <IconUsers /> },
  { label: "Inbox", icon: <IconInbox /> },
]

function RailOverflowFrame() {
  const [current, setCurrent] = useState("Projects")
  const [overflow, setOverflow] = useState<"more" | "scroll">("more")
  const scope = useContext(DemoScope)
  return (
    <div className="gallery-shell-rail-frame" data-testid="rail-overflow">
      <Rail.Root aria-label={scope ? `Rail overflow (specimen): ${scope}` : "Rail overflow (specimen)"} overflow={overflow}>
        {OVERFLOW_ITEMS.map((item) => (
          <Rail.Item
            key={item.label}
            icon={item.icon}
            label={item.label}
            active={item.label === current}
            badge={item.label === "Inbox" ? <CountBadge value={4} tone="accent" overlay aria-hidden /> : undefined}
            onClick={() => setCurrent(item.label)}
          />
        ))}
        <Rail.Spacer />
        <Rail.Item icon={<IconSettings />} label="Settings" onClick={() => setCurrent("Settings")} active={current === "Settings"} />
      </Rail.Root>
      <div className="gallery-shell-rail-frame-side">
        <Segmented
          size="sm"
          aria-label="Overflow"
          value={overflow}
          onValueChange={setOverflow}
          options={[
            { value: "more", label: "More" },
            { value: "scroll", label: "Scroll" },
          ]}
        />
        <p className="type-caption text-fg-muted">{current}</p>
      </div>
    </div>
  )
}

function TabBarOverflowFrame() {
  const [current, setCurrent] = useState("Projects")
  const scope = useContext(DemoScope)
  return (
    <div className="gallery-shell-tabbar-frame" data-testid="tabbar-overflow">
      <TabBar.Root aria-label={scope ? `Tab bar overflow (specimen): ${scope}` : "Tab bar overflow (specimen)"}>
        {OVERFLOW_ITEMS.map((item) => (
          <TabBar.Item key={item.label} icon={item.icon} label={item.label} active={item.label === current} onClick={() => setCurrent(item.label)} />
        ))}
      </TabBar.Root>
      <p className="type-caption text-fg-muted">{current}</p>
    </div>
  )
}

function RailAndDrawer() {
  const scope = useContext(DemoScope)
  // SectionDrawer.Search: local state, the host filters its own rows and highlights the match.
  const [query, setQuery] = useState("")
  const needle = query.trim().toLocaleLowerCase("en-AU")
  const keep = (label: string) => !needle || label.toLocaleLowerCase("en-AU").includes(needle)
  const items = SPECIMEN_ITEMS.filter((item) => keep(item.label))
  const projects = SPECIMEN_PROJECTS.filter(keep)
  return (
    <div className="gallery-shell-sidebar">
      <Rail.Root aria-label={scope ? `Main (specimen): ${scope}` : "Main (specimen)"}>
        {RAIL_ITEMS.map((item) => (
          <Rail.Item key={item.label} icon={item.icon} label={item.label} shortcut={item.shortcut} active={item.label === "Assistant"} />
        ))}
        <Rail.Spacer />
        <Rail.Item icon={<IconSettings />} label={ORGANISATION_SETTINGS.label} shortcut={ORGANISATION_SETTINGS.shortcut} />
      </Rail.Root>
      <SectionDrawer.Root aria-label={scope ? `Assistant navigation (specimen): ${scope}` : "Assistant navigation (specimen)"}>
        <SectionDrawer.Header icon={<BrandMark mark="ai" />} title="Assistant" />
        <SectionDrawer.Search noun="Assistant" value={query} onValueChange={setQuery} />
        <SectionDrawer.Body>
          <Button variant="primary" block icon={<IconNewChat />}>
            New chat
          </Button>
          {items.length ? (
            <SectionDrawer.List>
              {items.map((item) => (
                <SectionDrawer.Item key={item.label} icon={item.icon} label={<SectionDrawer.Match text={item.label} query={query} />} count={item.count} />
              ))}
            </SectionDrawer.List>
          ) : null}
          {projects.length ? (
            <SectionDrawer.Group id="gallery.ai.projects" title="Projects">
              <SectionDrawer.List>
                {projects.map((label) => (
                  <SectionDrawer.Item key={label} icon={<IconFolder />} label={<SectionDrawer.Match text={label} query={query} />} active={label === SPECIMEN_PROJECTS[0]} />
                ))}
              </SectionDrawer.List>
            </SectionDrawer.Group>
          ) : null}
          {!items.length && !projects.length ? <EmptyState icon={<IconSearch />}>{`No items match "${query.trim()}"`}</EmptyState> : null}
        </SectionDrawer.Body>
        <SectionDrawer.Footer>
          <SectionDrawer.List>
            <SectionDrawer.Item icon={<IconSettings />} label="AI settings" />
          </SectionDrawer.List>
        </SectionDrawer.Footer>
      </SectionDrawer.Root>
    </div>
  )
}

const SWITCHER_ORGS = MOCK_ORGANISATIONS.map(toContextItem)

function SpecimenTopBar({ label }: { label: string }) {
  const demo = useContext(DemoScope)
  const [scope, setScope] = useState<string | null>("northstar")
  const [unread, setUnread] = useState(3)
  return (
    <TopBar
      scope={<ContextSwitcher items={SWITCHER_ORGS} value={scope} onValueChange={setScope} />}
      breadcrumb={
        <Breadcrumb
          aria-label={`Breadcrumb: ${demo ? `${demo}: ` : ""}${label}`}
          items={[
            { id: "devices", label: "Devices", href: "#devices" },
            { id: "c106", label: "NST-C106", href: "#c106" },
            { id: "overview", label: "Overview" },
          ]}
        />
      }
      search={<SearchTrigger placeholder="Search devices, organisations, tickets…" shortcut="mod+shift+k" onOpen={() => {}} />}
      actions={
        <>
          <TopBarSettingsButton label={WORKSPACE_SETTINGS.label} data-keep="" />
        </>
      }
      account={
        <Menu.Root>
          <Menu.Trigger render={<AccountButton name="Avery Quinn" email="avery.quinn@orbit.example.com.au" avatarSrc={PORTRAITS[1]} unread={unread} />} />
          <Menu.Popup align="end">
            <Menu.Item disabledReason={unread === 0 ? "No unread notifications" : undefined} onClick={() => setUnread(0)}>Mark notifications read</Menu.Item>
          </Menu.Popup>
        </Menu.Root>
      }
    />
  )
}

function SpecimenHeader() {
  const endpoint = ENDPOINTS[0]!
  return (
    <EntityHeader
      icon={<IconEndpoint />}
      iconStatus={<StatusDot status="online" overlay />}
      title={endpoint.name}
      status={<StatusBadge status="online" />}
      subtitle={endpoint.model}
      actions={<ActionBar set={endpointActions} targets={[endpoint]} label={endpoint.name} />}
    />
  )
}

function SpecimenTabBar({ condensed }: { condensed?: boolean }) {
  return (
    <TabBar.Root aria-label={condensed ? "Main, condensed (specimen)" : "Main (specimen)"} condensed={condensed}>
      <TabBar.Item icon={<IconAi />} label="AI" />
      <TabBar.Item icon={<IconEndpoint />} label="Devices" active />
      <TabBar.Item icon={<IconTickets />} label="Tickets" />
      <TabBar.Item icon={<IconAlerts />} label="Alerts" />
      <TabBar.More>
        <TabBar.MoreItem icon={<IconDashboard />} label="Dashboard" />
        <TabBar.MoreItem icon={<IconOrganisation />} label="Organisations" />
        <TabBar.MoreItem icon={<IconSettings />} label={ORGANISATION_SETTINGS.label} />
        <TabBar.MoreItem icon={<IconSettings />} label={WORKSPACE_SETTINGS.label} />
      </TabBar.More>
    </TabBar.Root>
  )
}

const BREAKPOINTS: Array<[string, string]> = [
  ["Phone · under 48rem", "Top bar, workspace and a floating tab bar (four destinations and More). The section drawer is a left Sheet and More a bottom Sheet. Windows are full-screen sheets with a switcher."],
  ["Tablet · 48–64rem", "The rail stays on the canvas; the section drawer slides over from the left (a Sheet) from the top bar's toggle. The inspector is a right Sheet. Windows float or maximise."],
  ["Desktop · 64rem and wider", "Rail and a resizable section drawer (14–28rem, collapses to the rail). The inspector docks from 80rem when opened. Windows float by default and tile in two columns."],
  ["Wide · 120rem (1920px) and wider", "The inspector is open by default, unless inspectorDefault is closed. New windows tile beside the page."],
  ["Ultra-wide · 160rem (2560px) and wider", "Up to three columns: the page and two columns of tiled windows."],
]

const SLOTS: Array<[string, string]> = [
  ["AppShell.brand", "ShellBrand: the product mark over the rail (the configured BrandMark product mark by default)."],
  ["AppShell.rail", "Rail.Root with Rail.Item (icon, label, shortcut, active, render link) and Rail.Spacer. Items that do not fit move into a More menu."],
  ["AppShell.drawer", "SectionDrawer for the current section; omit for none. Docked, resizable and collapsible on desktops, a left Sheet below. SectionDrawer.Search (between Header and Body, fixed while the list scrolls) filters the list with local state: / or ⌘F / Ctrl F focuses it from anywhere in the drawer, ↓ enters the list, Esc clears and then returns focus; highlight with SectionDrawer.Match, or hand the query to a Tree. SectionDrawer.Body fill hands the height to a Tree that scrolls itself; useDrawerDismiss closes the sheet after a choice."],
  ["AppShell.topBar", "TopBar with scope (ContextSwitcher: the organisation or project in the URL, first after the logo), breadcrumb (RouteBreadcrumb after the scope, fed from route matches), search (SearchTrigger → useCommandPalette().open), actions and account (AccountButton with the shared Avatar, a Menu trigger)."],
  ["Workspace.scopes", "The current organisation and how to draw one. Windows from another organisation show its chip; the dock groups by organisation (R14.4)."],
  ["AppShell.children", "The Workspace: primary (the routed view) and the dock."],
  ["AppShell.inspector", "Inspector (title, icon, actions, footer, closeName). Docked at 80rem and wider, a Sheet below. inspectorDefault sets whether it starts open; a stored choice wins."],
  ["AppShell.tabBar", "TabBar.Root with TabBar.Item, TabBar.More and TabBar.MoreItem for phones."],
  ["EntityHeader", "icon, iconStatus, title, status, subtitle (data only), actions (ActionBar over the entity's ActionSet), tabs (RouteTabs)."],
]

/* ── Section ─────────────────────────────────────────────────────────────── */

export default function AppShellSection() {
  return (
    <SectionPage>
      <Specimen
        title="Anatomy"
        description="Chrome and the page header sit on the canvas; only real content is glass: the section drawer, windows, the inspector, the dock and the phone tab bar."
        wide
        layout="bare"
      >
        <div className="gallery-shell-anatomy">
          <Example label="Desktop">
            <DesktopDiagram />
          </Example>
          <Example label="Phone">
            <PhoneDiagram />
          </Example>
        </div>
      </Specimen>

<Specimen title="Entity header" description="The primary window's title bar, on the canvas, with the entity's ActionBar. The title line never wraps: the actions give way first (buttons move into More), below 48rem the title steps down a size, and under 30rem the icon goes and every action is one ⋯ at the end of the title line." wide layout="stack">
        <Example label="Full">
          <div className="gallery-shell-window">
            <SpecimenHeader />
          </div>
        </Example>
        <Example label="Compact (a 30rem window)">
          <div className="gallery-shell-window" data-width="compact">
            <SpecimenHeader />
          </div>
        </Example>
        <Example label="Phone (a 22rem window)">
          <div className="gallery-shell-window" data-width="phone">
            <SpecimenHeader />
          </div>
        </Example>
        <Example label="Loading">
          <div className="gallery-shell-window">
            <EntityHeaderSkeleton />
          </div>
        </Example>
      </Specimen>

      <ContainerLab title="Entity header in the container lab" description="The header in a row, a header, a tile, a pane and a tall narrow column. With little height it keeps the title line only.">
        {() => (
          <div className="gallery-shell-window" data-fill="">
            <SpecimenHeader />
          </div>
        )}
      </ContainerLab>

      <Specimen title="Rail and section drawer" description="An icon-only rail with labelled tooltips, and a resizable drawer for the section's navigation. The rail's gear opens the current organisation's settings. mod+B or the current rail item toggles the drawer.">
        <RailAndDrawer />
      </Specimen>

      <Specimen title="Rail overflow" description="Items that do not fit the rail's height move into a More menu, before the spacer, or the column scrolls. The current section stays visible, and an item chosen from the menu joins the rail. Drag the frame's bottom edge to change the height.">
        <RailOverflowFrame />
      </Specimen>

      <Specimen title="Top bar" description="The application context: organisation switcher, search, settings and the account with its notification badge. As the bar narrows, the organisation and account fold to avatars and search to a button." wide layout="stack">
        {(["wide", "medium", "narrow"] as const).map((width) => (
          <Example key={width} label={width === "wide" ? "Wide" : width === "medium" ? "Medium" : "Narrow"}>
            <div className="gallery-shell-topbar" data-width={width}>
              <SpecimenTopBar label={width} />
            </div>
          </Example>
        ))}
      </Specimen>

      <Specimen title="Phone tab bar" description="The rail on phones: a floating glass pill above the safe area. Scrolling down condenses it; scrolling up restores it." backdrop>
        <Example label="Resting">
          <SpecimenTabBar condensed={false} />
        </Example>
        <Example label="Condensed">
          <SpecimenTabBar condensed />
        </Example>
      </Specimen>

      <Specimen title="Tab bar overflow" description="Five tabs at most, More included. Tabs beyond that, or too narrow to read, move into More's sheet, and the current destination stays in the bar. Drag the frame's corner to change the width.">
        <TabBarOverflowFrame />
      </Specimen>

      <Specimen title="Breakpoints" description="Only the shell reads the viewport (R7.1); everything inside adapts to its container." wide layout="bare">
        <table className="gallery-shell-table">
          <tbody>
            {BREAKPOINTS.map(([name, does]) => (
              <tr key={name}>
                <th scope="row">{name}</th>
                <td>{does}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Specimen>

      <Specimen title="Slots" description="The shell is generic: Glass UX's destinations, labels and brand come in as props." wide layout="bare">
        <table className="gallery-shell-table">
          <tbody>
            {SLOTS.map(([name, does]) => (
              <tr key={name}>
                <th scope="row">
                  <code>{name}</code>
                </th>
                <td>{does}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Specimen>

      <Rules
        do={[
          "Put the page header and tabs on the canvas and the content in panels.",
          "Give every rail destination a label, a shortcut and the current-section state.",
          "Keep the breadcrumb in the top bar, always at the same place.",
          "Pass Glass UX's navigation and brand into the shell as props.",
          "Let panes scroll inside themselves; the document never scrolls.",
        ]}
        dont={[
          "Wrap the top bar, rail or page header in glass.",
          "Add a second navigation bar or a page title under the breadcrumb.",
          "Use viewport media queries inside the workspace; use container queries.",
          "Hard-code a page width or centre a narrow column on wide screens.",
          "Reload the page between routes.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--sidebar-w-rail", "Rail column"],
          ["--sidebar-w", "Default section drawer width"],
          ["--topbar-h", "Top bar row"],
          ["--bottombar-h", "Phone tab bar"],
          ["--inspector-w", "Inspector width"],
          ["--gap-panels", "Gap between panes"],
          ["--page-gutter", "Space around the shell"],
          ["--target-min", "Rail items and tab bar targets"],
          ["--safe-bottom", "Safe area under the tab bar"],
        ]}
      />
    </SectionPage>
  )
}
