# RichTextReader

`glass-ux/rich-text-reader` ·
[Live component catalogue](https://dastari.github.io/glass-ux/components/rich-text-reader)

A Markdown document to read, with no toolbar, well or editor. It takes the same string as
[`RichTextInput`](rich-text.md), so one screen can swap between them, and its type and heading steps
match the editor's content. It sits on whatever holds it: use a Panel for a surface.

```tsx
import { RichTextReader } from "glass-ux/rich-text-reader"

<RichTextReader value={markdown} />
<RichTextReader value={markdown} maxHeight={480} aria-label="Handover" />
```

Use it where a person reads and does not edit. A `readOnly` `RichTextInput` stays the choice when
the source view matters, or when the same control turns editable in place: it keeps its toolbar
and well, and its visual view shows tables as lines of pipes.

| Prop                            | Default | Result                                                                     |
| ------------------------------- | ------- | -------------------------------------------------------------------------- |
| `value`                         |         | The document as Markdown.                                                  |
| `maxHeight`                     | none    | Past this height, in CSS pixels, the document scrolls in a focusable region. |
| `anchors`                       | `true`  | Headings take ids; `#fragment` links and footnotes jump. Turn it off when several readers share a page. |
| `images`                        | `true`  | Draws images. `false` shows their alternative text.                        |
| `aria-label`, `aria-labelledby` |         | Names the document, as a region. A scrolling one is "Document" otherwise.  |

Other attributes go to the root element.

## What it draws

Tables keep every row and wrap their text. A column keeps a readable width, and past the box the
table scrolls sideways in its own focusable region, so a phone gets a scroller rather than a column
of broken words. Task lists show their state, named Done or Not done. Fenced code is a CodeBlock with
its copy button, and footnotes link both ways.

## Loading

The entry is separate from `glass-ux/rich-text`, so an application using only the input loads neither
this code nor its stylesheets. The Markdown renderer and its parser load when a reader first renders,
and until they arrive the plain text holds the place. An image reserves no height until it loads,
since Markdown does not say how large it is.

## Untrusted documents

It runs the sanitised Markdown pipeline: raw HTML is dropped, not shown. Links and images follow
[the editor's address rules](rich-text.md), and an address with credentials in it
(`https://bank.example@host/`) is also refused. A refused address keeps its text and has no link; a
refused image shows its alternative text. Safe links open in a new tab with `noopener noreferrer`;
`mailto:` and `tel:` hand over without one.

Images load with no referrer, but loading one still tells the address's owner that someone opened
the document. For Markdown from authors you do not trust, pass `images={false}`. Trusted-domain rules
remain the application's.
