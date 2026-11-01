# ReactionBar

`glass-ux/reaction-bar` ·
[Live component catalogue](https://dastari.github.io/glass-ux/components/reaction-bar)

Emoji reactions with counts. Each is a toggle named for what it says ("2 people reacted with thumbs
up"), pressed when the current person is one of them.

```tsx
import { ReactionBar } from "glass-ux/reaction-bar"

<ReactionBar
  reactions={reactions}
  onReactionsChange={(next, { emoji, reacted }) => {
    setReactions(next)
    api.react(id, emoji, reacted)
  }}
/>
```

- **State.** `reactions` is controlled. With `defaultReactions` the bar counts the person's own
  changes itself. The host owns the people and the real totals.
- **Names.** 👍 ❤️ 😄 🎉 😮 😢 have translated names. For any other emoji pass `label`, or a screen
  reader reads the emoji. `people` adds a tooltip of who reacted, in the locale's list format.
- **Unavailable.** `readOnly` draws counts with no controls; `disabledReason` keeps them, disabled,
  with the reason. `picker={false}` removes the add control.
- **Stability.** The add control comes first, so a reaction arriving at the end moves nothing.
- **Keyboard.** One tab stop (R11.5): arrow keys move in reading order, Enter or Space toggles.
- **Size.** The picker's code and data load when it first opens.
