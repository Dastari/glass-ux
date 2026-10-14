import { useState } from "react"
import { z } from "zod"
import { Rules, SectionPage, Specimen } from "../kit.js"
import { Button, useActionFeedback } from "../../ui/button/index.js"
import { FieldSkeleton } from "../../ui/field/index.js"
import { Form, FormGroup, FormStack, formBehaviour, useAppForm } from "../../ui/form/index.js"
import { Segmented } from "../../ui/segmented/index.js"
import { SettingRow, SettingRowSkeleton } from "../../ui/setting-row/index.js"
import { Switch } from "../../ui/switch/index.js"
import { Panel, PanelBody, PanelFooter, PanelHeader } from "../../ui/surface/index.js"
import { Toaster, toast } from "../../ui/toast/index.js"
import {
  AGENT_GROUPS,
  CONNECTION_MODES,
  ENVIRONMENTS,
  wait,
  type AgentGroup,
  type ConnectionMode,
  type Environment,
} from "./forms.fixtures.js"

const REMOTE_CONTROL: Array<{ value: "enabled" | "disabled"; label: string }> = [
  { value: "enabled", label: "Enabled" },
  { value: "disabled", label: "Disabled" },
]

/** The agent's General settings, as the server sends them. */
interface AgentSettings {
  deviceName: string
  description: string
  agentGroup: AgentGroup | null
  environment: Environment | null
  connectionMode: ConnectionMode | null
  notes: string
}

const SAVED: AgentSettings = {
  deviceName: "LMN-7C71",
  description: "HP EliteOne 1000 G2 27-in 4K UHD AiO",
  agentGroup: "workstations",
  environment: "production",
  connectionMode: "always",
  notes: "Primary office workstation. Used by the IT team for remote support and maintenance.",
}

const chosen = (message: string) => z.string().nullable().refine((value) => value !== null, message)

const agentSettings = z.object({
  deviceName: z
    .string()
    .trim()
    .min(1, "Enter a device name")
    .max(15, "Use 15 characters or fewer — the Windows limit")
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and hyphens only"),
  description: z.string().max(120, "Use 120 characters or fewer"),
  agentGroup: chosen("Choose an agent group"),
  environment: chosen("Choose an environment"),
  connectionMode: chosen("Choose a connection mode"),
  notes: z.string().max(500, "Shorten the notes to 500 characters"),
})

const offline = (device: string) => `${device} is offline — try again when it reconnects.`

/** Stacked fields: saved together with Save (R15.10). */
function GeneralForm({ fail }: { fail: boolean }) {
  const [saved, setSaved] = useState(SAVED)
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: saved,
    validators: { onDynamic: agentSettings },
    onSubmit: async ({ value }) => {
      await wait(1100)
      if (fail) throw new Error("Agent offline")
      setSaved(value)
    },
  })

  return (
    <Form
      form={form}
      aria-label="General"
      onError={() => toast.danger(`${saved.deviceName} settings not saved`, { description: offline(saved.deviceName) })}
    >
      <Panel data-testid="agent-settings">
        <PanelHeader title="General" level={3} />
        <PanelBody>
          <FormStack>
            <FormGroup label="Identity">
              <form.AppField name="deviceName">
                {(field) => (
                  <field.TextField label="Device name" hint="Up to 15 letters, numbers and hyphens." width="medium" autoComplete="off" spellCheck={false} />
                )}
              </form.AppField>
              <form.AppField name="description">
                {(field) => <field.TextField label="Description" optional maxLength={120} width="medium" />}
              </form.AppField>
            </FormGroup>
            <FormGroup label="Placement">
              <form.AppField name="agentGroup">
                {(field) => <field.SelectField label="Agent group" options={AGENT_GROUPS} placeholder="Choose an agent group" />}
              </form.AppField>
              <form.AppField name="environment">
                {(field) => <field.SelectField label="Environment" options={ENVIRONMENTS} placeholder="Choose an environment" />}
              </form.AppField>
              <form.AppField name="connectionMode">
                {(field) => <field.SelectField label="Connection mode" options={CONNECTION_MODES} placeholder="Choose a connection mode" />}
              </form.AppField>
            </FormGroup>
            <form.AppField name="notes">
              {(field) => <field.TextareaField label="Notes" optional maxLength={500} minRows={2} maxRows={6} />}
            </form.AppField>
          </FormStack>
        </PanelBody>
        <PanelFooter>
          <form.CancelButton />
          <form.SubmitButton />
        </PanelFooter>
      </Panel>
    </Form>
  )
}

/** A setting that applies at once: optimistic, confirmed on its row, rolled back on failure (R15.11). */
function useImmediate<T>(initial: T, label: string, fail: boolean) {
  const [value, setValue] = useState(initial)
  const { status, run } = useActionFeedback()
  const change = (next: T) => {
    const previous = value
    setValue(next)
    void run(
      () => wait(800).then(() => (fail ? Promise.reject(new Error("offline")) : undefined)),
      () => {
        setValue(previous)
        toast.danger(`${label} not changed on LMN-7C71`, { description: offline("LMN-7C71") })
      }
    )
  }
  return { value, change, status }
}

