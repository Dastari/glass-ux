import { useState } from "react"
import { z } from "zod"
import { CONTAINER_PRESETS, ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { DEMO_MAP_CONFIG } from "../fixtures/map.js"
import { AddressInput, AddressView, addressSchema, emptyAddress, type AddressValue } from "../../ui/address-field/index.js"
import { Field } from "../../ui/field/index.js"
import { Form, FormActions, FormGroup, FormStack, formBehaviour, useAppForm } from "../../ui/form/index.js"
import { demoGeocoder } from "../fixtures/geocoder.js"
import { HOME_BIAS, Usage } from "./inputs.kit.js"
import { wait } from "./forms.fixtures.js"

const AU = { code: "AU", name: "Australia" }

const HOBART_OFFICE: AddressValue = {
  line1: "12 Example Lane",
  line2: "Level 2",
  locality: "Hobart",
  region: { code: "AU-TAS", name: "Tasmania" },
  postcode: "7000",
  country: AU,
  location: { lat: -42.88334, lng: 147.32688 },
  pinned: false,
}

const SAMPLE_DEPOT: AddressValue = {
  line1: "24 Sample Avenue",
  line2: "",
  locality: "Mossbridge",
  region: { code: "AU-TAS", name: "Tasmania" },
  postcode: "7190",
  country: AU,
  location: { lat: -42.50843, lng: 147.91032 },
  pinned: true,
}

function LookupDemo() {
  const [value, setValue] = useState<AddressValue>(() => emptyAddress(AU))
  return (
    <FormStack className="w-full" data-testid="address-lookup">
      <AddressInput geocoder={demoGeocoder} label="Site address" value={value} onValueChange={setValue} bias={HOME_BIAS} countries={["AU", "NZ"]} map={DEMO_MAP_CONFIG} />
    </FormStack>
  )
}

const schema = z.object({ address: addressSchema({ required: true }), billing: addressSchema() })

function BoundDemo() {
  const [saved, setSaved] = useState({ address: { ...emptyAddress(AU) }, billing: { ...emptyAddress(AU) } })
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: saved,
    validators: { onDynamic: schema },
    onSubmit: async ({ value }) => {
      await wait(700)
      setSaved(value)
    },
  })
  return (
    <Form form={form} aria-label="Organisation address" className="w-full" data-testid="address-form">
      <FormStack>
        <FormGroup label="Address">
          <form.AppField name="address">{(field) => <field.AddressField geocoder={demoGeocoder} label="Street address" bias={HOME_BIAS} countries={["AU", "NZ"]} />}</form.AppField>
        </FormGroup>
        <FormGroup label="Billing address">
          <form.AppField name="billing">{(field) => <field.AddressField geocoder={demoGeocoder} label="Billing address" optional bias={HOME_BIAS} />}</form.AppField>
        </FormGroup>
        <FormActions>
          <form.CancelButton />
          <form.SubmitButton>Save addresses</form.SubmitButton>
        </FormActions>
      </FormStack>
    </Form>
  )
}

