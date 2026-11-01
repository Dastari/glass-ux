# Diff view

`glass-ux/diff-view` · [Live component catalogue](https://dastari.github.io/glass-ux/)

A unified diff for any text: configuration, a policy or a document. Removed lines sit on one
tint and added lines on another, with the sign in the gutter so a change reads without colour.

```tsx
import { DiffView } from "glass-ux/diff-view"

<DiffView
  label="storage.conf"
  lines={[
    { type: "context", text: "[archive]", before: 41, after: 41 },
    { type: "remove", text: "retention = 30" },
    { type: "add", text: "retention = 90" },
  ]}
/>
```

Lines are numbered from 1. Where a hunk starts further in, give `before` and `after`, and later
lines count on from them. `diffText(lines)` gives the plain text for a copy action.

`label` names the change, and the region is announced with the counts of added and removed
lines. Both line numbers show in a wide box and drop below 25rem, leaving the sign and the text.
The numbers are `--fg-muted`, which meets 4.5:1 on the plain, add and remove surfaces.
Long lines scroll sideways and the region takes keyboard focus for that (R20.6). DiffView draws
every line it is given; a very long diff needs a virtualised list of your own, which can match
it through the tokens below. Code keeps the page's direction: pass `dir="ltr"` for source text
in a right-to-left application.

## Tokens

| Role | Purpose |
| --- | --- |
| `--code-add-tint` | The fill of an added line |
| `--code-remove-tint` | The fill of a removed line |
| `--code-add-text` | The sign of an added line |
| `--code-remove-text` | The sign of a removed line |

They follow mode and material, including a surface's own `data-glass` level. Text on these
tints meets AA in every palette and mode on the library's surfaces.

## Accessibility

The diff is a named table of rows inside a named region. The sign is read as "Added" or
"Removed"; `addedLabel` and `removedLabel` change those words. Line numbers stay out of what is
read aloud.
