# WindowFrame

Everything in the workspace is a window: tiled, floating, snapped, maximised, minimised to the dock or popped out.

`import { WindowFrame } from "glass-ux/windows"`

[Live examples](https://dastari.github.io/glass-ux/components/window-frame)

## WindowFrame.Root



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| focused | `boolean \| undefined` | false, true | no | false | The focused window has a stronger edge; others dim their app bar. |
| material | `"none" \| "panel" \| undefined` | "none", "panel" | no | "panel" | `panel` (default): a glass frame, for secondary windows. `none`: no frame, for the primary window, whose header, tabs and status sit on the canvas and whose content panels carry the glass. |
| state | `WindowFrameState \| undefined` | "primary", "sheet", "tiled", "floating", "maximised", "minimised", "popout" | no | — | Controlled view state, including loading, empty and error states. |

## WindowFrame.AppBar



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actions | `ReactNode` | See type | no | — | Window-specific actions, before the controls. Ghost sm buttons. |
| actionsRef | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Receives the actions container, for content that portals its own actions in. |
| controls | `ReactNode` | See type | no | — | Window controls (WindowControls). |
| icon | `ReactNode` | See type | no | — | An icon element without an explicit size; the component sizes it through its tokens. |
| scope | `ReactNode` | See type | no | — | The window's organisation when it is not the current one (WindowScopeChip, R14.4). |
| subtitle | `ReactNode` | See type | no | — | Data only (R2.2): the endpoint or organisation the window is about. |
| title | `ReactNode` | See type | yes | — | The heading or title content. |
| titleId | `string \| undefined` | See type | no | — | id for the title, so the frame can be labelled by it. |

## WindowFrame.Body



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| variant | `"fill" \| "scroll" \| undefined` | "fill", "scroll" | no | "scroll" | `scroll` pads and scrolls (documents, lists); `fill` is edge to edge (viewers). |

## WindowFrame.StatusBar



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| narrow | `"show" \| "hide" \| undefined` | "show", "hide" | no | "show" | `hide` drops the bar in a phone-width window (under 30rem), for a primary view whose bar only adds detail there is no room for. Live state that matters on a phone (connection lost, reconnecting) keeps the default, `show`. |

## WindowFrame.StatusItem



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| tone | `WindowStatusTone \| undefined` | "danger", "warning", "success", "neutral", "info" | no | — | Draws a status dot before the label. |

## WindowFrame.StatusMeta



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

## WindowFrame.StatusGroup



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

## WindowFrame.Controls



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| compact | `boolean \| undefined` | false, true | no | false | Phones: minimise reads as "back to workspace" and maximise is implicit. |
| leading | `ReactNode` | See type | no | — | Extra controls before the standard ones (the phone window switcher). |
| maximised | `boolean \| undefined` | false, true | no | false | Whether the window fills its available workspace. |
| onClose | `(() => void) \| undefined` | See type | no | — | Called when close occurs. The callback type specifies its arguments. |
| onMinimise | `(() => void) \| undefined` | See type | no | — | Called when minimise occurs. The callback type specifies its arguments. |
| onPopOut | `(() => void) \| undefined` | See type | no | — | Called when pop out occurs. The callback type specifies its arguments. |
| onReturn | `(() => void) \| undefined` | See type | no | — | Popped-out windows offer "Return to workspace" in place of pop-out. |
| onToggleMaximise | `(() => void) \| undefined` | See type | no | — | Called when toggle maximise occurs. The callback type specifies its arguments. |
| title | `string` | See type | yes | — | The heading or title content. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
