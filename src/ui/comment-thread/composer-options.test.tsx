// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CommentThread } from "./comment-thread.js"
import type { CommentComposerOptions, CommentDraft, CommentEntry } from "./types.js"

// The editor's engine is not under test: a textarea stands in for it, with the same value contract.
vi.mock("../rich-text/index.js", () => ({
  RichTextInput: ({ value, onValueChange, "aria-label": label, disabled }: { value: string; onValueChange: (next: string) => void; "aria-label": string; disabled?: boolean }) => (
    <textarea aria-label={label} value={value} disabled={disabled} onChange={(event) => onValueChange(event.target.value)} />
  ),
}))

afterEach(cleanup)

// jsdom does not lay out, so it has no scrollIntoView; the thread calls it when a reply closes.
Element.prototype.scrollIntoView = () => undefined

const MIRA = { id: "mira", name: "Mira Rowan" }
const NOOR = { id: "noor", name: "Noor Haddad" }
const ME = { id: "me", name: "Avery Quinn" }
const AT = Date.UTC(2026, 2, 12, 9)
const COMMENTS: CommentEntry[] = [
  { id: "a", author: MIRA, body: "First", at: AT, choice: "client" },
  { id: "b", author: NOOR, body: "Second", at: AT },
]
const body = (comment: CommentEntry) => comment.body
const NOTES: CommentComposerOptions = {
  defaultChoice: (parent) => parent?.choice ?? "team",
  renderControl: ({ choice, setChoice, parent, disabled }) => (
    <button type="button" disabled={disabled} onClick={() => setChoice(choice === "team" ? "client" : "team")}>
      {`${parent ? `Reply to ${parent.author.name}` : "Thread"} is ${choice}`}
    </button>
  ),
  sendLabel: ({ choice }) => (choice === "client" ? "Add client note" : "Add team note"),
}
const permissions = { comment: true, forComment: () => ({ reply: true }) }
const type = (name: string, text: string) => fireEvent.change(screen.getByRole("textbox", { name }), { target: { value: text } })

