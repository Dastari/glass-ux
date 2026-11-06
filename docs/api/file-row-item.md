# FileRowItem

One downloadable file: type glyph, name, size and type, and a download button.

`import { FileRowItem } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/file-row-item)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| as | `"div" \| "li" \| undefined` | "div", "li" | no | "li" | The row's element. `li` must sit directly under a `ul` or `ol`; use `div` for a row outside a list. |
| file | `ResultFile` | See type | yes | — | The file to list: `name` and `mime` pick the glyph and type, `size` is in bytes, and `href` makes the button a download link. |
