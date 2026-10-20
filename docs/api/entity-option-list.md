# EntityOptionList

The option rows for entity search (the composer's

`import { EntityOptionList } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/entity-option-list)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| active | `number` | See type | yes | — | Marks the current destination or active choice. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| empty | `string \| undefined` | See type | no | "No matches" | Content shown when there are no matching items. |
| id | `string` | See type | yes | — | A stable element or component identifier. |
| onActive | `(index: number) => void` | See type | yes | — | Called with the zero-based index of the row under the pointer. Pair with `active` to move the highlight. |
| onPick | `(entity: EntityRef) => void` | See type | yes | — | Called with the entity the person clicks or presses Enter or Space on; adding or removing the pick is up to the caller. |
| options | `EntityRef[]` | See type | yes | — | The available choices, including their values and visible labels. |
| query | `string \| undefined` | See type | no | "" | The text being searched for; matches are emphasised. |
| selected | `(entity: EntityRef) => boolean` | See type | yes | — | The selected state or collection. |
