import { useState } from "react"
import { z } from "zod"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { EmailInput, EmailSuggestion, emailSchema, suggestEmail } from "../../ui/email-field/index.js"
import { Field } from "../../ui/field/index.js"
import { Form, FormActions, FormStack, formBehaviour, useAppForm } from "../../ui/form/index.js"
import { Usage } from "./inputs.kit.js"
import { wait } from "./forms.fixtures.js"

const schema = z.object({ work: emailSchema({ required: true }), personal: emailSchema() })

function EmailDemo() {
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { work: "mira.rowan@northstar.tas.gov.ua", personal: "avery@gmial.com" },
    validators: { onDynamic: schema },
    onSubmit: () => wait(600),
  })
  return (
    <Form form={form} aria-label="Email addresses" className="w-full" data-testid="email-form">
      <FormStack>
        <form.AppField name="work">{(field) => <field.EmailField label="Work email" knownDomains={["northstar.example"]} />}</form.AppField>
        <form.AppField name="personal">{(field) => <field.EmailField label="Personal email" optional />}</form.AppField>
        <FormActions>
          <form.SubmitButton>Save</form.SubmitButton>
        </FormActions>
      </FormStack>
    </Form>
  )
}

function SuggestionDemo() {
  const [value, setValue] = useState("avery@hotmial.com")
  const suggestion = suggestEmail(value)
  return (
    <Field label="Email" hint={suggestion ? <EmailSuggestion suggestion={suggestion} onAccept={setValue} /> : undefined}>
      <EmailInput value={value} onValueChange={setValue} />
    </Field>
  )
}

export default function EmailFieldSection() {
  return (
    <SectionPage>
      <Specimen title="Typo hint" description="Once focus leaves, a domain one or two keystrokes from a common provider — or from the organisation's own domain — offers the correction in the message line. Choosing it replaces the value; nothing moves.">
        <FormStack className="w-full">
          <SuggestionDemo />
        </FormStack>
      </Specimen>

      <Specimen title="In a form" description="Leave each field to see its hint. The domain is lower-cased and mailto: dropped on blur.">
        <EmailDemo />
      </Specimen>

      <Specimen title="States" layout="grid">
        <FormStack>
          <Field label="Empty">
            <EmailInput />
          </Field>
          <Field label="Invalid" error="Enter an email such as name@example.com.au">
            <EmailInput defaultValue="mira@" invalid />
          </Field>
        </FormStack>
        <FormStack>
          <Field label="Read-only">
            <EmailInput defaultValue="avery.quinn@orbit.example.com.au" readOnly />
          </Field>
          <Field label="Disabled">
            <EmailInput defaultValue="avery.quinn@orbit.example.com.au" disabled />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Over glass and imagery" backdrop>
        <FormStack>
          <Field label="Work email">
            <EmailInput defaultValue="mira.rowan@northstar.example" />
          </Field>
        </FormStack>
      </Specimen>

      <ContainerLab>
        <div className="flex h-full items-center p-1">
          <EmailInput size="sm" defaultValue="mira.rowan@northstar.example" aria-label="Email" />
        </div>
      </ContainerLab>

      <Usage
        code={`
import { emailSchema } from "../../ui/email-field/index.js"

const schema = z.object({ work: emailSchema({ required: true }), personal: emailSchema() })

<form.AppField name="work">
  {(field) => <field.EmailField label="Work email" knownDomains={[organisation.emailDomain]} />}
</form.AppField>`}
      />

      <Rules
        do={["Pass the organisation's own domain as knownDomains, so its typos are caught too.", "Keep the local part's case; mail systems may treat it as significant.", "Use type email so phones show the @ keyboard."]}
        dont={["Block a domain the hint does not know: hints are suggestions, never errors.", "Validate with a full RFC 5322 grammar; it accepts addresses no mail system takes.", "Show the hint while someone is still typing."]}
      />

      <TokenTable
        tokens={[
          ["--accent-text", "The suggestion"],
          ["--type-caption-size", "Message line"],
        ]}
      />
    </SectionPage>
  )
}
