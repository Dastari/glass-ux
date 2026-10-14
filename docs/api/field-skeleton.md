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
| orientation | `FieldOrientation \| undefined` | "horizontal", "vertical" | no | control === "switch" || control === "checkbox" ? "horizontal" : "vertical" | Direction of layout and keyboard navigation. |
| rows | `number \| undefined` | See type | no | 3 | Textarea rows (minRows). |
| size | `FieldSize \| undefined` | "sm", "md", "lg" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
