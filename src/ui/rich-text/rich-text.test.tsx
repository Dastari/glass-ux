// @vitest-environment jsdom
import { CodeNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
} from "@lexical/markdown";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createEditor } from "lexical";
import {
  afterEach,
  beforeAll,
  afterAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Field } from "../field/index.js";
import { MarkdownImageNode } from "./image-node.js";
import { MARKDOWN_TRANSFORMERS } from "./markdown.js";
import RichTextEditor from "./rich-text-editor.js";
import { RichTextInput } from "./rich-text.js";
import { richTextSchema } from "./schema.js";
import { isSafeRichTextUrl } from "./urls.js";

afterEach(cleanup);
beforeAll(() =>
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  ),
);
afterAll(() => vi.unstubAllGlobals());

function roundTrip(markdown: string) {
  const editor = createEditor({
    namespace: "markdown-test",
    nodes: [
      HeadingNode,
      QuoteNode,
      CodeNode,
      ListNode,
      ListItemNode,
      LinkNode,
      MarkdownImageNode,
    ],
    onError: (error) => {
      throw error;
    },
  });
  editor.update(
    () =>
      $convertFromMarkdownString(
        markdown,
        MARKDOWN_TRANSFORMERS,
        undefined,
        false,
      ),
    { discrete: true },
  );
  return editor
    .getEditorState()
    .read(() =>
      $convertToMarkdownString(MARKDOWN_TRANSFORMERS, undefined, false),
    );
}

