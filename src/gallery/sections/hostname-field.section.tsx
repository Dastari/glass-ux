import { z } from "zod"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Field } from "../../ui/field/index.js"
import { Form, FormActions, FormStack, formBehaviour, useAppForm } from "../../ui/form/index.js"
import { DomainInput, domainSchema, HostnameInput, hostnameSchema } from "../../ui/hostname-field/index.js"
import { Usage } from "./inputs.kit.js"
import { wait } from "./forms.fixtures.js"

function HostDemo() {
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { computer: "NST-RECEPTION-FRONT", printer: "printer.northstar.local", domain: "https://northstar.example/about", cert: "*.northstar.example" },
    validators: {
      onDynamic: z.object({ computer: hostnameSchema({ required: true }), printer: hostnameSchema({ fqdn: true }), domain: domainSchema({ required: true }), cert: domainSchema({ wildcard: true }) }),
    },
    onSubmit: () => wait(600),
  })
  return (
    <Form form={form} aria-label="Names" className="w-full" data-testid="hostname-form">
      <FormStack>
        <form.AppField name="computer">{(field) => <field.HostnameField label="Computer name" netbios width="medium" />}</form.AppField>
        <form.AppField name="printer">{(field) => <field.HostnameField label="Printer" fqdn optional width="medium" />}</form.AppField>
        <form.AppField name="domain">{(field) => <field.DomainField label="Email domain" width="medium" />}</form.AppField>
        <form.AppField name="cert">{(field) => <field.DomainField label="Certificate name" wildcard optional width="medium" />}</form.AppField>
        <FormActions>
          <form.SubmitButton>Save</form.SubmitButton>
        </FormActions>
      </FormStack>
    </Form>
  )
}

export default function HostnameFieldSection() {
  return (
    <SectionPage>
      <Specimen
        title="Host names and domains"
        description="Each label is letters, digits and hyphens, never starting or ending with one. A pasted URL gives its host; domains are lower-cased and Unicode becomes punycode. Computer names past 15 characters warn about NetBIOS."
      >
        <HostDemo />
      </Specimen>

      <Specimen title="States" layout="grid">
        <FormStack>
          <Field label="Empty">
            <HostnameInput width="medium" />
          </Field>
          <Field label="Invalid" error="A part can't start or end with a hyphen">
            <HostnameInput defaultValue="-nst-c106" invalid width="medium" />
          </Field>
        </FormStack>
        <FormStack>
          <Field label="Read-only">
            <DomainInput defaultValue="northstar.example" readOnly width="medium" />
          </Field>
          <Field label="Disabled">
            <DomainInput defaultValue="northstar.example" disabled width="medium" />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Over glass and imagery" backdrop>
        <FormStack>
          <Field label="Computer name">
            <HostnameInput defaultValue="NST-C106" width="medium" />
          </Field>
        </FormStack>
      </Specimen>

      <ContainerLab>
        <div className="flex h-full items-center p-1">
          <HostnameInput size="sm" defaultValue="printer.northstar.northstar.local" aria-label="Host" />
        </div>
      </ContainerLab>

      <Usage
        code={`
import { domainSchema, hostnameSchema } from "../../ui/hostname-field/index.js"

const schema = z.object({
  computer: hostnameSchema({ required: true }),
  domain: domainSchema({ required: true }),          // "Enter a full domain such as northstar.example"
})

<form.AppField name="computer">{(field) => <field.HostnameField label="Computer name" netbios />}</form.AppField>
<form.AppField name="domain">{(field) => <field.DomainField label="Email domain" />}</form.AppField>`}
      />

      <Rules
        do={["Use DomainField for anything DNS resolves publicly; HostnameField for machines.", "Keep a computer name's case; Windows shows it as set.", "Allow a wildcard only where certificates are meant."]}
        dont={["Accept underscores in host names.", "Store a URL where a host is meant; the field takes the host out.", "Lower-case computer names behind the user's back."]}
      />

      <TokenTable tokens={[["--field-medium", "Width"]]} />
    </SectionPage>
  )
}
