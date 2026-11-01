# TypeaheadPopup

The floating box of a typeahead, positioned against an element or a rectangle. It never
takes focus: Base UI's menus do, which text entry cannot allow.

`import { TypeaheadPopup } from "glass-ux/typeahead"`

[Live examples](https://dastari.github.io/glass-ux/components/typeahead-popup)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| align | `"center" \| "start" \| "end" \| undefined` | "center", "start", "end" | no | "start" | Alignment against the anchor. |
| anchor | `TypeaheadAnchor` | See type | yes | — | What the popup hangs from. |
| children | `ReactNode` | See type | yes | — | The list. |
| className | `string \| undefined` | See type | no | — | Layout classes for the popup. |
| label | `string` | See type | yes | — | Accessible name of the popup. |
| onClose | `(reason: TypeaheadCloseReason) => void` | See type | yes | — | Called when a press outside dismisses it. Set `open` to false in response. |
| open | `boolean` | false, true | yes | — | Whether the popup is showing. |
| popupProps | `(Pick<import("react").DetailedHTMLProps<import("react").HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "onMouseDown"> & { "data-detail"?: string; }) \| undefined` | See type | no | — | Attributes for the popup element. |
| side | `"top" \| "bottom" \| undefined` | "top", "bottom" | no | "bottom" | Preferred side of the anchor; collision handling may choose another. |
| size | `PopoverSize \| undefined` | "sm", "md", "lg" | no | "md" | Popup width. |
