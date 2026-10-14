import { useState } from "react"
import { z } from "zod"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Field } from "../../ui/field/index.js"
import { Form, FormActions, FormStack, formBehaviour, useAppForm } from "../../ui/form/index.js"
import { mobileSchema, phoneSchema, PhoneInput } from "../../ui/phone-field/index.js"
import { Usage } from "./inputs.kit.js"
import { wait } from "./forms.fixtures.js"

const schema = z.object({ mobile: mobileSchema({ required: true }), office: phoneSchema(), afterHours: phoneSchema() })

function ContactDemo() {
  const [saved, setSaved] = useState({ mobile: "", office: "+61362345678;ext=204", afterHours: "" })
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
    <Form form={form} aria-label="Contact methods" className="w-full" data-testid="phone-form">
      <FormStack>
        <form.AppField name="mobile">{(field) => <field.MobileField label="Mobile" />}</form.AppField>
        <form.AppField name="office">{(field) => <field.PhoneField label="Office" extension />}</form.AppField>
        <form.AppField name="afterHours">{(field) => <field.PhoneField label="After hours" optional display="international" />}</form.AppField>
        <FormActions>
          <form.CancelButton />
          <form.SubmitButton>Save contact</form.SubmitButton>
        </FormActions>
      </FormStack>
      <form.Subscribe selector={(state) => state.values}>
        {(values) => (
          <output className="sr-only" data-testid="phone-values">
            {JSON.stringify(values)}
          </output>
        )}
      </form.Subscribe>
    </Form>
  )
}

function PasteDemo() {
  const [value, setValue] = useState("")
  return (
    <FormStack className="w-full" data-testid="phone-paste">
      <Field label="Mobile" hint={value ? `Stored as ${value}` : "Paste +64 21 123 4567: the country switches to New Zealand."}>
        <PhoneInput kind="mobile" value={value} onValueChange={setValue} />
      </Field>
    </FormStack>
  )
}

export default function PhoneFieldSection() {
  return (
    <SectionPage>
      <Specimen
        title="Country and number"
        description="The picker shows the flag, the ISO code and the calling code; search it by name, code or +61. National numbers are read in that country. The number is tidied when focus leaves, never under the caret."
      >
        <FormStack className="w-full">
          <Field label="Mobile">
            <PhoneInput kind="mobile" defaultValue="+61412345678" />
          </Field>
          <Field label="Reception" hint="Desk phones can carry an extension.">
            <PhoneInput defaultValue="+61362345678;ext=204" extension />
          </Field>
          <Field label="Blenheim office" hint="A number from another country shows its own country.">
            <PhoneInput defaultValue="+6435784000" />
          </Field>
          <Field label="Support line" hint="International display.">
            <PhoneInput defaultValue="+611300555123" display="international" />
          </Field>
          <Field label="Without flags">
            <PhoneInput defaultValue="+61412345678" flags={false} />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Paste switches the country" description="A pasted international number (+64…, 0011 64…, 00 44…) sets the country and is shown in its national form.">
        <PasteDemo />
      </Specimen>

      <Specimen title="In a form" description="PhoneField and MobileField store E.164 (“+61412345678”, “+61362345678;ext=204”). mobileSchema refuses landlines; both check the number is valid for its country.">
        <ContactDemo />
      </Specimen>

      <Specimen title="States" layout="grid">
        <FormStack>
          <Field label="Empty">
            <PhoneInput />
          </Field>
          <Field label="Invalid" error="Check the phone number: it isn't a valid number for AU">
            <PhoneInput defaultValue="+614123" invalid />
          </Field>
        </FormStack>
        <FormStack>
          <Field label="Read-only">
            <PhoneInput defaultValue="+61362345678" readOnly />
          </Field>
          <Field label="Disabled">
            <PhoneInput defaultValue="+61362345678" disabled />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Over glass and imagery" backdrop>
        <FormStack>
          <Field label="Mobile">
            <PhoneInput kind="mobile" defaultValue="+61412345678" />
          </Field>
        </FormStack>
      </Specimen>

      <ContainerLab>
        {(preset) =>
          preset?.id === "row" || preset?.id === "header" ? (
            <div className="flex h-full items-center px-1">
              <PhoneInput size="sm" width="full" defaultValue="+61412345678" aria-label="Mobile" />
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-3" data-scroll-container>
              <FormStack>
                <Field label="Reception">
                  <PhoneInput defaultValue="+61362345678;ext=204" extension />
                </Field>
              </FormStack>
            </div>
          )
        }
      </ContainerLab>

      <Usage
        code={`
import { mobileSchema, phoneSchema } from "../../ui/phone-field/index.js"

const schema = z.object({
  mobile: mobileSchema({ required: true }),   // "Enter a mobile number, not a landline"
  office: phoneSchema(),                      // optional; "+61362345678;ext=204"
})

<form.AppField name="mobile">{(field) => <field.MobileField label="Mobile" />}</form.AppField>
<form.AppField name="office">{(field) => <field.PhoneField label="Office" extension />}</form.AppField>

// defaultCountry (default "AU") reads national numbers; display="international" shows +61 4…`}
      />

      <Rules
        do={[
          "Store E.164 and let the field show it national or international.",
          "Use MobileField where only a mobile works (SMS, MFA); it refuses landlines.",
          "Set defaultCountry to the workspace's country.",
          "Offer the extension only for desk phones.",
        ]}
        dont={[
          "Use emoji flags: Windows draws them as two letters.",
          "Reformat the number while someone types in it.",
          "Put the country and the number in two separate rows.",
          "Use a NumberField for phone numbers.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--field-medium", "Default width"],
          ["--fill-hover", "Country picker hover"],
          ["--fg-muted", "Calling code"],
          ["--line", "Extension divider"],
        ]}
      />
    </SectionPage>
  )
}
