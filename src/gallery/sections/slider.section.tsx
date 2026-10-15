import { useState } from "react"
import { ContainerLab, Matrix, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Field, type ChoiceSize, type ChoiceTone } from "../../ui/field/index.js"
import { Slider } from "../../ui/slider/index.js"
import { Tabs } from "../../ui/tabs/index.js"

const SIZES: ChoiceSize[] = ["sm", "md", "lg"]
const TONES: ChoiceTone[] = ["accent", "success", "warning", "danger"]

const hour = (value: number) => `${value % 12 === 0 ? 12 : value % 12}:00 ${value < 12 || value === 24 ? "am" : "pm"}`

function RetainedSlider() {
  const [value, setValue] = useState(40)
  return (
    <Tabs.Root defaultValue="summary">
      <Tabs.List aria-label="Retained slider views" items={[{ value: "summary", label: "Summary" }, { value: "controls", label: "Controls" }]} />
      <Tabs.Panel value="summary"><p>The controls stay mounted while this summary is shown. Open Controls to adjust the retained volume.</p></Tabs.Panel>
      <Tabs.Panel value="controls" keepMounted>
        <Field label="Retained volume" nativeLabel={false} aside={`${value}%`}>
          <Slider value={value} onValueChange={(next) => setValue(next as number)} aria-label="Retained volume" unit="%" />
        </Field>
      </Tabs.Panel>
    </Tabs.Root>
  )
}

function BandwidthField() {
  const [value, setValue] = useState(40)
  return (
    <Field label="Bandwidth limit" nativeLabel={false} aside={`${value} Mbps`} hint="Applies to file transfer and remote control.">
      <Slider value={value} onValueChange={(next) => setValue(next as number)} min={5} max={100} step={5} unit="Mbps" />
    </Field>
  )
}

function WindowField() {
  const [value, setValue] = useState<number[]>([1, 5])
  return (
    <Field label="Maintenance window" nativeLabel={false} aside={`${hour(value[0] ?? 0)} – ${hour(value[1] ?? 0)}`}>
      <Slider
        value={value}
        onValueChange={(next) => setValue(next as number[])}
        min={0}
        max={12}
        format={hour}
        thumbLabels={["Window starts", "Window ends"]}
        marks={[{ value: 0, label: "12 am" }, { value: 3 }, { value: 6, label: "6 am" }, { value: 9 }, { value: 12, label: "12 pm" }]}
      />
    </Field>
  )
}

export default function SliderSection() {
  return (
    <SectionPage>
      <Specimen title="Sizes" description="Drag, click the track, or focus a bead and use the arrow keys — keyboard and track steps glide; dragging follows the pointer." wide>
        <Matrix
          columns={["Value", "Range", "Bubble pinned", "Disabled"]}
          rows={SIZES.map((size) => ({
            label: size,
            cells: [
              <div key="a" className="w-56 pt-8">
                <Slider size={size} defaultValue={64} aria-label={`Volume ${size}`} unit="%" />
              </div>,
              <div key="b" className="w-56 pt-8">
                <Slider size={size} defaultValue={[20, 70]} thumbLabels={["Minimum", "Maximum"]} unit="%" />
              </div>,
              <div key="c" className="w-56 pt-8">
                <Slider size={size} defaultValue={40} bubble="always" unit="Mbps" aria-label={`Bandwidth ${size}`} />
              </div>,
              <div key="d" className="w-56 pt-8">
                <Slider size={size} defaultValue={30} disabled aria-label={`Disabled ${size}`} />
              </div>,
            ],
          }))}
        />
      </Specimen>

      <Specimen title="Tones" description="A status tone when the value is a threshold: warn above 80 % disk, alert above 90 %.">
        <Matrix
          columns={["Value", "Range"]}
          rows={TONES.map((tone) => ({
            label: tone,
            cells: [
              <div key="a" className="w-48">
                <Slider tone={tone} defaultValue={72} unit="%" aria-label={`${tone} value`} />
              </div>,
              <div key="b" className="w-48">
                <Slider tone={tone} defaultValue={[30, 80]} unit="%" />
              </div>,
            ],
          }))}
        />
      </Specimen>

      <Specimen title="In a field" description="The label row carries the live value on the right, so the bubble is only needed while dragging." layout="stack">
        <BandwidthField />
        <WindowField />
        <Field label="Screen quality" nativeLabel={false}>
          <Slider
            defaultValue={2}
            min={1}
            max={3}
            format={(value) => ["Speed", "Balanced", "Quality"][value - 1] ?? ""}
            marks={[{ value: 1, label: "Speed" }, { value: 2, label: "Balanced" }, { value: 3, label: "Quality" }]}
          />
        </Field>
      </Specimen>

      <Specimen title="Over glass and imagery" backdrop>
        <div className="w-72 pt-8">
          <Slider defaultValue={55} bubble="always" unit="%" aria-label="Opacity" />
        </div>
        <div className="w-72 pt-8">
          <Slider size="lg" defaultValue={[25, 75]} thumbLabels={["From", "To"]} />
        </div>
      </Specimen>

      <Specimen title="Initially hidden controls" description="Retained tabs and dialogs can mount a slider before it has a measurable size. It measures when revealed, follows container resizing and keeps its value when hidden again." layout="bare">
        <RetainedSlider />
      </Specimen>

      <ContainerLab>
        {(preset) =>
          preset?.id === "row" ? (
            <div className="flex h-full items-center gap-3 px-3">
              <span className="type-label shrink-0 text-fg-muted">Zoom</span>
              <Slider size="sm" defaultValue={100} min={25} max={200} step={25} unit="%" aria-label="Zoom" />
            </div>
          ) : preset?.id === "header" ? (
            <div className="flex h-full items-center px-3">
              <Slider defaultValue={[20, 80]} thumbLabels={["From", "To"]} />
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-3">
              <BandwidthField />
              <WindowField />
            </div>
          )
        }
      </ContainerLab>

      <Rules
        do={[
          "Use a slider when the exact number matters less than the feel (quality, zoom, volume).",
          "Show the value in the label row (Field aside) when it matters.",
          "Name each thumb of a range (“Window starts”, “Window ends”).",
          "Use a NumberField instead when people will type a precise value.",
        ]}
        dont={[
          "Use a slider for more than about 200 steps without a number field beside it.",
          "Colour the range with a status tone for decoration.",
          "Put labels on every tick — ends and one middle mark are enough.",
          "Hide the only readout inside the bubble.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--glass-fill-inset", "Track well"],
          ["--accent", "Range (start)"],
          ["--accent-2", "Range (end)"],
          ["--accent-glow", "Range glow"],
          ["--glass-fill-overlay", "Value bubble"],
          ["--shadow-3", "Value bubble lift"],
          ["--check-size", "Bead size base"],
          ["--duration-base", "Glide between steps"],
          ["--ease-spring", "Bead growth, bubble"],
        ]}
      />
    </SectionPage>
  )
}
