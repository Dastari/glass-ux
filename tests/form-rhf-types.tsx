// Compile with tests/tsconfig.json to check the public adapter with transformed resolvers.
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EmailField } from "../src/ui/email-field/index.js";
import { RhfField, RhfForm, useRhfField } from "../src/ui/form-rhf/index.js";

const schema = z.object({
  email: z.string().transform((value) => value.length),
});

export function TransformedForm() {
  const form = useForm({
    defaultValues: { email: "" },
    resolver: zodResolver(schema),
  });
  const binding = useRhfField({ control: form.control, name: "email" });
  const inputValue: string = binding.controlProps.value;
  return (
    <RhfForm
      form={form}
      onSubmit={(values) => {
        const output: number = values.email;
        void output;
      }}
    >
      <RhfField
        control={form.control}
        name="email"
        component={EmailField}
        label={inputValue}
        exact
      />
    </RhfForm>
  );
}
