# PanelHeader

A Panel heading with an optional icon, description and trailing actions.

`import { PanelHeader } from "glass-ux/surface"`

[Live examples](https://dastari.github.io/glass-ux/components/panel-header)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actions | `ReactNode` | See type | no | — | Right-aligned controls. Keep to ghost/secondary buttons, tabs or a segmented control. |
| description | `ReactNode` | See type | no | — | Additional content describing the value, state, or consequence. |
| icon | `ReactNode` | See type | no | — | An icon element without an explicit size; the component sizes it through its tokens. |
| level | `2 \| 3 \| 4 \| undefined` | 2, 3, 4 | no | 2 | Heading level for the title; panels on a page are normally h2. |
| title | `ReactNode` | See type | yes | — | The heading or title content. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
