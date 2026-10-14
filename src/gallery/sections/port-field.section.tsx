import { z } from "zod"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Field } from "../../ui/field/index.js"
import { Form, FormActions, FormStack, formBehaviour, useAppForm } from "../../ui/form/index.js"
import { PortInput, portSchema } from "../../ui/port-field/index.js"
import { Usage } from "./inputs.kit.js"
import { wait } from "./forms.fixtures.js"

function PortDemo() {
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { web: 443 as number | null, snmp: 161 as number | null, controller: 8443 as number | null },
    validators: { onDynamic: z.object({ web: portSchema({ required: true }), snmp: portSchema({ required: true }), controller: portSchema() }) },
    onSubmit: () => wait(600),
  })
  return (
    <Form form={form} aria-label="Ports" className="w-full" data-testid="port-form">
      <FormStack>
        <form.AppField name="web">{(field) => <field.PortField label="Web interface port" hint="Printers default to HTTP 80" />}</form.AppField>
        <form.AppField name="snmp">{(field) => <field.PortField label="SNMP port" />}</form.AppField>
        <form.AppField name="controller">{(field) => <field.PortField label="Controller port" optional services={{ 8443: "UniFi" }} />}</form.AppField>
        <FormActions>
          <form.SubmitButton>Save</form.SubmitButton>
        </FormActions>
      </FormStack>
    </Form>
  )
}

export default function PortFieldSection() {
  return (
    <SectionPage>
      <Specimen title="With its service" description="Whole numbers 1–65535, no grouping, and the service usually on the port named beside it (“443 HTTPS”). Arrow keys step; Shift steps by 1,000.">
        <PortDemo />
      </Specimen>

      <Specimen title="States" layout="grid">
        <FormStack>
          <Field label="Empty">
            <PortInput />
          </Field>
          <Field label="Invalid" error="Enter a port from 1 to 65535">
            <PortInput defaultValue={0} invalid />
          </Field>
        </FormStack>
        <FormStack>
          <Field label="Read-only">
            <PortInput defaultValue={3389} readOnly />
          </Field>
          <Field label="Disabled">
            <PortInput defaultValue={22} disabled />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Over glass and imagery" backdrop>
        <Field label="Port">
          <PortInput defaultValue={443} />
        </Field>
      </Specimen>

      <ContainerLab>
        <div className="flex h-full items-center p-1">
          <PortInput size="sm" defaultValue={3268} width="full" aria-label="Port" />
        </div>
      </ContainerLab>

      <Usage
        code={`
import { portSchema } from "../../ui/port-field/index.js"

const schema = z.object({ port: portSchema({ required: true }) })   // number | null

<form.AppField name="port">{(field) => <field.PortField label="Port" services={{ 8443: "UniFi" }} />}</form.AppField>`}
      />

      <Rules do={["Keep ports short (width short is the default).", "Name your own services with `services`."]} dont={["Group digits (8,080).", "Show steppers: nobody clicks from 443 to 8443."]} />

      <TokenTable tokens={[["--field-short", "Width"], ["--fg-subtle", "Service name"]]} />
    </SectionPage>
  )
}
