import { useState } from "react";
import { z } from "zod";
import {
  ContainerLab,
  Rules,
  SectionPage,
  Specimen,
  SwapSlot,
  TokenTable,
} from "../kit.js";
import { Button } from "../../ui/button/index.js";
import { Field } from "../../ui/field/index.js";
import {
  Form,
  FormActions,
  FormStack,
  formBehaviour,
  useAppForm,
} from "../../ui/form/index.js";
import {
  RichTextInput,
  RichTextSkeleton,
  richTextSchema,
} from "../../ui/rich-text/index.js";
import { Usage } from "./inputs.kit.js";

const DOCUMENT = `## Northstar welcome guide

Check the **site contact** before changing a device. Keep the handover *clear and brief*.

- Record the device name
- Link the [support guide](https://northstar.example/support)
- Add the next step

> Leave enough detail for the next technician.

Use \`device status\` to check the connection.
`;

function DocumentDemo() {
  const [markdown, setMarkdown] = useState(DOCUMENT);
  return (
    <div
      className="flex w-full min-w-0 flex-col gap-3"
      data-testid="rich-text-demo"
    >
      <Field
        label="Welcome guide"
        nativeLabel={false}
        hint="Markdown source is saved."
      >
        <RichTextInput
          value={markdown}
          onValueChange={setMarkdown}
          minHeight={220}
          maxHeight={420}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setMarkdown(DOCUMENT)}>
          Reset document
        </Button>
        <Button
          size="sm"
          onClick={() =>
            setMarkdown(
              "## Updated guide\n\nThis document was replaced by its owner.",
            )
          }
        >
          Load another document
        </Button>
      </div>
      <details>
        <summary>Persisted Markdown</summary>
        <pre className="gallery-usage" data-testid="rich-text-markdown">
          {markdown}
        </pre>
      </details>
    </div>
  );
}

