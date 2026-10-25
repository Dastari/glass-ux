# TransferList

Assign items between two lists: Available and Assigned (permissions, group members). Each
list has a search field, checkboxes with a select-all box, and a count in its header; the
buttons between them move the selected items or all listed items. Disabled items stay put
and say why in a tooltip. Lists are virtualised, so thousands of items cost only the rows
on screen. With `orderable` the assigned list can be reordered by dragging or Alt+↑ / ↓.
In a narrow container the lists stack and the move buttons turn to point down and up.

Keyboard: ↑ ↓ move, Shift extends the selection, Space checks, Ctrl/⌘+A selects all,
Enter moves the selection (or the focused item) to the other list, Esc clears the selection.

`import { TransferList } from "glass-ux/transfer-list"`

[Live examples](https://dastari.github.io/glass-ux/components/transfer-list)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Names the whole control ("Role permissions"). |
| className | `string \| undefined` | See type | no | — | Layout only. Set a height here (the lists fill it); the default is the `--_h` component token. |
| defaultValue | `string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | false | Nothing can be selected or moved. |
| grouped | `boolean \| undefined` | false, true | no | true | List items under their `group` headings. Default true. The assigned list keeps its own order when orderable. |
| items | `TransferItem[]` | See type | yes | — | Every item that can be assigned. Values must be unique. |
| labels | `Partial<{ available: string; assigned: string; search: (list: string) => string; selectAll: (list: string) => string; count: (selected: number, total: number) => string; moveSelected: (list: string) => string; moveAll: (list: string) => string; nothingSelected: string; nothingToMove: (list: string) => string; emptyAvailable: string; emptyAssigned: string; noMatch: (query: string) => string; moved: (count: number, list: string) => string; reordered: (label: string, position: number, total: number) => string; reorderHint: string; reorder: (label: string) => string; }> \| undefined` | See type | no | — | Wording for this instance (list titles, counts), over the language pack and `MessagesProvider`. |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for search matching and wording. Default: the nearest `LocaleProvider`. |
| name | `string \| undefined` | See type | no | — | Native form field name: one hidden input per assigned value. |
| onValueChange | `((value: string[]) => void) \| undefined` | See type | no | — | Called with the assigned values (in order) after each move or reorder. |
| orderable | `boolean \| undefined` | false, true | no | false | The assigned list's order is meaningful: rows carry a grip to drag them, and Alt+↑ / Alt+↓ moves the focused row. Reordering is off while the list is searched. An orderable list renders every row; keep it to a few hundred. |
| searchable | `boolean \| undefined` | false, true | no | true | A search field above each list. Default true. |
| value | `string[] \| undefined` | See type | no | — | The assigned values, in order. Controlled while defined. |
