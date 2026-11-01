import { useState } from "react"
import { gradientToCss, GradientPicker, type GradientValue } from "../../ui/gradient-picker/index.js"
import { Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Usage } from "./inputs.kit.js"

/** Fictional sample gradients (tokens:allow sample data). */
const SUNRISE: GradientValue = {
  kind: "linear",
  angle: 90,
  stops: [
    { color: "#1f3a8a", position: 0 }, // tokens:allow sample stop
    { color: "#e8710a", position: 55 }, // tokens:allow sample stop
    { color: "#fde68a", position: 100 }, // tokens:allow sample stop
  ],
}
const GLOW: GradientValue = {
  kind: "radial",
  angle: 0,
  stops: [
    { color: "#ffffff", position: 0 }, // tokens:allow sample stop
    { color: "#1f6feb00", position: 100 }, // tokens:allow sample stop
  ],
}
const WHEEL: GradientValue = {
  kind: "angular",
  angle: 30,
  interpolation: "oklab",
  stops: [
    { color: "#0000ff", position: 0 }, // tokens:allow sample stop
    { color: "#ffff00", position: 50 }, // tokens:allow sample stop
    { color: "#0000ff", position: 100 }, // tokens:allow sample stop
  ],
}
const PRESETS = [
  { value: "#1f6feb", label: "Harbour blue" }, // tokens:allow sample preset
  { value: "#0f9d58", label: "Fern" }, // tokens:allow sample preset
  { value: "#e8710a", label: "Kiln orange" }, // tokens:allow sample preset
]

function Picker() {
  const [value, setValue] = useState(SUNRISE)
  return (
    <div className="grid max-w-md gap-3" data-testid="gradient-picker">
      <GradientPicker value={value} onValueChange={setValue} swatches={PRESETS} aria-label="Banner gradient" />
      <code className="type-caption text-fg-muted break-all" data-testid="gradient-css">
        {gradientToCss(value)}
      </code>
    </div>
  )
}

export default function GradientPickerSection() {
  return (
    <SectionPage>
      <Specimen title="Picker" description="Drag a stop or press the rail to add one; Add stop and the Position field do the same without a drag. With a stop focused, the arrow keys move it and Delete removes it." layout="stack">
        <Picker />
      </Specimen>

      <Specimen title="Radial, with opacity" layout="stack">
        <div className="grid max-w-md gap-3">
          <GradientPicker defaultValue={GLOW} alpha aria-label="Glow" />
        </div>
      </Specimen>

      <Specimen
        title="Angular, blended in OKLab"
        description="With interpolation set to oklab, the blend is written as extra sRGB stops, each inside the gamut, so blue to yellow passes through no grey and the CSS shows the same colours on every display."
        layout="stack"
      >
        <div className="grid max-w-md gap-3">
          <GradientPicker defaultValue={WHEEL} kinds={["angular", "linear"]} aria-label="Wheel" />
        </div>
      </Specimen>

      <Specimen title="Disabled" layout="stack">
        <div className="grid max-w-md gap-3">
          <GradientPicker defaultValue={SUNRISE} disabled aria-label="Locked gradient" />
        </div>
      </Specimen>

      <Usage
        code={`
import { GradientPicker, gradientToCss } from "glass-ux/gradient-picker"

<GradientPicker value={gradient} onValueChange={setGradient} />

<div style={{ backgroundImage: gradientToCss(gradient) }} />`}
      />

      <Rules
        do={["Store the GradientValue and render with gradientToCss, on a server too.", "Offer only the kinds an application can show, with kinds."]}
        dont={["Parse the CSS string back into stops.", "Rely on a wide-gamut screen: stops are hex, so every colour is sRGB."]}
      />

      <TokenTable
        tokens={[
          ["--radius-tile", "Preview corners"],
          ["--line", "Preview and rail edge"],
          ["--accent-ring", "The chosen stop"],
        ]}
      />
    </SectionPage>
  )
}
