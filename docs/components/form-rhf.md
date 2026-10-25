# React Hook Form

`glass-ux/form-rhf` connects existing typed fields to React Hook Form without changing
their values, normalisation or reserved error lines. Install the optional peers only when
using this adapter:

```sh
pnpm add react-hook-form @hookform/resolvers
```

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "glass-ux/button";
import { EmailField, emailSchema } from "glass-ux/email-field";
import { MoneyField, moneySchema } from "glass-ux/money-field";
import { FormStack, FormActions } from "glass-ux/form";
import { RhfForm, RhfField, rhfFormBehaviour } from "glass-ux/form-rhf";

const schema = z.object({ email: emailSchema({ required: true }), budget: moneySchema({ required: true }) });

export function ContactForm() {
  const form = useForm({
    ...rhfFormBehaviour,
    resolver: zodResolver(schema),
    defaultValues: { email: "", budget: 12500 as number | null },
  });
  return <RhfForm form={form} onSubmit={async values => { await saveContact(values); form.reset(values); }}>
    <FormStack>
      <RhfField control={form.control} name="email" component={EmailField} label="Email" />
      <RhfField control={form.control} name="budget" component={MoneyField} label="Monthly budget" />
      <FormActions><Button type="submit" disabled={!form.formState.isDirty} status={form.formState.isSubmitting ? "pending" : "idle"}>Save contact</Button></FormActions>
    </FormStack>
  </RhfForm>;
}
```

The application supplies `saveContact`. `RhfForm` supplies RHF context, disables native
validation and focuses the first invalid field after submit. It preserves resolver output
types, including transformed Zod values. `onError` receives exceptions from the save callback.
Use RHF's `formState.isSubmitting` and `isSubmitSuccessful` for the initiating button's
feedback; call `reset(savedValues)` after a successful save to establish the new baseline.

`RhfField` accepts the usual controller options (`control`, `name`, `rules`, `defaultValue`,
`shouldUnregister`, `disabled`), a bound `component`, and that component's normal props.
It supplies value, change, blur, dirty, touched, name and validation messages through the
same binding the TanStack fields read. It registers the rendered control for RHF error
focus. Use defined defaults (`""`, `null`, arrays, booleans or the typed object); avoid
`undefined` values. `AddressField` binds each address part separately so nested schema
messages appear on the corresponding row.

`rhfFormBehaviour` uses RHF's `onTouched` mode (blur first, then change) and revalidates
submitted errors on change. You can override those settings in `useForm`.

For bare controls, `useRhfField({ control, name })` returns `controlProps`, `checkedProps`
and `fieldProps`, plus RHF's `field`, `fieldState` and `formState`. Put `fieldProps` on
`Field`, `controlProps` on value controls (`Input`, `Select`, `MoneyInput`, `DateField`,
`RichTextInput` and the other typed inputs), or `checkedProps` on `Checkbox`/`Switch`.
Use bound fields where available to retain their derived hints and normalisation.