describe("Markdown value contract", () => {
  it("inherits invalid state and validation text from a wrapping Field", () => {
    render(
      <Field label="Document" nativeLabel={false} error="Write a document">
        <RichTextEditor value="" />
      </Field>,
    );
    const editor = screen.getByRole("textbox", { name: "Document" });
    expect(editor).toHaveAttribute("aria-invalid", "true");
    expect(editor).toHaveAccessibleDescription("Write a document");
  });
  it("renders normal paragraph spacing without blank source lines becoming empty paragraphs", () => {
    render(
      <RichTextEditor
        aria-label="Document"
        sourceView={false}
        value={"## Guide\n\nFirst paragraph.\n\nSecond paragraph."}
      />,
    );
    expect(
      screen.getByRole("textbox", { name: "Document" }).querySelectorAll("p"),
    ).toHaveLength(2);
  });

  it("retains uncontrolled Markdown edits across visual and source views", async () => {
    render(
      <RichTextInput aria-label="Document" defaultValue="First paragraph." />,
    );
    await screen.findByRole("textbox", { name: "Document" });
    fireEvent.click(
      screen.getByRole("button", { name: "Markdown", exact: true }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Document" }), {
      target: { value: "## New heading\n\n**New paragraph.**" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Visual", exact: true }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("textbox", { name: "Document" }),
      ).toHaveTextContent("New paragraph."),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Markdown", exact: true }),
    );
    expect(screen.getByRole("textbox", { name: "Document" })).toHaveValue(
      "## New heading\n\n**New paragraph.**",
    );
  });
  it.each([
    "## Guide\n\nA **bold**, *italic*, ~~removed~~ and `code` paragraph.",
    "- First\n- Second\n  - Nested\n\n1. One\n2. Two",
    "- [ ] Pending\n- [x] Complete",
    "> A quote\n\n```ts\nconst ready = true\n```",
    '[Support](https://northstar.example/support "Guide")',
    '![Building entrance](https://northstar.example/entrance.png "Main entrance")',
    "line one  \nline two\n\nline three",
  ])("supported Markdown is stable after conversion: %s", (markdown) => {
    const canonical = roundTrip(markdown);
    expect(roundTrip(canonical)).toBe(canonical);
    expect(canonical).toContain(
      markdown.includes("Building")
        ? "Building entrance"
        : (markdown
            .split("\n")[0]
            ?.replace(/^## /, "")
            .replace(/^- \[ \] /, "")
            .replace(/^> /, "")
            .replace(/^- /, "") ?? ""),
    );
  });

  it("preserves exact source when switching views, including unsupported syntax", async () => {
    const markdown =
      "# Heading\n\n| Label | Value |\n| --- | --- |\n| Contact | Mira |\n\n<script>alert(1)</script>\n";
    const change = vi.fn();
    render(
      <Field label="Document" nativeLabel={false}>
        <RichTextEditor value={markdown} onValueChange={change} />
      </Field>,
    );
    expect(screen.getByRole("textbox", { name: "Document" })).toHaveAttribute(
      "contenteditable",
      "true",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Markdown", exact: true }),
    );
    expect(screen.getByRole("textbox", { name: "Document" })).toHaveValue(
      markdown,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Visual", exact: true }),
    );
    expect(screen.getByRole("textbox", { name: "Document" })).toHaveTextContent(
      "Heading",
    );
    expect(change).not.toHaveBeenCalled();
    expect(document.querySelector(".fa-rich-text script")).toBeNull();
  });

  it("accepts external controlled changes without emitting or keeping stale source", async () => {
    const change = vi.fn();
    const { rerender } = render(
      <RichTextEditor
        aria-label="Document"
        value="**First**"
        onValueChange={change}
      />,
    );
    rerender(
      <RichTextEditor
        aria-label="Document"
        value={"## Replacement\n\nFresh text"}
        onValueChange={change}
      />,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("textbox", { name: "Document" }),
      ).toHaveTextContent("Fresh text"),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Markdown", exact: true }),
    );
    expect(screen.getByRole("textbox", { name: "Document" })).toHaveValue(
      "## Replacement\n\nFresh text",
    );
    expect(change).not.toHaveBeenCalled();
  });

  it("keeps read-only source inspectable and disables editing", () => {
    render(
      <RichTextEditor aria-label="Document" value="**Published**" readOnly />,
    );
    expect(screen.getByRole("textbox", { name: "Document" })).toHaveAttribute(
      "contenteditable",
      "false",
    );
    expect(
      screen.getByRole("button", { name: "Bold", exact: true }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Markdown", exact: true }),
    );
    expect(screen.getByRole("textbox", { name: "Document" })).toHaveAttribute(
      "readonly",
    );
  });

  it("reports upload failures without changing the document", async () => {
    const failure = new Error("File storage is unavailable. Try again.");
    const upload = vi.fn().mockRejectedValue(failure);
    const report = vi.fn();
    const change = vi.fn();
    render(
      <RichTextEditor
        aria-label="Document"
        value="Original document"
        uploadAttachment={upload}
        onAttachmentError={report}
        onValueChange={change}
      />,
    );
    const file = new File(["fictional fixture"], "guide.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(screen.getByLabelText("File attachment"), {
      target: { files: [file] },
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      failure.message,
    );
    expect(upload).toHaveBeenCalledWith(file);
    expect(report).toHaveBeenCalledWith(failure);
    expect(change).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Document" })).toHaveTextContent(
      "Original document",
    );
  });

  it("rejects unsafe URLs returned by an attachment adapter", async () => {
    const report = vi.fn();
    render(
      <RichTextEditor
        aria-label="Document"
        value="Original document"
        uploadAttachment={async () => ({
          kind: "image",
          url: "data:image/svg+xml,x",
          label: "Image",
        })}
        onAttachmentError={report}
      />,
    );
    fireEvent.change(screen.getByLabelText("File attachment"), {
      target: {
        files: [
          new File(["fictional fixture"], "guide.svg", {
            type: "image/svg+xml",
          }),
        ],
      },
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "The uploaded file needs a safe HTTP(S) or relative URL",
    );
    expect(report).toHaveBeenCalledOnce();
    expect(document.querySelector(".fa-rich-text img")).toBeNull();
  });

  it("validates empty and maximum-length Markdown with the shared form rule", () => {
    expect(richTextSchema().safeParse("").success).toBe(true);
    expect(richTextSchema({ required: true }).safeParse(" \n ").success).toBe(
      false,
    );
    expect(richTextSchema({ maxLength: 4 }).safeParse("guide").success).toBe(
      false,
    );
    expect(
      richTextSchema({ required: true, maxLength: 10 }).safeParse("**Guide**")
        .success,
    ).toBe(true);
  });
});

describe("URL policy", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,x",
    "//host/path",
    "java\nscript:alert(1)",
    "\\host\\path",
  ])("rejects unsafe insertion: %s", (url) =>
    expect(isSafeRichTextUrl(url)).toBe(false),
  );
  it.each([
    "https://northstar.example",
    "http://localhost/guide",
    "/files/guide.pdf",
    "../guide",
    "#heading",
    "mailto:mira@northstar.example",
    "tel:+61355550100",
  ])("accepts links: %s", (url) => expect(isSafeRichTextUrl(url)).toBe(true));
  it("does not display data URLs or email addresses as images", () => {
    expect(isSafeRichTextUrl("data:image/svg+xml,x", true)).toBe(false);
    expect(isSafeRichTextUrl("mailto:mira@northstar.example", true)).toBe(
      false,
    );
    expect(isSafeRichTextUrl("/images/entrance.png", true)).toBe(true);
  });
});