describe("CommentThread composer options", () => {
  it("keeps its controls and the word Send without options", () => {
    render(<CommentThread comments={COMMENTS} renderBody={body} currentUser={ME} permissions={{ comment: true }} />)
    expect(screen.getByRole("button", { name: "Send" })).toBeTruthy()
    expect(document.querySelector(".fa-comment-composer-control")).toBeNull()
  })

  it("takes a fixed send label", () => {
    render(<CommentThread comments={COMMENTS} renderBody={body} currentUser={ME} permissions={{ comment: true }} composer={{ sendLabel: "Post" }} />)
    expect(screen.getByRole("button", { name: "Post" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Send" })).toBeNull()
  })

  it("changes the send label with the composer's choice", () => {
    render(<CommentThread comments={COMMENTS} renderBody={body} currentUser={ME} permissions={permissions} composer={NOTES} />)
    expect(screen.getByRole("button", { name: "Add team note" })).toBeTruthy()
    act(() => screen.getByRole("button", { name: "Thread is team" }).click())
    expect(screen.getByRole("button", { name: "Add client note" })).toBeTruthy()
  })

  it("sends the choice in the draft, keeps it after a send and leaves it out when there is none", async () => {
    const drafts: CommentDraft[] = []
    const { unmount } = render(<CommentThread comments={COMMENTS} renderBody={body} currentUser={ME} permissions={permissions} composer={NOTES} onSubmit={(draft) => void drafts.push(draft)} />)
    act(() => screen.getByRole("button", { name: "Thread is team" }).click())
    type("Write a comment", "Note")
    await act(async () => screen.getByRole("button", { name: "Add client note" }).click())
    expect(drafts).toEqual([{ body: "Note", parentId: null, choice: "client" }])
    expect(screen.getByRole("button", { name: "Thread is client" })).toBeTruthy()
    unmount()
    drafts.length = 0
    render(<CommentThread comments={COMMENTS} renderBody={body} currentUser={ME} permissions={permissions} onSubmit={(draft) => void drafts.push(draft)} />)
    type("Write a comment", "Plain")
    await act(async () => screen.getByRole("button", { name: "Send" }).click())
    expect(drafts).toEqual([{ body: "Plain", parentId: null }])
    expect(Object.keys(drafts[0]!)).not.toContain("choice")
  })

  it("gives a reply composer its own choice, starting from its parent, apart from the thread's", async () => {
    const drafts: CommentDraft[] = []
    render(<CommentThread comments={COMMENTS} renderBody={body} currentUser={ME} permissions={permissions} composer={NOTES} onSubmit={(draft) => void drafts.push(draft)} />)
    act(() => screen.getByRole("button", { name: "Reply to Mira Rowan" }).click())
    const replying = screen.getByRole("button", { name: "Reply to Mira Rowan is client" })
    expect(screen.getByRole("button", { name: "Thread is team" })).toBeTruthy()
    act(() => replying.click())
    expect(screen.getByRole("button", { name: "Reply to Mira Rowan is team" })).toBeTruthy()
    // The other composer is untouched, in both directions.
    act(() => screen.getByRole("button", { name: "Thread is team" }).click())
    expect(screen.getByRole("button", { name: "Reply to Mira Rowan is team" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Thread is client" })).toBeTruthy()
    type("Reply to Mira Rowan", "Reply text")
    const branch = document.querySelector<HTMLElement>(".fa-comment-branch")!
    await act(async () => within(branch).getByRole("button", { name: "Add team note" }).click())
    expect(drafts).toEqual([{ body: "Reply text", parentId: "a", choice: "team" }])
    // A reply composer starts again when it next opens; the thread's holds what it had.
    act(() => screen.getByRole("button", { name: "Reply to Mira Rowan" }).click())
    expect(screen.getByRole("button", { name: "Reply to Mira Rowan is client" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Thread is client" })).toBeTruthy()
  })

  it("tells the control when the composer is unavailable", () => {
    render(<CommentThread comments={COMMENTS} renderBody={body} currentUser={ME} permissions={{ comment: "Locked" }} composer={NOTES} />)
    expect((screen.getByRole("button", { name: "Thread is team" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("keeps the choice through a failed send and a retry", async () => {
    const drafts: CommentDraft[] = []
    let fail = true
    render(
      <CommentThread
        defaultComments={[]}
        renderBody={body}
        currentUser={ME}
        permissions={permissions}
        composer={NOTES}
        renderBadges={(comment) => comment.choice ?? null}
        onSubmit={(draft) => {
          drafts.push(draft)
          if (fail) throw new Error("Offline")
        }}
      />,
    )
    act(() => screen.getByRole("button", { name: "Thread is team" }).click())
    type("Write a comment", "Note")
    await act(async () => screen.getByRole("button", { name: "Add client note" }).click())
    expect(screen.getByText("Not sent")).toBeTruthy()
    expect(document.querySelector(".fa-comment-badges")?.textContent).toBe("client")
    // Changing the composer afterwards does not change what the retry sends.
    act(() => screen.getByRole("button", { name: "Thread is client" }).click())
    fail = false
    await act(async () => screen.getByRole("button", { name: "Retry" }).click())
    expect(drafts.map((draft) => draft.choice)).toEqual(["client", "client"])
    expect(document.querySelector(".fa-comment-badges")?.textContent).toBe("client")
  })

  it("does not let Escape in the control close an empty reply, and Escape in the editor still does", () => {
    render(<CommentThread comments={COMMENTS} renderBody={body} currentUser={ME} permissions={permissions} composer={NOTES} />)
    act(() => screen.getByRole("button", { name: "Reply to Mira Rowan" }).click())
    fireEvent.keyDown(screen.getByRole("button", { name: "Reply to Mira Rowan is client" }), { key: "Escape" })
    expect(screen.getByRole("textbox", { name: "Reply to Mira Rowan" })).toBeTruthy()
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Reply to Mira Rowan" }), { key: "Escape" })
    expect(screen.queryByRole("textbox", { name: "Reply to Mira Rowan" })).toBeNull()
  })
})

describe("CommentThread comment slots", () => {
  it("draws badges in the head and attachments under the text, on replies too", () => {
    const replied: CommentEntry = { ...COMMENTS[0]!, replies: [{ id: "r", author: ME, body: "Reply", at: AT }] }
    render(<CommentThread comments={[replied]} renderBody={body} renderBadges={(comment) => <em>{`badge ${comment.id}`}</em>} renderAttachments={(comment) => <a href="#f">{`file ${comment.id}`}</a>} />)
    for (const id of ["a", "r"]) {
      const row = document.querySelector<HTMLElement>(`[data-comment-id="${id}"]`)!
      expect(row.querySelector(".fa-comment-head .fa-comment-badges")?.textContent).toBe(`badge ${id}`)
      expect(row.querySelector(".fa-comment-body + .fa-comment-attachments")?.textContent).toBe(`file ${id}`)
    }
  })

  it("adds no box when a slot has nothing, and nothing without slots", () => {
    const { rerender } = render(<CommentThread comments={COMMENTS} renderBody={body} renderBadges={() => null} renderAttachments={() => false} />)
    expect(document.querySelector(".fa-comment-badges, .fa-comment-attachments")).toBeNull()
    rerender(<CommentThread comments={COMMENTS} renderBody={body} />)
    expect(document.querySelector(".fa-comment-badges, .fa-comment-attachments")).toBeNull()
  })

  it("does not ask for either on a deleted comment", () => {
    const seen: string[] = []
    render(
      <CommentThread
        comments={[{ ...COMMENTS[0]!, deleted: true }, COMMENTS[1]!]}
        renderBody={body}
        renderBadges={(comment) => {
          seen.push(comment.id)
          return "x"
        }}
        renderAttachments={(comment) => {
          seen.push(comment.id)
          return "y"
        }}
      />,
    )
    expect(new Set(seen)).toEqual(new Set(["b"]))
  })
})
