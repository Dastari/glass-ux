# Masonry

`glass-ux/masonry` · [Live component catalogue](https://dastari.github.io/glass-ux/)

Items of different heights in columns, as many columns as the container's width allows. Each item
goes to the shortest column so far.

```tsx
import { Masonry } from "glass-ux/masonry"

<Masonry
  aria-label="Photographs"
  items={photos}
  getKey={(photo) => photo.id}
  getRatio={(photo) => photo.width / photo.height}
  columnWidth="sm"
  renderItem={(photo) => <Image src={photo.src} alt={photo.alt} ratio={photo.width / photo.height} />}
/>
```

- **Approach:** measured arithmetic, not CSS. From the container's width and each item's ratio the
  layout computes every position, and writes it as a logical inset and a size. With a ratio for every
  item nothing is measured, so nothing moves while pictures load (R9), and appending items never moves
  the earlier ones. An item without a ratio (`getRatio` returns `undefined`) is measured after it
  renders; once its height settles the items after it in its column move. Everything is re-laid out when the width, the
  narrowest column or the gap changes.
- **Columns:** `columnWidth` is the narrowest a column may be, a named width (`xs`…`xl`, as Grid) or any
  CSS length; `columns` fixes the count and `maxColumns` caps it. `gap` takes a spacing role or space step.
- **Tab order matches reading order.** CSS `columns` fills one column at a time, so Tab runs down
  column one, then column two, though the eye reads across. Here the DOM is the order of the items, and
  because each goes to the shortest column its top is never above the one before it (and level with it
  only further along the row). So the DOM order is the order of reading and no `order`, `tabindex` or
  reordered markup is needed. Keep one control per item (a button or link inside the `li`), and give the
  list a name.
- **Right to left:** positions are logical, so the first column is at the right and the order of
  reading follows it. Items do not mirror.
- **Limit:** every item is rendered. That suits hundreds; for a feed, append pages (earlier items stay
  put). To window a very long list, call `layoutMasonry(count, options, heightOf)` yourself, it is
  pure, and render only the items near the viewport at the positions it returns.
- **Server rendering:** the first render has no width to lay out from, so the items are in the HTML but
  hidden until the browser measures, before first paint.
- **Combining:** put a button around an `Image` in each item and open a `Lightbox` from it, see the
  catalogue.
- **Words:** it has none of its own.
