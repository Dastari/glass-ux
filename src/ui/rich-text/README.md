# Rich text

`RichTextInput` edits Markdown visually by default. The optional Markdown view exposes
the source of the same document. `RichTextField` binds the string to TanStack Form with
the shared Field label and reserved validation message. `RichTextSkeleton` reserves the
toolbar and content geometry while a document loads. The editor engine is a lazy import.

```tsx
import { RichTextInput, richTextSchema } from "glass-ux/rich-text";
import {
  Form,
  FormActions,
  FormStack,
  formBehaviour,
  useAppForm,
} from "glass-ux/form";
import { z } from "zod";

const schema = z.object({
  document: richTextSchema({ required: true, maxLength: 4000 }),
});

function DocumentForm() {
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { document: "## Welcome\n\nWrite a **clear handover**." },
    validators: { onDynamic: schema },
    onSubmit: ({ value }) => saveMarkdown(value.document),
  });
  return (
    <Form form={form}>
      <FormStack>
        <form.AppField name="document">
          {(field) => <field.RichTextField label="Document" />}
        </form.AppField>
        <FormActions>
          <form.SubmitButton>Save document</form.SubmitButton>
        </FormActions>
      </FormStack>
    </Form>
  );
}
```

For a bare control, use `value` and `onValueChange`, or supply `defaultValue`. Wrap it in
Field with `nativeLabel={false}`, or give it `aria-label`. `ref` receives the active visual
`HTMLDivElement` or source `HTMLTextAreaElement`; both expose `focus()`. `onBlur` runs when
focus leaves the editor and its toolbar. `readOnly` permits source inspection and selection.
`disabled` disables both editing and the view switch. `invalid` marks a bare control.

The visual subset supports paragraphs, ATX headings 1–6, quotes, fenced code, bold, italic,
strike-through, inline code, ordered/unordered/nested lists, task lists, inline links and
inline images, including image titles. The Block style menu creates headings 1–3, paragraphs,
quotes and code blocks, and announces the selected style. Choose Quote for a paragraph
or type `>` followed by a space; it saves with Markdown’s `>` prefix. Choose Paragraph
to leave the quote. Formatting buttons announce their pressed state. The toolbar uses
Base UI roving focus with Left/Right arrows, and the shared menus/popovers support Escape.
Ctrl/⌘ B and I format text; Ctrl/⌘ Z and Shift Ctrl/⌘ Z undo and redo visual edits. Markdown
shortcuts work in the visual editor. Select source mode to edit tables, reference links,
footnotes, frontmatter and extensions outside the visual subset.

Switching views preserves the supplied Markdown exactly and emits no value change. Visual
content changes emit equivalent Markdown with canonical formatting; unsupported syntax
may be escaped as literal text. External `value` replacements update both views and clear
the previous visual undo history. Raw HTML is shown as text, never interpreted. Neither
HTML nor Lexical JSON is a persistence format for this field.

`minHeight` and `maxHeight` bound content height in CSS pixels (160 and 480 by default),
excluding the toolbar. Content scrolls beyond `maxHeight`. `resize` enables a vertical grip
in either view (default true); host layout can set outer width with `className` or `style`.
The source switch uses the shared Segmented control: labels and Eye/Code icons at wider
widths, then named icons when that keeps formatting on one row. Formatting wraps only when
the remaining width cannot fit its controls. Segmented still owns focus, names and the
adaptive presentation. The skeleton uses the same control geometry and follows those rows.
Spacing, type, borders and corners continue to follow density, UI scale and appearance.

The optional `uploadAttachment(file)` adapter belongs to the application. It uploads a File
and resolves `{ kind: "image" | "link", url, label }`. Images use `label` as alternative text;
other attachments use it as link text. `attachmentAccept` configures the picker. The editor
shows pending feedback and upload errors, and calls `onAttachmentError` for host reporting.
Only syntactically valid HTTP(S) or relative image URLs are displayed. Links additionally
accept mailto: and tel:. Relative paths, queries and #anchors resolve against the current
page. HTTP(S) addresses require `://` and a valid host; whitespace, malformed percent escapes,
backslashes, executable, data and protocol-relative URLs are rejected. The toolbar displays
an error and leaves the document unchanged. A link without selected text uses its address
as readable link text. Imported unsafe destinations remain in Markdown but have no active href.

While editing, an ordinary click places the caret. Use Ctrl/⌘-click, middle-click, or select
the link and choose Edit link → Open link to open it deliberately. Read-only links open on
a normal click; selecting link text does not navigate. Links open in a new tab with
`noopener,noreferrer`. Disabled documents do not activate links. The component owns basic
URL syntax and scheme safety; the application owns trusted-domain rules, authorization,
custom wording and any other business policy.
Applications own storage, authorization, document IDs, revisions and save operations.

`richTextSchema({ required, maxLength })` validates a Markdown string with shared empty and
required semantics. `maxLength` counts UTF-16 code units, including Markdown syntax.
Use the same limits on the server. Tests cover conversion stability, view preservation,
controlled replacements, read-only source, URL safety, formatting, validation and geometry.