const schema = z.object({
  document: richTextSchema({ required: true, maxLength: 4000 }),
});
function DocumentForm() {
  const [saved, setSaved] = useState("");
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { document: "" },
    validators: { onDynamic: schema },
    onSubmit: ({ value }) => {
      setSaved(value.document);
    },
  });
  return (
    <div className="w-full" data-testid="rich-text-form-demo">
      <Form form={form} aria-label="Document form">
        <FormStack>
          <form.AppField name="document">
            {(field) => (
              <field.RichTextField
                label="Document"
                hint="Write the handover and save its Markdown."
                minHeight={160}
                maxHeight={320}
              />
            )}
          </form.AppField>
          <FormActions>
            <form.SubmitButton>Save document</form.SubmitButton>
            <form.CancelButton />
          </FormActions>
        </FormStack>
      </Form>
      {saved ? (
        <div role="status">
          Saved Markdown:
          <pre className="gallery-usage" data-testid="rich-text-saved">
            {saved}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function AttachmentDemo() {
  return (
    <Field
      label="Supporting files"
      nativeLabel={false}
      hint="Demo upload adapter returns a fictional file link. Applications supply storage and authorization."
    >
      <RichTextInput
        defaultValue="Attach a guide or image to this document."
        uploadAttachment={async (file) => ({
          kind: "link",
          url: `https://files.northstar.example/${encodeURIComponent(file.name)}`,
          label: file.name,
        })}
        minHeight={120}
        maxHeight={240}
      />
    </Field>
  );
}

function QuoteDemo() {
  const [markdown, setMarkdown] = useState(
    "> Keep the original speaker’s wording clear.\n\nAdd your response below the quotation.",
  );
  return (
    <div
      className="flex w-full min-w-0 flex-col gap-3"
      data-testid="rich-text-quote-demo"
    >
      <Field
        label="Quoted passage"
        nativeLabel={false}
        hint="Choose Block style → Quote to quote a paragraph, or Paragraph to return to body text."
      >
        <RichTextInput
          value={markdown}
          onValueChange={setMarkdown}
          minHeight={120}
          maxHeight={240}
        />
      </Field>
      <details>
        <summary>Persisted Markdown</summary>
        <pre className="gallery-usage" data-testid="rich-text-quote-markdown">
          {markdown}
        </pre>
      </details>
    </div>
  );
}

export default function RichTextSection() {
  return (
    <SectionPage>
      <Specimen
        title="Edit a document"
        description="Visual editing is the default. Select text to format it, change the paragraph style, or use Ctrl/⌘ B and I. Markdown source is another presentation of the same value."
        layout="stack"
      >
        <DocumentDemo />
      </Specimen>
      <Specimen
        title="In a form"
        description="Validation starts when focus leaves the complete editor. Empty documents are rejected; saving receives a Markdown string."
        layout="stack"
      >
        <DocumentForm />
      </Specimen>
      <Specimen
        title="Quoted text"
        description="Quote paragraphs with the Block style menu or type > followed by a space. Quotations stay editable and save as Markdown blockquotes."
        layout="stack"
      >
        <QuoteDemo />
      </Specimen>
      <Specimen
        title="Attachments"
        description="A host upload adapter adds image or file URLs to Markdown. Glass UX does not store files or grant upload authority."
        layout="stack"
      >
        <AttachmentDemo />
      </Specimen>
      <Specimen title="States" layout="stack">
        <Field label="Empty document" nativeLabel={false}>
          <RichTextInput minHeight={100} maxHeight={220} />
        </Field>
        <Field
          label="Invalid document"
          nativeLabel={false}
          error="Write a document"
        >
          <RichTextInput invalid minHeight={100} maxHeight={220} />
        </Field>
        <Field label="Read-only document" nativeLabel={false}>
          <RichTextInput
            defaultValue={
              "## Published guide\n\nRead, select or inspect the **Markdown source**. Open the [support guide](https://northstar.example/support)."
            }
            readOnly
            minHeight={100}
            maxHeight={220}
          />
        </Field>
        <Field label="Disabled document" nativeLabel={false}>
          <RichTextInput
            defaultValue="This guide is unavailable while the workspace loads. [Support guide](https://northstar.example/support)."
            disabled
            minHeight={100}
            maxHeight={220}
          />
        </Field>
        <Field label="Visual only" nativeLabel={false}>
          <RichTextInput
            sourceView={false}
            defaultValue="A compact **visual editor** with the same Markdown value."
            minHeight={100}
            maxHeight={220}
          />
        </Field>
      </Specimen>
      <Specimen
        title="Loading geometry"
        description="The skeleton retains the toolbar and content height."
        layout="stack"
      >
        <SwapSlot
          id="rich-text-loading"
          skeleton={<RichTextSkeleton minHeight={160} />}
          loaded={
            <RichTextInput
              defaultValue="The **document** is ready."
              minHeight={160}
              maxHeight={160}
            />
          }
        />
      </Specimen>
      <ContainerLab
        presets={[
          { id: "tile", label: "Tile 280×320", width: 280, height: 320 },
          { id: "pane", label: "Pane 720×480", width: 720, height: 480 },
          { id: "tall", label: "Tall narrow 240×640", width: 240, height: 640 },
        ]}
        description="Formatting buttons wrap within the container; the source switch adapts with Segmented. Content scrolls after its maximum height, and either view can be resized vertically."
      >
        <div className="p-2">
          <RichTextInput
            aria-label="Container document"
            defaultValue={
              "## Shared guide\n\nA paragraph with **bold text**, a [link](https://northstar.example) and a next step."
            }
            minHeight={100}
            maxHeight={180}
          />
        </div>
      </ContainerLab>
      <Usage
        code={`import { RichTextInput, richTextSchema } from "glass-ux/rich-text"\n\nconst schema = z.object({ document: richTextSchema({ required: true, maxLength: 4000 }) })\n\n<form.AppField name="document">\n  {(field) => <field.RichTextField label="Document" />}\n</form.AppField>\n\n<RichTextInput value={markdown} onValueChange={setMarkdown} />`}
      />
      <Specimen
        title="Markdown support"
        layout="stack"
        description="Paragraphs, headings, quotes, fenced code, inline formatting, ordered, unordered and task lists, links and images. The paragraph menu creates headings 1–3."
      >
        <p>
          Switching views preserves the supplied source exactly. Visual edits
          emit equivalent Markdown with canonical formatting. Raw HTML is never
          rendered. Tables, reference links, footnotes, frontmatter and other
          extensions are available as literal source; use Markdown view when
          authoring those constructs.
        </p>
      </Specimen>
      <Rules
        do={[
          "Save the Markdown string and let the host own document revisions and file storage.",
          "Use RichTextField in typed forms and label bare inputs.",
          "Use Markdown view for syntax outside the documented visual subset.",
          "Provide meaningful alternative text for images.",
        ]}
        dont={[
          "Persist Lexical JSON or HTML as this field's value.",
          "Treat an upload adapter as permission to access a file or storage service.",
          "Use links with executable or data URL schemes.",
        ]}
      />
      <TokenTable
        tokens={[
          ["--control-px-md", "Content inset"],
          ["--radius-control", "Editor corners"],
          ["--border-width", "Editor and toolbar line weight"],
          ["--type-body-line", "Document line height"],
          ["--accent-text", "Links and active formatting"],
        ]}
      />
    </SectionPage>
  );
}
