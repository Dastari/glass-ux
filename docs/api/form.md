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

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
