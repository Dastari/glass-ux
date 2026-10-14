import { z } from "zod"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Field } from "../../ui/field/index.js"
import { Form, FormActions, FormStack, formBehaviour, useAppForm } from "../../ui/form/index.js"
import { IpInput, ipSchema } from "../../ui/ip-field/index.js"
import { Usage } from "./inputs.kit.js"
import { wait } from "./forms.fixtures.js"

function NetworkDemo() {
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { gateway: "010.013.004.001", subnet: "10.13.4.0/22", dns: "2001:0DB8:0000:0000:0000:0000:0000:0001" },
    validators: { onDynamic: z.object({ gateway: ipSchema({ version: 4, required: true }), subnet: ipSchema({ version: 4, cidr: "required", required: true }), dns: ipSchema() }) },
    onSubmit: () => wait(600),
  })
  return (
    <Form form={form} aria-label="Network" className="w-full" data-testid="ip-form">
      <FormStack>
        <form.AppField name="gateway">{(field) => <field.IpField label="Gateway" version={4} width="medium" />}</form.AppField>
        <form.AppField name="subnet">{(field) => <field.IpField label="Subnet" version={4} cidr="required" width="medium" />}</form.AppField>
        <form.AppField name="dns">{(field) => <field.IpField label="DNS server" optional width="medium" />}</form.AppField>
        <FormActions>
          <form.SubmitButton>Save network</form.SubmitButton>
        </FormActions>
      </FormStack>
    </Form>
  )
}

export default function IpFieldSection() {
  return (
    <SectionPage>
      <Specimen
        title="Normalised on blur"
        description="Leave a field: 010.013.004.001 becomes 10.13.4.1 and IPv6 is compressed per RFC 5952. The hint says what the address or range is; Copy appears once it is valid."
      >
        <NetworkDemo />
      </Specimen>

      <Specimen title="States" layout="grid">
        <FormStack>
          <Field label="Empty">
            <IpInput width="medium" />
          </Field>
          <Field label="Invalid" error="Enter an IPv4 address such as 192.168.1.10">
            <IpInput defaultValue="10.13.4.256" invalid width="medium" />
          </Field>
        </FormStack>
        <FormStack>
          <Field label="Read-only">
            <IpInput defaultValue="203.0.113.24" readOnly width="medium" />
          </Field>
          <Field label="Disabled">
            <IpInput defaultValue="10.13.4.1" disabled width="medium" />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Over glass and imagery" backdrop>
        <FormStack>
          <Field label="Gateway">
            <IpInput defaultValue="10.13.4.1" width="medium" />
          </Field>
        </FormStack>
      </Specimen>

      <ContainerLab>
        <div className="flex h-full items-center p-1">
          <IpInput size="sm" defaultValue="2001:db8:85a3::8a2e:370:7334" aria-label="Address" />
        </div>
      </ContainerLab>

      <Usage
        code={`
import { ipSchema } from "../../ui/ip-field/index.js"

const schema = z.object({
  gateway: ipSchema({ version: 4, required: true }),
  subnet: ipSchema({ version: 4, cidr: "required" }),   // "Add a prefix length, such as /24"
})

<form.AppField name="subnet">{(field) => <field.IpField label="Subnet" version={4} cidr="required" width="medium" />}</form.AppField>`}
      />

      <Rules
        do={["Say the version when only one works.", "Use cidr=\"required\" for networks, so the prefix is never forgotten.", "Store the canonical form the field writes."]}
        dont={["Read leading zeros as octal.", "Accept a port in an address field; use PortField beside it.", "Use separate boxes per octet."]}
      />

      <TokenTable tokens={[["--field-medium", "Width"], ["--fg-subtle", "Leading icon"]]} />
    </SectionPage>
  )
}
