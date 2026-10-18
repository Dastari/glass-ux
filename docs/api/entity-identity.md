# EntityIdentity

Present a host-defined entity with its glyph or avatar, readable name and supporting metadata.

`import { EntityIdentity } from "glass-ux/entity"`

[Live examples](https://dastari.github.io/glass-ux/components/entity-identity)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actions | `ActionSet<T> \| undefined` | See type | no | — | The entity's actions (R12): ActionBar in the header, ⋯ in compact and row, right-click everywhere. |
| count | `EntityCount \| undefined` | See type | no | — | Item count shown by the component. |
| facts | `ReactNode \| readonly string[]` | See type | no | — | Data only (R2.2): model · firmware · IP. An array joins with " · ". |
| fill | `boolean \| undefined` | false, true | no | — | `auto` only: the identity fills a box with a definite height, so height takes part. |
| heading | `EntityHeading \| undefined` | "h1", "h2", "h3", "h4", "p" | no | — | Header and compact title element. Default: h1 for the header, h2 for compact. |
| href | `string \| undefined` | See type | no | — | Where the identity opens. Click and Enter follow it; `onOpen` intercepts plain clicks. |
| icon | `ReactNode` | See type | no | — | The glyph (an icon without a size). Rows and chips always draw the glyph. |
| image | `ReactNode` | See type | no | — | An illustration or image (`<img alt="">`) for the header, compact and icon tiers. |
| kind | `string \| undefined` | See type | no | — | Singular noun for accessible names: "Printer" → "Printer HP-LJ-M480, Printing". |
| maxActions | `number \| undefined` | See type | no | — | Most header buttons (ActionBar maxButtons). |
| metric | `ReactNode` | See type | no | — | One live value for the header (a Metric). Its box is reserved, so updates never shift. |
| name | `string` | See type | yes | — | The entity's name: accessible names, tooltips, menus ("Actions for NST-C106"). |
| onOpen | `(() => void) \| undefined` | See type | no | — | Called with no arguments when the person opens the identity. With `href`, it intercepts plain left clicks (modified clicks follow the link); without it, the title or row becomes a button. |
| onRemove | `(() => void) \| undefined` | See type | no | — | Chip only: a removable chip (composer context) with no link. |
| portrait | `EntityPortrait \| undefined` | See type | no | — | A person in the icon slot at every tier, with the glyph as a corner mark. Beats `image`. |
| preview | `boolean \| undefined` | false, true | no | — | Chip only: open the preview card on hover and focus (default true). |
| secondary | `ReactNode` | See type | no | — | A row's second line. Defaults to the facts. |
| size | `"inline" \| "sm" \| undefined` | "inline", "sm" | no | — | Chip only: inline sits in a prose line box (20px), sm suits rows and the composer (24px). |
| slots | `EntitySlots \| undefined` | See type | no | — | Overrides for named content slots. |
| state | `EntityState \| undefined` | See type | no | — | Controlled view state, including loading, empty and error states. |
| tabs | `ReactNode` | See type | no | — | L2 tabs, header only. |
| target | `T \| undefined` | See type | no | — | The entity the actions run against. |
| tier | `EntityTierProp \| undefined` | "header", "row", "auto", "compact", "icon", "chip" | no | "auto" | A tier, or `auto` (default) to let the container decide on both axes (see tier.ts). |
| title | `ReactNode` | See type | no | — | Rendered instead of the name (search highlights). The name stays the accessible text. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
