# Popover

Small, contextual, non-blocking content next to its trigger: a filter, a peek, a short form.

`import { Popover } from "glass-ux/popover"`

[Live examples](https://dastari.github.io/glass-ux/components/popover)

## Popover.Root



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

## Popover.Trigger



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

## Popover.Popup



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| align | `import("@base-ui/react/internals/useAnchorPositioning").Align \| undefined` | "center", "start", "end" | no | "center" | Alignment of the overlay relative to its anchor. |
| anchor | `Element \| import("react").RefObject<Element \| null> \| import(".pnpm/@floating-ui+dom@1.8.0/node_modules/@floating-ui/dom").VirtualElement \| (() => Element \| import(".pnpm/@floating-ui+dom@1.8.0/node_modules/@floating-ui/dom").VirtualElement \| null) \| null \| undefined` | See type | no | — | Anchor used to position floating content. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| side | `import("@base-ui/react/internals/useAnchorPositioning").Side \| undefined` | "top", "bottom", "left", "right", "inline-end", "inline-start" | no | "bottom" | Preferred side of the anchor; collision handling may choose another side. |
| size | `PopoverSize \| undefined` | "sm", "md", "lg" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| title | `ReactNode` | false, true | no | — | Optional title row; adds a close button. Omit it when the trigger already names the content. |

## Popover.Close



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

## Popover.Description



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

## Popover.Preview



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | false, true | yes | — | The content or component slots rendered inside the component. |
| size | `PopoverSize \| undefined` | "sm", "md", "lg" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| title | `ReactNode` | false, true | no | — | The heading or title content. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
