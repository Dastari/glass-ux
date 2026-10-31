import { useState, type ReactNode } from "react"
import { SectionPage, Specimen } from "../kit.js"
import {
  IconCalendar,
  IconEdit,
  IconFolder,
  IconHelp,
  IconHome,
  IconInbox,
  IconLayers,
  IconLogOut,
  IconPlus,
  IconReporting,
  IconSettings,
  IconStar,
  IconTasks,
  IconTrash,
  IconUser,
  IconUsers,
} from "../../icons/generated/icons.js"
import { Avatar } from "../../ui/avatar/index.js"
import { Breadcrumb } from "../../ui/breadcrumb/index.js"
import { FactList } from "../../ui/fact-list/index.js"
import { Menu } from "../../ui/menu/index.js"
import { Segmented } from "../../ui/segmented/index.js"
import { TooltipPreview } from "../../ui/tooltip/index.js"
import { Tree, type TreeNode } from "../../ui/tree/index.js"
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  type SidebarCollapsible,
  type SidebarVariant,
} from "../../ui/sidebar/index.js"

// A fictional studio's workspace.
const PROJECTS = ["Atlas redesign", "Billing service", "Field app"]
const FAVOURITES = ["Release checklist", "Design reviews", "On-call rota"]
const TICKETS = [
  { id: "NS-1042", title: "Export stalls at 90%", owner: "Avery Chen", status: "In progress", updated: "10:42" },
  { id: "NS-1039", title: "Invoice totals round twice", owner: "Sam Okafor", status: "Review", updated: "09:15" },
  { id: "NS-1031", title: "Map tiles load slowly", owner: "Rina Patel", status: "Open", updated: "Yesterday" },
]

const CONVERSATIONS = [
  { id: "atlas", title: "Atlas launch plan", detail: "Avery Chen · 10:42", unread: 3 },
  { id: "billing", title: "Invoice rounding", detail: "Sam Okafor · 09:15", unread: 0 },
  { id: "field", title: "Field app offline mode", detail: "Rina Patel · Yesterday", unread: 12 },
]
const CLIENTS = ["Northwind Traders", "Harbour Freight"]
const SITES: TreeNode[] = [
  {
    id: "north",
    label: "Northern region",
    children: [
      { id: "north-depot", label: "Depot 12", description: "14 devices" },
      { id: "north-office", label: "Head office", description: "62 devices" },
    ],
  },
  {
    id: "south",
    label: "Southern region",
    children: [
      { id: "south-lab", label: "Test lab", description: "9 devices" },
      { id: "south-store", label: "Store 4", description: "21 devices" },
      { id: "south-yard", label: "Yard", description: "3 devices" },
    ],
  },
]

// Sidebar widths are props, in rem so they follow the UI scale.
const DETAILS_WIDTH = "18rem" // tokens:allow Sidebar prop value
const RESIZE_LIMITS = { minWidth: "12rem", maxWidth: "24rem" } as const // tokens:allow Sidebar prop values

function Mark() {
  return <IconLayers />
}

