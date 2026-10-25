import { useState } from "react"
import { ColorField, ColorPicker, contrast, parseHex } from "../../ui/color-picker/index.js"
import { Field } from "../../ui/field/index.js"
import { Rules, SectionPage, Specimen } from "../kit.js"

/** Fictional brand presets for the demos (tokens:allow sample data). */
const PRESETS = [
  { value: "#1f6feb", label: "Harbour blue" }, // tokens:allow sample preset
  { value: "#0f9d58", label: "Fern" }, // tokens:allow sample preset
  { value: "#e8710a", label: "Kiln orange" }, // tokens:allow sample preset
  { value: "#d93025", label: "Signal red" }, // tokens:allow sample preset
  { value: "#9334e6", label: "Dusk violet" }, // tokens:allow sample preset
  { value: "#5f6368", label: "Slate grey" }, // tokens:allow sample preset
]
const WHITE = parseHex("#ffffff")! // tokens:allow contrast reference

export default function ColorPickerSection() {
  const [colour, setColour] = useState("#e8710a") // tokens:allow sample value
  const [tag, setTag] = useState<string | null>("#1f6feb") // tokens:allow sample value
  const [overlay, setOverlay] = useState("#1f6febb3") // tokens:allow sample value
  const parsed = parseHex(colour)
  const ratio = parsed ? contrast(parsed, WHITE) : 0
  return (
    <SectionPage>
      <Specimen
        title="Picker"
        description="Lightness runs up the area and chroma across it, at the hue below. Colours a screen cannot show are faint; choosing one takes the nearest that can be shown."
        layout="stack"
      >
        <div className="grid max-w-md gap-3">
          <ColorPicker value={colour} onValueChange={setColour} swatches={PRESETS} aria-label="Brand colour" />
          <p className="type-caption text-fg-muted" data-numeric>
            {colour} · white text on it {ratio.toFixed(2)}:1 {ratio >= 4.5 ? "(AA)" : "(below AA)"}
          </p>
        </div>
      </Specimen>

      <Specimen title="Field" description="The hex value is typed in place; the swatch opens the picker. Clearable fields can hold no colour." layout="stack">
        <div className="grid max-w-md gap-4">
          <Field label="Tag colour" description="Shown on the tag's chip.">
            <ColorField value={tag} onValueChange={setTag} clearable swatches={PRESETS} />
          </Field>
          <Field label="Overlay colour" description="With opacity, stored as #rrggbbaa.">
            <ColorField value={overlay} onValueChange={(next) => next && setOverlay(next)} alpha />
          </Field>
          <Field label="Locked colour">
            <ColorField defaultValue="#5f6368" disabled /> {/* tokens:allow sample value */}
          </Field>
        </div>
      </Specimen>

      <Rules
        do={[
          "Use the picker where any colour is a valid answer: a tag, a chart series, a brand accent.",
          "Offer the organisation's own colours as swatches, named.",
          "Check contrast where text will sit on the colour, and say so beside the field.",
        ]}
        dont={[
          "Don't use it for a choice from a few named colours; that is a SwatchPicker.",
          "Don't store anything but the hex value; formats for display are derived from it.",
        ]}
      />
    </SectionPage>
  )
}
