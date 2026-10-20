# EntityChip

A Glass UX entity mentioned by the assistant, the user or the composer: glyph (with the
endpoint's live status dot), name, and one data meta (ticket state, version). It is a
link: click navigates, hover or focus opens a preview card, right-click (Shift+F10)
opens the entity's actions — the same definition as its own page (R12).

`import { EntityChip } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/entity-chip)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| entity | `EntityRef` | See type | yes | — | Entity reference supplied by the host. |
| glyph | `boolean \| undefined` | false, true | no | true | Draw the entity glyph (off when a tile beside it already shows it). |
| onRemove | `(() => void) \| undefined` | See type | no | — | Render a removable, non-navigating chip (composer context, picked entities). |
| preview | `boolean \| undefined` | false, true | no | true | Show the preview card on hover and focus (default for links). |
| size | `EntityChipSize \| undefined` | "sm", "inline" | no | "inline" | inline: inside prose (20px, sits in the line box) · sm: rows, composer, cards (24px). |
| variant | `"chip" \| "plain" \| undefined` | "chip", "plain" | no | "chip" | chip: a soft pill (prose, composer) · plain: glyph and name only (table cells, lists). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLSpanElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