/** Setting rows: each applies as soon as it changes. */
function BehaviourSettings({ fail }: { fail: boolean }) {
  const remote = useImmediate<"enabled" | "disabled">("enabled", "Remote control", fail)
  const updates = useImmediate(true, "Auto-updates", fail)
  const logging = useImmediate(false, "Diagnostic logging", fail)
  return (
    <Panel aria-label="Behaviour" data-testid="agent-behaviour">
      <PanelHeader title="Behaviour" level={3} />
      <PanelBody>
        <FormStack>
          <SettingRow
            label="Remote control"
            description="Technicians can view and control LMN-7C71."
            status={remote.status}
            error={offline("LMN-7C71")}
            control={<Segmented size="sm" options={REMOTE_CONTROL} value={remote.value} onValueChange={remote.change} />}
          />
          <SettingRow
            label="Keep agent up to date"
            description="Automatically download and install updates when available."
            status={updates.status}
            error={offline("LMN-7C71")}
            control={<Switch checked={updates.value} onCheckedChange={updates.change} />}
          />
          <SettingRow
            label="Verbose logging"
            description="Collect additional logs for troubleshooting. May impact performance."
            status={logging.status}
            error={offline("LMN-7C71")}
            control={<Switch checked={logging.value} onCheckedChange={logging.change} />}
          />
        </FormStack>
      </PanelBody>
    </Panel>
  )
}

function AgentSettingsSkeleton() {
  return (
    <>
      <Panel aria-busy="true" aria-label="Loading general settings">
        <PanelHeader title="General" level={3} />
        <PanelBody>
          <FormStack>
            <FieldSkeleton labelWidth="25%" />
            <FieldSkeleton labelWidth="22%" />
            <FieldSkeleton labelWidth="24%" />
            <FieldSkeleton labelWidth="22%" />
            <FieldSkeleton labelWidth="28%" />
            <FieldSkeleton control="textarea" rows={2} labelWidth="12%" />
          </FormStack>
        </PanelBody>
        <PanelFooter>
          <Button disabled>Cancel</Button>
          <Button variant="primary" disabled>
            Save changes
          </Button>
        </PanelFooter>
      </Panel>
      <Panel aria-busy="true" aria-label="Loading behaviour settings">
        <PanelHeader title="Behaviour" level={3} />
        <PanelBody>
          <FormStack>
            <SettingRowSkeleton control="segmented" labelWidth="30%" />
            <SettingRowSkeleton labelWidth="40%" />
            <SettingRowSkeleton labelWidth="32%" />
          </FormStack>
        </PanelBody>
      </Panel>
    </>
  )
}

export default function FormsPattern() {
  const [fail, setFail] = useState(false)
  const [loading, setLoading] = useState(false)
  return (
    <SectionPage>
      <Toaster />
      <Specimen
        title="Agent settings · General"
        description="One column, one row per field (R15). General is a TanStack Form with Zod: fields validate when you leave them, then as you type until fixed; Save is disabled until something changes, confirms in place, and Cancel reverts. Behaviour is setting rows that apply at once and confirm on the row."
        wide
      >
        <Button size="sm" variant={fail ? "soft" : "ghost"} aria-pressed={fail} onClick={() => setFail((value) => !value)}>
          {fail ? "Saves fail (agent offline)" : "Saves succeed"}
        </Button>
        <Button size="sm" variant={loading ? "soft" : "ghost"} aria-pressed={loading} onClick={() => setLoading((value) => !value)}>
          {loading ? "Showing the loading shape" : "Show the loading shape"}
        </Button>
      </Specimen>

      {/* Panels sit on the canvas, not inside a specimen: glass never nests (R4.2). */}
      <div className="flex flex-col gap-panels" style={{ maxWidth: "calc(var(--form-measure) + var(--inset-panel) * 2)" }} data-wide="">
        {loading ? (
          <AgentSettingsSkeleton />
        ) : (
          <>
            <GeneralForm fail={fail} />
            <BehaviourSettings fail={fail} />
          </>
        )}
      </div>

      <Rules
        do={[
          "Keep one Zod schema on the form; each field validates its own slice.",
          "Stack one field per row; group rows under an overline label.",
          "Make booleans and short modes setting rows that apply at once.",
          "Put Cancel then Save at the end of the footer; Save is the only primary.",
          "Pass the server's record as defaultValues so a save becomes the new baseline.",
        ]}
        dont={[
          "Show a success banner — the Save button confirms in place.",
          "Disable Save to signal errors; let submit focus the first invalid field.",
          "Add an info callout that restates the heading.",
          "Put two fields side by side, or switches beside fields.",
          "Separate fields with dividers.",
        ]}
      />
    </SectionPage>
  )
}
