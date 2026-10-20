# CitationMarker

A footnote marker in assistant text (`[^2]`): a small numbered pill. Hover or focus
names the source; activating it opens the source (external sources in a new tab).

`import { CitationMarker } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/citation-marker)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| index | `number` | See type | yes | — | The footnote number, matched against `index` in the message's sources; an unmatched number renders as a plain superscript. |
