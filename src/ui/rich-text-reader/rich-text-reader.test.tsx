// @vitest-environment jsdom
import { cleanup, configure, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { RichTextReader } from "./rich-text-reader.js"

afterEach(cleanup)

// The first render waits for the Markdown renderer to import, which takes a while on a loaded machine.
configure({ asyncUtilTimeout: 20_000 })

/** The renderer loads on demand; a document's text shows only once it has. */
async function read(element: React.ReactElement) {
  const view = render(element)
  await waitFor(() => expect(view.container.querySelector(".fa-ai-md")).not.toBeNull())
  return view.container
}

const hrefOf = (container: HTMLElement, text: string) => within(container).getByText(text).closest("a")?.getAttribute("href") ?? null

describe("RichTextReader", () => {
  it("holds the plain text until the renderer arrives, then replaces it", async () => {
    const { container } = render(<RichTextReader value={"# Title\n\nBody"} />)
    expect(container.querySelector(".fa-rich-text-reader-plain")?.textContent).toBe("# Title\n\nBody")
    await waitFor(() => expect(container.querySelector("h1")?.textContent).toBe("Title"))
    expect(container.querySelector(".fa-rich-text-reader-plain")).toBeNull()
  })

  it("has no toolbar, well or editing surface", async () => {
    const container = await read(<RichTextReader value={"Some **text**"} />)
    expect(container.querySelector("[contenteditable], [role=toolbar], textarea, button, .fa-control, .fa-rich-text")).toBeNull()
    expect(screen.queryByRole("textbox")).toBeNull()
  })

  it("draws a table as a table, every row of it, in a named region that takes focus", async () => {
    const rows = Array.from({ length: 30 }, (_, index) => `| Row ${index} | ${index} |`).join("\n")
    const container = await read(<RichTextReader value={`| Name | Count |\n| --- | ---: |\n${rows}`} />)
    expect(container.textContent).not.toContain("|")
    expect(container.querySelectorAll("tbody tr")).toHaveLength(30)
    const region = screen.getByRole("region", { name: "Table" })
    expect(region.getAttribute("tabindex")).toBe("0")
    expect(region.hasAttribute("data-capped")).toBe(false)
    expect(region.querySelector("table")?.style.getPropertyValue("--_columns")).toBe("2")
  })

  it("numbers tables and code apart when a name repeats, and restores a name that stops repeating", async () => {
    const two = "| A |\n| - |\n| 1 |\n\nBetween\n\n| B |\n| - |\n| 2 |"
    const code = "\n\n```sh\none\n```\n\nAnd\n\n```sh\ntwo\n```"
    const { rerender } = render(<RichTextReader value={two + code} />)
    await waitFor(() => expect(screen.getByRole("region", { name: "Table 1" })).toBeTruthy())
    expect(screen.getByRole("region", { name: "Table 2" })).toBeTruthy()
    const names = [...document.querySelectorAll("[role=region][aria-label], section[aria-label]")].map((region) => region.getAttribute("aria-label"))
    expect(new Set(names).size).toBe(names.length)
    rerender(<RichTextReader value={"| A |\n| - |\n| 1 |\n\nBetween"} />)
    await waitFor(() => expect(screen.getByRole("region", { name: "Table" })).toBeTruthy())
  })

  it("draws task lists with their state named", async () => {
    await read(<RichTextReader value={"- [x] First\n- [ ] Second"} />)
    expect(screen.getByRole("checkbox", { name: "Done" }).getAttribute("aria-checked")).toBe("true")
    expect(screen.getByRole("checkbox", { name: "Not done" }).getAttribute("aria-checked")).toBe("false")
  })

  it("ignores raw HTML", async () => {
    const container = await read(<RichTextReader value={'Before\n\n<script>window.hacked = 1</script>\n\n<img src="https://example.com/x.png" onerror="window.hacked = 1">\n\n<a href="https://example.com" onclick="x()">raw</a> text\n\nAfter'} />)
    expect(container.querySelector("script, [onerror], [onclick], a")).toBeNull()
    expect(container.querySelector("img")).toBeNull()
    expect(container.textContent).toContain("After")
  })

  it.each([
    ["javascript:alert(1)"],
    ["JaVaScRiPt:alert(1)"],
    ["data:text/html,hi"],
    ["vbscript:x"],
    ["file:///etc/passwd"],
    ["//example.com/path"],
    ["https://bank.example@example.com/"],
    ["https:/\\example.com"],
    ["ftp://example.com/"],
  ])("keeps the text of a link to %s and gives it no address", async (url) => {
    const container = await read(<RichTextReader value={`[Click here](${url.replaceAll("\\", "\\\\")})`} />)
    expect(container.querySelector("a")).toBeNull()
    expect(container.textContent).toContain("Click here")
  })

  it("opens safe links in a new tab, and hands mail and phone addresses over", async () => {
    const container = await read(<RichTextReader value={"[Web](https://example.com/a) [Plain](http://example.com/b) [Near](/guides/a) [Mail](mailto:a@example.com) [Call](tel:+61255501234)"} />)
    for (const [text, href] of [["Web", "https://example.com/a"], ["Plain", "http://example.com/b"], ["Near", "/guides/a"]] as const) {
      const link = within(container).getByText(text).closest("a")!
      expect(link.getAttribute("href")).toBe(href)
      expect(link.getAttribute("target")).toBe("_blank")
      expect(link.getAttribute("rel")).toBe("noopener noreferrer")
    }
    for (const [text, href] of [["Mail", "mailto:a@example.com"], ["Call", "tel:+61255501234"]] as const) {
      const link = within(container).getByText(text).closest("a")!
      expect(link.getAttribute("href")).toBe(href)
      expect(link.hasAttribute("target")).toBe(false)
    }
  })

  it("draws images from safe addresses without a referrer, and alternative text otherwise", async () => {
    const container = await read(<RichTextReader value={'![Plan](https://example.com/plan.png "North") and ![Blocked](data:image/png;base64,AAAA) and ![Script](javascript:alert(1))'} />)
    const images = container.querySelectorAll("img")
    expect(images).toHaveLength(1)
    expect(images[0]!.getAttribute("src")).toBe("https://example.com/plan.png")
    expect(images[0]!.getAttribute("alt")).toBe("Plan")
    expect(images[0]!.getAttribute("title")).toBe("North")
    expect(images[0]!.getAttribute("referrerpolicy")).toBe("no-referrer")
    expect(images[0]!.getAttribute("loading")).toBe("lazy")
    expect(container.textContent).toContain("Blocked")
    expect(container.textContent).toContain("Script")
  })

  it("loads nothing from a document's addresses with images off", async () => {
    const container = await read(<RichTextReader images={false} value={"![Plan](https://example.com/plan.png)"} />)
    expect(container.querySelector("img")).toBeNull()
    expect(container.textContent).toContain("Plan")
  })

  it("gives headings ids and makes fragments jump, unless anchors is off", async () => {
    const first = await read(<RichTextReader value={"## Site access\n\n[Jump](#site-access)"} />)
    expect(first.querySelector("h2")?.id).toBe("site-access")
    expect(hrefOf(first, "Jump")).toBe("#site-access")
    cleanup()
    const second = await read(<RichTextReader anchors={false} value={"## Site access\n\n[Jump](#site-access)"} />)
    expect(second.querySelector("h2")?.id).toBe("")
    expect(hrefOf(second, "Jump")).toBeNull()
  })

  it("keeps footnotes as footnotes, each link with its target", async () => {
    const container = await read(<RichTextReader value={"A claim[^1] and [^plain] text.\n\n[^1]: The source."} />)
    expect(container.textContent).toContain("The source.")
    expect(container.textContent).toContain("[^plain]")
    expect(container.querySelector(".fa-ai-citation, [data-citation]")).toBeNull()
    const reference = container.querySelector<HTMLAnchorElement>("sup a")!
    const note = container.querySelector(reference.getAttribute("href")!)
    expect(note?.textContent).toContain("The source.")
    const back = within(container).getByRole("link", { name: "Back to reference 1" })
    expect(container.querySelector(back.getAttribute("href")!)).toBe(reference)
  })

  it("names its scrolling region, by default and as asked, and is no region when it does not scroll", async () => {
    const plain = await read(<RichTextReader value="Text" />)
    expect(plain.querySelector("[role=region], [tabindex]")).toBeNull()
    cleanup()
    await read(<RichTextReader value="Text" maxHeight={200} />)
    const region = screen.getByRole("region", { name: "Document" })
    expect(region.getAttribute("tabindex")).toBe("0")
    cleanup()
    await read(<RichTextReader value="Text" maxHeight={200} aria-label="Handover" />)
    expect(screen.getByRole("region", { name: "Handover" })).toBeTruthy()
    cleanup()
    await read(
      <>
        <h2 id="named">Named</h2>
        <RichTextReader value="Text" maxHeight={200} aria-labelledby="named" />
      </>,
    )
    expect(screen.getByRole("region", { name: "Named" })).toBeTruthy()
    cleanup()
    await read(<RichTextReader value="Text" aria-label="Short note" />)
    expect(screen.getByRole("region", { name: "Short note" }).getAttribute("tabindex")).toBeNull()
  })

  it("passes on the host's attributes and classes", async () => {
    const container = await read(<RichTextReader value="Text" id="doc" className="mine" data-kind="guide" style={{ color: "red" }} />)
    const root = container.querySelector<HTMLElement>(".fa-rich-text-reader")!
    expect(root.id).toBe("doc")
    expect(root.classList.contains("mine")).toBe(true)
    expect(root.dataset.kind).toBe("guide")
    expect(root.style.color).toBe("red")
  })

  it("shows a new value in place", async () => {
    const { container, rerender } = render(<RichTextReader value="First" />)
    await waitFor(() => expect(container.querySelector(".fa-ai-md p")?.textContent).toBe("First"))
    rerender(<RichTextReader value="Second" />)
    await waitFor(() => expect(container.querySelector(".fa-ai-md p")?.textContent).toBe("Second"))
    expect(container.querySelector(".fa-rich-text-reader-plain")).toBeNull()
  })
})
