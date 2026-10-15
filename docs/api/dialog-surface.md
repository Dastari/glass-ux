# DialogSurface

Backdrop + viewport + glass popup, for every modal surface (Dialog, AlertDialog,
Sheet, the command palette). Internal; consumers use Dialog.Popup.

`import { DialogSurface } from "glass-ux/dialog"`

[Live examples](https://dastari.github.io/glass-ux/components/dialog-surface)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| edge | `"bottom" \| "left" \| "right" \| undefined` | "bottom", "left", "right" | no | "right" | `side` mode only: the edge the panel slides in from (Sheet's `side`). |
| finalFocus | `boolean \| RefObject<HTMLElement \| null> \| ((closeType: import(".pnpm/@base-ui+utils@0.5.0_@types+react@19.3.0_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/@base-ui/utils/useEnhancedClickHandler").InteractionType) => boolean \| HTMLElement \| null \| void) \| undefined` | See type | no | — | The element or behaviour to focus when the overlay closes. |
| initialFocus | `boolean \| RefObject<HTMLElement \| null> \| ((openType: import(".pnpm/@base-ui+utils@0.5.0_@types+react@19.3.0_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/@base-ui/utils/useEnhancedClickHandler").InteractionType) => boolean \| HTMLElement \| null \| void) \| undefined` | See type | no | — | The element or behaviour to focus when the overlay opens. |
| kind | `DialogKind \| undefined` | "dialog", "alert", "palette", "side", "settings" | no | "dialog" | `settings` fixes the height so switching sections never resizes the dialog. |
| mode | `DialogMode` | "dialog", "side", "sheet" | yes | — | Active display or interaction mode. |
| size | `DialogSize \| undefined` | "full", "sm", "md", "lg", "xl" | no | "md" | sm 400 · md 560 · lg 760 · xl 1040 · full. Ignored by phone sheets (full width). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
