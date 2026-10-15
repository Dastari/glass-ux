# ContextMenu

Right-click menus. Visually and structurally the same as Menu — the same item parts —
so a row's ⋯ menu and its context menu are indistinguishable (R11.6).

`import { ContextMenu } from "glass-ux/context-menu"`

[Live examples](https://dastari.github.io/glass-ux/components/context-menu)

## ContextMenu.Root



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

## ContextMenu.Trigger



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

## ContextMenu.Popup



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| align | `import("@base-ui/react/internals/useAnchorPositioning").Align \| undefined` | "center", "start", "end" | no | — | Alignment of the overlay relative to its anchor. |
| alignOffset | `number \| undefined` | See type | no | — | Alignment offset from the anchor, in CSS pixels. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| side | `import("@base-ui/react/internals/useAnchorPositioning").Side \| undefined` | "top", "bottom", "left", "right", "inline-end", "inline-start" | no | — | Preferred side of the anchor; collision handling may choose another side. |
| sideOffset | `number \| undefined` | See type | no | — | Gap between the overlay and its anchor, in CSS pixels. |

## ContextMenu.Item



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| disabledReason | `string \| null \| undefined` | See type | no | — | Disable the row and say why, on a line beneath it. |
| icon | `ReactNode` | See type | no | — | An icon element without an explicit size; the component sizes it through its tokens. |
| reasonId | `string \| undefined` | See type | no | — | ID of the element explaining the current state. |
| reasonShown | `boolean \| undefined` | false, true | no | true | Consecutive rows disabled for the same reason show it once, under the last of them: the others pass `reasonShown={false}` and point at that line with `reasonId`. |
| shortcut | `string \| undefined` | See type | no | — | e.g. "mod+shift+r". Shown in the platform's form at the trailing edge. |
| tone | `MenuItemTone \| undefined` | "danger", "default" | no | "default" | The semantic tone. Use danger and warning for consequences and states. |
| trail | `ReactNode` | See type | no | — | A short trailing note: the current value of what the row changes ("last 7 days"). |

## ContextMenu.LinkItem



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| icon | `ReactNode` | See type | no | — | An icon element without an explicit size; the component sizes it through its tokens. |

## ContextMenu.CheckboxItem



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| shortcut | `string \| undefined` | See type | no | — | Keyboard shortcut shown with the control, using the host platform’s modifier keys. |
| trail | `ReactNode` | See type | no | — | A short trailing note in the trail slot, e.g. where a hidden column went ("In row details"). |

## ContextMenu.RadioGroup



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

## ContextMenu.RadioItem



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| shortcut | `string \| undefined` | See type | no | — | Keyboard shortcut shown with the control, using the host platform’s modifier keys. |

## ContextMenu.Group



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| (((state: import("@base-ui/react").ContextMenuGroupState) => string \| undefined) & string) \| undefined` | See type | no | — | CSS class applied to the element, or a function that returns a class based on the component's state. |

## ContextMenu.GroupLabel



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| (((state: import("@base-ui/react").ContextMenuGroupLabelState) => string \| undefined) & string) \| undefined` | See type | no | — | CSS class applied to the element, or a function that returns a class based on the component's state. |

## ContextMenu.Separator



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| (((state: import("@base-ui/react").SeparatorState) => string \| undefined) & string) \| undefined` | See type | no | — | CSS class applied to the element, or a function that returns a class based on the component's state. |

## ContextMenu.Submenu



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| disabledReason | `string \| null \| undefined` | See type | no | — | Explains why the action is unavailable; the control remains focusable so the reason is accessible. |
| icon | `ReactNode` | See type | no | — | An icon element without an explicit size; the component sizes it through its tokens. |
| label | `ReactNode` | See type | yes | — | The visible or accessible label for this component. |
| reasonId | `string \| undefined` | See type | no | — | ID of the element explaining the current state. |
| reasonShown | `boolean \| undefined` | false, true | no | true | Whether the state’s explanation is visible. |
| tone | `MenuItemTone \| undefined` | "danger", "default" | no | "default" | The semantic tone. Use danger and warning for consequences and states. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
