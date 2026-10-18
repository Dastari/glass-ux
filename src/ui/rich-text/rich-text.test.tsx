// @vitest-environment jsdom
import { CodeNode } from "@lexical/code";
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
import { MARKDOWN_LINK_NODES } from "./link-node.js";

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
      ...MARKDOWN_LINK_NODES,
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

  it.each([
    "docs/guide?x=1",
    "?mode=1",
    "#section",
    "/guide",
    "mailto:mira@northstar.example",
    "tel:+61355550100",
  ])(
    "preserves a safe imported destination in the DOM and Markdown: %s",
    async (url) => {
      const markdown = `[Support](${url})`;
      const change = vi.fn();
      render(
        <RichTextEditor
          aria-label="Document"
          value={markdown}
          onValueChange={change}
        />,
      );
      const link = screen.getByRole("link", { name: "Support" });
      expect(link).toHaveAttribute("href", url);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(roundTrip(markdown)).toBe(markdown);
      fireEvent.click(
        screen.getByRole("button", { name: "Markdown", exact: true }),
      );
      expect(screen.getByRole("textbox", { name: "Document" })).toHaveValue(
        markdown,
      );
      expect(change).not.toHaveBeenCalled();
    },
  );

  it.each([
    "javascript:alert",
    "sms:+61355550100",
    "https:",
    "https://",
    "//northstar.example",
    "https://bad%host",
  ])(
    "keeps unsafe imported source while removing its active href: %s",
    (url) => {
      const markdown = `[Blocked](${url})`;
      render(
        <RichTextEditor aria-label="Document" value={markdown} readOnly />,
      );
      const link = screen.getByText("Blocked").closest("a");
      expect(link).not.toHaveAttribute("href");
      expect(link).toHaveAttribute("aria-disabled", "true");
      fireEvent.click(
        screen.getByRole("button", { name: "Markdown", exact: true }),
      );
      expect(screen.getByRole("textbox", { name: "Document" })).toHaveValue(
        markdown,
      );
    },
  );

  it("suppresses accidental editing navigation and permits deliberate safe activation", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const { rerender } = render(
      <RichTextEditor aria-label="Document" value="[Support](/guide)" />,
    );
    const link = screen.getByRole("link", { name: "Support" });
    expect(fireEvent.click(link)).toBe(false);
    expect(open).not.toHaveBeenCalled();
    fireEvent.click(link, { ctrlKey: true });
    fireEvent.click(link, { metaKey: true });
    fireEvent(
      link,
      new MouseEvent("auxclick", {
        bubbles: true,
        cancelable: true,
        button: 1,
      }),
    );
    expect(open).toHaveBeenCalledTimes(3);
    expect(open).toHaveBeenLastCalledWith(
      "/guide",
      "_blank",
      "noopener,noreferrer",
    );
    rerender(
      <RichTextEditor
        aria-label="Document"
        value="[Support](/guide)"
        readOnly
      />,
    );
    // A read-only click remains uncancelled so the native anchor owns navigation.
    expect(fireEvent.click(link)).toBe(true);
    rerender(
      <RichTextEditor
        aria-label="Document"
        value="[Support](/guide)"
        disabled
      />,
    );
    expect(fireEvent.click(link, { ctrlKey: true })).toBe(false);
    expect(open).toHaveBeenCalledTimes(3);
    rerender(
      <RichTextEditor aria-label="Document" value="[Support](/guide)" />,
    );
    fireEvent.click(link);
    expect(open).toHaveBeenCalledTimes(3);
    fireEvent.click(link, { metaKey: true });
    expect(open).toHaveBeenCalledTimes(4);
    open.mockRestore();
  });

  it("honours a host's capture handler before deliberate link activation", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(
      <div onClickCapture={(event) => event.preventDefault()}>
        <RichTextEditor aria-label="Document" value="[Support](/guide)" />
      </div>,
    );
    fireEvent.click(screen.getByRole("link", { name: "Support" }), {
      ctrlKey: true,
    });
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it.each(["readOnly", "disabled"] as const)(
    "closes an open link form and rejects stale actions when %s changes",
    async (mode) => {
      const change = vi.fn();
      const { rerender } = render(
        <RichTextEditor
          aria-label="Document"
          value="Original document"
          onValueChange={change}
        />,
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Edit link", exact: true }),
      );
      const address = await screen.findByRole("textbox", {
        name: "Link address",
      });
      fireEvent.change(address, {
        target: { value: "https://northstar.example" },
      });
      const apply = screen.getByRole("button", { name: "Apply link" });
      rerender(
        <RichTextEditor
          aria-label="Document"
          value="Original document"
          onValueChange={change}
          {...{ [mode]: true }}
        />,
      );
      fireEvent.click(apply);
      await waitFor(() =>
        expect(
          screen.queryByRole("textbox", { name: "Link address" }),
        ).toBeNull(),
      );
      expect(
        screen.getByRole("textbox", { name: "Document" }),
      ).toHaveTextContent("Original document");
      expect(change).not.toHaveBeenCalled();
    },
  );

  it.each(["readOnly", "disabled"] as const)(
    "closes an open block menu and rejects stale Quote actions when %s changes",
    async (mode) => {
      const change = vi.fn();
      const { rerender } = render(
        <RichTextEditor
          aria-label="Document"
          value="Original document"
          onValueChange={change}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: /^Block style:/ }));
      const quote = await screen.findByRole("menuitemradio", {
        name: "Quote",
        exact: true,
      });
      rerender(
        <RichTextEditor
          aria-label="Document"
          value="Original document"
          onValueChange={change}
          {...{ [mode]: true }}
        />,
      );
      fireEvent.click(quote);
      await waitFor(() =>
        expect(
          screen.queryByRole("menuitemradio", { name: "Quote", exact: true }),
        ).toBeNull(),
      );
      expect(
        screen
          .getByRole("textbox", { name: "Document" })
          .querySelector("blockquote"),
      ).toBeNull();
      expect(change).not.toHaveBeenCalled();
    },
  );

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
    // The status region is mounted before the failure so the message is announced.
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();
    const file = new File(["fictional fixture"], "guide.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(screen.getByLabelText("File attachment"), {
      target: { files: [file] },
    });
    await waitFor(() => expect(status).toHaveTextContent(failure.message));
    // The failure is shown in place on the Attach button, not as an inserted row.
    expect(document.querySelector(".fa-rich-text-status[data-error]")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Attach file" }),
    ).toHaveAttribute("data-status", "error");
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
    "https:",
    "https://",
    "https:/northstar.example",
    "https:///northstar.example",
    "https://?path",
    "http:northstar.example",
    "https://bad%host",
    "https://northstar.example:999999/",
    "https://northstar.example/a%2",
    "https://northstar.example/a\\b",
    "https://northstar.example/a b",
    "mailto:",
    "mailto:missing-address",
    "tel:",
    "tel:letters",
    "sms:+61355550100",
    "123:malformed",
    "mailto:a%0Ab@northstar.example",
    "mailto:a%09b@northstar.example",
    "mailto:a%C2%85b@northstar.example",
    "/docs/\u0085guide",
    "tel:%2A",
    "tel:%2D",
    "tel:%28%29",
    "tel:*;ext=1",
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
    "tel:55550100;ext=123",
    "https://northstar.example/a%20b?q=1#heading",
    "https://[::1]:443/path",
    "HTTPS://NORTHSTAR.EXAMPLE",
    "docs/guide?x=1",
    "?mode=1",
    "mailto:mira@northstar.example?subject=Guide",
    "mailto:?subject=Guide",
    "mailto:mira@northstar.example?body=Hello%0AWorld",
  ])("accepts links: %s", (url) => expect(isSafeRichTextUrl(url)).toBe(true));
  it("does not display data URLs or email addresses as images", () => {
    expect(isSafeRichTextUrl("data:image/svg+xml,x", true)).toBe(false);
    expect(isSafeRichTextUrl("mailto:mira@northstar.example", true)).toBe(
      false,
    );
    expect(isSafeRichTextUrl("/images/entrance.png", true)).toBe(true);
  });
});
