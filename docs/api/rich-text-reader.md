# RichTextReader

A Markdown document to read: no toolbar, no well and no editor. Tables, task lists, code,
footnotes and images draw fully, which the editor's visual view does not do for tables. Links
follow the editor's address rules and open in a new tab; anything unsafe keeps its text and
loses its address. The renderer loads when this component first renders, and until then the
plain text holds the place.

`import { RichTextReader } from "glass-ux/rich-text-reader"`

[Live examples](https://dastari.github.io/glass-ux/components/rich-text-reader)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| anchors | `boolean \| undefined` | false, true | no | true | Give headings GitHub-style ids and make `#fragment` links and footnotes jump within the page. Set false when several readers share a page and their ids would repeat. Default true. |
| images | `boolean \| undefined` | false, true | no | true | Draw images. False shows their alternative text, so a document from an untrusted author loads nothing from an address it chose. Default true. |
| maxHeight | `number \| undefined` | See type | no | — | Longest height in CSS pixels, past which the document scrolls in a focusable region. Default none: the document takes the height it needs and whatever holds it scrolls. |
| value | `string` | See type | yes | — | The document as Markdown (GFM): the same string RichTextInput edits. Raw HTML is ignored and the tree is sanitised. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
