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
| anchors | `boolean \| undefined` | false, true | no | false | Give headings GitHub-style ids (`## R1 · Consistency` → `#r1--consistency`, repeats suffixed `-1`, `-2`) and render `#fragment` links as in-page links. For documents read at length; leave it off for messages, where several on one page would repeat ids and a fragment link has no target. Default false: fragment links render as plain text. |
| streaming | `boolean \| undefined` | false, true | no | false | Show the caret after the last character while the answer streams in. |
| text | `string` | See type | yes | — | Assistant markdown (GFM). Raw HTML is ignored and the tree is sanitised. |
| wrapTableCells | `boolean \| undefined` | false, true | no | false | Wrap table text within the available column widths and show every row (the page scrolls). Default false uses single-line cells with truncation tooltips and caps long tables in a scroll box; use true for readable documents. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
