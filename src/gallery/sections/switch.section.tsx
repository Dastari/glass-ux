import { useState } from "react"
import { ContainerLab, Matrix, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import type { ChoiceSize, ChoiceTone } from "../../ui/field/index.js"
import { FormStack } from "../../ui/form/index.js"
import { SettingRow, SettingRowSkeleton } from "../../ui/setting-row/index.js"
import { Switch } from "../../ui/switch/index.js"

const SIZES: ChoiceSize[] = ["sm", "md", "lg"]
const TONES: ChoiceTone[] = ["accent", "success", "warning", "danger"]

function SettingRows() {
  const [updates, setUpdates] = useState(true)
  const [verbose, setVerbose] = useState(false)
  return (
    <FormStack>
      <SettingRow
        label="Keep agent up to date"
        description="Download and install agent releases as they ship."
        control={<Switch checked={updates} onCheckedChange={setUpdates} />}
      />
      <SettingRow
        label="Verbose logging"
        description="Collects detailed logs for troubleshooting. Uses more disk on NST-C106."
        control={<Switch checked={verbose} onCheckedChange={setVerbose} />}
      />
    </FormStack>
  )
}

export default function SwitchSection() {
  return (
    <SectionPage>
      <Specimen title="Sizes and states" description="Every switch is live. Press and hold: the bead stretches toward where it is going." wide>
        <Matrix
          columns={["Off", "On", "Icons, off", "Icons, on", "Invalid", "Disabled", "Disabled, on"]}
          rows={SIZES.map((size) => ({
            label: size,
            cells: [
              <Switch key="a" size={size} aria-label="Off" />,
              <Switch key="b" size={size} defaultChecked aria-label="On" />,
              <Switch key="c" size={size} icons aria-label="Icons off" />,
              <Switch key="d" size={size} icons defaultChecked aria-label="Icons on" />,
              <Switch key="e" size={size} invalid aria-label="Invalid" />,
              <Switch key="f" size={size} disabled aria-label="Disabled" />,
              <Switch key="g" size={size} disabled defaultChecked aria-label="Disabled on" />,
            ],
          }))}
        />
      </Specimen>

      <Specimen title="Tones" description="Accent by default. A status tone only when the setting is itself a status — “Maintenance mode” in warning, “Quarantine” in danger.">
        <Matrix
          columns={["sm", "md", "lg + icons"]}
          rows={TONES.map((tone) => ({
            label: tone,
            cells: [
              <Switch key="a" size="sm" tone={tone} defaultChecked aria-label={`${tone} small`} />,
              <Switch key="b" tone={tone} defaultChecked aria-label={`${tone} medium`} />,
              <Switch key="c" size="lg" tone={tone} icons defaultChecked aria-label={`${tone} large`} />,
            ],
          }))}
        />
      </Specimen>

      <Specimen title="In setting rows" description="Booleans are switches in setting rows: what it controls and what turning it on does on the left, the switch on the right (R15.4). See Setting row for saving in place.">
        <SettingRows />
      </Specimen>

      <Specimen title="With its own label" description="For a switch outside a form, such as a toolbar or a list filter." layout="stack">
        <Switch label="Show offline endpoints" defaultChecked />
        <Switch label="Maintenance mode" description="Pauses alerts for LMN-4E5E until you turn it off." tone="warning" />
        <Switch label="Quarantine" description="Blocks every connection except Glass UX." tone="danger" size="lg" icons />
        <Switch label="Share screen recordings" disabled />
      </Specimen>

      <Specimen title="Over glass and imagery" backdrop>
        <Switch defaultChecked aria-label="On" />
        <Switch aria-label="Off" />
        <Switch size="lg" icons defaultChecked aria-label="On with icons" />
        <Switch size="lg" icons aria-label="Off with icons" />
      </Specimen>

      <Specimen title="Loading" description="A switch row's skeleton has the switch's exact box and the label and description lines.">
        <FormStack>
          <SettingRowSkeleton labelWidth="45%" />
          <SettingRowSkeleton labelWidth="35%" />
        </FormStack>
      </Specimen>

      <ContainerLab>
        {(preset) =>
          preset?.id === "row" || preset?.id === "header" ? (
            <div className="flex h-full items-center gap-3 px-3">
              <Switch size="sm" label="Live updates" defaultChecked />
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-3" data-scroll-container>
              <SettingRows />
            </div>
          )
        }
      </ContainerLab>

      <Rules
        do={[
          "Use a switch for a setting that takes effect immediately.",
          "Label the setting, not the state: “Verbose logging”, never “On”.",
          "Say what turning it on does in the description when it is not obvious.",
          "Confirm in place: an optimistic toggle that rolls back with a toast on failure.",
        ]}
        dont={[
          "Use a switch inside a form that needs Save — use a checkbox.",
          "Use a lone checkbox for a setting, or a switch beside a stacked field.",
          "Use a status tone for decoration.",
          "Show “On / Off” text beside it; the track already says so.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--switch-w", "Track width, md"],
          ["--switch-h", "Track height, md"],
          ["--glass-fill-inset", "Off well"],
          ["--accent", "On fill (start)"],
          ["--accent-2", "On fill (end)"],
          ["--accent-glow", "Glow when on"],
          ["--sheen-solid", "Highlight on the fill"],
          ["--ease-spring", "Bead travel and squash"],
          ["--duration-slow", "Bead travel"],
          ["--target-min", "Touch hit area"],
        ]}
      />
    </SectionPage>
  )
}
