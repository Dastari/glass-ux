# TypeaheadOption

One row of a typeahead. A press does not take focus from the text, and the highlight
follows pointer movement, not hover, so a list scrolling under a still pointer leaves it
where the keyboard put it.

`import { TypeaheadOption } from "glass-ux/typeahead"`

[Live examples](https://dastari.github.io/glass-ux/components/typeahead-option)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| active | `boolean` | false, true | yes | — | Whether this is the highlighted row. |
| children | `ReactNode` | See type | yes | — | The row's content, usually `OptionRow`. |
| className | `string \| undefined` | See type | no | "fa-item" | Row classes. Default: the shared menu row. |
| describedBy | `string \| undefined` | See type | no | — | The id of the text describing the row. |
| index | `number` | See type | yes | — | The row's position. |
| listId | `string` | See type | yes | — | The listbox id. Rows are `${listId}-${index}`, which `aria-activedescendant` names. |
| onActive | `(index: number) => void` | See type | yes | — | Called with the row's index as the pointer moves over it. |
| onPick | `() => void` | See type | yes | — | Called on a click, Enter or Space. |
| selected | `boolean \| undefined` | false, true | no | active | Whether the row is selected. Default: while it is highlighted. Pass a value when the list marks picks. |