export default function AddressFieldSection() {
  return (
    <SectionPage>
      <Specimen
        title="Lookup"
        description="Type three characters and suggestions arrive from the geocoder, leaning towards the home region. Choosing one fills every field and drops the pin; the fields stay editable. Enter manually opens them without a lookup."
      >
        <LookupDemo />
      </Specimen>

      <Specimen title="Filled, with the pin" description="Drag the pin, click the map or focus the pin and use the arrow keys: the position becomes “placed by hand” and Reset pin returns to the lookup's point.">
        <FormStack className="w-full" data-testid="address-filled">
          <AddressInput geocoder={demoGeocoder} label="Site address" defaultValue={HOBART_OFFICE} bias={HOME_BIAS} map={DEMO_MAP_CONFIG} />
        </FormStack>
      </Specimen>

      <Specimen title="In a form" description="Each part is its own form field, so the schema's messages land on the row to fix and Save focuses the first one.">
        <BoundDemo />
      </Specimen>

      <Specimen title="States" description="Errors replace the hint in place; disabled keeps the layout." layout="grid">
        <FormStack>
          <AddressInput geocoder={demoGeocoder} label="Site address" defaultValue={{ ...SAMPLE_DEPOT, postcode: "719" }} errors={{ postcode: "Check the postcode, such as 7000", locality: undefined }} />
        </FormStack>
        <FormStack>
          <AddressInput geocoder={demoGeocoder} label="Site address" defaultValue={HOBART_OFFICE} disabled />
        </FormStack>
      </Specimen>

      <Specimen title="Read-only" description="AddressView: the postal block in a recessed well with Copy, and the map when the address has a position. Put it in a Field for its label." layout="grid">
        <FormStack>
          <Field label="Address" hint="Change it in the organisation's settings.">
            <AddressView value={HOBART_OFFICE} map={DEMO_MAP_CONFIG} />
          </Field>
        </FormStack>
        <FormStack>
          <Field label="Billing address">
            <AddressView value={{ ...emptyAddress(AU), line1: "PO Box 12", locality: "Mossbridge", region: { code: "AU-TAS", name: "Tasmania" }, postcode: "7190" }} />
          </Field>
          <Field label="Postal address">
            <AddressView value={emptyAddress(AU)} />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Over glass and imagery" backdrop>
        <FormStack>
          <AddressInput geocoder={demoGeocoder} label="Site address" defaultValue={HOBART_OFFICE} />
        </FormStack>
      </Specimen>

      <ContainerLab
        description="The editor is a form column: it fills its box to --form-measure, one row per part. The read-only view wraps nothing and truncates long lines."
        presets={CONTAINER_PRESETS.filter((preset) => preset.id !== "row" && preset.id !== "header")}
      >
        <div className="h-full overflow-y-auto p-3" data-scroll-container>
          <FormStack>
            <AddressView value={HOBART_OFFICE} />
            <AddressInput geocoder={demoGeocoder} label="Site address" defaultValue={SAMPLE_DEPOT} />
          </FormStack>
        </div>
      </ContainerLab>

      <Usage
        code={`
import { addressSchema } from "../../ui/address-field/index.js"

const schema = z.object({
  address: addressSchema({ required: true }),   // messages land on line1, locality, postcode, country
  billing: addressSchema(),                     // empty is fine
})

<form.AppField name="address">
  {(field) => (
    <field.AddressField
      label="Street address"
      bias={{ lat: -42.88, lng: 147.33, zoom: 7 }}   // the workspace's home region
      countries={["AU", "NZ"]}                      // suggest only these
      map={mapConfig}                               // optional pin map (MapLibre, lazy)
      // Supply your own GeocoderAdapter, or implement the default /api/geocode contract.
    />
  )}
</form.AppField>

// Read-only: <Field label="Address"><AddressView value={address} map={mapConfig} /></Field>`}
      />

      <Rules
        do={[
          "Bias the lookup to the workspace's home region and restrict it to the countries you serve.",
          "Keep the fields editable after a lookup: geocoders miss unit numbers and new streets.",
          "Show the map wherever the position matters (sites), and let people move the pin.",
          "Keep the lookup behind /api/geocode; self-host the geocoder (GEOCODER_URL) before a customer who must not send addresses to a third party.",
        ]}
        dont={[
          "Use Nominatim for search-as-you-type: its usage policy forbids it.",
          "Hide the geocoder's credit: OpenStreetMap's licence requires it.",
          "Split an address across two columns; every part is its own row.",
          "Overwrite a hand-placed pin when the same address is looked up again.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--gap-fields", "Row rhythm (the editor matches the form column)"],
          ["--form-measure", "The column it fills"],
          ["--radius-tile", "The map well"],
          ["--accent", "The pin"],
          ["--fg-subtle", "The geocoder's credit"],
        ]}
      />
    </SectionPage>
  )
}
