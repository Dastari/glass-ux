import { useState } from "react"
import { z } from "zod"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Field } from "../../ui/field/index.js"
import { Form, FormStack, formBehaviour, useAppForm } from "../../ui/form/index.js"
import { OtpInput, otpSchema, type OtpStatus } from "../../ui/otp-field/index.js"
import { Usage } from "./inputs.kit.js"
import { wait } from "./forms.fixtures.js"

/** The code the demo accepts. */
const GOOD = "482913"

function VerifyDemo() {
  const [status, setStatus] = useState<OtpStatus | undefined>()
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { code: "" },
    validators: { onDynamic: z.object({ code: otpSchema() }) },
    onSubmit: async ({ value }) => {
      await wait(500)
      if (value.code !== GOOD) {
        setStatus("error")
        throw new Error("That code is not right")
      }
      setStatus("success")
    },
  })
  return (
    <Form form={form} aria-label="Verify" className="w-full" data-testid="otp-form">
      <FormStack>
        <form.AppField name="code" listeners={{ onChange: () => setStatus(undefined) }}>
          {(field) => (
            <field.OtpField
              label="Verification code"
              hint={status === "error" ? "That code is not right. Check the app and try again." : `Enter the code from your authenticator (try ${GOOD}).`}
              autoSubmit
              status={status}
            />
          )}
        </form.AppField>
        <div>
          <form.SubmitButton>Verify</form.SubmitButton>
        </div>
      </FormStack>
    </Form>
  )
}

export default function OtpFieldSection() {
  const [code, setCode] = useState("")
  return (
    <SectionPage>
      <Specimen
        title="Entry and paste"
        description="Type, or paste anything with the code in it (“Your code is 482913”, “482 913”, “G-482913”): every box fills. Backspace steps back, the arrows move, and phones offer the code from a message (autocomplete one-time-code)."
      >
        <FormStack className="w-full" data-testid="otp-demo">
          <Field label="Verification code" hint={code.length === 6 ? `Complete: ${code}` : "Six digits"}>
            <OtpInput value={code} onValueChange={setCode} />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Submit on complete" description="With autoSubmit the last digit submits the form; the boxes show the outcome in place.">
        <VerifyDemo />
      </Specimen>

      <Specimen title="States" description="Error and success change the boxes, never the layout: the ✓ has its slot already." layout="grid">
        <FormStack>
          <Field label="Error" error="That code is not right">
            <OtpInput defaultValue="481239" status="error" />
          </Field>
          <Field label="Success">
            <OtpInput defaultValue={GOOD} status="success" />
          </Field>
        </FormStack>
        <FormStack>
          <Field label="Disabled">
            <OtpInput defaultValue="48" disabled />
          </Field>
          <Field label="Recovery code" hint="Eight letters and digits, in two groups.">
            <OtpInput length={8} characters="alphanumeric" size="md" />
          </Field>
          <Field label="PIN" hint="Masked, four digits.">
            <OtpInput length={4} mask size="md" groups={[4]} />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Over glass and imagery" backdrop>
        <Field label="Verification code">
          <OtpInput defaultValue="4829" />
        </Field>
      </Specimen>

      <ContainerLab>
        <div className="flex h-full items-center p-1">
          <Field label="Code">
            <OtpInput size="md" defaultValue="482913" />
          </Field>
        </div>
      </ContainerLab>

      <Usage
        code={`
import { otpSchema } from "../../ui/otp-field/index.js"

const schema = z.object({ code: otpSchema() })   // "Enter the 6-digit code"

<form.AppField name="code">
  {(field) => <field.OtpField label="Verification code" autoSubmit status={refused ? "error" : undefined} />}
</form.AppField>`}
      />

      <Rules
        do={["Use autoSubmit for step-up codes so the last digit verifies.", "Clear the error status as soon as the code changes.", "Use groups that match how the code is shown elsewhere."]}
        dont={["Clear the boxes when a code is refused; let people fix one digit.", "Use separate fields per digit in a form.", "Disable paste."]}
      />

      <TokenTable
        tokens={[
          ["--control-h-lg", "Box side"],
          ["--success-soft", "Accepted boxes"],
          ["--danger-line", "Refused boxes"],
        ]}
      />
    </SectionPage>
  )
}
