# Fieldset

Groups related fields under one legend. Use `section` (overline) to split a long form
into parts, and `field` to label a set of checkboxes or radios like a single field.

`import { Fieldset } from "glass-ux/field"`

[Live examples](https://dastari.github.io/glass-ux/components/fieldset)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| legend | `ReactNode` | See type | yes | — | Group heading. `section` renders it as an overline; `field` as a field label. |
| variant | `"section" \| "field" \| undefined` | "section", "field" | no | "section" | The named visual variant. It is rendered as a data attribute and styled through shared tokens. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| ref | `Ref<HTMLFieldSetElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").FieldsetRootState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |

Also accepts the element’s standard HTML attributes and React DOM events.
