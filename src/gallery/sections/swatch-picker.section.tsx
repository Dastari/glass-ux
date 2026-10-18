import { ContainerLab, Example, Matrix, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { PALETTES, PALETTE_LABELS, type Palette } from "../../lib/appearance/appearance.js"
import { Segmented, type SegmentedOption } from "../../ui/segmented/index.js"
import { SettingRow } from "../../ui/setting-row/index.js"
import { SwatchPicker, type SwatchOption } from "../../ui/swatch-picker/index.js"

const PALETTE_OPTIONS: Array<SwatchOption<Palette>> = PALETTES.map((palette) => ({ value: palette, label: PALETTE_LABELS[palette] ?? palette, palette }))
const TINTS: SwatchOption[] = [
  { value: "1", label: "Tint 1", colour: "var(--identity-1)" },
  { value: "2", label: "Tint 2", colour: "var(--identity-2)" },
  { value: "3", label: "Tint 3", colour: "var(--identity-3)" },
  { value: "4", label: "Tint 4", colour: "var(--identity-4)" },
  { value: "5", label: "Tint 5", colour: "var(--identity-5)" },
  { value: "6", label: "Tint 6", colour: "var(--identity-6)" },
]
const RANGES: SegmentedOption[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
]
const DENSITIES: SegmentedOption[] = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
]
/** Boxes for the collapse step: every swatch, then the menu. */
const LADDER = [
  { width: "w-90", label: "360 px" },
  { width: "w-30", label: "120 px" },
]

/** A toolbar whose controls give way in order (fa-fit-row): the palette first, then the range, then the density. */
function FitToolbar({ label }: { label: string }) {
  return (
    <div className="fa-fit-row h-full px-2" role="group" aria-label={label}>
      <SwatchPicker size="sm" className="fa-fit-1" options={PALETTE_OPTIONS} defaultValue="sunset" aria-label="Palette" />
      <Segmented size="sm" className="fa-fit-2" options={RANGES} defaultValue="week" aria-label="Range" />
      <Segmented size="sm" className="fa-fit-3" options={DENSITIES} defaultValue="comfortable" aria-label="Density" />
    </div>
  )
}

