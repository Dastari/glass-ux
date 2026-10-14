import { Example, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { IconEndpoint } from "../../icons/generated/icons.js"
import { ActionContextMenu, ActionMenu, ActionMenuPreview, ActionProvider } from "../../ui/actions/index.js"
import { StatusBadge } from "../../ui/badge/index.js"
import { Kbd } from "../../ui/kbd/index.js"
import { TruncatedText } from "../../ui/truncated-text/index.js"
import { ENDPOINTS, endpointActions, type DemoEndpoint } from "./overlays.fixtures.js"

function EndpointCard({ endpoint }: { endpoint: DemoEndpoint }) {
  return (
    <ActionContextMenu set={endpointActions} targets={[endpoint]} label={endpoint.name}>
      <div
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- focusable so Shift+F10 and the Menu key reach its context menu
        tabIndex={0}
        aria-label={`${endpoint.name}, ${endpoint.online ? "online" : "offline"}. Context menu: Shift+F10.`}
        className="glass-control flex w-72 max-w-full min-w-0 items-center gap-3 rounded-tile p-3 outline-offset-2"
      >
        <span className="fa-tile-icon">
          <IconEndpoint />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <TruncatedText className="type-label font-semibold">{endpoint.name}</TruncatedText>
          <TruncatedText middle className="type-caption text-fg-muted">
            {endpoint.user}
          </TruncatedText>
        </span>
        <StatusBadge status={endpoint.online ? "online" : "offline"} size="sm" />
        <ActionMenu set={endpointActions} targets={[endpoint]} label={endpoint.name} />
      </div>
    </ActionContextMenu>
  )
}

export default function ContextMenuSection() {
  return (
    <ActionProvider>
      <SectionPage>
        <Specimen
          title="Live"
          description="Right-click a card (or focus it and press Shift+F10 or the Menu key). The menu is the one its ⋯ button opens — same definition, same rows."
        >
          {ENDPOINTS.slice(0, 3).map((endpoint) => (
            <EndpointCard key={endpoint.id} endpoint={endpoint} />
          ))}
          <Example label="Keyboard">
            <span className="flex items-center gap-2 type-caption text-fg-muted">
              <Kbd keys="shift+f10" size="sm" /> or <Kbd keys="contextmenu" size="sm" /> on a focused card
            </span>
          </Example>
        </Specimen>

        <Specimen title="Anatomy" description="Opens at the pointer — or under the focused element from the keyboard — and is otherwise identical to Menu.">
          <ActionMenuPreview set={endpointActions} targets={[ENDPOINTS[1]!]} label={ENDPOINTS[1]!.name} openSubmenu="remote-tools" highlight="remote-tools" />
        </Specimen>

        <Rules
          do={[
            "Give every row and card with actions a context menu built from the same definition as its ⋯ button.",
            "Make rows focusable so Shift+F10 and the Menu key reach the menu.",
            "Keep a visible ⋯ button too: a context menu is never the only way in.",
          ]}
          dont={[
            "Build a different menu for right-click.",
            "Override the browser's context menu on text, inputs or links.",
            "Put actions in a context menu that the row's ⋯ menu does not have.",
          ]}
        />

        <TokenTable
          tokens={[
            ["--item-h", "Row height"],
            ["--radius-overlay", "Surface corners"],
            ["--glass-fill-overlay", "Surface fill"],
            ["--z-popover", "Stacking"],
          ]}
        />
      </SectionPage>
    </ActionProvider>
  )
}
