# Masonry

Items of different heights in columns, laid out from the box's width. Every item goes to the
shortest column so far, so the columns stay level without the content reflowing, and the order
of the items is the order of reading: each item's top is at or below the one before it, and
level only further along the row. Tab follows the DOM, which is that order, so focus never
jumps between columns. (CSS `columns` fills a column at a time and breaks exactly this.)

With a ratio for each item, the layout is arithmetic from the width and the ratios, with no
measuring of pictures: nothing moves while they load and the items before an appended one never
move. It renders every item: for a very long list load it in pages, or place the items yourself
with `layoutMasonry` and render only those near the viewport. The first render has no width
to lay out from, so on the server the items are present and hidden until the browser measures.

Right to left starts the columns at the right. Items are `li` in a list, so put a name on it.

`import { Masonry } from "glass-ux/masonry"`

[Live examples](https://dastari.github.io/glass-ux/components/masonry)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Names the list. |
| aria-labelledby | `string \| undefined` | See type | no | — | Names the list by another element, such as a heading. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| columns | `number \| undefined` | See type | no | — | A fixed number of columns, instead of as many as `columnWidth` allows. |
| columnWidth | `(string & {}) \| GridMin \| undefined` | See type | no | "md" | The narrowest a column may be: a named width (`xs` 8rem … `xl` 24rem, as Grid) or any CSS length. As many columns as fit are used. Default `md`. |
| gap | `LayoutGap \| undefined` | "section", "none", 1, 2, 3, 4, 5, "inline", 12, 6, 8, "fields", "controls", "tiles", "panels", "half", 1.5, 2.5, 10, 16 | no | "tiles" | The room between items, a spacing role or a step on the space scale. Default `tiles`. |
| getKey | `((item: T, index: number) => Key) \| undefined` | See type | no | — | A stable key for an item. Default the index, which is right for a list that only grows at the end. |
| getRatio | `((item: T, index: number) => number \| undefined) \| undefined` | See type | no | — | An item's width divided by its height, known before it loads: a picture's pixel size, a video's shape. The item's box is reserved from it, so nothing moves as pictures arrive. An item without one (return `undefined`) is measured after it renders and moves the items after it in its column once its height settles. |
| items | `readonly T[]` | See type | yes | — | The items, in reading order. Appending items never moves the ones before them. |
| maxColumns | `number \| undefined` | See type | no | — | The most columns to use. |
| renderItem | `(item: T, index: number) => ReactNode` | See type | yes | — | Draws one item. It fills the item's box, whose width is the column's and whose height follows `getRatio`. |
