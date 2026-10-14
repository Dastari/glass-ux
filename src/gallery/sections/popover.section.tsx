import { Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { StatusBadge } from "../../ui/badge/index.js"
import { Checkbox, CheckboxGroup } from "../../ui/checkbox/index.js"
import { Popover } from "../../ui/popover/index.js"

function FilterContent() {
  return (
    <CheckboxGroup defaultValue={["online", "warning"]} aria-label="Status">
      <Checkbox value="online" label="Online" description="412 endpoints" />
      <Checkbox value="offline" label="Offline" description="38 endpoints" />
      <Checkbox value="warning" label="Needs attention" description="7 endpoints" />
    </CheckboxGroup>
  )
}

function PeekContent() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="type-subtitle">NST-C106</span>
        <StatusBadge status="online" />
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 type-label">
        <dt className="text-fg-muted">Signed in</dt>
        <dd>MiraRowan</dd>
        <dt className="text-fg-muted">Uptime</dt>
        <dd>2 days</dd>
        <dt className="text-fg-muted">Agent</dt>
        <dd>6.8.0</dd>
      </dl>
    </div>
  )
}

export default function PopoverSection() {
  return (
    <SectionPage>
<Specimen title="Anatomy" description="glass-overlay on the popup recipe, a tile's inset around the content, and an optional title row with a close button. No arrow: it grows out of its trigger from 8px away.">
        <Popover.Preview title="Filter by status" size="sm">
          <FilterContent />
        </Popover.Preview>
        <Popover.Preview size="sm">
          <PeekContent />
        </Popover.Preview>
      </Specimen>

      <Specimen title="Over imagery" backdrop>
        <Popover.Preview size="sm">
          <PeekContent />
        </Popover.Preview>
      </Specimen>

      <Rules
        do={[
          "Keep popovers small and about the thing that opened them.",
          "Add a title row only when the trigger does not already name the content.",
          "Use a hover-opening popover for an infotip, so touch and screen readers reach it too.",
        ]}
        dont={[
          "Put a whole form or a task in a popover — use a dialog.",
          "Put a list of actions in a popover — use a menu.",
          "Nest popovers.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--glass-fill-overlay", "Surface fill"],
          ["--radius-overlay", "Corners"],
          ["--inset-tile", "Content inset"],
          ["--shadow-3", "Elevation"],
          ["--z-popover", "Stacking (above dialogs that open it)"],
          ["--duration-base", "Enter"],
        ]}
      />
    </SectionPage>
  )
}
