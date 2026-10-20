# FieldSkeleton

The loading shape of a Field: a label-role text line, a block of the control's exact
height and the reserved message line — the same boxes as the loaded field (R9.3).

`import { FieldSkeleton } from "glass-ux/field"`

[Live examples](https://dastari.github.io/glass-ux/components/field-skeleton)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| control | `"input" \| "textarea" \| "switch" \| "checkbox" \| undefined` | "input", "textarea", "switch", "checkbox" | no | "input" | The control the field holds; the placeholder takes exactly its box. |
| labelWidth | `string \| number \| undefined` | See type | no | "40%" | Width of the label line. |
| orientation | `FieldOrientation \| undefined` | "horizontal", "vertical" | no | control === "switch" || control === "checkbox"
    ? "horizontal"
    : "vertical" | Direction of layout and keyboard navigation. |
| rows | `number \| undefined` | See type | no | 3 | Textarea rows (minRows). |
| size | `FieldSize \| undefined` | "sm", "md", "lg" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
