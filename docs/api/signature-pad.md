# SignaturePad

A handwritten signature as a form value. Draw with a mouse, pen or finger: strokes swell
and thin with speed and pen pressure, and are stored as points so the signature redraws
sharply at any size. "Type instead" takes a typed name for people who cannot draw.
Undo removes the last stroke and Clear empties the pad; with the pad focused, Delete
clears and Ctrl/Command+Z undoes. Export with `signatureToSvg` or `signatureToPng`.

A drawing on its own does not establish who signed: the application records who, when
and what was agreed.

`import { SignaturePad } from "glass-ux/signature-pad"`

[Live examples](https://dastari.github.io/glass-ux/components/signature-pad)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| allowTyped | `boolean \| undefined` | false, true | no | true | Offer "Type instead", so people who cannot draw can sign with their typed name. Default true. |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when no Field label names the pad. |
| aspectRatio | `number \| undefined` | See type | no | 3 | Width ÷ height of the signing area. Default 3. The pad keeps this shape at every width. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| defaultValue | `SignatureValue \| null \| undefined` | See type | no | null | The starting signature when uncontrolled. |
| disabled | `boolean \| undefined` | false, true | no | false | Disables interaction while retaining the component’s disabled appearance. |
| invalid | `boolean \| undefined` | false, true | no | — | Show the invalid state (set by SignatureField when its error shows). |
| name | `string \| undefined` | See type | no | — | Name for a native form submission (a hidden input carries the value as JSON). |
| onBlur | `((event: FocusEvent<HTMLDivElement>) => void) \| undefined` | See type | no | — | Called when focus leaves the pad, for form libraries' touched state. |
| onValueChange | `((value: SignatureValue \| null) => void) \| undefined` | See type | no | — | Called after each stroke, undo, clear or typed change with the new signature (null when empty). |
| readOnly | `boolean \| undefined` | false, true | no | false | Shows the signature without the toolbar; it cannot be changed. |
| required | `boolean \| undefined` | false, true | no | — | Marks the field as required; pair it with the corresponding schema validation. |
| value | `SignatureValue \| null \| undefined` | See type | no | — | The signature, or null when empty. Pair with `onValueChange` to control it. |
