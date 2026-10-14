import { ContainerLab, Example, Matrix, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { PALETTES, PALETTE_LABELS, type Palette } from "../../lib/appearance/appearance.js"
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

      <Specimen title="Over glass and imagery" backdrop>
        <SwatchPicker options={PALETTE_OPTIONS} defaultValue="emerald" aria-label="Palette over imagery" />
      </Specimen>

      <ContainerLab>
        {(preset) =>
          preset?.id === "row" || preset?.id === "header" ? (
            <div className="flex h-full items-center px-2">
              <SwatchPicker size="sm" options={PALETTE_OPTIONS} defaultValue="sunset" aria-label="Palette" />
            </div>
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
        ]}
        dont={[
          "Use a select of colour names when the colours themselves are the choice.",
          "Pass a raw colour; pass a token or a palette id.",
          "Use it for a free colour choice; that needs a hue slider or a colour field.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--control-h-sm / --control-h-md", "Track height"],
          ["--glass-fill-inset", "Track well (same as the segmented control)"],
          ["--accent / --accent-2", "A palette swatch's gradient, read inside its palette island"],
          ["--accent-line", "The chosen ring, the page's accent"],
          ["--canvas", "The gap between swatch and ring"],
        ]}
      />
    </SectionPage>
  )
}
