# Window

Slots for window bodies.

`import { Window } from "glass-ux/windows"`

[Live examples](https://dastari.github.io/glass-ux/components/window)

## Window.Actions



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | false, true | yes | — | The content or component slots rendered inside the component. |

## Window.Status



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | false, true | no | — | StatusItem / StatusMeta children for the status bar. |
| indicator | `WindowIndicator \| undefined` | See type | no | — | What the dock shows for this window: a dot and a one-word state. |

## Window.Body



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| variant | `"fill" \| "scroll" \| undefined` | "fill", "scroll" | no | "scroll" | `scroll` pads and scrolls (documents, lists); `fill` is edge to edge (viewers). |

## Window.StatusItem



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| tone | `WindowStatusTone \| undefined` | "danger", "warning", "success", "neutral", "info" | no | — | Draws a status dot before the label. |

## Window.StatusMeta



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
