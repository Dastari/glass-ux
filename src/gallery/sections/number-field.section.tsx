import { ContainerLab, Example, Matrix, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Field } from "../../ui/field/index.js"
import { FormStack } from "../../ui/form/index.js"
import { NumberField, type NumberFieldSize } from "../../ui/number-field/index.js"

const SIZES: NumberFieldSize[] = ["sm", "md", "lg"]

export default function NumberFieldSection() {
  return (
    <SectionPage>
      <Specimen title="Sizes and states" description="↑ ↓ step, Shift steps by 10, Home and End jump to the bounds. Values clamp on blur." wide>
        <Matrix
          columns={["Empty", "Value", "Read-only", "Invalid", "Disabled"]}
          rows={SIZES.map((size) => ({
            label: size,
            cells: [
              <NumberField key="a" size={size} placeholder="30" unit="days" aria-label={`Retention ${size}`} className="w-48" />,
              <NumberField key="b" size={size} defaultValue={90} min={1} max={100} unit="%" aria-label={`Threshold ${size}`} className="w-48" />,
              <NumberField key="c" size={size} defaultValue={3389} readOnly aria-label={`Port ${size}`} className="w-48" />,
              <NumberField key="d" size={size} defaultValue={0} invalid unit="min" aria-label={`Timeout ${size}`} className="w-48" />,
              <NumberField key="e" size={size} defaultValue={5} disabled unit="retries" aria-label={`Retries ${size}`} className="w-48" />,
            ],
          }))}
        />
      </Specimen>

      <Specimen title="In a form" description="Numbers are short values: give them width=&quot;short&quot; unless the unit or grouping needs more.">
        <FormStack>
          <Field label="Disk alert threshold" hint="Alert when a volume passes this.">
            <NumberField defaultValue={90} min={50} max={99} unit="%" width="short" />
          </Field>
          <Field label="Session timeout">
            <NumberField defaultValue={15} min={1} max={480} step={5} largeStep={60} unit="min" width="short" />
          </Field>
          <Field label="Bandwidth cap" optional>
            <NumberField defaultValue={2500} min={0} step={100} format={{ useGrouping: true }} unit="kbps" width="medium" />
          </Field>
          <Field label="Retry attempts" error="Between 1 and 10">
            <NumberField defaultValue={0} invalid min={0} max={20} width="short" />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Scrub label" description="Drag the prefix sideways to change the value — for dense numeric inputs such as a resolution.">
        <Example label="Remote resolution">
          <NumberField scrubLabel="W" defaultValue={1920} min={640} max={7680} step={2} aria-label="Width" className="w-44" />
          <NumberField scrubLabel="H" defaultValue={1080} min={480} max={4320} step={2} aria-label="Height" className="w-44" />
        </Example>
        <Example label="Without steppers">
          <NumberField steppers={false} defaultValue={443} min={1} max={65535} aria-label="Port" className="w-28" />
        </Example>
      </Specimen>

      <Specimen title="Over glass and imagery" backdrop>
        <NumberField defaultValue={90} unit="%" aria-label="Threshold over imagery" className="w-48" />
        <NumberField scrubLabel="W" defaultValue={1920} aria-label="Width over imagery" className="w-44" />
      </Specimen>

      <ContainerLab>
        {(preset) =>
          preset?.id === "row" || preset?.id === "header" ? (
            <div className="flex h-full items-center gap-2 px-1">
              <NumberField size="sm" scrubLabel="W" defaultValue={1920} aria-label="Width" />
              <NumberField size="sm" scrubLabel="H" defaultValue={1080} aria-label="Height" />
            </div>
          ) : (
            <div className="h-full overflow-y-auto" data-scroll-container>
              <FormStack className="p-3">
                <Field label="Disk alert threshold">
                  <NumberField defaultValue={90} unit="%" />
                </Field>
                <Field label="Bandwidth cap">
                  <NumberField defaultValue={250000} format={{ useGrouping: true }} unit="kbps" />
                </Field>
              </FormStack>
            </div>
          )
        }
      </ContainerLab>

      <Rules
        do={[
          "Set min, max and step; the field clamps and steps for you.",
          "Put the unit in the unit slot, never in the label.",
          "Use a scrub label only where people adjust by feel.",
          "Format large numbers with grouping (2,500 kbps).",
        ]}
        dont={[
          "Use a NumberField for identifiers such as phone or postcode — use Input.",
          "Hide the steppers when the range is small and stepping is common.",
          "Accept out-of-range values silently; say the bounds in the error.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--control-h-md", "Box height"],
          ["--control-h-sm", "Stepper button (md box)"],
          ["--fg-subtle", "Unit and scrub label"],
          ["--accent-text", "Scrub label while dragging"],
        ]}
      />
    </SectionPage>
  )
}
