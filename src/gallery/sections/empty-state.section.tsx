import { ContainerLab, Example, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { IconCloudOff, IconEndpoint, IconInbox, IconSearch } from "../../icons/generated/icons.js"
import { Button } from "../../ui/button/index.js"
import { EmptyState } from "../../ui/empty-state/index.js"

export default function EmptyStateSection() {
  return (
    <SectionPage>
      <Specimen title="In a pane" description="Centred in the content's own box: the icon in a soft tile, one line, the primary action." wide>
        <div className="flex w-full flex-wrap gap-6">
          <Example label="Large · ≥ 16rem tall">
            <div className="glass-inset h-72 w-120 max-w-full rounded-tile">
              <EmptyState
                icon={<IconSearch />}
                action={
                  <Button size="sm" variant="secondary">
                    Clear search
                  </Button>
                }
              >
                No endpoints match “orb-7”
              </EmptyState>
            </div>
          </Example>
          <Example label="Block · tile">
            <div className="glass-inset h-48 w-70 rounded-tile">
              <EmptyState icon={<IconInbox />}>No tickets assigned to Avery Quinn</EmptyState>
            </div>
          </Example>
        </div>
      </Specimen>

      <Specimen title="In a row" description="Under 10rem of height it becomes one row — a table body with no rows, a short list." layout="stack">
        <div className="glass-inset h-12 w-150 max-w-full rounded-control">
          <EmptyState
            icon={<IconEndpoint />}
            action={
              <Button size="sm" variant="ghost">
                Add endpoint
              </Button>
            }
          >
            No endpoints in Staging
          </EmptyState>
        </div>
      </Specimen>

      <Specimen title="Error in place" description="A failed load takes the same box in danger tone, says what failed and offers the retry (R2.4, R9.1)." layout="stack">
        <div className="glass-inset h-64 w-120 max-w-full rounded-tile">
          <EmptyState
            tone="danger"
            icon={<IconCloudOff />}
            action={
              <Button size="sm" variant="secondary">
                Retry
              </Button>
            }
          >
            Couldn’t load software for NST-C106 — the agent is offline
          </EmptyState>
        </div>
        <div className="glass-inset h-12 w-150 max-w-full rounded-control">
          <EmptyState tone="danger" icon={<IconCloudOff />}>
            Couldn’t load software for NST-C106 — the agent is offline
          </EmptyState>
        </div>
      </Specimen>

      <ContainerLab description="Row in the row and header boxes; centred block in the tile and the tall column; large in the pane.">
        {() => (
          <EmptyState
            icon={<IconSearch />}
            action={
              <Button size="sm" variant="secondary">
                Clear search
              </Button>
            }
          >
            No endpoints match “orb-7”
          </EmptyState>
        )}
      </ContainerLab>

      <Rules
        do={[
          "State the fact in one line: “No endpoints match “orb-7””.",
          "Offer the one action that resolves it, if there is one.",
          "Render it in the content's box so nothing around it moves.",
          "Say what failed and what to do when the box holds an error.",
        ]}
        dont={[
          "Write a headline and a paragraph, or cheer the user on (R2.3).",
          "Use an illustration; the icon is enough.",
          "Show an empty state while data is still loading; that is the skeleton's job.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--icon-2xl", "Large icon"],
          ["--icon-xl", "Block icon"],
          ["--tile-icon-box", "Block tile"],
          ["--fg-muted", "Line"],
          ["--danger-soft", "Error tile"],
        ]}
      />
    </SectionPage>
  )
}
