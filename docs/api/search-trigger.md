# SearchTrigger

The command search field. A button that looks like a field: it opens the palette.

`import { SearchTrigger } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/search-trigger)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| onOpen | `() => void` | See type | yes | — | Called when the person clicks the trigger or presses `shortcut` anywhere (unless a palette host already handled the key); open the command palette here. |
| placeholder | `string \| undefined` | See type | no | — | The prompt shown while the value is empty. It does not replace the field’s label. |
| shortcut | `string \| undefined` | See type | no | "mod+k" | Opens from anywhere (R11.5). Default mod+k. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| ref | `Ref<HTMLButtonElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| value | `string \| number \| readonly string[] \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |

Also accepts the element’s standard HTML attributes and React DOM events.
