import { useState } from "react"
import { Field } from "../../ui/field/index.js"
import { Input } from "../../ui/input/index.js"
import { Stepper, Wizard, type StepItem } from "../../ui/stepper/index.js"
import { Switch } from "../../ui/switch/index.js"
import { SettingRow } from "../../ui/setting-row/index.js"
import { Rules, SectionPage, Specimen } from "../kit.js"
import { wait } from "./forms.fixtures.js"

const ONBOARDING: StepItem[] = [
  { id: "site", label: "Name the site", description: "Where the devices are" },
  { id: "agent", label: "Install the agent" },
  { id: "alerts", label: "Alerts", optional: true },
  { id: "review", label: "Review" },
]

function SiteStep({ name, onName }: { name: string; onName: (value: string) => void }) {
  return (
    <div className="grid max-w-md gap-4">
      <Field label="Site name" description="Shown on reports and alerts.">
        <Input value={name} onValueChange={(value) => onName(String(value))} />
      </Field>
    </div>
  )
}

function WizardDemo({ orientation }: { orientation: "horizontal" | "vertical" }) {
  const [name, setName] = useState("")
  const [token, setToken] = useState("")
  return (
    <Wizard
      orientation={orientation}
      aria-label="Add a site"
      steps={[
        {
          id: "site",
          label: "Name the site",
          description: "Where the devices are",
          content: <SiteStep name={name} onName={setName} />,
          validate: () => (name.trim() ? true : "Enter a name for the site."),
        },
        {
          id: "agent",
          label: "Install the agent",
          content: (
            <div className="grid max-w-md gap-4">
              <Field label="Enrolment token" description="Paste the token from the installer. Any text that starts with NST- will do here.">
                <Input value={token} onValueChange={(value) => setToken(String(value))} />
              </Field>
            </div>
          ),
          validate: async () => {
            await wait(600)
            return token.startsWith("NST-") ? true : "The token was not recognised. It starts with NST-."
          },
        },
        {
          id: "alerts",
          label: "Alerts",
          optional: true,
          content: (
            <div className="grid max-w-lg gap-1">
              <SettingRow label="Email the on-call engineer" control={<Switch defaultChecked />} />
              <SettingRow label="Post to the operations channel" control={<Switch />} />
            </div>
          ),
        },
        {
          id: "review",
          label: "Review",
          content: (
            <p className="text-fg-muted">
              {name || "The site"} will appear in the site list. Devices enrol as they report in.
            </p>
          ),
        },
      ]}
      onFinish={() => wait(900)}
      finishLabel="Add site"
    />
  )
}

export default function StepperSection() {
  const [step, setStep] = useState("agent")
  return (
    <SectionPage>
      <Specimen title="Wizard" description="Next checks the step first and stays with its message; optional steps can be skipped; the stepper lets you go back to any step you have visited." layout="stack" wide>
        <WizardDemo orientation="horizontal" />
      </Specimen>

      <Specimen title="Beside the content" description="A rail of steps for longer flows. Narrow containers stack it above the content." layout="stack" wide>
        <WizardDemo orientation="vertical" />
      </Specimen>

      <Specimen title="Stepper" description="Progress alone, for flows whose content and buttons the page already owns. Narrow containers show the step count, its name and a bar." layout="stack" wide>
        <div className="grid gap-6">
          <Stepper steps={ONBOARDING} value={step} navigation="any" onValueChange={setStep} aria-label="Onboarding" />
          <div className="max-w-sm">
            <Stepper steps={ONBOARDING} value={step} aria-label="Onboarding, narrow" />
          </div>
          <Stepper
            aria-label="Deployment"
            steps={[
              { id: "build", label: "Build", status: "complete" },
              { id: "test", label: "Tests", status: "error", description: "3 failed" },
              { id: "stage", label: "Staging", status: "upcoming" },
              { id: "ship", label: "Production", status: "upcoming" },
            ]}
            value="test"
          />
        </div>
      </Specimen>

      <Rules
        do={[
          "Use a wizard when a task has an order and later steps depend on earlier ones.",
          "Name steps by what the person does there, in a few words.",
          "Check each step before moving on, and say what to fix beside the buttons.",
        ]}
        dont={[
          "Don't use a stepper for navigation between independent pages; that is tabs.",
          "Don't hide Back: people check what they entered.",
        ]}
      />
    </SectionPage>
  )
}
