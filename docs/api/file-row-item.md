# FileRowItem

One downloadable file: type glyph, name, size and type, and a download button.

`import { FileRowItem } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/file-row-item)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| file | `ResultFile` | See type | yes | — | The file to list: `name` and `mime` pick the glyph and type, `size` is in bytes, and `href` makes the button a download link. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
