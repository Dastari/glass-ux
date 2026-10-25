import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../../ui/button/index.js";
import { EmailField, emailSchema } from "../../ui/email-field/index.js";
import { IpField, ipSchema } from "../../ui/ip-field/index.js";
import { PortField, portSchema } from "../../ui/port-field/index.js";
import { MoneyField, moneySchema } from "../../ui/money-field/index.js";
import { FormActions, FormStack } from "../../ui/form/index.js";
import {
  RhfField,
  RhfForm,
  rhfFormBehaviour,
} from "../../ui/form-rhf/index.js";
import { SectionPage, Specimen } from "../kit.js";

const schema = z.object({
  email: emailSchema({ required: true }),
  gateway: ipSchema({ required: true }),
  port: portSchema({ required: true }),
  budget: moneySchema({ required: true }),
});
type Contact = z.input<typeof schema>;
const defaults: Contact = {
  email: "",
  gateway: "192.0.2.10",
  port: 443,
  budget: 12500,
};

export default function RhfSection() {
  const form = useForm({
    ...rhfFormBehaviour,
    defaultValues: defaults,
    resolver: zodResolver(schema),
  });
  return (
    <SectionPage>
      <Specimen
        layout="stack"
        title="Site contact"
        description="Typed values and schema messages are shared with the TanStack fields."
      >
        <RhfForm
          form={form}
          aria-label="RHF site contact"
          data-testid="rhf-contact"
          onSubmit={async (values) => {
            form.reset(values);
          }}
        >
          <FormStack>
            <RhfField
              control={form.control}
              name="email"
              component={EmailField}
              label="Contact email"
            />
            <RhfField
              control={form.control}
              name="gateway"
              component={IpField}
              label="Gateway"
            />
            <RhfField
              control={form.control}
              name="port"
              component={PortField}
              label="Service port"
            />
            <RhfField
              control={form.control}
              name="budget"
              component={MoneyField}
              label="Monthly budget"
            />
            <FormActions>
              <Button type="button" onClick={() => form.reset()}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!form.formState.isDirty}
                status={
                  form.formState.isSubmitting
                    ? "pending"
                    : form.formState.isSubmitSuccessful
                      ? "success"
                      : "idle"
                }
              >
                Save contact
              </Button>
            </FormActions>
          </FormStack>
        </RhfForm>
      </Specimen>
    </SectionPage>
  );
}
