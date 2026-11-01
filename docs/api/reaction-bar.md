# ReactionBar

Reactions with counts, each a toggle named for what it says: "2 people reacted with thumbs
up", pressed when one of them is the current person. The bar is one tab stop (R11.5) and
arrow keys move along it in reading order. The add control comes first, so a reaction
arriving at the end moves nothing. The picker loads on demand when it first opens.

`import { ReactionBar } from "glass-ux/reaction-bar"`

[Live examples](https://dastari.github.io/glass-ux/components/reaction-bar)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Names the bar. Default "Reactions". |
| defaultReactions | `readonly Reaction[] \| undefined` | See type | no | [] | The reactions at first when uncontrolled. The bar counts the person's own changes itself. |
| disabledReason | `string \| undefined` | See type | no | — | Why this person cannot react now. Reactions and the add control stay, disabled, and show it (R12.3). |
| onReactionsChange | `((reactions: readonly Reaction[], change: ReactionChange) => void) \| undefined` | See type | no | — | Called when a person adds or removes a reaction, with the next reactions and the change. |
| picker | `boolean \| undefined` | false, true | no | true | Offer the add control. Without it people only join the reactions already drawn. Default true. |
| reactions | `readonly Reaction[] \| undefined` | See type | no | — | The reactions, controlled, in the order to draw them. |
| readOnly | `boolean \| undefined` | false, true | no | false | Show the counts with no way to react: no buttons and no add control. |
| suggested | `readonly string[] \| undefined` | See type | no | COMMON | Emoji offered first in the picker. Default 👍 ❤️ 😄 🎉 😮 😢. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
