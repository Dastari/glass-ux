import { useNavigate } from "@tanstack/react-router"
import { useMemo, useState, type ReactNode } from "react"
import { sections } from "../registry.js"
import { Example, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { IconColumns, IconEndpoint, IconGrid, IconLayers, IconMoon, IconPlus, IconSearch, IconSun } from "../../icons/generated/icons.js"
import { useAppearance } from "../../lib/appearance/use-appearance.js"
import { ActionProvider, usePaletteActions } from "../../ui/actions/index.js"
import { Button } from "../../ui/button/index.js"
import { CommandPanel, DEFAULT_PALETTE_GROUP_ORDER, PaletteProvider, useCommandPalette, usePaletteCommands, useRegisteredCommands, type PaletteCommand } from "../../ui/command-palette/index.js"
import { Kbd } from "../../ui/kbd/index.js"
import { Switch } from "../../ui/switch/index.js"
import { toast } from "../../ui/toast/index.js"
import { ENDPOINTS, endpointActions } from "./overlays.fixtures.js"

/** The host places its record group after the generic groups. */
const GROUP_ORDER = [...DEFAULT_PALETTE_GROUP_ORDER, "Endpoints"]

const GROUP_ICON: Record<string, ReactNode> = { Foundations: <IconLayers />, Components: <IconGrid />, Patterns: <IconColumns /> }

/** What a page would register: destinations, records and global actions. */
function DemoCommands({ selected, onSelect, loading }: { selected: string; onSelect: (id: string) => void; loading: boolean }) {
  const navigate = useNavigate()
  const { appearance, update } = useAppearance()
  const navigation = useMemo<PaletteCommand[]>(
    () =>
      sections.map((section) => ({
        id: `nav:${section.id}`,
        label: section.title,
        group: "Navigation",
        detail: section.group,
        icon: GROUP_ICON[section.group] ?? <IconColumns />,
        run: () => void navigate({ to: "/design/$section", params: { section: section.id } }),
      })),
    [navigate]
  )
  const endpoints = useMemo<PaletteCommand[]>(
    () =>
      ENDPOINTS.map((endpoint) => ({
        id: `endpoint:${endpoint.id}`,
        label: endpoint.name,
        group: "Endpoints",
        detail: `${endpoint.organisation} · ${endpoint.lastSeen}`,
        keywords: [endpoint.user, endpoint.model],
        icon: <IconEndpoint />,
        run: () => onSelect(endpoint.id),
      })),
    [onSelect]
  )
  const actions = useMemo<PaletteCommand[]>(
    () => [
      { id: "ticket:new", label: "New ticket", group: "Actions", icon: <IconPlus />, shortcut: "mod+alt+n", run: () => toast.info("Ticket 7102 created") },
      {
        id: "appearance:mode",
        label: appearance.mode === "dark" ? "Switch to light mode" : "Switch to dark mode",
        group: "Actions",
        icon: appearance.mode === "dark" ? <IconSun /> : <IconMoon />,
        keywords: ["theme", "appearance"],
        run: () => update({ mode: appearance.mode === "dark" ? "light" : "dark" }),
      },
    ],
    [appearance.mode, update]
  )
  usePaletteCommands(navigation)
  usePaletteCommands(endpoints, { loading })
  usePaletteCommands(actions)

  const endpoint = ENDPOINTS.find((item) => item.id === selected) ?? ENDPOINTS[0]!
  const targets = useMemo(() => [endpoint], [endpoint])
  usePaletteActions(endpointActions, targets, endpoint.name)
  return null
}

function OpenButton() {
  const palette = useCommandPalette()
  return (
    <Button icon={<IconSearch />} onClick={palette.open} iconEnd={<Kbd keys="mod+k" size="sm" />}>
      Search
    </Button>
  )
}

function InlinePanel({ query, loading: forceLoading }: { query?: string; loading?: boolean }) {
  const { commands, loading } = useRegisteredCommands()
  return (
    <div className="glass-overlay fa-palette-frame">
      <CommandPanel commands={commands} loading={forceLoading ?? loading} defaultQuery={query} groupOrder={GROUP_ORDER} onRun={(command) => void command.run()} />
    </div>
  )
}

export default function CommandPaletteSection() {
  const [selected, setSelected] = useState("nst-c106")
  const [loading, setLoading] = useState(false)
  const current = ENDPOINTS.find((item) => item.id === selected) ?? ENDPOINTS[0]!
  return (
    <ActionProvider>
      <PaletteProvider groupOrder={GROUP_ORDER}>
        <DemoCommands selected={selected} onSelect={setSelected} loading={loading} />
        <SectionPage>
          <Specimen
            title="Live"
            description="Press ⌘K or Ctrl K anywhere on this page. Results group by kind; typing matches across labels, data and keywords, best match first. ↑↓ move, ↵ runs, Esc closes and focus returns."
          >
            <Example label="Open">
              <OpenButton />
            </Example>
            <Example label="Selected endpoint (its actions are registered)">
              <span className="glass-control flex h-10 items-center gap-2 rounded-control px-3 type-label">
                <IconEndpoint />
                {current.name}
              </span>
            </Example>
            <Example label="Loading source">
              <Switch checked={loading} onCheckedChange={setLoading} label="Endpoints still loading" />
            </Example>
          </Specimen>

          <Specimen title="Anatomy" description="Search row, grouped results — icon, label with matched letters, data, shortcut — and keyboard hints. The frame keeps one height while results change." wide>
            <InlinePanel />
            <InlinePanel query="pow re" />
          </Specimen>

          <Specimen title="Empty and loading" description="No match states the query in one line. A source still fetching shows rows of skeleton in the shape of results.">
            <InlinePanel query="orb-7" />
            <InlinePanel query="win" loading />
          </Specimen>

          <Rules
            do={[
              "Register commands with usePaletteCommands from the component that owns them, so they come and go with it.",
              "Register a selected item's actions with usePaletteActions — the same definition as its menus.",
              "Show data after the label (hostname, organisation, parent menu), not a description.",
              "Give frequent commands a shortcut; the palette shows it and binds it while registered.",
            ]}
            dont={[
              "Hand-build palette entries for an entity's actions.",
              "Register commands globally that only make sense on one page.",
              "Run a command before the palette has closed and focus has returned.",
            ]}
          />

          <TokenTable
            tokens={[
              ["--radius-dialog", "Frame corners"],
              ["--item-h", "Result row height"],
              ["--fill-hover", "Highlighted result"],
              ["--accent-line", "Matched-letter underline"],
              ["--type-subtitle-size", "Query text"],
              ["--z-dialog", "Stacking"],
            ]}
          />
        </SectionPage>
      </PaletteProvider>
    </ActionProvider>
  )
}
