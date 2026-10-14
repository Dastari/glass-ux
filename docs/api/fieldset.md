# Fieldset

Groups related fields under one legend. Use `section` (overline) to split a long form
into parts, and `field` to label a set of checkboxes or radios like a single field.

`import { Fieldset } from "glass-ux/field"`

[Live examples](https://dastari.github.io/glass-ux/components/fieldset)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| legend | `ReactNode` | false, true | yes | — | Group heading. `section` renders it as an overline; `field` as a field label. |
| variant | `"section" \| "field" \| undefined` | "section", "field" | no | "section" | The named visual variant. It is rendered as a data attribute and styled through shared tokens. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
