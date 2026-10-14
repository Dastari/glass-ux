import { useState } from "react"
import { ContainerLab, Matrix, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Checkbox, CheckboxGroup } from "../../ui/checkbox/index.js"
import { Field, type ChoiceSize, type ChoiceTone } from "../../ui/field/index.js"
import { Radio, RadioCard, RadioGroup } from "../../ui/radio/index.js"
import { SESSION_KINDS, type SessionKind } from "./forms.fixtures.js"

const SIZES: ChoiceSize[] = ["sm", "md", "lg"]
const TONES: ChoiceTone[] = ["accent", "success", "warning", "danger"]
const ENDPOINT_IDS = ["nst-c106", "orb-4e5e", "win11-vm"]
const ENDPOINT_NAMES: Record<string, string> = { "nst-c106": "NST-C106", "orb-4e5e": "LMN-4E5E", "win11-vm": "STUDIO-VM" }

function ParentGroup() {
  const [value, setValue] = useState<string[]>(["nst-c106"])
  return (
    <CheckboxGroup legend="Restart after patching" value={value} onValueChange={setValue} allValues={ENDPOINT_IDS}>
      <Checkbox parent label="All endpoints in Front office" />
      {ENDPOINT_IDS.map((id) => (
        <Checkbox key={id} value={id} label={ENDPOINT_NAMES[id]} className="ms-7" />
      ))}
    </CheckboxGroup>
  )
}

function SessionCards({ orientation = "vertical" }: { orientation?: "vertical" | "horizontal" }) {
  const [kind, setKind] = useState<SessionKind>("interactive")
  return (
    <RadioGroup<SessionKind>
      variant="cards"
      orientation={orientation}
      value={kind}
      onValueChange={(next) => setKind(next as SessionKind)}
      aria-label="Session type"
    >
      {SESSION_KINDS.map((session) => (
        <RadioCard<SessionKind>
          key={session.value}
          value={session.value}
          title={session.label}
          description={session.description}
          icon={orientation === "horizontal" ? session.icon : undefined}
          disabled={session.value === "command" && orientation === "horizontal"}
        />
      ))}
    </RadioGroup>
  )
}

