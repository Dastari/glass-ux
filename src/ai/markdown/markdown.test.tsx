// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { headingSlug, Markdown, splitMarkdownBlocks } from "./markdown.js"

// A leading link reference definition renders nothing but makes the text unsplittable,
// which yields the single-document parse used as the reference.
const WHOLE = "[glass-ux-reference]: #\n\n"

const fixtures = [
  "Intro paragraph with **bold** and `code`.\n\n## Heading\n\nSecond paragraph [^2] with an [external link](https://example.com).\n\n---\n\nLast line",
  "- one\n- two\n\n- loose three\n\n  continued item\n\nAfter the list\n\n3. third\n4. fourth\n\n1) paren\n\nDone",
  "Code follows:\n\n```ts\nconst a = 1\n\nconst b = 2\n```\n\n~~~\ntilde\n\n~~~\n\nText after `fences`.\n\n````md\n```\ninner\n```\n````\n\nEnd",
  "> quoted\n> still quoted\n\n> second quote\n\n| Name | Value |\n| ---- | ----: |\n| A | 1 |\n| B | 2 |\n\nParagraph\n\n    indented code\n\n    more indented\n\nTail",
  "Setext\n===\n\n* * *\n\n![Diagram](https://example.com/a.png)\n\n- [ ] task\n- [x] done\n\n#\n\n> \n\n*emphasis* line\n\n[](https://example.com)\n\nfinal",
  "Answer\n\n```\nunclosed fence\n\nstill code",
  "1. outer\n   - nested\n\n     nested para\n\n2. second\n\nPlain\r\n\r\nWindows lines\r\n\r\n<b>inline html</b> text\n\n<!-- comment\n\nhidden -->\n\nAfter",
  "Cited [^1] claim\n\nMore\n\n[^1]: The source",
]

function html(text: string, streaming: boolean) {
  // useId values depend on tree position, not content.
  return renderToStaticMarkup(<Markdown text={text} streaming={streaming} />).replace(/_R_[A-Za-z0-9]*_/g, "_id_")
}

describe("Markdown streaming segments", () => {
  it("splits only at blank lines that close every block", () => {
    expect(splitMarkdownBlocks("a\n\nb")).toEqual(["a", "b"])
    expect(splitMarkdownBlocks("- a\n\n- b")).toEqual(["- a\n\n- b"])
    expect(splitMarkdownBlocks("```\na\n\nb\n```\n\nc")).toEqual(["```\na\n\nb\n```", "c"])
    expect(splitMarkdownBlocks("a [x]\n\n[x]: #")).toEqual(["a [x]\n\n[x]: #"])
    // Appending text leaves completed pieces unchanged, so their memoised parse is reused.
    expect(splitMarkdownBlocks("a\n\nb\n\nc grows").slice(0, 2)).toEqual(splitMarkdownBlocks("a\n\nb\n\nc").slice(0, 2))
  })

  it("renders every streamed prefix exactly as one parse of the whole text", () => {
    for (const fixture of fixtures) {
      for (let length = 0; length <= fixture.length; length += 1) {
        const prefix = fixture.slice(0, length)
        for (const streaming of [false, true]) {
          expect(html(prefix, streaming), JSON.stringify({ prefix, streaming })).toBe(
            html(WHOLE + prefix, streaming),
          )
        }
      }
    }
  }, 60_000)
})

describe("Markdown anchors", () => {
  it("slugs headings as GitHub does", () => {
    expect(headingSlug("R1 · Consistency")).toBe("r1--consistency")
    expect(headingSlug("0.6 → 0.7")).toBe("06--07")
    expect(headingSlug("Before you ship")).toBe("before-you-ship")
  })

  it("leaves fragment links and heading ids off by default", () => {
    const { container } = render(<Markdown text={"## Intro\n\n[Jump](#intro)"} />)
    expect(container.querySelector("h2")?.id).toBe("")
    expect(container.querySelector('a[href="#intro"]')).toBeNull()
  })

  it("links fragments to numbered heading ids across segments", () => {
    const text = "## Required changes\n\nOne\n\n## Required changes\n\nTwo\n\n[Second](#required-changes-1)"
    const { container } = render(<Markdown anchors text={text} />)
    expect([...container.querySelectorAll("h2")].map((h) => h.id)).toEqual(["required-changes", "required-changes-1"])
    expect(container.querySelector('a[href="#required-changes-1"]')?.textContent).toBe("Second")
  })
})
