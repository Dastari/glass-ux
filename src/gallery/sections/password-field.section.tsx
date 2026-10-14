import { z } from "zod"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Field } from "../../ui/field/index.js"
import { Form, FormActions, FormStack, formBehaviour, useAppForm } from "../../ui/form/index.js"
import { currentPasswordSchema, PasswordInput, passwordSchema } from "../../ui/password-field/index.js"
import { Usage } from "./inputs.kit.js"
import { wait } from "./forms.fixtures.js"

const USER = ["Avery Quinn", "avery.quinn@orbit.example.com.au", "Orbit Workspace"]
const schema = z.object({ current: currentPasswordSchema(), next: passwordSchema({ userInputs: USER }) })

function ChangePasswordDemo() {
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { current: "", next: "" },
    validators: { onDynamic: schema },
    onSubmit: () => wait(700),
  })
  return (
    <Form form={form} aria-label="Change password" className="w-full" data-testid="password-form">
      <FormStack>
        <form.AppField name="current">{(field) => <field.PasswordField label="Current password" purpose="current" width="medium" />}</form.AppField>
        <form.AppField name="next">{(field) => <field.PasswordField label="New password" generate userInputs={USER} width="medium" />}</form.AppField>
        <FormActions>
          <form.CancelButton />
          <form.SubmitButton>Change password</form.SubmitButton>
        </FormActions>
      </FormStack>
    </Form>
  )
}

export default function PasswordFieldSection() {
  return (
    <SectionPage>
      <Specimen
        title="Reveal, Caps Lock and strength"
        description="The eye shows and hides the password (a tooltip names it; aria-pressed says which). With Caps Lock on, a note appears inside the box. New passwords get a strength bar along the box's lower edge; the words are in the message line."
      >
        <FormStack className="w-full" data-testid="password-demo">
          <Field label="Local admin password" hint="Too weak · Avoid common passwords and their variations">
            <PasswordInput defaultValue="Password1!" width="medium" />
          </Field>
          <Field label="Wi-Fi passphrase" hint="Good · Add another word or a few more characters">
            <PasswordInput defaultValue="Freycinet-Lodge-42" width="medium" />
          </Field>
          <Field label="Sign-in password">
            <PasswordInput purpose="current" defaultValue="correct horse battery staple" width="medium" />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Generate and copy" description="Generate draws from the browser's cryptographic random source, reveals the result and offers Copy. Safari reads the matching password rules.">
        <FormStack className="w-full">
          <Field label="Service account password">
            <PasswordInput generate={{ length: 24 }} width="medium" />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="In a form" description="currentPasswordSchema only requires a value; passwordSchema wants 12 characters and at least Fair, and penalises the person's own name and email.">
        <ChangePasswordDemo />
      </Specimen>

      <Specimen title="States" layout="grid">
        <FormStack>
          <Field label="Empty">
            <PasswordInput width="medium" />
          </Field>
          <Field label="Invalid" error="Use 12 characters or more">
            <PasswordInput defaultValue="short1!" invalid width="medium" />
          </Field>
        </FormStack>
        <FormStack>
          <Field label="Disabled">
            <PasswordInput defaultValue="x7#Qm9!vLp2@Rt8^Wk" disabled width="medium" />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Over glass and imagery" backdrop>
        <FormStack>
          <Field label="New password">
            <PasswordInput defaultValue="x7#Qm9!vLp2@Rt8^Wk" generate width="medium" />
          </Field>
        </FormStack>
      </Specimen>

      <ContainerLab>
        <div className="flex h-full items-center p-1">
          <PasswordInput size="sm" defaultValue="x7#Qm9!vLp2@Rt8^Wk" generate aria-label="Password" />
        </div>
      </ContainerLab>

      <Usage
        code={`
import { currentPasswordSchema, passwordSchema } from "../../ui/password-field/index.js"

const schema = z.object({
  current: currentPasswordSchema(),                                   // autocomplete="current-password"
  next: passwordSchema({ minLength: 12, minScore: 2, userInputs: [name, email] }),
})

<form.AppField name="current">{(field) => <field.PasswordField label="Current password" purpose="current" />}</form.AppField>
<form.AppField name="next">{(field) => <field.PasswordField label="New password" generate userInputs={[name, email]} />}</form.AppField>`}
      />

      <Rules
        do={[
          "Say purpose=\"current\" for sign-in and confirmation, so password managers fill it.",
          "Offer Generate for service accounts and shared credentials.",
          "Pass the person's name and email as userInputs.",
          "Enforce the real policy on the server too, with a breached-password check.",
        ]}
        dont={[
          "Log, store or send a password anywhere but the form's submission.",
          "Block paste into a password field.",
          "Show a strength bar when someone signs in.",
          "Put rules in the label; the message line explains what is missing.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--danger", "Too weak and weak"],
          ["--warning", "Fair"],
          ["--success", "Good and strong"],
          ["--warning-soft", "Caps Lock note"],
        ]}
      />
    </SectionPage>
  )
}
