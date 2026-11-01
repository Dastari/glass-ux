# Typeahead

`glass-ux/typeahead` · [Live component catalogue](https://dastari.github.io/glass-ux/)

A listbox that opens from text, at a caret or any rectangle, while focus stays in the text.
Base UI's menus move focus, which text entry cannot allow, so the highlighted row is exposed
with `aria-activedescendant`. Composer's slash and mention menus and RichTextInput's mentions
use it. It knows nothing about any editor: the host decides when it is open, and with which
rows, and replaces the text on a pick.

```tsx
import { Typeahead, useTypeahead } from "glass-ux/typeahead"

function Mentions({ textRef, trigger, rows, loading, onPick, onClose }) {
  const typeahead = useTypeahead({
    open: Boolean(trigger),
    query: trigger?.query,
    items: rows,
    multiline: true,
    onPick,
    onClose,
  })
  return (
    <>
      <textarea ref={textRef} {...typeahead.textProps} onKeyDown={typeahead.onKeyDown} />
      <Typeahead state={typeahead} anchor={trigger?.rect} label="People" loading={loading} reserveRows={5} />
    </>
  )
}
```

## Rows

Without `filter`, `items` are shown exactly as supplied: the host owns matching, which is the
usual case for a server search. Pass `filter` to have the hook keep the rows that match
`query`. Rows default to `OptionRow` from the item's `label`, `description`, `icon` and `meta`;
`renderItem` draws your own. Items need an `id`, or pass `getId`.

## Anchor

`anchor` is an element, a ref, a rectangle in viewport coordinates or a function returning
one. Use a function when the anchor scrolls. Take the rectangle where the trigger was typed,
not at the moving caret, or the list slides along as the person types.

## Late results

A row never moves under a person who is aiming at it (R9):

- The popup keeps its size and side when `reserveRows` holds the height from the start. Set
  it for any source that answers later.
- Once the pointer has moved over the list, or an arrow key has moved the highlight, rows that
  arrive for the same query join the end and the rest wait. They are shown when the pointer
  leaves, or when the query changes.
- The highlight stays on its item, not its index.
- A pointer left resting where the list opened does not hold anything, and a new query
  replaces the rows at once.

## Detail

`renderDetail` draws the highlighted row's detail in a pane beside the list, and that pane
describes the row (`aria-describedby`). Below 28rem it moves under the list at a fixed height.

## Accessibility

Spread `textProps` on the text element. A single-line input becomes a `combobox` with
`aria-expanded`. Pass `multiline` for a textarea or rich text: it stays a `textbox`, since the
combobox role has no multi-line form and HTML does not allow it on a textarea, and `textbox`
does not support `aria-expanded`. Either way the element carries `aria-autocomplete`,
`aria-haspopup`, `aria-controls` and `aria-activedescendant`. `Typeahead` announces the result
count from a polite region that stays mounted (R20.9).

## Keys

Call `onKeyDown` first from the text element. It returns true when the list used the key.

| Key | Action |
| --- | --- |
| ↑ ↓ | Move the highlight, wrapping |
| Enter, Tab | Pick the highlighted row |
| Esc | Close |

Every other key stays with the text.

## Parts

`TypeaheadPopup` and `TypeaheadOption` are the positioned box and one row, for a list you
draw yourself. Composer uses these to keep its own rows.
