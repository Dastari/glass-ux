# IconPicker

A searchable grid of icons. The grid is one tab stop: arrow keys move through it in reading
order, Home and End go to its ends, Enter or Space picks, and typing returns to the search. ↓
enters the grid from the search, and Enter there picks the first result. Searches match names
and the words people use for an icon (GPU finds ground-power).

`import { IconPicker } from "glass-ux/icon-picker"`

[Live examples](https://dastari.github.io/glass-ux/components/icon-picker)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| autoFocus | `boolean \| undefined` | false, true | no | false | Focus the search when the picker mounts. |
| defaultValue | `string \| null \| undefined` | See type | no | null | The chosen icon when uncontrolled. |
| icons | `readonly IconCatalogueEntry[] \| undefined` | See type | no | iconCatalogue | The icons to offer, in order. Default every icon (`iconCatalogue`); pass a filtered copy to offer fewer. |
| onValueChange | `((name: string) => void) \| undefined` | See type | no | — | Called with the name a person picks by click, Enter or Space. |
| value | `string \| null \| undefined` | See type | no | — | The chosen icon's name ("air-start"), controlled; null for none. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
