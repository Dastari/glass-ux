# RichTextInput

A Markdown document with an editable visual view and optional source view. The toolbar
uses Glass UX Button, Segmented, Menu and Popover controls. Supports paragraphs,
headings, quotes, fenced code, bold, italic, inline code, strike-through, lists,
task lists, links and inline images. Choose Quote from Block style for Markdown blockquotes.
Plain link clicks place the editing caret; Ctrl/⌘-click, middle-click or the link popover's
Open link action opens a safe destination separately. Read-only links open on a normal click.
HTTP(S), mailto:, tel: and relative destinations are syntax checked; applications own
allowed-domain and other business policies. Unsupported syntax remains available in source.
The editing engine loads only when this component renders.

`import { RichTextInput } from "glass-ux/rich-text"`

[Live examples](https://dastari.github.io/glass-ux/components/rich-text-input)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-describedby | `string \| undefined` | See type | no | — | IDs of supporting or validation text. |
| aria-label | `string \| undefined` | See type | no | — | Accessible name for a bare input. |
| aria-labelledby | `string \| undefined` | See type | no | — | IDs providing the accessible name. |
| attachmentAccept | `string \| undefined` | See type | no | — | File picker accept attribute used by the upload adapter. Default unrestricted. |
| className | `string \| undefined` | See type | no | — | Outer layout classes. |
| defaultValue | `string \| undefined` | See type | no | "" | Initial Markdown when the host does not control value. Default empty. |
| defaultView | `RichTextView \| undefined` | "visual", "markdown" | no | — | Initial presentation for an uncontrolled view. Default visual. |
| disabled | `boolean \| undefined` | false, true | no | — | Disable editing, link activation, toolbar controls and source switching. |
| id | `string \| undefined` | See type | no | — | ID of the active editing surface. Field supplies a label when wrapped. |
| invalid | `boolean \| undefined` | false, true | no | — | Mark a bare input invalid; RichTextField derives this from validation. |
| maxHeight | `number \| undefined` | See type | no | 480 | Maximum content height, in CSS pixels; longer documents scroll. Default 480. |
| minHeight | `number \| undefined` | See type | no | 160 | Minimum content height, in CSS pixels. Default 160. Toolbar height is additional. |
| name | `string \| undefined` | See type | no | — | Native form field name; its value is Markdown. |
| onAttachmentError | `((error: unknown) => void) \| undefined` | See type | no | — | Reports an upload failure to the host instead of the default toast. The Attach button shows the failure in place, its tooltip carries the message and a status region announces it. |
| onBlur | `((event: FocusEvent<HTMLDivElement>) => void) \| undefined` | See type | no | — | Called when focus leaves the complete editor, including its toolbar. |
| onError | `((error: Error) => void) \| undefined` | See type | no | — | Receives an editing-engine error; the original Markdown remains available in source view. |
| onValueChange | `((markdown: string) => void) \| undefined` | See type | no | — | The next Markdown after an edit. View changes do not rewrite the document. |
| onViewChange | `((view: RichTextView) => void) \| undefined` | See type | no | — | Called when a person chooses Visual or Markdown. |
| placeholder | `string \| undefined` | See type | no | — | Prompt shown in an empty document. Default "Write a document…". |
| readOnly | `boolean \| undefined` | false, true | no | — | Prevent edits while allowing selection, source inspection and normal safe-link opening in a new tab. |
| ref | `Ref<HTMLDivElement \| HTMLTextAreaElement> \| undefined` | See type | no | — | Receives the visible editing surface for focus. |
| required | `boolean \| undefined` | false, true | no | — | Announce that the document is required. Validate with richTextSchema. |
| resize | `boolean \| undefined` | false, true | no | — | Allow vertical resizing of the editing surface between its limits. Default true. |
| sourceView | `boolean \| undefined` | false, true | no | — | Offer the Markdown source view. Labels become named Eye/Code icons before formatting wraps. Default true. |
| spellCheck | `boolean \| undefined` | false, true | no | — | Enable browser spelling checks. Default true. |
| style | `CSSProperties \| undefined` | See type | no | — | Outer layout styles. |
| uploadAttachment | `((file: File) => Promise<RichTextAttachment>) \| undefined` | See type | no | — | Host-owned upload adapter. When supplied, the toolbar offers Attach file. |
| value | `string \| undefined` | See type | no | — | Controlled Markdown source. HTML and editor JSON are never emitted. |
| view | `RichTextView \| undefined` | "visual", "markdown" | no | — | Controlled presentation. Default visual; the visual view is directly editable. |
