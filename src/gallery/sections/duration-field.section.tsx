import { z } from "zod"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { DurationInput, durationSchema } from "../../ui/duration-field/index.js"
import { Field } from "../../ui/field/index.js"
import { Form, FormActions, FormStack, formBehaviour, useAppForm } from "../../ui/form/index.js"
import { Usage } from "./inputs.kit.js"
import { wait } from "./forms.fixtures.js"

function DurationDemo() {
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { response: 5400 as number | null, maintenance: 7200 as number | null, timeout: null as number | null },
    validators: {
      onDynamic: z.object({
        response: durationSchema({ required: true, min: 900, max: 604800 }),
        maintenance: durationSchema({ max: 86400 }),
        timeout: durationSchema({ min: 30, max: 3600 }),
      }),
    },
    onSubmit: () => wait(600),
  })
  return (
    <Form form={form} aria-label="Durations" className="w-full" data-testid="duration-form">
      <FormStack>
        <form.AppField name="response">{(field) => <field.DurationField label="Response target" />}</form.AppField>
        <form.AppField name="maintenance">{(field) => <field.DurationField label="Maintenance window" optional />}</form.AppField>
        <form.AppField name="timeout">{(field) => <field.DurationField label="Script timeout" optional units={["m", "s"]} defaultUnit="s" placeholder="90s" />}</form.AppField>
        <FormActions>
          <form.SubmitButton>Save</form.SubmitButton>
        </FormActions>
      </FormStack>
    </Form>
  )
}

export default function DurationFieldSection() {
  return (
    <SectionPage>
      <Specimen title="As people say it" description="1h 30m, 90 (minutes by default), 1:30, 1.5 hours, 2 days 4 hrs. Leave the field and it is written compactly; the hint spells it out so a bare number is never misread.">
        <DurationDemo />
      </Specimen>

      <Specimen title="States" layout="grid">
        <FormStack>
          <Field label="Empty">
            <DurationInput />
          </Field>
          <Field label="Unreadable" error="Enter a duration such as 1h 30m, 90m or 1:30">
            <DurationInput defaultValue={Number.NaN} invalid placeholder="soon" />
          </Field>
        </FormStack>
        <FormStack>
          <Field label="Read-only">
            <DurationInput defaultValue={5400} readOnly />
          </Field>
          <Field label="Disabled">
            <DurationInput defaultValue={5400} disabled />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Over glass and imagery" backdrop>
        <Field label="Response target">
          <DurationInput defaultValue={5400} />
        </Field>
      </Specimen>

      <ContainerLab>
        <div className="flex h-full items-center p-1">
          <DurationInput size="sm" defaultValue={187200} width="full" aria-label="Duration" />
        </div>
      </ContainerLab>

      <Usage
        code={`
import { durationSchema } from "../../ui/duration-field/index.js"

const schema = z.object({ response: durationSchema({ required: true, min: 900, max: 604800 }) })   // seconds

<form.AppField name="response">{(field) => <field.DurationField label="Response target" units={["d", "h", "m"]} />}</form.AppField>`}
      />

      <Rules do={["Store seconds.", "Choose the units the setting is thought of in (units, defaultUnit)."]} dont={["Ask for hours and minutes in two rows.", "Use a NumberField with a unit for durations people think of in mixed units."]} />

      <TokenTable tokens={[["--field-short", "Width"]]} />
    </SectionPage>
  )
}
