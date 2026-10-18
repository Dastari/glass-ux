# Segmented

One of two to five mutually exclusive modes ("Enabled | Disabled", "List | Grid", "RMM ·
PSA · CHAT"). A recessed glass track with a selected indicator that slides between segments.

Container-aware (R7): measured against the box it is given, it steps down from every label,
to icons only (when every option has an icon), to one menu button showing the chosen option
("RMM ▾") whose menu lists the options with a check on the chosen one. The value,
onValueChange and the group's accessible name are the same in every form.

`import { Segmented } from "glass-ux/segmented"`

[Live examples](https://dastari.github.io/glass-ux/components/segmented)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| aria-labelledby | `string \| undefined` | See type | no | — | IDs of elements that provide the accessible name. |
| block | `boolean \| undefined` | false, true | no | false | Fill the container; segments share the width equally. A block never collapses. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| collapse | `SegmentedCollapse \| undefined` | "menu", "none", "auto" | no | — | What happens when the options do not fit. Default: the host's SegmentedCollapseContext, else "auto". |
| defaultValue | `V \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| iconOnly | `boolean \| undefined` | false, true | no | false | Show icons only; labels become accessible names. Still folds to the menu when even the icons do not fit. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field. |
| onBlur | `((event: FocusEvent<HTMLDivElement>) => void) \| undefined` | See type | no | — | Called with the focus event when focus leaves the whole control, not when it moves between segments. For form libraries' touched state. |
| onValueChange | `((value: V) => void) \| undefined` | See type | no | — | Called with the chosen option's `value` when the person picks a segment (or a menu item in the collapsed form); pressing the current segment does not deselect it. Pair with `value` to control it. |
| options | `SegmentedOption<V>[]` | See type | yes | — | The available choices, including their values and visible labels. |
| size | `SegmentedSize \| undefined` | "sm", "md", "lg" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| tone | `ChoiceTone \| undefined` | "danger", "warning", "success", "accent" | no | — | The chosen segment's tint. Status tones only when the modes are statuses (R3.3). |
| value | `V \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
