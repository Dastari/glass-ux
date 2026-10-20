# Form

The <form> element for a `useAppForm` instance. Submitting (button or Enter) validates
every field, focuses the first invalid one, or saves: the SubmitButton shows pending →
✓ in place, and the form takes the saved values as its new baseline. Pass the saved
record back as `defaultValues` (it normally comes from the server).

`import { Form } from "glass-ux/form"`

[Live examples](https://dastari.github.io/glass-ux/components/form)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| form | `FormInstance` | See type | yes | — | Form instance whose values, validation and submission state are observed. |
| onError | `((error: unknown) => void) \| undefined` | See type | no | — | A failed save (onSubmit threw). The button shows ✕; put the reason in a toast here. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| ref | `Ref<HTMLFormElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
