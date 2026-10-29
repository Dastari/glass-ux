import { useState } from "react"
import { Dialog } from "../../ui/dialog/index.js"
import { LevelGauge, type GaugeLevel } from "../../ui/level-gauge/index.js"
import { ContainerLab, Example, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Usage } from "./inputs.kit.js"

type Risk = "low" | "moderate" | "high"
const RISK: GaugeLevel<Risk>[] = [
  { value: "low", label: "Low", tone: "success" },
  { value: "moderate", label: "Moderate", tone: "warning" },
  { value: "high", label: "High", tone: "danger" },
]
const FIRE: GaugeLevel[] = [
  { value: "low", label: "Low", tone: "success" },
  { value: "moderate", label: "Moderate", tone: "info" },
  { value: "high", label: "High", tone: "warning" },
  { value: "very-high", label: "Very high", tone: "danger" },
  { value: "extreme", label: "Extreme", tone: "danger" },
]

/** Fictional visitors and their screening results. */
const VISITS: Array<{ name: string; company: string; risk: Risk | null; before?: Risk }> = [
  { name: "Noa Varga", company: "Harbour Feed Co.", risk: "low" },
  { name: "Ellis Park", company: "Northbank Vets", risk: "moderate", before: "high" },
  { name: "Rory Lake", company: "Tidewater Haulage", risk: "high" },
  { name: "Sage Winter", company: "Self-employed", risk: null },
]

function RiskHelp({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Popup size="sm">
        <Dialog.Header title="Risk levels" />
        <Dialog.Body>
          <dl className="grid gap-3">
            <div>
              <dt className="font-medium">Low</dt>
              <dd className="text-fg-muted">No contact with livestock or overseas farms in the last 30 days.</dd>
            </div>
            <div>
              <dt className="font-medium">Moderate</dt>
              <dd className="text-fg-muted">Contact more than 7 days ago, or high risk lowered by mitigation.</dd>
            </div>
            <div>
              <dt className="font-medium">High</dt>
              <dd className="text-fg-muted">Contact in the last 7 days. An escort is required.</dd>
            </div>
          </dl>
        </Dialog.Body>
      </Dialog.Popup>
    </Dialog.Root>
  )
}

function SummaryDemo() {
  const [help, setHelp] = useState(false)
  return (
    <div className="grid w-full max-w-md gap-6">
      <LevelGauge
        label="Final risk"
        size="md"
        levels={RISK}
        value="moderate"
        previous="high"
        previousLabel="Before mitigation"
        note="Boots disinfected and coveralls issued at the gate."
        onPress={() => setHelp(true)}
      />
      <RiskHelp open={help} onOpenChange={setHelp} />
    </div>
  )
}

export default function LevelGaugeSection() {
  return (
    <SectionPage>
      <Specimen title="In a table" description="The sm tier: segments and the level's name on one line. An earlier, higher level stays traced; a visitor not yet screened reads Not rated in the same space." layout="stack" wide>
        <table className="w-full max-w-2xl text-left" data-testid="level-gauge-table">
          <thead className="type-caption text-fg-muted">
            <tr>
              <th className="py-2 font-medium">Visitor</th>
              <th className="py-2 font-medium">Company</th>
              <th className="py-2 font-medium">Risk</th>
            </tr>
          </thead>
          <tbody>
            {VISITS.map((visit) => (
              <tr key={visit.name} className="border-t border-line">
                <td className="py-2">{visit.name}</td>
                <td className="py-2 text-fg-muted">{visit.company}</td>
                <td className="py-2">
                  <LevelGauge label="Risk" levels={RISK} value={visit.risk} previous={visit.before} previousLabel="Before mitigation" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Specimen>

      <Specimen title="In a summary" description="The md tier: the label and level, the earlier level and a note, full-width segments and the scale beneath. Pressing it explains the levels.">
        <SummaryDemo />
      </Specimen>

      <Specimen title="Scales and changes" layout="grid">
        <Example label="Five levels">
          <LevelGauge label="Fire danger" size="md" levels={FIRE} value="very-high" />
        </Example>
        <Example label="Rose since the last visit (striped)">
          <LevelGauge label="Risk" size="md" levels={RISK} value="high" previous="low" previousLabel="Last visit" />
        </Example>
        <Example label="Lowered by mitigation (traced)">
          <LevelGauge label="Risk" levels={RISK} value="low" previous="high" previousLabel="Before mitigation" />
        </Example>
        <Example label="Not rated">
          <LevelGauge label="Risk" size="md" levels={RISK} value={undefined} fallback="Awaiting screening" />
        </Example>
      </Specimen>

      <Specimen title="Over glass and imagery" backdrop>
        <LevelGauge label="Final risk" size="md" levels={RISK} value="moderate" previous="high" previousLabel="Before mitigation" />
      </Specimen>

      <ContainerLab description="sm keeps its segments and truncates the name; md fills its box up to 24rem.">
        {() => (
          <div className="grid w-full gap-3 p-2">
            <LevelGauge label="Risk" levels={RISK} value="moderate" previous="high" />
            <LevelGauge label="Final risk" size="md" levels={RISK} value="moderate" previous="high" previousLabel="Before mitigation" />
          </div>
        )}
      </ContainerLab>

      <Usage
        code={`
import { LevelGauge } from "glass-ux/level-gauge"

<LevelGauge
  label="Final risk"
  levels={[
    { value: "low", label: "Low", tone: "success" },
    { value: "moderate", label: "Moderate", tone: "warning" },
    { value: "high", label: "High", tone: "danger" },
  ]}
  value={visit.risk}
  previous={visit.riskBeforeMitigation}
  previousLabel="Before mitigation"
  onPress={() => setHelpOpen(true)}
/>`}
      />

      <TokenTable
        tokens={[
          ["--success / --warning / --danger / --info", "filled, striped and traced segments, by the level's tone"],
          ["--success-text …", "the level's name"],
          ["--fill-muted / --line", "empty segments"],
          ["--fg-subtle / --fg", "the scale's names / the current one"],
        ]}
      />

      <Rules
        do={[
          "Give every level a status tone that matches its meaning, lowest first.",
          "Show the earlier level when a rating was changed, so the reader sees both.",
          "Offer an explanation of the levels with onPress where people need it.",
        ]}
        dont={[
          "Use it for a continuous value; that is a Meter or Gauge.",
          "Use categorical colours for levels: status colours keep their meaning (R3.3).",
          "Show more than about six levels.",
        ]}
      />
    </SectionPage>
  )
}
