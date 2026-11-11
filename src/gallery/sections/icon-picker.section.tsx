import { useState } from "react"
import { z } from "zod"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Field } from "../../ui/field/index.js"
import { Form, FormActions, FormStack, formBehaviour, useAppForm } from "../../ui/form/index.js"
import { IconField, IconInput, IconPicker, iconCatalogue } from "../../ui/icon-picker/index.js"
import { Usage } from "./inputs.kit.js"
import { wait } from "./forms.fixtures.js"

/** Asset types an application files its equipment under: each keeps its icon's name. */
function AssetTypeDemo() {
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { name: "Ground power units", icon: "ground-power" as string | null },
    validators: { onDynamic: z.object({ name: z.string().min(1), icon: z.string().nullable() }) },
    onSubmit: () => wait(600),
  })
  return (
    <Form form={form} aria-label="Asset type" className="w-full" data-testid="icon-form">
      <FormStack>
        <form.AppField name="name">{(field) => <field.TextField label="Name" />}</form.AppField>
        <form.AppField name="icon">{() => <IconField label="Icon" clearable />}</form.AppField>
        <form.Subscribe selector={(state) => state.values.icon}>
          {(icon) => (
            <p className="fa-hint" data-testid="icon-value">
              Stored: {icon ?? "null"}
            </p>
          )}
        </form.Subscribe>
        <FormActions>
          <form.SubmitButton>Save</form.SubmitButton>
        </FormActions>
      </FormStack>
    </Form>
  )
}

const EQUIPMENT = iconCatalogue.filter((entry) => entry.group === "aviation" || entry.group === "vehicles" || entry.group === "tools")

function PanelDemo() {
  const [picked, setPicked] = useState<string | null>("crane")
  return (
    <div className="flex w-full max-w-sm flex-col gap-2" data-testid="icon-picker-panel">
      <IconPicker value={picked} onValueChange={setPicked} icons={EQUIPMENT} aria-label="Equipment icon" />
      <p className="fa-hint">Picked: {picked}</p>
    </div>
  )
}

export default function IconPickerSection() {
  return (
    <SectionPage>
      <Specimen title="In a form" description="IconField holds the chosen icon's name, or null. The search also finds an icon by the words people use for it: try GPU, truck or stairs.">
        <AssetTypeDemo />
      </Specimen>

      <Specimen title="A set of your own" description="icons takes any list of catalogue entries: here the aviation, vehicle and tool icons only. The grid is one tab stop; arrow keys move through it.">
        <PanelDemo />
      </Specimen>

      <Specimen title="States" layout="grid">
        <FormStack>
          <Field label="Empty">
            <IconInput />
          </Field>
          <Field label="Chosen">
            <IconInput defaultValue="forklift" />
          </Field>
        </FormStack>
        <FormStack>
          <Field label="Invalid" error="Choose an icon">
            <IconInput invalid />
          </Field>
          <Field label="Disabled">
            <IconInput defaultValue="warehouse" disabled />
          </Field>
        </FormStack>
      </Specimen>

      <ContainerLab>
        <div className="flex h-full items-start p-1">
          <IconInput defaultValue="airplane" width="full" aria-label="Icon" />
        </div>
      </ContainerLab>

      <Usage
        code={`
import { IconField, iconCatalogue } from "glass-ux/icon-picker"

<form.AppField name="icon">{() => <IconField label="Icon" clearable />}</form.AppField>

// Where the item is shown, draw its stored name:
const Icon = iconCatalogue.find((entry) => entry.name === type.icon)?.Icon`}
      />

      <Rules
        do={["Store the icon's name, and draw it from the catalogue (or a map of the few you offer).", "Offer a set of your own with icons when only some icons suit the choice."]}
        dont={["Import iconCatalogue where you only draw a few known icons: it brings in the whole set."]}
      />

      <TokenTable tokens={[["--field-medium", "Width"], ["--control-h-sm", "Icon cell"]]} />
    </SectionPage>
  )
}
