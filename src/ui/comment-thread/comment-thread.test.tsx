// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { CommentThread } from "./comment-thread.js"
import type { CommentEntry, CommentPermissions } from "./types.js"

afterEach(cleanup)

const MIRA = { id: "mira", name: "Mira Rowan" }
const ME = { id: "me", name: "Avery Quinn" }
const AT = Date.UTC(2026, 2, 12, 9)
const COMMENTS: CommentEntry[] = [
  { id: "a", author: MIRA, body: "First", at: AT, replies: [{ id: "b", author: ME, body: "Reply", at: AT }] },
  { id: "c", author: ME, body: "Second", at: AT, reactions: [{ emoji: "👍", count: 1 }] },
]
const body = (comment: CommentEntry) => comment.body

describe("CommentThread", () => {
  it("has no controls without permissions, and shows reactions as counts", () => {
    render(<CommentThread comments={COMMENTS} renderBody={body} />)
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.getByRole("img", { name: "1 person reacted with thumbs up" })).toBeTruthy()
  })

  it("names the thread for its anchor, and counts its comments", () => {
    render(<CommentThread comments={COMMENTS} anchor="Plan, page 3" renderBody={body} />)
    expect(screen.getByRole("region", { name: "Comments on Plan, page 3" })).toBeTruthy()
    render(<CommentThread comments={COMMENTS} renderBody={body} />)
    expect(screen.getByText("3 comments")).toBeTruthy()
  })

  it("offers each ability a comment has, and a reason for one unavailable", () => {
    const permissions: CommentPermissions = {
      forComment: (comment) => (comment.id === "a" ? { reply: true, edit: "Editing has closed" } : {}),
    }
    render(<CommentThread comments={COMMENTS} renderBody={body} permissions={permissions} />)
    expect(screen.getAllByRole("button", { name: /^Reply to/ })).toHaveLength(1)
    expect(screen.getAllByRole("button", { name: /^Comment actions/ })).toHaveLength(1)
  })

  it("never offers a reply to a reply", () => {
    render(<CommentThread comments={COMMENTS} renderBody={body} permissions={{ forComment: () => ({ reply: true }) }} />)
    expect(screen.getAllByRole("button", { name: /^Reply to/ })).toHaveLength(2)
    expect(screen.queryByRole("button", { name: "Reply to Avery Quinn" })).toBeTruthy()
    const reply = screen.getByText("Reply").closest("article")!
    expect(within(reply).queryByRole("button", { name: /^Reply to/ })).toBeNull()
  })

  it("shows a deleted comment's place, with its replies", () => {
    render(<CommentThread comments={[{ ...COMMENTS[0]!, deleted: true }]} renderBody={body} />)
    expect(screen.getByText("Comment deleted")).toBeTruthy()
    expect(screen.queryByText("First")).toBeNull()
    expect(screen.getByText("Reply")).toBeTruthy()
  })

  it("draws a send state the host tracks", () => {
    render(<CommentThread comments={[{ ...COMMENTS[1]!, reactions: undefined, status: "pending" }]} renderBody={body} />)
    expect(screen.getByText("Sending…")).toBeTruthy()
  })

  it("holds another person's comment and passes the person's own", () => {
    const { rerender } = render(<CommentThread comments={COMMENTS} currentUser={ME} renderBody={body} />)
    rerender(<CommentThread comments={[...COMMENTS, { id: "d", author: MIRA, body: "Theirs", at: AT }]} currentUser={ME} renderBody={body} />)
    expect(screen.queryByText("Theirs")).toBeNull()
    expect(screen.getByRole("button", { name: "Show 1 new comment" })).toBeTruthy()
    rerender(
      <CommentThread
        comments={[...COMMENTS, { id: "d", author: MIRA, body: "Theirs", at: AT }, { id: "e", author: ME, body: "Mine", at: AT }]}
        currentUser={ME}
        renderBody={body}
      />,
    )
    expect(screen.getByText("Mine")).toBeTruthy()
    expect(screen.queryByText("Theirs")).toBeNull()
  })

  it("folds when resolved, and unfolds on request", () => {
    render(<CommentThread comments={COMMENTS} defaultResolved renderBody={body} />)
    expect(screen.queryByText("First")).toBeNull()
    expect(screen.getByText("Resolved")).toBeTruthy()
    act(() => screen.getByRole("button", { name: "Show 3 comments" }).click())
    expect(screen.getByText("First")).toBeTruthy()
  })

  it("reports a resolve and hides the composer", () => {
    const changes: boolean[] = []
    render(<CommentThread comments={COMMENTS} renderBody={body} permissions={{ resolve: true }} onResolvedChange={(next) => changes.push(next)} />)
    act(() => screen.getByRole("button", { name: "Resolve" }).click())
    expect(changes).toEqual([true])
    expect(screen.getByRole("button", { name: "Reopen" })).toBeTruthy()
  })

  it("keeps a reason on a capability that is unavailable", () => {
    render(<CommentThread comments={COMMENTS} renderBody={body} permissions={{ resolve: "Only the lead can resolve this" }} />)
    expect(screen.getByRole("button", { name: "Resolve" }).getAttribute("aria-description")).toBe("Only the lead can resolve this")
  })

  it("shows an empty line, and a failure with Retry", () => {
    const { rerender } = render(<CommentThread comments={[]} />)
    expect(screen.getByText("No comments")).toBeTruthy()
    rerender(<CommentThread comments={[]} error onRetry={() => undefined} />)
    expect(screen.getByRole("alert").textContent).toContain("did not load")
  })
})
