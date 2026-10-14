# Markdown

Assistant prose. GFM markdown, sanitised, with Glass UX semantics: internal links to
entities become context chips, external links say they leave Glass UX, `[^n]` markers become
citation pills, fenced code becomes a CodeBlock and tables take the AI table style.
Prose holds the reading measure (in a conversation, the reading column); code and tables
are wide blocks that break out wider than the text.

`import { Markdown } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/markdown)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| streaming | `boolean \| undefined` | false, true | no | false | Show the caret after the last character while the answer streams in. |
| text | `string` | See type | yes | — | Assistant markdown (GFM). Raw HTML is ignored and the tree is sanitised. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
