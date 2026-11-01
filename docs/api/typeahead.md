# Typeahead

A listbox at a caret or any rectangle, with focus staying in the text
(`aria-activedescendant`). Build it with `useTypeahead`; it needs no particular editor.
The result count is announced from a polite region that stays mounted (R20.9).

Width  two panes when `renderDetail` is given; below 28rem the detail moves under the list.

`import { Typeahead } from "glass-ux/typeahead"`

[Live examples](https://dastari.github.io/glass-ux/components/typeahead)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| align | `"center" \| "start" \| "end" \| undefined` | "center", "start", "end" | no | — | Alignment against the anchor. |
| anchor | `TypeaheadAnchor` | See type | yes | — | What the list hangs from: an element, a caret rectangle or any rectangle. |
| className | `string \| undefined` | See type | no | — | Layout classes for the popup. |
| empty | `string \| undefined` | See type | no | — | Text when there are no rows. Default "No results". |
| label | `string` | See type | yes | — | Accessible name of the list. |
| loading | `boolean \| undefined` | false, true | no | false | Results are on their way. Reserve their room with `reserveRows`. |
| renderDetail | `((item: Item) => ReactNode) \| undefined` | See type | no | — | The highlighted row's detail, in a pane beside the list that moves under it in a narrow box. |
| renderItem | `((item: Item) => ReactNode) \| undefined` | See type | no | — | A row's content. Default: `OptionRow` from the item's `label`, `description`, `icon` and `meta`. |
| reserveRows | `number \| undefined` | See type | no | — | Hold this many rows of height from the start, for results that arrive late: the popup keeps its size and its place. |
| side | `"top" \| "bottom" \| undefined` | "top", "bottom" | no | — | Preferred side of the anchor. |
| state | `TypeaheadState<Item>` | See type | yes | — | The state from `useTypeahead`. |
