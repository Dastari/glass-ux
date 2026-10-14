import { useState } from "react"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Badge } from "../../ui/badge/index.js"
import { Button, useActionFeedback } from "../../ui/button/index.js"
import { FormGroup, FormStack } from "../../ui/form/index.js"
import { Segmented } from "../../ui/segmented/index.js"
import { SettingRow, SettingRowSkeleton } from "../../ui/setting-row/index.js"
import { Switch } from "../../ui/switch/index.js"
import { Toaster, toast } from "../../ui/toast/index.js"
import { wait } from "./forms.fixtures.js"

const ENABLED = [
  { value: "enabled", label: "Enabled" },
  { value: "disabled", label: "Disabled" },
]
const QUALITY = [
  { value: "speed", label: "Speed" },
  { value: "balanced", label: "Balanced" },
  { value: "quality", label: "Quality" },
]

/** A switch that applies at once: optimistic, confirmed in place, rolled back on failure. */
function SavingSwitch({ label, description, fail = false }: { label: string; description: string; fail?: boolean }) {
  const [on, setOn] = useState(false)
  const { status, run } = useActionFeedback()
  return (
    <SettingRow
      label={label}
      description={description}
      status={status}
      error="Not saved — LMN-7C71 is offline. Try again when it reconnects."
      control={
        <Switch
          checked={on}
          onCheckedChange={(next) => {
            setOn(next)
            void run(
              () => wait(900).then(() => (fail ? Promise.reject(new Error("offline")) : undefined)),
              () => {
                setOn(!next)
                toast.danger(`${label} not changed`, { description: "LMN-7C71 is offline — try again when it reconnects." })
              }
            )
          }}
        />
      }
    />
  )
}

function Rows() {
  return (
    <>
      <SettingRow
        label="Keep agent up to date"
        description="Download and install agent releases as they ship."
        control={<Switch defaultChecked />}
      />
      <SettingRow
        label="Answer with conversation history"
        badge={<Badge size="sm">Beta</Badge>}
        description="Assistant remembers details from earlier chats about this organisation."
        control={<Switch />}
      />
      <SettingRow label="Remote control" control={<Segmented size="sm" options={ENABLED} defaultValue="enabled" />} />
      <SettingRow
        label="Screen quality"
        description="Speed favours frame rate on slow links."
        control={<Segmented size="sm" options={QUALITY} defaultValue="balanced" />}
      />
      <SettingRow label="Agent version" value="6.8.0" control={<Button size="sm">Check for updates</Button>} />
      <SettingRow label="Organisation" value="Northstar Studio" control={<Button size="sm">Change</Button>} />
      <SettingRow
        label="Diagnostics bundle"
        description="Logs, event viewer extracts and the agent's configuration, zipped."
        control={<Button size="sm">Export</Button>}
      />
      <SettingRow label="Enrolled" value="12 Sep 2026" />
    </>
  )
}

export default function SettingRowSection() {
  return (
    <SectionPage>
      <Toaster />
      <Specimen
        title="Every control type"
        description="Switches, segmented controls of up to four options, a read-only value with an action, a plain action, and a value on its own. The label names the control; the description says what it does."
      >
        <FormStack>
          <Rows />
        </FormStack>
      </Specimen>

      <Specimen
        title="Saving in place"
        description="Setting rows that apply at once need no Save button (R15.11). Toggle one: a spinner after 120 ms, then a drawn ✓. The second fails: the switch rolls back, the row says why, and a toast names the target."
      >
        <FormStack>
          <SavingSwitch label="Verbose logging" description="Collects detailed logs for troubleshooting." />
          <SavingSwitch label="Quarantine" description="Blocks every connection except Glass UX." fail />
        </FormStack>
      </Specimen>

      <Specimen title="Narrow boxes" description="When the text would get narrower than 12rem the control wraps under it; below 16rem it aligns to the start." layout="row">
        <div className="w-60">
          <FormStack>
            <SettingRow label="Keep agent up to date" description="Download and install releases as they ship." control={<Switch defaultChecked />} />
            <SettingRow label="Remote control" control={<Segmented size="sm" options={ENABLED} defaultValue="enabled" />} />
            <SettingRow label="Organisation" value="Northstar Studio" control={<Button size="sm">Change</Button>} />
          </FormStack>
        </div>
      </Specimen>

      <Specimen title="Disabled and grouped">
        <FormStack>
          <FormGroup label="Updates">
            <SettingRow label="Keep agent up to date" description="Managed by the Workstations group policy." disabled control={<Switch defaultChecked disabled />} />
            <SettingRow label="Update channel" control={<Segmented size="sm" options={[{ value: "stable", label: "Stable" }, { value: "preview", label: "Preview" }]} defaultValue="stable" disabled />} />
          </FormGroup>
          <FormGroup label="Privacy">
            <SettingRow label="Share screen recordings" control={<Switch />} />
          </FormGroup>
        </FormStack>
      </Specimen>

      <Specimen title="Loading" description="The skeleton keeps the label, description and control boxes.">
        <FormStack>
          <SettingRowSkeleton />
          <SettingRowSkeleton control="segmented" description={false} labelWidth="30%" />
          <SettingRowSkeleton control="button" labelWidth="45%" />
        </FormStack>
      </Specimen>

      <ContainerLab>
        {(preset) =>
          preset?.id === "row" || preset?.id === "header" ? (
            <div className="flex h-full items-center px-3">
              <SettingRow className="w-full" label="Keep agent up to date" control={<Switch size="sm" defaultChecked />} />
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-3" data-scroll-container>
              <FormStack>
                <Rows />
              </FormStack>
            </div>
          )
        }
      </ContainerLab>

      <Rules
        do={[
          "Use a setting row for switches, segmented controls of up to four options, values with an action, and actions.",
          "Make every boolean setting a switch in a setting row.",
          "Save switch settings at once and confirm on the row.",
          "Keep the description to what the setting does.",
          "Use a small secondary Button for row actions (“Change”, “Export”).",
        ]}
        dont={[
          "Put text fields, selects or comboboxes in a setting row — they are stacked fields.",
          "Add a Save button for a page of switches.",
          "Squeeze the label to keep the control on the line; let it drop below.",
          "Use a lone checkbox for a setting.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--type-body-size", "Label and value"],
          ["--type-label-size", "Description"],
          ["--fg-muted", "Value and description"],
          ["--control-h-sm", "Row minimum height, row actions"],
          ["--space-6", "Gap between text and control"],
          ["--success-text", "Saved ✓"],
          ["--danger-text", "Not saved ✕ and reason"],
          ["--spinner-delay", "Before the spinner shows"],
          ["--feedback-hold", "How long ✓ shows"],
        ]}
      />
    </SectionPage>
  )
}
