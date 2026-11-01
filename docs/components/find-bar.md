# Find bar

`glass-ux/find-bar` · [Live component catalogue](https://dastari.github.io/glass-ux/)

A find control for logs, tables and long documents: a term, options through a slot, a match
count, previous and next, and an optional replace row. It holds no search logic. The host
owns matching and tells the bar what it found.

```tsx
import { FindBar } from "glass-ux/find-bar"

<FindBar
  open={open}
  onOpenChange={setOpen}
  value={term}
  onValueChange={setTerm}
  matchCount={matches.length}
  matchIndex={current}
  searching={running}
  onNext={goToNext}
  onPrevious={goToPrevious}
  toggles={<MatchCaseToggle />}
/>
```

## What the host supplies

- `matchCount`: the matches found so far. Leave it undefined until there is something to count.
- `matchIndex`: the current match, from 0.
- `searching`: the search is still running and the count may climb.
- `onNext`, `onPrevious`: move the host's current match.
- `toggles`: options such as match case, whole word or a pattern. The bar draws them and
  knows nothing about them; the host owns their state and their meaning.
- `onReplace`, `onReplaceAll`: supplying either offers the replace row. Both receive the
  replacement text.

## Count

The count's width is reserved for its widest form, so a climbing count moves nothing (R9.1).
While `searching`, it shows "128+". From 10,000 it abbreviates ("12K"), which keeps it inside
the reserved width.

A polite region that stays mounted announces the outcome once typing pauses (R20.9). The
climbing total is never announced: while the search runs it says "Searching…" once, or the
current match on its own, then the result when it settles.

## Focus

The term takes focus and selects its text when `open` turns true. A bar that mounts open
leaves focus alone unless you pass `autoFocus`, which suits `{open && <FindBar autoFocus />}`.
Closing returns focus to `returnFocusRef`, or else to the element that had focus before the
bar did (R20.3). Open the bar from your own shortcut, for example `useHotkeys("mod+f", …)`.

## Keys

| Key | In the term | In the replace field |
| --- | --- | --- |
| Enter | Next match | Replace the current match |
| Shift+Enter | Previous match | |
| Esc | Close and return focus | Close and return focus |

## Floating

`floating` places the bar on overlay glass at the top end of the nearest positioned ancestor.
Make that ancestor a wrapper around the scroller, not the scroller itself, or the bar scrolls
away with the content. It keeps clear of the scrollbar and the top scroll edge, so the edge's
hairline stays visible (R5.8). Give the scroller `scroll-padding-block-start` so that a match
you reveal with `scrollIntoView` is not left under the bar, and allow for two rows in a box
narrower than 28rem.

```tsx
<div className="relative">
  <div className="overflow-auto" style={{ scrollPaddingBlockStart: "4rem" }}>{log}</div>
  <FindBar floating {...find} />
</div>
```

Below 28rem the options and count move to a second row, so the term keeps a usable width.
