# ComboboxPopup

The glass list shared by Combobox, MultiSelect and TagInput: a polite live count, the
list state (refresh line, first-load skeleton rows, error with Retry, "type more"),
the empty row, options (grouped when they name a group) and the "N more" footer.

`import { ComboboxPopup } from "glass-ux/combobox"`

[Live examples](https://dastari.github.io/glass-ux/components/combobox-popup)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| check | `boolean \| undefined` | false, true | no | true | Reserve the ✓ column (single and multiple choice). |
| empty | `((query: string) => ReactNode) \| undefined` | See type | no | noMatches | Text for the empty row; receives the current query. |
| items | `OptionItem<V>[]` | See type | yes | — | The collection rendered by the component. Stable identifiers preserve selection and keyboard focus. |
| loading | `boolean \| undefined` | false, true | no | false | Show skeleton rows (static lists loading from elsewhere). |
| query | `string` | See type | yes | — | Current search text or typed query state. |
| search | `OptionSearch<V> \| undefined` | See type | no | — | The async search, when the list comes from a source. |
