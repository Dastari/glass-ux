import { z } from "zod"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Field } from "../../ui/field/index.js"
import { Form, FormActions, FormStack, formBehaviour, useAppForm } from "../../ui/form/index.js"
import { PercentInput, percentSchema } from "../../ui/percent-field/index.js"
import { Usage } from "./inputs.kit.js"
import { wait } from "./forms.fixtures.js"

function PercentDemo() {
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { disk: 90 as number | null, discount: 0.125 as number | null },
    validators: { onDynamic: z.object({ disk: percentSchema({ required: true, min: 50, max: 99 }), discount: percentSchema({ scale: "fraction", max: 0.5 }) }) },
    onSubmit: () => wait(600),
  })
  return (
    <Form form={form} aria-label="Percentages" className="w-full" data-testid="percent-form">
      <FormStack>
        <form.AppField name="disk">{(field) => <field.PercentField label="Disk alert threshold" min={50} max={99} />}</form.AppField>
        <form.AppField name="discount">{(field) => <field.PercentField label="Agreement discount" optional scale="fraction" max={0.5} decimals={1} />}</form.AppField>
        <FormActions>
          <form.SubmitButton>Save</form.SubmitButton>
        </FormActions>
      </FormStack>
    </Form>
  )
}

export default function PercentFieldSection() {
  return (
    <SectionPage>
      <Specimen title="Whole percents or fractions" description="A threshold is 90 (whole); a discount from an API may be 0.125 (fraction). Either way the box shows 90 % or 12.5 %, clamped to its bounds.">
        <PercentDemo />
      </Specimen>

      <Specimen title="States" layout="grid">
        <FormStack>
          <Field label="Empty">
            <PercentInput />
          </Field>
          <Field label="Invalid" error="Enter a percentage from 50 to 99">
            <PercentInput defaultValue={40} invalid />
          </Field>
        </FormStack>
        <FormStack>
          <Field label="Disabled">
            <PercentInput defaultValue={90} disabled />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Over glass and imagery" backdrop>
        <Field label="Threshold">
          <PercentInput defaultValue={90} />
        </Field>
      </Specimen>

      <ContainerLab>
        <div className="flex h-full items-center p-1">
          <PercentInput size="sm" defaultValue={90} width="full" aria-label="Threshold" />
        </div>
      </ContainerLab>

      <Usage
        code={`
import { percentSchema } from "../../ui/percent-field/index.js"

const schema = z.object({ disk: percentSchema({ required: true, min: 50, max: 99 }) })

<form.AppField name="disk">{(field) => <field.PercentField label="Disk alert threshold" min={50} max={99} />}</form.AppField>`}
      />

      <Rules do={["Say the bounds in the schema too, so the message names them.", "Use scale=\"fraction\" when the API stores 0–1."]} dont={["Put % in the label."]} />

      <TokenTable tokens={[["--field-short", "Width"]]} />
    </SectionPage>
  )
}
