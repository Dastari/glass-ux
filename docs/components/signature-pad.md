# Signature

`glass-ux/signature-pad` · [Live component catalogue](https://dastari.github.io/glass-ux/)

A handwritten signature as a form value. People draw with a mouse, pen or finger, and strokes
swell and thin with speed and pen pressure. The value stores the strokes as points, not
pixels, so the signature redraws sharply at any size and in any theme. **Type instead** takes a
typed name, rendered in a script face, for people who cannot draw. The pad keeps its aspect
ratio at every width, and its toolbar buttons disable rather than disappear, so nothing moves
while someone signs.

```tsx
import { signatureSchema, signatureToSvg } from "glass-ux/signature-pad"

const schema = z.object({ signature: signatureSchema({ required: true }) })   // "Add your signature"

<form.AppField name="signature">{(field) => <field.SignatureField label="Signature" required />}</form.AppField>

// On save: keep the value, and render an image for documents.
const svg = signatureToSvg(values.signature)
```

- **Value:** `null` when empty, `{ kind: "drawn", width, height, strokes }` with each point's
  `x`, `y`, `t` (ms into the stroke) and `p` (pen pressure, 0.5 without a pen), or
  `{ kind: "typed", text }`. `isSignatureEmpty` tells whether anything was signed.
- **Props:** `allowTyped` (default true), `aspectRatio` (default 3), `readOnly` (shows the
  signature without the toolbar), `disabled`, `name` (a hidden input carries the value as JSON
  for native forms).
- **Keyboard:** the drawing area takes focus. Delete clears it, and Ctrl or Command with Z
  undoes the last stroke. Switching between drawn and typed keeps each, so switching back
  restores it.
- **Exports:** `signatureToSvg(value, options)` returns a standalone SVG document, and
  `signatureToPng(value, options)` returns a PNG `Blob` (browser only). Both default to black
  ink on a transparent background. Options are `color`, `background` and `width` (for
  example 1200 for print). A typed signature exports as text in the viewer's script face.
- **Not a legal record:** a drawing does not establish who signed. Record who signed, when,
  and what they agreed to beside the value, and keep the record from being changed.
- **Parts:** `SignaturePad` (the bare control inside a `Field`), `strokeOutline` (one stroke's
  outline as SVG path data).