/** The content beside the sidebar: a bar with the trigger and breadcrumb, then the page. */
function Page({ place, label, children }: { place: string; label: string; children?: ReactNode }) {
  return (
    <>
      <div className="gallery-sidebar-bar">
        <SidebarTrigger />
        <Breadcrumb aria-label={label} items={[{ id: "studio", label: "Northstar Studio" }, { id: place, label: place }]} />
      </div>
      <div className="gallery-sidebar-page">
        {children ?? (
          <ul className="gallery-sidebar-rows">
            {TICKETS.map((ticket) => (
              <li key={ticket.id}>
                <span className="type-mono">{ticket.id}</span>
                <span>{ticket.title}</span>
                <span className="text-fg-muted">{ticket.updated}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

/** The workspace navigation: groups with counts, actions and a sub-menu. */
function WorkspaceNav({ query = "" }: { query?: string }) {
  const needle = query.trim().toLocaleLowerCase("en-AU")
  const keep = (label: string) => !needle || label.toLocaleLowerCase("en-AU").includes(needle)
  return (
    <>
      <Sidebar.Group>
        <Sidebar.GroupLabel>Workspace</Sidebar.GroupLabel>
        <Sidebar.Menu>
          {keep("Home") ? (
            <Sidebar.MenuItem>
              <Sidebar.MenuButton icon={<IconHome />} href="#home" active>
                Home
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          ) : null}
          {keep("Inbox") ? (
            <Sidebar.MenuItem>
              <Sidebar.MenuButton icon={<IconInbox />} href="#inbox">
                Inbox
              </Sidebar.MenuButton>
              <Sidebar.MenuBadge value={12} />
            </Sidebar.MenuItem>
          ) : null}
          {keep("Projects") || PROJECTS.some(keep) ? (
            <Sidebar.MenuItem>
              <Sidebar.MenuButton icon={<IconFolder />}>Projects</Sidebar.MenuButton>
              <Sidebar.MenuSub id="projects" defaultOpen>
                {PROJECTS.filter((project) => keep("Projects") || keep(project)).map((project, index) => (
                  <Sidebar.MenuSubItem key={project}>
                    <Sidebar.MenuSubButton href={`#project-${index}`}>{project}</Sidebar.MenuSubButton>
                  </Sidebar.MenuSubItem>
                ))}
              </Sidebar.MenuSub>
            </Sidebar.MenuItem>
          ) : null}
          {keep("Calendar") ? (
            <Sidebar.MenuItem>
              <Sidebar.MenuButton icon={<IconCalendar />} href="#calendar">
                Calendar
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          ) : null}
          {keep("Reports") ? (
            <Sidebar.MenuItem>
              <Sidebar.MenuButton icon={<IconReporting />} href="#reports">
                Reports
              </Sidebar.MenuButton>
              <Sidebar.MenuBadge value={3} tone="accent" />
            </Sidebar.MenuItem>
          ) : null}
        </Sidebar.Menu>
      </Sidebar.Group>
      <Sidebar.Group id="favourites" collapsible>
        <Sidebar.GroupLabel>Favourites</Sidebar.GroupLabel>
        <Sidebar.GroupAction icon={<IconPlus />} aria-label="Add favourite" />
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            {FAVOURITES.filter(keep).map((favourite, index) => (
              <Sidebar.MenuItem key={favourite}>
                <Sidebar.MenuButton icon={<IconStar />} href={`#favourite-${index}`}>
                  {favourite}
                </Sidebar.MenuButton>
                <Menu.Root>
                  <Menu.Trigger render={<Sidebar.MenuAction showOnHover aria-label={`${favourite} actions`} />} />
                  <Menu.Popup side="inline-end">
                    <Menu.Item icon={<IconEdit />}>Rename</Menu.Item>
                    <Menu.Item icon={<IconTrash />} tone="danger">
                      Remove from favourites
                    </Menu.Item>
                  </Menu.Popup>
                </Menu.Root>
              </Sidebar.MenuItem>
            ))}
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    </>
  )
}

/** The footer: help, settings and the account menu. */
function AccountFooter() {
  return (
    <Sidebar.Footer>
      <Sidebar.Menu>
        <Sidebar.MenuItem>
          <Sidebar.MenuButton icon={<IconHelp />} href="#help">
            Help
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
        <Sidebar.MenuItem>
          <Sidebar.MenuButton icon={<IconSettings />} href="#settings">
            Settings
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
        <Sidebar.MenuItem>
          <Menu.Root>
            <Menu.Trigger
              render={
                <Sidebar.MenuButton size="lg" icon={<Avatar name="Avery Chen" decorative />} tooltip="Avery Chen">
                  <span>Avery Chen</span>
                  <span>avery@northstar.example</span>
                </Sidebar.MenuButton>
              }
            />
            <Menu.Popup side="inline-end" align="end">
              <Menu.Item icon={<IconUser />}>Profile</Menu.Item>
              <Menu.Item icon={<IconLogOut />}>Sign out</Menu.Item>
            </Menu.Popup>
          </Menu.Root>
        </Sidebar.MenuItem>
      </Sidebar.Menu>
    </Sidebar.Footer>
  )
}

function WorkspaceApp() {
  const [query, setQuery] = useState("")
  return (
    <div className="gallery-sidebar-frame" data-size="tall" data-testid="sidebar-app">
      <SidebarProvider storageKey="glass-ux.gallery.sidebar">
        <Sidebar collapsible="icon" resizable aria-label="Workspace navigation">
          <Sidebar.Header icon={<Mark />} title="Northstar Studio" subtitle="Pro plan" />
          <Sidebar.Search value={query} onValueChange={setQuery} />
          <Sidebar.Content>
            <WorkspaceNav query={query} />
          </Sidebar.Content>
          <AccountFooter />
          <Sidebar.Rail />
        </Sidebar>
        {/* SidebarInset is a <main>; inside this page, which has its own, it renders a div. */}
        <SidebarInset render={<div />}>
          <Page place="Home" label="Application frame breadcrumb" />
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}

/** A smaller frame for one option at a time. */
function OptionFrame({ label, collapsible = "offcanvas", variant = "sidebar", testId }: { label: string; collapsible?: SidebarCollapsible; variant?: SidebarVariant; testId: string }) {
  return (
    <div className="gallery-sidebar-frame" data-testid={testId}>
      <SidebarProvider shortcut={false}>
        <Sidebar collapsible={collapsible} variant={variant} aria-label={label}>
          <Sidebar.Header icon={<Mark />} title="Northstar Studio" />
          <Sidebar.Content>
            <WorkspaceNav />
          </Sidebar.Content>
          <Sidebar.Rail />
        </Sidebar>
        <SidebarInset render={<div />}>
          <Page place="Home" label={`${label} breadcrumb`} />
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}

function CollapsingModes() {
  const [mode, setMode] = useState<SidebarCollapsible>("icon")
  return (
    <div className="gallery-sidebar-stack">
      <Segmented
        aria-label="Collapsible"
        value={mode}
        onValueChange={setMode}
        options={[
          { value: "offcanvas", label: "Off canvas" },
          { value: "icon", label: "Icons" },
          { value: "none", label: "None" },
        ]}
      />
      <OptionFrame key={mode} label={`Collapsible ${mode} navigation`} collapsible={mode} testId="sidebar-modes" />
    </div>
  )
}

function Variants() {
  const [variant, setVariant] = useState<SidebarVariant>("floating")
  return (
    <div className="gallery-sidebar-stack">
      <Segmented
        aria-label="Variant"
        value={variant}
        onValueChange={setVariant}
        options={[
          { value: "sidebar", label: "Sidebar" },
          { value: "floating", label: "Floating" },
          { value: "inset", label: "Inset" },
        ]}
      />
      <OptionFrame key={variant} label={`${variant} variant navigation`} variant={variant} collapsible="icon" testId="sidebar-variants" />
    </div>
  )
}

function DetailsAtTheEnd() {
  const [selected, setSelected] = useState(TICKETS[0]!.id)
  const ticket = TICKETS.find((item) => item.id === selected) ?? TICKETS[0]!
  return (
    <div className="gallery-sidebar-frame" data-testid="sidebar-details">
      <SidebarProvider name="navigation" shortcut={false} defaultOpen={false}>
        <Sidebar collapsible="icon" aria-label="Tickets navigation">
          <Sidebar.Header icon={<Mark />} title="Northstar Studio" />
          <Sidebar.Content>
            <Sidebar.Menu>
              <Sidebar.MenuItem>
                <Sidebar.MenuButton icon={<IconInbox />} href="#queue" active>
                  Queue
                </Sidebar.MenuButton>
                <Sidebar.MenuBadge value={TICKETS.length} />
              </Sidebar.MenuItem>
              <Sidebar.MenuItem>
                <Sidebar.MenuButton icon={<IconTasks />} href="#mine">
                  Assigned to me
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
              <Sidebar.MenuItem>
                <Sidebar.MenuButton icon={<IconUsers />} href="#teams">
                  Teams
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            </Sidebar.Menu>
          </Sidebar.Content>
        </Sidebar>
        <SidebarInset render={<div />}>
          {/* The second sidebar is a second provider, inside the first one's inset. */}
          <SidebarProvider name="details">
            <SidebarInset render={<div />}>
              <div className="gallery-sidebar-bar">
                <SidebarTrigger sidebar="navigation" />
                <Breadcrumb aria-label="Tickets breadcrumb" items={[{ id: "studio", label: "Northstar Studio" }, { id: "queue", label: "Queue" }]} />
                <SidebarTrigger aria-label="Toggle details" className="ms-auto" />
              </div>
              <div className="gallery-sidebar-page">
                <ul className="gallery-sidebar-rows" aria-label="Tickets">
                  {TICKETS.map((item) => (
                    <li key={item.id}>
                      <button type="button" className="fa-item" aria-pressed={item.id === selected} data-active={item.id === selected ? "" : undefined} onClick={() => setSelected(item.id)}>
                        <span className="type-mono">{item.id}</span>
                        <span className="fa-item-label">{item.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </SidebarInset>
            <Sidebar side="end" variant="floating" width={DETAILS_WIDTH} as="div" aria-label="Ticket details">
              <Sidebar.Header title={ticket.id} subtitle={ticket.status} />
              <Sidebar.Content className="gallery-sidebar-facts">
                <FactList
                  facts={[
                    { label: "Summary", value: ticket.title },
                    { label: "Owner", value: ticket.owner },
                    { label: "Updated", value: ticket.updated },
                  ]}
                />
              </Sidebar.Content>
            </Sidebar>
          </SidebarProvider>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}

function Resizing() {
  return (
    <div className="gallery-sidebar-frame" data-testid="sidebar-resize">
      <SidebarProvider shortcut={false} storageKey="glass-ux.gallery.sidebar-resize">
        <Sidebar variant="floating" resizable {...RESIZE_LIMITS} aria-label="Resizable navigation">
          <Sidebar.Header icon={<Mark />} title="Northstar Studio" />
          <Sidebar.Content>
            <WorkspaceNav />
          </Sidebar.Content>
          <Sidebar.Rail />
        </Sidebar>
        <SidebarInset render={<div />}>
          <Page place="Home" label="Resizing breadcrumb" />
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}

function Loading() {
  const [state, setState] = useState<"loaded" | "loading">("loading")
  return (
    <div className="gallery-sidebar-stack">
      <Segmented
        aria-label="Navigation state"
        value={state}
        onValueChange={setState}
        options={[
          { value: "loading", label: "Loading" },
          { value: "loaded", label: "Loaded" },
        ]}
      />
      <div className="gallery-sidebar-frame" data-size="short" data-testid="sidebar-loading">
        <SidebarProvider shortcut={false}>
          <Sidebar collapsible="icon" aria-label="Loading navigation">
            <Sidebar.Header icon={<Mark />} title="Northstar Studio" />
            <Sidebar.Content>
              <Sidebar.Group>
                <Sidebar.GroupLabel>Projects</Sidebar.GroupLabel>
                <Sidebar.Menu aria-busy={state === "loading"}>
                  {state === "loading"
                    ? ["58%", "72%", "46%"].map((width) => <Sidebar.MenuSkeleton key={width} icon width={width} />)
                    : PROJECTS.map((project, index) => (
                        <Sidebar.MenuItem key={project}>
                          <Sidebar.MenuButton icon={<IconFolder />} href={`#loaded-${index}`}>
                            {project}
                          </Sidebar.MenuButton>
                        </Sidebar.MenuItem>
                      ))}
                </Sidebar.Menu>
              </Sidebar.Group>
            </Sidebar.Content>
          </Sidebar>
          <SidebarInset render={<div />}>
            <Page place="Projects" label="Loading breadcrumb" />
          </SidebarInset>
        </SidebarProvider>
      </div>
    </div>
  )
}

/** Rows with a detail line, a quiet count, a group count, a face and the filter's matches marked. */
function RichRows() {
  const [query, setQuery] = useState("")
  const needle = query.trim().toLocaleLowerCase("en-AU")
  const keep = (label: string) => !needle || label.toLocaleLowerCase("en-AU").includes(needle)
  const conversations = CONVERSATIONS.filter((conversation) => keep(conversation.title))
  const clients = CLIENTS.filter(keep)
  return (
    <div className="gallery-sidebar-frame" data-testid="sidebar-rich">
      <SidebarProvider shortcut={false}>
        <Sidebar aria-label="Conversations navigation">
          <Sidebar.Header icon={<Mark />} title="Northstar Studio" />
          <Sidebar.Search value={query} onValueChange={setQuery} aria-label="Filter conversations" />
          <Sidebar.Content>
            <Sidebar.Group>
              <Sidebar.GroupLabel count={conversations.length}>Conversations</Sidebar.GroupLabel>
              <Sidebar.Menu>
                {conversations.map((conversation, index) => (
                  <Sidebar.MenuItem key={conversation.id}>
                    <Sidebar.MenuButton
                      icon={<IconInbox />}
                      href={`#conversation-${conversation.id}`}
                      detail={conversation.detail}
                      count={conversation.unread || undefined}
                      active={index === 0}
                    >
                      <Sidebar.Match text={conversation.title} query={query} />
                    </Sidebar.MenuButton>
                  </Sidebar.MenuItem>
                ))}
              </Sidebar.Menu>
            </Sidebar.Group>
            {clients.length ? (
              <Sidebar.Group>
                <Sidebar.GroupLabel>Clients</Sidebar.GroupLabel>
                <Sidebar.Menu>
                  {clients.map((client) => (
                    <Sidebar.MenuItem key={client}>
                      <Sidebar.MenuButton
                        href={`#client-${client.split(" ")[0]!.toLowerCase()}`}
                        face={
                          <span className="gallery-sidebar-face">
                            <Avatar name={client} size="xs" decorative />
                            <Sidebar.Match text={client} query={query} />
                          </span>
                        }
                      >
                        {client}
                      </Sidebar.MenuButton>
                    </Sidebar.MenuItem>
                  ))}
                </Sidebar.Menu>
              </Sidebar.Group>
            ) : null}
          </Sidebar.Content>
        </Sidebar>
        <SidebarInset render={<div />}>
          <Page place="Conversations" label="Rich rows breadcrumb" />
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}

/** A Tree as the content's last child: Content fill lets it take the height and scroll itself. */
function FilledWithTree() {
  const [query, setQuery] = useState("")
  return (
    <div className="gallery-sidebar-frame" data-testid="sidebar-fill">
      <SidebarProvider shortcut={false}>
        <Sidebar aria-label="Sites navigation">
          <Sidebar.Header icon={<Mark />} title="Northstar Studio" />
          <Sidebar.Search value={query} onValueChange={setQuery} aria-label="Filter sites" />
          <Sidebar.Content fill>
            <Tree aria-label="Sites" nodes={SITES} query={query} defaultSelectedId="north-office" />
          </Sidebar.Content>
        </Sidebar>
        <SidebarInset render={<div />}>
          <Page place="Sites" label="Sites breadcrumb" />
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}

function PhoneSheet() {
  return (
    <div className="gallery-sidebar-frame" data-size="phone" data-testid="sidebar-phone">
      {/* mobileQuery="all" shows the phone form at any width; the default is phones only. */}
      <SidebarProvider shortcut={false} mobileQuery="all">
        <Sidebar aria-label="Phone navigation">
          <Sidebar.Header icon={<Mark />} title="Northstar Studio" />
          <Sidebar.Content>
            <WorkspaceNav />
          </Sidebar.Content>
          <AccountFooter />
        </Sidebar>
        <SidebarInset render={<div />}>
          <Page place="Home" label="Phone breadcrumb" />
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}

export default function SidebarSection() {
  return (
    <SectionPage>
      <Specimen
        title="Application frame"
        description="Collapses to icons and remembers its state, width and groups (storageKey). ⌘B or Ctrl+B toggles it; / or ⌘F filters while focus is inside. In the icon strip the labels become tooltips, counts sit on the icons and Projects opens as a flyout. Drag the edge, or focus it and use ← →, to resize."
        wide
        layout="bare"
      >
        <WorkspaceApp />
      </Specimen>

      <Specimen
        title="Collapsing"
        description="collapsible: offcanvas slides the pane away, icon narrows it to a strip, none keeps it open with no toggle. The content beside reflows once, after the motion."
        wide
        layout="bare"
      >
        <CollapsingModes />
      </Specimen>

      <Specimen
        title="Variants"
        description="variant: sidebar is a flush chrome pane, floating a glass panel inset from the edges, inset puts the sidebar on the canvas and raises the content as the panel."
        wide
        layout="bare"
      >
        <Variants />
      </Specimen>

      <Specimen
        title="Details at the end"
        description='A second provider inside the first one&apos;s inset holds an end sidebar for the selection. Each trigger names its sidebar (sidebar="navigation"); an end sidebar has no shortcut unless given one.'
        wide
        layout="bare"
      >
        <DetailsAtTheEnd />
      </Specimen>

      <Specimen
        title="Resizing"
        description="resizable with minWidth 12rem and maxWidth 24rem. Drag the Rail, or focus it: ← → step 1rem, Shift 4rem, Home and End go to the limits, Enter collapses. Dragging below the minimum collapses the pane; dragging out from the edge brings it back."
        wide
        layout="bare"
      >
        <Resizing />
      </Specimen>

      <Specimen
        title="Rows with more than a label"
        description="A MenuButton can carry a detail line (detail), a quiet count that is part of its name (count) or an entity's face (face). A group label can count its items. Sidebar.Match marks the filter's matches in a label."
        wide
        layout="bare"
      >
        <RichRows />
      </Specimen>

      <Specimen
        title="Filling with a tree"
        description="Content fill: the content stops scrolling and its last child, here a Tree that takes the filter's query, fills the height and scrolls itself. ↓ from the filter walks into the tree."
        wide
        layout="bare"
      >
        <FilledWithTree />
      </Specimen>

      <Specimen title="Loading" description="MenuSkeleton rows have the loaded rows' box, icon and label, so the items replace them in place." wide layout="bare">
        <Loading />
      </Specimen>

      <Specimen
        title="On phones"
        description="Below mobileQuery the same parts open in a sheet from the sidebar's edge. Swipe, Esc or the scrim closes it, and so does choosing a destination."
        wide
        layout="bare"
      >
        <PhoneSheet />
      </Specimen>

      <Specimen title="Shortcut" description="Triggers show the shortcut in their tooltip and aria-keyshortcuts. It is ignored in rich text, where Ctrl+B means bold." layout="row">
        <TooltipPreview content="Toggle sidebar" shortcut="mod+b" side="bottom" />
      </Specimen>
    </SectionPage>
  )
}
