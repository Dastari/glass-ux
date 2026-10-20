# ChoiceRow

A checkbox, radio or switch with its own label and description beside it (the
controls' `label` prop). A native label points at the control, so clicking the text
toggles it; works inside or outside a Field.

`import { ChoiceRow } from "glass-ux/field"`

[Live examples](https://dastari.github.io/glass-ux/components/choice-row)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The checkbox, radio or switch. Give it `id={controlId}` and `aria-describedby={descriptionId(controlId)}`. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| controlId | `string` | See type | yes | — | The control's id (the label points at it). |
| description | `ReactNode` | See type | no | — | Additional content describing the value, state, or consequence. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| label | `ReactNode` | See type | yes | — | The visible or accessible label for this component. |
