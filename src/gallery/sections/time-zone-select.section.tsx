import { z } from "zod"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Field } from "../../ui/field/index.js"
import { Form, FormActions, FormStack, formBehaviour, useAppForm } from "../../ui/form/index.js"
import { TimeZoneSelect, timeZoneSchema } from "../../ui/time-zone-select/index.js"
import { Usage } from "./inputs.kit.js"
import { wait } from "./forms.fixtures.js"

function ZoneDemo() {
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { zone: "Australia/Hobart" as string | null, overnight: null as string | null },
    validators: { onDynamic: z.object({ zone: timeZoneSchema({ required: true }), overnight: timeZoneSchema() }) },
    onSubmit: () => wait(600),
  })
  return (
    <Form form={form} aria-label="Time zones" className="w-full" data-testid="tz-form">
      <FormStack>
        <form.AppField name="zone">{(field) => <field.TimeZoneField label="Business hours time zone" suggested={["Australia/Hobart", "Australia/Sydney", "Pacific/Auckland", "UTC"]} />}</form.AppField>
        <form.AppField name="overnight">{(field) => <field.TimeZoneField label="Overnight support" optional />}</form.AppField>
        <FormActions>
          <form.SubmitButton>Save</form.SubmitButton>
        </FormActions>
      </FormStack>
    </Form>
  )
}

export default function TimeZoneSelectSection() {
  return (
    <SectionPage>
      <Specimen title="By city, with the offset now" description="Type a city or region. Each row shows the abbreviation and offset today, so daylight saving is visible; the hint shows the time there now.">
        <ZoneDemo />
      </Specimen>

      <Specimen title="States" layout="grid">
        <FormStack>
          <Field label="Empty">
            <TimeZoneSelect width="medium" />
          </Field>
        </FormStack>
        <FormStack>
          <Field label="Disabled">
            <TimeZoneSelect width="medium" defaultValue="Australia/Hobart" disabled />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Over glass and imagery" backdrop>
        <Field label="Time zone">
          <TimeZoneSelect width="medium" defaultValue="Australia/Hobart" />
        </Field>
      </Specimen>

      <ContainerLab>
        <div className="flex h-full items-center p-1">
          <TimeZoneSelect size="sm" defaultValue="America/Argentina/Buenos_Aires" aria-label="Time zone" />
        </div>
      </ContainerLab>

      <Usage
        code={`
import { timeZoneSchema } from "../../ui/time-zone-select/index.js"

const schema = z.object({ zone: timeZoneSchema({ required: true }) })   // "Australia/Hobart"

<form.AppField name="zone">{(field) => <field.TimeZoneField label="Time zone" suggested={["Australia/Hobart", "UTC"]} />}</form.AppField>`}
      />

      <Rules do={["Store the IANA name, never an offset: offsets change with daylight saving.", "Suggest the zones the organisation actually uses."]} dont={["Show a fixed offset as the zone's name.", "Use a plain Select: there are over 400 zones."]} />

      <TokenTable tokens={[["--fg-subtle", "Offset"], ["--field-medium", "Width"]]} />
    </SectionPage>
  )
}
