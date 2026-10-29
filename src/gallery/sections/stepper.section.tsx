import { useMemo, useRef, useState, type ReactNode } from "react"
import { Field } from "../../ui/field/index.js"
import { Input } from "../../ui/input/index.js"
import { Stepper, Wizard, type StepItem, type StepStatus } from "../../ui/stepper/index.js"
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

const CHECK_IN = [
  { id: "visitor", label: "Visitor" },
  { id: "screening", label: "Screening" },
  { id: "agreement", label: "Agreement" },
] as const

/** One long check-in form: the stepper follows the section in view, and ticks each section once its fields are filled, in any order. */
function SectionNavDemo() {
  const scroller = useRef<HTMLDivElement>(null)
  const refs = {
    visitor: useRef<HTMLElement>(null),
    screening: useRef<HTMLElement>(null),
    agreement: useRef<HTMLElement>(null),
  }
  const [inView, setInView] = useState("visitor")
  const [values, setValues] = useState({ name: "", company: "", travelled: "", animals: "", agreed: false })
  const done: Record<string, boolean> = {
    visitor: Boolean(values.name.trim() && values.company.trim()),
    screening: Boolean(values.travelled.trim() && values.animals.trim()),
    agreement: values.agreed,
  }
  const steps = useMemo<StepItem[]>(
    () => CHECK_IN.map((step) => ({ ...step, status: (done[step.id] ? "complete" : "upcoming") satisfies StepStatus })),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- done is derived from values
    [values],
  )
  const set = (key: keyof typeof values) => (value: unknown) => setValues((current) => ({ ...current, [key]: value }))
  const section = (id: keyof typeof refs, title: string, body: ReactNode) => (
    <section ref={refs[id]} aria-label={title} className="grid min-h-80 content-start gap-4 border-b border-line pb-8 last:min-h-60 last:border-b-0">
      <h3 className="type-title">{title}</h3>
      {body}
    </section>
  )
  return (
    <div className="flex w-full gap-6">
      <div className="w-44 shrink-0">
        <Stepper steps={steps} value={inView} onValueChange={setInView} navigation="any" orientation="vertical" sections={refs} scrollContainer={scroller} aria-label="Check-in sections" />
      </div>
      <div ref={scroller} className="h-100 min-w-0 flex-1 overflow-y-auto pe-2" data-testid="check-in-form">
        {section(
          "visitor",
          "Visitor",
          <>
            <Field label="Name">
              <Input value={values.name} onValueChange={(value) => set("name")(String(value))} />
            </Field>
            <Field label="Company">
              <Input value={values.company} onValueChange={(value) => set("company")(String(value))} />
            </Field>
          </>,
        )}
        {section(
          "screening",
          "Screening",
          <>
            <Field label="Countries visited in the last 30 days">
              <Input value={values.travelled} onValueChange={(value) => set("travelled")(String(value))} />
            </Field>
            <Field label="Contact with livestock this week">
              <Input value={values.animals} onValueChange={(value) => set("animals")(String(value))} />
            </Field>
          </>,
        )}
        {section("agreement", "Agreement", <SettingRow label="I have read the site rules" control={<Switch checked={values.agreed} onCheckedChange={set("agreed")} />} />)}
      </div>
    </div>
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

      <Specimen
        title="Section navigation"
        description="One long form with the stepper beside it: scrolling moves the highlight to the section in view, choosing a step scrolls to it, and each section shows its tick once filled, in any order. The section in view keeps its highlight when it is complete."
        layout="stack"
        wide
      >
        <SectionNavDemo />
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
