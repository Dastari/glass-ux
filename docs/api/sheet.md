# Sheet

A glass pane from a screen edge: the inspector (right), the section drawer (left) or a short list of choices (bottom).

`import { Sheet } from "glass-ux/sheet"`

[Live examples](https://dastari.github.io/glass-ux/components/sheet)

## Sheet.Root



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actionsRef | `RefObject<{ unmount: () => void; close: () => void; } \| null> \| undefined` | See type | no | — | Ref exposing the component’s imperative action contract. |
| children | `ReactNode` | false, true | no | — | The content or component slots rendered inside the component. |
| defaultOpen | `boolean \| undefined` | false, true | no | — | Opens the uncontrolled overlay initially. |
| modal | `boolean \| undefined` | false, true | no | — | Whether the overlay traps focus and makes outside content inert. |
| onOpenChange | `((open: boolean, details: DialogChangeDetails) => void) \| undefined` | See type | no | — | Called when open change occurs. The callback type specifies its arguments. |
| onOpenChangeComplete | `((open: boolean) => void) \| undefined` | See type | no | — | Called when open change complete occurs. The callback type specifies its arguments. |
| open | `boolean \| undefined` | false, true | no | — | Controls whether the overlay is open. |
| side | `SheetSide \| undefined` | "bottom", "left", "right" | no | "right" | `right` (default): inspector and secondary detail. `left`: the section drawer on tablets and phones. `bottom`: a short list of choices or actions (phone "More"). |

## Sheet.Trigger



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

## Sheet.Popup



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| children | `ReactNode` | false, true | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| size | `SheetSize \| undefined` | "sm", "md", "lg" | no | "md" | Width: sm 360 · md 480 · lg 640. Side sheets keep a sliver of the page visible on phones; a bottom sheet spans the phone's width. |

## Sheet.Header



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| close | `boolean \| undefined` | false, true | no | true | Show the close button (default). |
| icon | `ReactNode` | false, true | no | — | Icon in a tile, sized by the header. |
| media | `ReactNode` | false, true | no | — | Replaces the icon tile with the caller's own: an entity's identity tile (its photo, state). |
| subtitle | `ReactNode` | false, true | no | — | Data only: the target's identifier or context (R2.2), never a restatement. |
| title | `ReactNode` | false, true | yes | — | The heading or title content. |
| tone | `DialogTone \| undefined` | "danger", "warning", "default", "success", "accent", "info" | no | "default" | The semantic tone. Use danger and warning for consequences and states. |

## Sheet.Body



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| flush | `boolean \| undefined` | false, true | no | — | Remove the body's inset, for content that brings its own (a rail layout, a table). |

## Sheet.Footer



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| start | `ReactNode` | false, true | no | — | Tertiary actions on the left (Reset, Help). The primary always goes last, on the right. |

## Sheet.Close



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
