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
| size | `EntityChipSize \| undefined` | "inline", "sm" | no | "inline" | inline: inside prose (20px, sits in the line box) · sm: rows, composer, cards (24px). |
| variant | `"chip" \| "plain" \| undefined` | "chip", "plain" | no | "chip" | chip: a soft pill (prose, composer) · plain: glyph and name only (table cells, lists). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
