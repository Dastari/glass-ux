# RhfForm

Provide RHF context, prevent native validation and focus the first invalid Glass UX field after submission.

`import { RhfForm } from "glass-ux/form-rhf"`

[Live examples](https://dastari.github.io/glass-ux/components/rhf-form)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | FormStack, bound fields and submit controls. |
| form | `UseFormReturn<T, C, O>` | See type | yes | — | RHF instance created with useForm, usually spreading rhfFormBehaviour. |
| onError | `((error: unknown) => void) \| undefined` | See type | no | — | Receives an exception thrown by onSubmit. Render save feedback in the initiating control. |
| onSubmit | `SubmitHandler<O>` | See type | yes | — | Called with validated (and resolver-transformed) values. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| ref | `Ref<HTMLFormElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
