# Dialog

Focused tasks in a glass frame: icon header, one scrolling body, a pinned footer — a bottom sheet on phones.

`import { Dialog } from "glass-ux/dialog"`

[Live examples](https://dastari.github.io/glass-ux/components/dialog)

## Dialog.Root



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actionsRef | `RefObject<{ unmount: () => void; close: () => void; } \| null> \| undefined` | See type | no | — | Ref exposing the component’s imperative action contract. |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| defaultOpen | `boolean \| undefined` | false, true | no | — | Opens the uncontrolled overlay initially. |
| disablePointerDismissal | `boolean \| undefined` | false, true | no | — | Keep the dialog open on outside press (Esc still closes). |
| modal | `boolean \| undefined` | false, true | no | — | Default true. `false` lets the page stay interactive (rare; prefer a Popover or Sheet). |
| onOpenChange | `((open: boolean, details: DialogChangeDetails) => void) \| undefined` | See type | no | — | Called when open change occurs. The callback type specifies its arguments. |
| onOpenChangeComplete | `((open: boolean) => void) \| undefined` | See type | no | — | Called when open change complete occurs. The callback type specifies its arguments. |
| open | `boolean \| undefined` | false, true | no | — | Controls whether the overlay is open. |
| sheet | `boolean \| "auto" \| undefined` | false, true, "auto" | no | "auto" | `auto` (default) renders a bottom sheet with a grab handle on phones (< 48rem) and a centred dialog elsewhere (R13.4). Force either with true/false. |

## Dialog.Trigger



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

## Dialog.Popup



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| finalFocus | `boolean \| RefObject<HTMLElement \| null> \| ((closeType: import(".pnpm/@base-ui+utils@0.5.0_@types+react@19.3.0_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/@base-ui/utils/useEnhancedClickHandler").InteractionType) => boolean \| HTMLElement \| null \| void) \| undefined` | See type | no | — | The element or behaviour to focus when the overlay closes. |
| initialFocus | `boolean \| RefObject<HTMLElement \| null> \| ((openType: import(".pnpm/@base-ui+utils@0.5.0_@types+react@19.3.0_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/@base-ui/utils/useEnhancedClickHandler").InteractionType) => boolean \| HTMLElement \| null \| void) \| undefined` | See type | no | — | The element or behaviour to focus when the overlay opens. |
| kind | `DialogKind \| undefined` | "dialog", "alert", "palette", "side", "settings" | no | — | `settings` fixes the height so switching sections never resizes the dialog. |
| size | `DialogSize \| undefined` | "full", "sm", "md", "lg", "xl" | no | — | sm 400 · md 560 · lg 760 · xl 1040 · full. Ignored by phone sheets (full width). |

## Dialog.Header



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| close | `boolean \| undefined` | false, true | no | true | Show the close button (default). |
| icon | `ReactNode` | See type | no | — | Icon in a tile, sized by the header. |
| media | `ReactNode` | See type | no | — | Replaces the icon tile with the caller's own: an entity's identity tile (its photo, state). |
| subtitle | `ReactNode` | See type | no | — | Data only: the target's identifier or context (R2.2), never a restatement. |
| title | `ReactNode` | See type | yes | — | The heading or title content. |
| tone | `DialogTone \| undefined` | "danger", "warning", "default", "success", "accent", "info" | no | "default" | The semantic tone. Use danger and warning for consequences and states. |

## Dialog.Body



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| flush | `boolean \| undefined` | false, true | no | — | Remove the body's inset, for content that brings its own (a rail layout, a table). |

## Dialog.Footer



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| start | `ReactNode` | See type | no | — | Tertiary actions on the left (Reset, Help). The primary always goes last, on the right. |

## Dialog.Title



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |

## Dialog.Description



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |

## Dialog.Close



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

## Dialog.Preview



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| height | `"auto" \| "short" \| undefined` | "auto", "short" | no | "auto" | `short` fixes a low frame so the body scrolls (to show the scroll edges). |
| kind | `DialogKind \| undefined` | "dialog", "alert", "palette", "side", "settings" | no | "dialog" | Semantic entity or content kind, used to choose labels and rendering. |
| size | `DialogSize \| undefined` | "full", "sm", "md", "lg", "xl" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
