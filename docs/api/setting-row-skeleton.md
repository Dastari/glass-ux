# SettingRowSkeleton

A setting row's loading shape: label and description lines and the control's box.

`import { SettingRowSkeleton } from "glass-ux/setting-row"`

[Live examples](https://dastari.github.io/glass-ux/components/setting-row-skeleton)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| control | `"button" \| "switch" \| "none" \| "segmented" \| undefined` | "button", "switch", "none", "segmented" | no | "switch" | The control's box: a switch, a segmented control or a button. |
| description | `boolean \| undefined` | false, true | no | true | Additional content describing the value, state, or consequence. |
| labelWidth | `string \| number \| undefined` | See type | no | "40%" | Space reserved for the label. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