export default function ChoiceSection() {
  return (
    <SectionPage>
      <Specimen title="Checkbox" description="Ticking pops the tone fill in on the spring curve and draws the ✓. Mixed draws a bar. Every box is live." wide>
        <Matrix
          columns={["Unticked", "Ticked", "Mixed", "Invalid", "Disabled", "Disabled, ticked"]}
          rows={SIZES.map((size) => ({
            label: size,
            cells: [
              <Checkbox key="a" size={size} aria-label="Unticked" />,
              <Checkbox key="b" size={size} defaultChecked aria-label="Ticked" />,
              <Checkbox key="c" size={size} indeterminate aria-label="Mixed" />,
              <Checkbox key="d" size={size} invalid aria-label="Invalid" />,
              <Checkbox key="e" size={size} disabled aria-label="Disabled" />,
              <Checkbox key="f" size={size} disabled defaultChecked aria-label="Disabled, ticked" />,
            ],
          }))}
        />
      </Specimen>

      <Specimen title="Radio" description="The chosen circle fills with the tone and the dot springs in. Arrow keys move and choose." wide>
        <Matrix
          columns={["Not chosen", "Chosen", "Invalid", "Disabled", "Disabled, chosen"]}
          rows={SIZES.map((size) => ({
            label: size,
            cells: [
              <RadioGroup key="a" defaultValue="b" aria-label={`Not chosen ${size}`}>
                <Radio value="a" size={size} aria-label="Option A" />
              </RadioGroup>,
              <RadioGroup key="b" defaultValue="a" aria-label={`Chosen ${size}`}>
                <Radio value="a" size={size} aria-label="Option A" />
              </RadioGroup>,
              <RadioGroup key="c" invalid aria-label={`Invalid ${size}`}>
                <Radio value="a" size={size} aria-label="Option A" />
              </RadioGroup>,
              <RadioGroup key="d" disabled aria-label={`Disabled ${size}`}>
                <Radio value="a" size={size} aria-label="Option A" />
              </RadioGroup>,
              <RadioGroup key="e" disabled defaultValue="a" aria-label={`Disabled chosen ${size}`}>
                <Radio value="a" size={size} aria-label="Option A" />
              </RadioGroup>,
            ],
          }))}
        />
      </Specimen>

      <Specimen title="Tones" description="Accent by default. Success, warning and danger only when the choice itself is a status (R3.3).">
        <Matrix
          columns={["Ticked", "Mixed", "Chosen", "Card"]}
          rows={TONES.map((tone) => ({
            label: tone,
            cells: [
              <Checkbox key="a" tone={tone} defaultChecked aria-label={`${tone} ticked`} />,
              <Checkbox key="b" tone={tone} indeterminate aria-label={`${tone} mixed`} />,
              <RadioGroup key="c" tone={tone} defaultValue="a" aria-label={`${tone} chosen`}>
                <Radio value="a" aria-label="Chosen" />
              </RadioGroup>,
              <RadioGroup key="d" variant="cards" tone={tone} defaultValue="a" aria-label={`${tone} card`} className="w-56">
                <RadioCard value="a" title={tone === "danger" ? "Wipe and reset" : tone === "warning" ? "Restart now" : tone === "success" ? "Mark resolved" : "Interactive session"} />
              </RadioGroup>,
            ],
          }))}
        />
      </Specimen>

      <Specimen title="With labels" description="Click the label or the box. A description makes the label a heading." layout="stack">
        <Checkbox label="Wake devices before patching" defaultChecked />
        <Checkbox label="Restart when the signed-in user is idle" description="Waits up to 4 hours, then restarts at 2:00 am." />
        <Checkbox label="Skip devices on battery" disabled />
        <ParentGroup />
      </Specimen>

      <Specimen title="Radio group" layout="stack">
        <RadioGroup legend="When to install" defaultValue="window">
          <Radio value="now" label="Now" />
          <Radio value="window" label="In the maintenance window" description="Tonight, 1:00 – 5:00 am AEDT" />
          <Radio value="user" label="Ask the signed-in user" />
        </RadioGroup>
        <RadioGroup legend="Screen" orientation="horizontal" defaultValue="all">
          <Radio value="all" label="All displays" />
          <Radio value="primary" label="Primary" />
          <Radio value="secondary" label="Display 2" />
        </RadioGroup>
      </Specimen>

      <Specimen title="Radio cards" description="For options that need a sentence, typically in a dialog: Connect to NST-C106." layout="stack">
        <div className="max-w-md">
          <SessionCards />
        </div>
      </Specimen>

      <Specimen title="Radio cards in a grid" description="Horizontal cards reflow by container width and may carry an icon tile." layout="stack" wide>
        <SessionCards orientation="horizontal" />
      </Specimen>

      <Specimen title="Over glass and imagery" backdrop>
        <div className="flex flex-col gap-3">
          <Checkbox label="Wake devices before patching" defaultChecked />
          <Checkbox label="Skip devices on battery" />
          <RadioGroup defaultValue="b" orientation="horizontal" aria-label="Quality">
            <Radio value="a" label="Speed" />
            <Radio value="b" label="Balanced" />
            <Radio value="c" label="Quality" />
          </RadioGroup>
        </div>
      </Specimen>

      <Specimen title="Consent" description="Explicit consent is a checkbox in a horizontal Field: the statement, and the message line for the error.">
        <div className="flex max-w-sm flex-col gap-3">
          <Field orientation="horizontal" label="I have notified the site contact" error="Confirm before scheduling the wipe">
            <Checkbox invalid />
          </Field>
        </div>
      </Specimen>

      <ContainerLab>
        {(preset) =>
          preset?.id === "row" ? (
            <div className="flex h-full items-center gap-5 px-3">
              <Checkbox label="Online only" defaultChecked />
              <Checkbox label="Has alerts" />
              <RadioGroup orientation="horizontal" defaultValue="all" aria-label="Scope">
                <Radio value="all" label="All" />
                <Radio value="mine" label="Assigned to me" />
              </RadioGroup>
            </div>
          ) : preset?.id === "header" ? (
            <div className="flex h-full items-center px-3">
              <Checkbox label="Select all 1,284 endpoints on every page" />
            </div>
          ) : preset?.id === "tile" ? (
            <div className="p-3">
              <RadioGroup legend="When to install" defaultValue="window">
                <Radio value="now" label="Now" />
                <Radio value="window" label="In the maintenance window" />
                <Radio value="user" label="Ask the signed-in user" />
              </RadioGroup>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-3" data-scroll-container>
              <SessionCards orientation={preset?.id === "pane" ? "horizontal" : "vertical"} />
            </div>
          )
        }
      </ContainerLab>

      <Rules
        do={[
          "Use checkboxes to select items, for multi-choice groups and for explicit consent.",
          "Use radios for two to five visible options; use a Select for more.",
          "Use radio cards when each option needs a sentence of explanation.",
          "Give a group a legend that names the decision, not “Options”.",
          "Use a status tone only when the choice is itself a status.",
        ]}
        dont={[
          "Use a lone checkbox for a setting — booleans are switches in setting rows.",
          "Pre-tick consent or destructive options.",
          "Nest more than one level of parent and child checkboxes.",
          "Colour choices with status tones for decoration.",
          "Hide the box and rely on the label alone.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--check-size", "Box and circle, md"],
          ["--radius-check", "Checkbox corner"],
          ["--accent", "Ticked fill (start)"],
          ["--accent-2", "Ticked fill (end)"],
          ["--accent-glow", "Glow under a ticked box"],
          ["--success", "Success tone"],
          ["--warning", "Warning tone (dark mark)"],
          ["--danger", "Danger tone"],
          ["--accent-soft", "Chosen card fill"],
          ["--accent-line", "Chosen card edge"],
          ["--ease-spring", "Fill pop, ✓ draw, dot"],
          ["--press-scale", "Pressed box"],
        ]}
      />
    </SectionPage>
  )
}
