import { z } from "zod"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { ByteSizeInput, byteSizeSchema } from "../../ui/byte-size-field/index.js"
import { Field } from "../../ui/field/index.js"
import { Form, FormActions, FormStack, formBehaviour, useAppForm } from "../../ui/form/index.js"
import { Usage } from "./inputs.kit.js"
import { wait } from "./forms.fixtures.js"

function SizeDemo() {
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { quota: 50e9 as number | null, upload: 500e6 as number | null, memory: 2 * 1024 ** 3 as number | null },
    validators: { onDynamic: z.object({ quota: byteSizeSchema({ required: true, max: 100e9 }), upload: byteSizeSchema({ max: 2e9 }), memory: byteSizeSchema({ base: "binary" }) }) },
    onSubmit: () => wait(600),
  })
  return (
    <Form form={form} aria-label="Sizes" className="w-full" data-testid="bytes-form">
      <FormStack>
        <form.AppField name="quota">{(field) => <field.ByteSizeField label="Mailbox warning" />}</form.AppField>
        <form.AppField name="upload">{(field) => <field.ByteSizeField label="Largest upload" optional />}</form.AppField>
        <form.AppField name="memory">{(field) => <field.ByteSizeField label="Memory alert below" optional base="binary" defaultUnit="GiB" />}</form.AppField>
        <FormActions>
          <form.SubmitButton>Save</form.SubmitButton>
        </FormActions>
      </FormStack>
    </Form>
  )
}

export default function ByteSizeFieldSection() {
  return (
    <SectionPage>
      <Specimen title="Sizes in words" description="500 MB, 1.5GB, 2 GiB, 750k. Decimal units by default (disks and files); binary (KiB, MiB, GiB) for memory. Held in bytes.">
        <SizeDemo />
      </Specimen>

      <Specimen title="States" layout="grid">
        <FormStack>
          <Field label="Empty">
            <ByteSizeInput />
          </Field>
          <Field label="Too large" error="Enter a size up to 2 GB">
            <ByteSizeInput defaultValue={5e9} invalid />
          </Field>
        </FormStack>
        <FormStack>
          <Field label="Disabled">
            <ByteSizeInput defaultValue={50e9} disabled />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Over glass and imagery" backdrop>
        <Field label="Mailbox warning">
          <ByteSizeInput defaultValue={50e9} />
        </Field>
      </Specimen>

      <ContainerLab>
        <div className="flex h-full items-center p-1">
          <ByteSizeInput size="sm" defaultValue={1.5e12} width="full" aria-label="Size" />
        </div>
      </ContainerLab>

      <Usage
        code={`
import { byteSizeSchema } from "../../ui/byte-size-field/index.js"

const schema = z.object({ quota: byteSizeSchema({ required: true, max: 100e9 }) })   // bytes

<form.AppField name="quota">{(field) => <field.ByteSizeField label="Mailbox warning" />}</form.AppField>`}
      />

      <Rules do={["Store bytes.", "Use binary units for memory, decimal for disks and files."]} dont={["Make people convert to megabytes in their head."]} />

      <TokenTable tokens={[["--field-short", "Width"]]} />
    </SectionPage>
  )
}
