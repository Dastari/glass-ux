import { z } from "zod"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { CountryFlag, CountrySelect, countrySchema } from "../../ui/country-select/index.js"
import { Field } from "../../ui/field/index.js"
import { Form, FormActions, FormStack, formBehaviour, useAppForm } from "../../ui/form/index.js"
import { Usage } from "./inputs.kit.js"
import { wait } from "./forms.fixtures.js"

function CountryDemo() {
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { country: "AU" as string | null, tax: null as string | null },
    validators: { onDynamic: z.object({ country: countrySchema({ required: true }), tax: countrySchema() }) },
    onSubmit: () => wait(600),
  })
  return (
    <Form form={form} aria-label="Countries" className="w-full" data-testid="country-form">
      <FormStack>
        <form.AppField name="country">{(field) => <field.CountryField label="Country" />}</form.AppField>
        <form.AppField name="tax">{(field) => <field.CountryField label="Tax residency" optional />}</form.AppField>
        <FormActions>
          <form.SubmitButton>Save</form.SubmitButton>
        </FormActions>
      </FormStack>
    </Form>
  )
}

export default function CountrySelectSection() {
  return (
    <SectionPage>
      <Specimen title="By name, with the flag" description="Every ISO 3166-1 country, named by the browser in the locale, the workspace's own first. Flags are SVG (Windows has no flag emoji) and load once, lazily, in a reserved box.">
        <CountryDemo />
      </Specimen>

      <Specimen title="Flags" description="3:2, the height of a small icon, with a hairline so white flags read on white.">
        <span className="flex flex-wrap items-center gap-2">
          {["AU", "NZ", "GB", "US", "CA", "JP", "SG", "FJ", "PG", "IE", "IN", "PH"].map((code) => (
            <CountryFlag key={code} code={code} />
          ))}
        </span>
      </Specimen>

      <Specimen title="States" layout="grid">
        <FormStack>
          <Field label="Empty">
            <CountrySelect width="medium" />
          </Field>
          <Field label="Restricted" hint="Only the countries served.">
            <CountrySelect width="medium" countries={["AU", "NZ", "FJ", "PG"]} defaultValue="NZ" />
          </Field>
        </FormStack>
        <FormStack>
          <Field label="Read-only">
            <CountrySelect width="medium" defaultValue="AU" readOnly />
          </Field>
          <Field label="Disabled">
            <CountrySelect width="medium" defaultValue="AU" disabled />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Over glass and imagery" backdrop>
        <Field label="Country">
          <CountrySelect width="medium" defaultValue="AU" />
        </Field>
      </Specimen>

      <ContainerLab>
        <div className="flex h-full items-center p-1">
          <CountrySelect size="sm" defaultValue="AU" aria-label="Country" />
        </div>
      </ContainerLab>

      <Usage
        code={`
import { countrySchema } from "../../ui/country-select/index.js"

const schema = z.object({ country: countrySchema({ required: true }) })   // "AU"

<form.AppField name="country">{(field) => <field.CountryField label="Country" priority={["AU", "NZ"]} />}</form.AppField>`}
      />

      <Rules do={["Put the workspace's country first with priority.", "Restrict the list when only a few countries are possible."]} dont={["Use emoji flags.", "Store the country's name; store the code."]} />

      <TokenTable tokens={[["--icon-sm", "Flag height"], ["--line", "Flag hairline"], ["--fill-muted", "Flag loading tile"]]} />
    </SectionPage>
  )
}
