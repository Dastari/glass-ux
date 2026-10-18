# RichTextField

Markdown input bound to a string form field, with Field label and reserved validation.

`import { RichTextField } from "glass-ux/rich-text"`

[Live examples](https://dastari.github.io/glass-ux/components/rich-text-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-describedby | `string \| undefined` | See type | no | — | IDs of supporting or validation text. |
| aria-label | `string \| undefined` | See type | no | — | Accessible name for a bare input. |
| aria-labelledby | `string \| undefined` | See type | no | — | IDs providing the accessible name. |
| aside | `ReactNode` | See type | no | — | Right side of the label row: a live value readout or a small link. |
| attachmentAccept | `string \| undefined` | See type | no | — | File picker accept attribute used by the upload adapter. Default unrestricted. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultView | `RichTextView \| undefined` | "visual", "markdown" | no | — | Initial presentation for an uncontrolled view. Default visual. |
| hint | `ReactNode` | See type | no | — | The message line's resting text. Only when the format or consequence is not obvious (R2.8). |
| id | `string \| undefined` | See type | no | — | ID of the active editing surface. Field supplies a label when wrapped. |
| label | `ReactNode` | See type | no | — | Names the control. Omit only when a group legend or `aria-label` names it instead. |
| maxHeight | `number \| undefined` | See type | no | — | Maximum content height, in CSS pixels; longer documents scroll. Default 480. |
| minHeight | `number \| undefined` | See type | no | — | Minimum content height, in CSS pixels. Default 160. Toolbar height is additional. |
| onAttachmentError | `((error: unknown) => void) \| undefined` | See type | no | — | Reports an upload failure to the host instead of the default toast. The Attach button shows the failure in place, its tooltip carries the message and a status region announces it. |
| onError | `((error: Error) => void) \| undefined` | See type | no | — | Receives an editing-engine error; the original Markdown remains available in source view. |
| onViewChange | `((view: RichTextView) => void) \| undefined` | See type | no | — | Called when a person chooses Visual or Markdown. |
| optional | `boolean \| undefined` | false, true | no | — | Marks the label "Optional". Prefer this over marking required fields. |
| placeholder | `string \| undefined` | See type | no | — | Prompt shown in an empty document. Default "Write a document…". |
| readOnly | `boolean \| undefined` | false, true | no | — | Prevent edits while allowing selection, source inspection and normal safe-link opening in a new tab. |
| ref | `Ref<HTMLDivElement \| HTMLTextAreaElement> \| undefined` | See type | no | — | Receives the visible editing surface for focus. |
| required | `boolean \| undefined` | false, true | no | — | Shows the required marker. Pass `required` to the control as well. |
| resize | `boolean \| undefined` | false, true | no | — | Allow vertical resizing of the editing surface between its limits. Default true. |
| sourceView | `boolean \| undefined` | false, true | no | — | Offer the Markdown source view. Labels become named Eye/Code icons before formatting wraps. Default true. |
| spellCheck | `boolean \| undefined` | false, true | no | — | Enable browser spelling checks. Default true. |
| style | `CSSProperties \| undefined` | See type | no | — | Outer layout styles. |
| uploadAttachment | `((file: File) => Promise<RichTextAttachment>) \| undefined` | See type | no | — | Host-owned upload adapter. When supplied, the toolbar offers Attach file. |
| view | `RichTextView \| undefined` | "visual", "markdown" | no | — | Controlled presentation. Default visual; the visual view is directly editable. |
| warning | `ReactNode` | See type | no | — | Non-blocking warning in the reserved message slot; errors take precedence. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
