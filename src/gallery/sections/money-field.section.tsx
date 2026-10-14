import { z } from "zod"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Field } from "../../ui/field/index.js"
import { Form, FormActions, FormStack, formBehaviour, useAppForm } from "../../ui/form/index.js"
import { formatMoney, MoneyInput, moneySchema } from "../../ui/money-field/index.js"
import { Usage } from "./inputs.kit.js"
import { wait } from "./forms.fixtures.js"

function MoneyDemo() {
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { rate: 16500 as number | null, monthly: 129900 as number | null, credit: null as number | null },
    validators: { onDynamic: z.object({ rate: moneySchema({ required: true, max: 100000 }), monthly: moneySchema({ required: true }), credit: moneySchema({ allowNegative: true }) }) },
    onSubmit: () => wait(600),
  })
  return (
    <Form form={form} aria-label="Billing" className="w-full" data-testid="money-form">
      <FormStack>
        <form.AppField name="rate">{(field) => <field.MoneyField label="Hourly rate" hint="Excluding GST" />}</form.AppField>
        <form.AppField name="monthly">{(field) => <field.MoneyField label="Monthly agreement" />}</form.AppField>
        <form.AppField name="credit">{(field) => <field.MoneyField label="Adjustment" optional allowNegative />}</form.AppField>
        <form.Subscribe selector={(state) => state.values.rate}>
          {(rate) => (
            <p className="fa-hint" data-testid="money-minor">
              Stored: {rate ?? "null"} cents ({rate === null ? "—" : formatMoney(rate)})
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

export default function MoneyFieldSection() {
  return (
    <SectionPage>
      <Specimen title="Integer cents, the locale's format" description="Type 165 or $1,234.5: the field shows $1,234.50 when focus leaves and stores 123450. Other currencies use their own minor digits (JPY has none).">
        <MoneyDemo />
      </Specimen>

      <Specimen title="Currencies and states" layout="grid">
        <FormStack>
          <Field label="NZD, with its code">
            <MoneyInput currency="NZD" showCode defaultValue={99000} width="medium" />
          </Field>
          <Field label="Yen">
            <MoneyInput currency="JPY" showCode defaultValue={1500} width="medium" />
          </Field>
        </FormStack>
        <FormStack>
          <Field label="Invalid" error="Enter an amount up to $1,000.00">
            <MoneyInput defaultValue={250000} invalid width="medium" />
          </Field>
          <Field label="Disabled">
            <MoneyInput defaultValue={16500} disabled width="medium" />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Over glass and imagery" backdrop>
        <Field label="Hourly rate">
          <MoneyInput defaultValue={16500} width="medium" />
        </Field>
      </Specimen>

      <ContainerLab>
        <div className="flex h-full items-center p-1">
          <MoneyInput size="sm" defaultValue={123456789} aria-label="Amount" />
        </div>
      </ContainerLab>

      <Usage
        code={`
import { moneySchema } from "../../ui/money-field/index.js"

const schema = z.object({ rate: moneySchema({ required: true, max: 100000 }) })   // cents: 16500 = $165.00

<form.AppField name="rate">{(field) => <field.MoneyField label="Hourly rate" currency="AUD" />}</form.AppField>`}
      />

      <Rules do={["Store integer minor units.", "Show the code (showCode) when a screen mixes currencies."]} dont={["Store dollars as floats.", "Allow negatives unless the amount is an adjustment."]} />

      <TokenTable tokens={[["--field-medium", "Width"]]} />
    </SectionPage>
  )
}
