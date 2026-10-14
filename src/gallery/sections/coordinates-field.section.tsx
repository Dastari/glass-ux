import { useState } from "react"
import { z } from "zod"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { DEMO_MAP_CONFIG } from "../fixtures/map.js"
import { CoordinatesInput, coordinatesSchema, formatDms, isReadable, type LatLng } from "../../ui/coordinates-field/index.js"
import { Field } from "../../ui/field/index.js"
import { Form, FormActions, FormStack, formBehaviour, useAppForm } from "../../ui/form/index.js"
import { Usage } from "./inputs.kit.js"
import { wait } from "./forms.fixtures.js"

const TASMANIA = [143.8, -43.7, 148.5, -39.5] as const

function PasteDemo() {
  const [value, setValue] = useState<LatLng | null>(null)
  return (
    <FormStack className="w-full" data-testid="coordinates-paste">
      <Field label="Site position" hint={isReadable(value) ? formatDms(value) : "Paste decimal degrees, DMS or a Google Maps link"}>
        <CoordinatesInput value={value} onValueChange={setValue} map={DEMO_MAP_CONFIG} mapFallback={TASMANIA} />
      </Field>
    </FormStack>
  )
}

function BoundDemo() {
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { position: { lat: -42.88334, lng: 147.32688 } as LatLng | null, antenna: null as LatLng | null },
    validators: { onDynamic: z.object({ position: coordinatesSchema({ required: true }), antenna: coordinatesSchema() }) },
    onSubmit: () => wait(600),
  })
  return (
    <Form form={form} aria-label="Positions" className="w-full" data-testid="coordinates-form">
      <FormStack>
        <form.AppField name="position">{(field) => <field.CoordinatesField label="Site position" map={DEMO_MAP_CONFIG} mapFallback={TASMANIA} />}</form.AppField>
        <form.AppField name="antenna">{(field) => <field.CoordinatesField label="Antenna" optional locate={false} />}</form.AppField>
        <FormActions>
          <form.SubmitButton>Save</form.SubmitButton>
        </FormActions>
      </FormStack>
    </Form>
  )
}

export default function CoordinatesFieldSection() {
  return (
    <SectionPage>
      <Specimen
        title="Paste anything"
        description="-42.88334, 147.32688 · 42°53′0″S 147°19′37″E · 42.88334S 147.32688E · a Google Maps, OpenStreetMap or Apple Maps link · geo:-42.88,147.33. Leave the field and it becomes decimal degrees; the hint shows DMS."
      >
        <PasteDemo />
      </Specimen>

      <Specimen title="Pick on map and use my location" description="The map pin opens a picker: click the map or drag the pin. The location button asks the browser for the device's position; a site whose location is blocked says how to allow it.">
        <BoundDemo />
      </Specimen>

      <Specimen title="States" layout="grid">
        <FormStack>
          <Field label="Empty">
            <CoordinatesInput />
          </Field>
          <Field label="Out of range" error="Latitude must be between -90 and 90">
            <CoordinatesInput defaultValue={{ lat: -95, lng: 147.3 }} invalid />
          </Field>
        </FormStack>
        <FormStack>
          <Field label="Read-only">
            <CoordinatesInput defaultValue={{ lat: -42.88334, lng: 147.32688 }} readOnly />
          </Field>
          <Field label="Disabled">
            <CoordinatesInput defaultValue={{ lat: -42.88334, lng: 147.32688 }} disabled />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Over glass and imagery" backdrop>
        <FormStack>
          <Field label="Site position">
            <CoordinatesInput defaultValue={{ lat: -42.88334, lng: 147.32688 }} map={DEMO_MAP_CONFIG} />
          </Field>
        </FormStack>
      </Specimen>

      <ContainerLab>
        <div className="flex h-full items-center p-1">
          <CoordinatesInput size="sm" defaultValue={{ lat: -42.88334, lng: 147.32688 }} aria-label="Coordinates" />
        </div>
      </ContainerLab>

      <Usage
        code={`
import { coordinatesSchema } from "../../ui/coordinates-field/index.js"

const schema = z.object({ position: coordinatesSchema({ required: true }) })   // { lat, lng } | null

<form.AppField name="position">
  {(field) => <field.CoordinatesField label="Site position" map={mapConfig} mapFallback={homeRegionBox} />}
</form.AppField>`}
      />

      <Rules
        do={["Accept whatever people paste; the field normalises it.", "Give the picker a fallback area (the home region).", "Keep five decimals: about a metre."]}
        dont={["Split latitude and longitude into two rows.", "Ask for location on page load; only when the button is pressed.", "Store DMS text; store numbers."]}
      />

      <TokenTable tokens={[["--accent", "The pin"], ["--radius-tile", "Map well"]]} />
    </SectionPage>
  )
}