export default function SwatchPickerSection() {
  return (
    <SectionPage>
      <Specimen title="Variants" description="Palettes paint their own accent gradient (each swatch is a palette island, right in both modes). Colours take a token. Hover or focus a swatch for its name.">
        <Example label="Palettes">
          <SwatchPicker options={PALETTE_OPTIONS} defaultValue="ocean" aria-label="Palette" />
        </Example>
        <Example label="Colour tokens">
          <SwatchPicker options={TINTS} defaultValue="3" aria-label="Tint" />
        </Example>
      </Specimen>

      <Specimen title="Sizes" description="sm 32 for toolbars (the design site's palette chooser) · md 40 beside fields and segmented controls.">
        <Matrix
          columns={["Palettes"]}
          rows={(["sm", "md"] as const).map((size) => ({
            label: size,
            cells: [<SwatchPicker key="a" size={size} options={PALETTE_OPTIONS} defaultValue="orbit" aria-label={`Palette ${size}`} />],
          }))}
        />
      </Specimen>

      <Specimen title="States" layout="stack">
        <Example label="In a setting row (the row's label names it)">
          <div className="w-full max-w-xl">
            <SettingRow label="Palette" description="Ocean" control={<SwatchPicker options={PALETTE_OPTIONS} defaultValue="ocean" />} />
          </div>
        </Example>
        <Example label="Nothing chosen (a custom colour is in use)">
          <SwatchPicker options={PALETTE_OPTIONS} value={null} aria-label="Palette, custom accent" />
        </Example>
        <Example label="Disabled">
          <SwatchPicker options={PALETTE_OPTIONS} defaultValue="aurora" disabled aria-label="Palette (disabled)" />
        </Example>
        <Example label="One option disabled">
          <SwatchPicker options={TINTS.map((tint) => (tint.value === "5" ? { ...tint, disabled: true } : tint))} defaultValue="1" aria-label="Tint, one disabled" />
        </Example>
      </Specimen>

      <Specimen
        title="Full → menu"
        description="Measured against its box (R7), like the segmented control: every swatch while they fit, else one button showing the chosen swatch. Its menu lists the swatches with their names and a check on the chosen one. The button keeps its width whatever the value; the value and the group's name are the same in both forms."
        layout="stack"
        wide
      >
        {LADDER.map((step) => (
          <Example key={step.label} label={`${step.label} · md, then sm`}>
            <div className="flex flex-col gap-3">
              <div className={step.width}>
                <SwatchPicker options={PALETTE_OPTIONS} defaultValue="ocean" aria-label={`Palette (${step.label})`} />
              </div>
              <div className={step.width}>
                <SwatchPicker size="sm" options={TINTS} defaultValue="4" aria-label={`Tint (${step.label})`} />
              </div>
            </div>
          </Example>
        ))}
        <Example label={'Forced by the host (collapse="menu")'}>
          <SwatchPicker collapse="menu" options={PALETTE_OPTIONS} defaultValue="emerald" aria-label="Palette (menu)" />
        </Example>
        <Example label={'collapse="none": wraps instead'}>
          <div className="w-30">
            <SwatchPicker collapse="none" options={TINTS} defaultValue="2" aria-label="Tint (wraps)" />
          </div>
        </Example>
      </Specimen>

      <Specimen
        title="In a toolbar"
        description="A fa-fit-row gives its controls a share of one line and squeezes them in order, fa-fit-1 first: the palette folds to its menu, then the range, then the density. Drag the frame's corner."
        layout="bare"
        wide
      >
        <div className="gallery-lab-frame" data-resizable="" style={{ width: 640, height: 56 }}>
          <FitToolbar label="Toolbar" />
        </div>
      </Specimen>

      <Specimen title="Over glass and imagery" backdrop>
        <SwatchPicker options={PALETTE_OPTIONS} defaultValue="emerald" aria-label="Palette over imagery" />
      </Specimen>

      <ContainerLab description="In the row, the header and the free frame the palette shares a toolbar (fa-fit-row) and folds to its menu first; in the pane the swatches fit, and in the narrow column they fold. Drag the free frame to watch the order.">
        {(preset) =>
          preset === null || preset.id === "row" || preset.id === "header" ? (
            <FitToolbar label={`Toolbar (${preset?.label ?? "free frame"})`} />
          ) : (
            <div className="flex flex-col gap-3 p-3">
              <SwatchPicker options={PALETTE_OPTIONS} defaultValue="sunset" aria-label="Palette" />
              <SwatchPicker options={TINTS} defaultValue="2" aria-label="Tint" />
            </div>
          )
        }
      </ContainerLab>

      <Rules
        do={[
          "Use it for up to about eight colours whose names matter less than how they look: palettes, an organisation's tint.",
          "Name every swatch; the name is its tooltip and its accessible name.",
          "In a setting row, show the chosen colour's name as the row's description when people need to say it out loud.",
          "In a toolbar, put it in a fa-fit-row with fa-fit-1, so it folds to its menu before controls whose labels matter more.",
        ]}
        dont={[
          "Use a select of colour names when the colours themselves are the choice.",
          "Pass a raw colour; pass a token or a palette id.",
          "Use it for a free colour choice; that needs a hue slider or a colour field.",
          'Let a toolbar overflow or wrap; let the picker fold to its menu (collapse="none" only where wrapping is wanted, as in a sheet).',
        ]}
      />

      <TokenTable
        tokens={[
          ["--control-h-sm / --control-h-md", "Track height"],
          ["--glass-fill-inset", "Track well (same as the segmented control)"],
          ["--accent / --accent-2", "A palette swatch's gradient, read inside its palette island"],
          ["--accent-line", "The chosen ring, the page's accent"],
          ["--canvas", "The gap between swatch and ring"],
          ["--glass-fill-control-hover", "The menu button, lit like other controls"],
          ["--target-min", "The menu button's touch target"],
        ]}
      />
    </SectionPage>
  )
}
