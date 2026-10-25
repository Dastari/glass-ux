import { useCallback, useState } from "react"
import { z } from "zod"
import { IconMapPin } from "../../icons/generated/icons.js"
import { Cascader, CascaderField, type CascaderOption } from "../../ui/cascader/index.js"
import { Field } from "../../ui/field/index.js"
import { Form, FormActions, FormStack, formBehaviour, useAppForm } from "../../ui/form/index.js"
import { ContainerLab, Rules, SectionPage, Specimen } from "../kit.js"
import { wait } from "./forms.fixtures.js"
import { LOCATIONS, NZ_REGIONS } from "./pickers.fixtures.js"

/** Locations whose New Zealand regions load when that country opens. */
function useLocations() {
  const [options, setOptions] = useState(LOCATIONS)
  const onLoadChildren = useCallback(async (option: CascaderOption) => {
    await wait(700)
    if (option.value === "nz") setOptions((current) => current.map((item) => (item.value === "nz" ? { ...item, children: NZ_REGIONS } : item)))
  }, [])
  return { options, onLoadChildren }
}

function SingleDemo() {
  const { options, onLoadChildren } = useLocations()
  const [value, setValue] = useState<string[] | null>(["au", "nsw", "parramatta"])
  return (
    <FormStack>
      <Field label="Delivery site" nativeLabel={false} hint={value ? `value: ${JSON.stringify(value)}` : undefined}>
        <Cascader options={options} onLoadChildren={onLoadChildren} value={value} onValueChange={setValue} icon={<IconMapPin />} placeholder="Choose a site" />
      </Field>
      <Field label="Service area" nativeLabel={false} hint="Any level can be chosen.">
        <Cascader options={options} onLoadChildren={onLoadChildren} changeOnSelect defaultValue={["au", "vic"]} placeholder="Choose a country, region or site" />
      </Field>
    </FormStack>
  )
}

function MultipleDemo() {
  const { options, onLoadChildren } = useLocations()
  const [value, setValue] = useState<string[][]>([["au", "nsw"], ["sg", "jurong"]])
  return (
    <FormStack>
      <Field label="Coverage" nativeLabel={false} hint={`value: ${JSON.stringify(value)}`}>
        <Cascader multiple options={options} onLoadChildren={onLoadChildren} value={value} onValueChange={setValue} placeholder="Choose regions or sites" />
      </Field>
    </FormStack>
  )
}

function FormDemo() {
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { site: null as string[] | null },
    validators: { onDynamic: z.object({ site: z.array(z.string()).nullable().refine((value) => value !== null, "Choose a delivery site") }) },
    onSubmit: () => wait(600),
  })
  return (
    <Form form={form} aria-label="Delivery" className="w-full">
      <FormStack>
        <form.AppField name="site">{() => <CascaderField label="Delivery site" options={LOCATIONS} placeholder="Choose a site" />}</form.AppField>
        <FormActions>
          <form.SubmitButton>Save</form.SubmitButton>
        </FormActions>
      </FormStack>
    </Form>
  )
}

export default function CascaderSection() {
  return (
    <SectionPage>
      <Specimen title="One path" description="Columns open to the right as you choose. The search lists matching full paths. New Zealand loads its regions on first open. The trigger drops middle levels when the path does not fit.">
        <SingleDemo />
      </Specimen>

      <Specimen title="Several paths" description="Checkboxes on every level: a checked region stands for its sites (parent strategy), and a partly checked one shows the mixed state.">
        <MultipleDemo />
      </Specimen>

      <Specimen title="Drill-down list" description='layout="list" is what phones get: one level at a time, with Back above it, in a popup as wide as the screen allows.'>
        <FormStack>
          <Field label="Delivery site" nativeLabel={false}>
            <Cascader layout="list" options={LOCATIONS} defaultValue={["au", "qld", "brisbane"]} placeholder="Choose a site" />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="In a form" description="CascaderField binds to string[] | null, or string[][] with multiple.">
        <FormDemo />
      </Specimen>

      <Specimen title="States" layout="grid">
        <FormStack>
          <Field label="Invalid" nativeLabel={false} error="Choose a delivery site">
            <Cascader options={LOCATIONS} placeholder="Choose a site" />
          </Field>
        </FormStack>
        <FormStack>
          <Field label="Read-only" nativeLabel={false}>
            <Cascader options={LOCATIONS} defaultValue={["sg", "changi"]} readOnly />
          </Field>
        </FormStack>
        <FormStack>
          <Field label="Disabled" nativeLabel={false} disabled>
            <Cascader options={LOCATIONS} defaultValue={["au", "tas", "launceston"]} disabled />
          </Field>
        </FormStack>
      </Specimen>

      <ContainerLab>
        <div className="flex h-full items-center p-1">
          <Cascader size="sm" options={LOCATIONS} defaultValue={["au", "nsw", "wollongong"]} aria-label="Delivery site" />
        </div>
      </ContainerLab>

      <Rules
        do={[
          "Use a Cascader for three or more levels where each level is a short list.",
          "Store the full path: equal values on different branches stay distinct.",
          "Use changeOnSelect only when a partial path is a meaningful answer.",
        ]}
        dont={["Use a Cascader for levels of hundreds of options; use a searchable TreeSelect or Combobox.", "Hide the search when people know the last level's name."]}
      />
    </SectionPage>
  )
}
