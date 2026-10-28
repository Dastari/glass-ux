# SignatureField

SignaturePad bound to a `SignatureValue | null` form field. Pair it with `signatureSchema()`.

`import { SignatureField } from "glass-ux/signature-pad"`

[Live examples](https://dastari.github.io/glass-ux/components/signature-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| allowTyped | `boolean \| undefined` | false, true | no | — | Offer "Type instead", so people who cannot draw can sign with their typed name. Default true. |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when no Field label names the pad. |
| aside | `ReactNode` | See type | no | — | Right side of the label row: a live value readout or a small link. |
| aspectRatio | `number \| undefined` | See type | no | — | Width ÷ height of the signing area. Default 3. The pad keeps this shape at every width. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| hint | `ReactNode` | See type | no | — | The message line's resting text. Only when the format or consequence is not obvious (R2.8). |
| label | `ReactNode` | See type | no | — | Names the control. Omit only when a group legend or `aria-label` names it instead. |
| optional | `boolean \| undefined` | false, true | no | — | Marks the label "Optional". Prefer this over marking required fields. |
| readOnly | `boolean \| undefined` | false, true | no | — | Shows the signature without the toolbar; it cannot be changed. |
| required | `boolean \| undefined` | false, true | no | — | Shows the required marker. Pass `required` to the control as well. |
| warning | `ReactNode` | See type | no | — | Non-blocking warning in the reserved message slot; errors take precedence. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. Takes precedence over the `disabled` prop on the `<Field.Control>` component. |
