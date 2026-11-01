import { useRef, useState } from "react"
import { Button } from "../../ui/button/index.js"
import { CommentThread, type CommentEntry, type CommentPermissions } from "../../ui/comment-thread/index.js"
import { Switch } from "../../ui/switch/index.js"
import { AVERY, HOUR, JAMIE, NOOR, SAMPLE_MENTIONS, sampleComments } from "../fixtures/collaboration.js"
import { SectionPage, Specimen } from "../kit.js"

const owner: CommentPermissions = {
  comment: true,
  resolve: true,
  forComment: (comment) => ({
    reply: true,
    react: true,
    edit: comment.author.id === AVERY.id,
    delete: comment.author.id === AVERY.id || "Only its author can delete a comment",
  }),
}

function FullThread() {
  const [now] = useState(() => Date.now())
  const [comments, setComments] = useState<readonly CommentEntry[]>(() => sampleComments(now))
  const [failing, setFailing] = useState(false)
  const failNext = useRef(false)
  failNext.current = failing
  const arrivals = useRef(0)
  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <Button
          size="sm"
          onClick={() => {
            arrivals.current += 1
            const id = `arrival-${arrivals.current}`
            setComments((rows) => [...rows, { id, author: JAMIE, body: `Site photo ${arrivals.current} is in the shared folder.`, at: Date.now() }])
          }}
        >
          Deliver a comment
        </Button>
        <Switch checked={failing} onCheckedChange={setFailing} label="Sends fail" />
      </div>
      <div data-testid="comments-full">
        <CommentThread
          anchor="Floor plan, level 2"
          onAnchorClick={() => undefined}
          comments={comments}
          onCommentsChange={setComments}
          currentUser={AVERY}
          permissions={owner}
          mentions={SAMPLE_MENTIONS}
          onSubmit={async ({ body, parentId }) => {
            await new Promise((resolve) => setTimeout(resolve, 250))
            if (failNext.current) throw new Error("Offline")
            const entry: CommentEntry = { id: `saved-${Date.now()}`, author: AVERY, body, at: Date.now() }
            setComments((rows) =>
              parentId ? rows.map((row) => (row.id === parentId ? { ...row, replies: [...(row.replies ?? []), entry] } : row)) : [...rows, entry],
            )
          }}
          onEdit={(comment, body) => {
            setComments((rows) =>
              rows.map((row) => ({
                ...row,
                ...(row.id === comment.id ? { body, editedAt: Date.now() } : null),
                replies: row.replies?.map((reply) => (reply.id === comment.id ? { ...reply, body, editedAt: Date.now() } : reply)),
              })),
            )
          }}
          onDelete={(comment) => {
            setComments((rows) =>
              rows.flatMap((row): CommentEntry[] => {
                if (row.id === comment.id) return row.replies?.length ? [{ ...row, deleted: true }] : []
                return [{ ...row, replies: row.replies?.filter((reply) => reply.id !== comment.id) }]
              }),
            )
          }}
          onReactionsChange={(comment, reactions) =>
            setComments((rows) =>
              rows.map((row) => ({
                ...row,
                ...(row.id === comment.id ? { reactions } : null),
                replies: row.replies?.map((reply) => (reply.id === comment.id ? { ...reply, reactions } : reply)),
              })),
            )
          }
        />
      </div>
    </div>
  )
}

function ResolvedThread() {
  const [now] = useState(() => Date.now())
  return (
    <div className="w-full max-w-2xl" data-testid="comments-resolved">
      <CommentThread aria-label="Resolved thread" anchor="Site survey, page 12" defaultComments={sampleComments(now)} defaultResolved permissions={{ resolve: true }} currentUser={AVERY} />
    </div>
  )
}

function ReadOnlyThread() {
  const [now] = useState(() => Date.now())
  return (
    <div className="w-full max-w-2xl" data-testid="comments-read-only">
      <CommentThread aria-label="Read-only thread" defaultComments={sampleComments(now).slice(1)} />
    </div>
  )
}

function ReasonedThread() {
  const [now] = useState(() => Date.now())
  return (
    <div className="w-full max-w-2xl" data-testid="comments-reason">
      <CommentThread
        aria-label="Locked thread"
        defaultComments={[{ id: "r1", author: NOOR, body: "Locked for the design freeze.", at: now - HOUR }]}
        currentUser={AVERY}
        permissions={{
          comment: "Comments are locked during the design freeze",
          resolve: "Only the project lead can resolve this thread",
          forComment: () => ({ reply: "Replies are locked during the design freeze", react: "Reactions are locked during the design freeze" }),
        }}
      />
    </div>
  )
}

function ScrollingThread() {
  const [now] = useState(() => Date.now())
  const [comments] = useState(() =>
    Array.from({ length: 16 }, (_, index) => ({ id: `s${index}`, author: index % 2 ? NOOR : JAMIE, body: `Survey note ${index + 1}: reading taken at grid line ${index + 1}.`, at: now - (16 - index) * HOUR })),
  )
  return (
    <div className="h-120 w-full max-w-2xl" data-testid="comments-fill">
      <CommentThread
        aria-label="Scrolling thread"
        fill
        defaultComments={comments}
        currentUser={AVERY}
        permissions={{ comment: true, forComment: () => ({ reply: true, delete: true }) }}
        onSubmit={() => undefined}
      />
    </div>
  )
}

function ThreadStates() {
  return (
    <div className="grid w-full gap-4 md:grid-cols-2">
      <div className="h-72" data-testid="comments-loading">
        <CommentThread aria-label="Loading thread" fill loading />
      </div>
      <div className="h-72" data-testid="comments-error">
        <CommentThread aria-label="Failed thread" fill error onRetry={() => undefined} />
      </div>
    </div>
  )
}

export default function CommentThreadSection() {
  return (
    <SectionPage>
      <Specimen
        title="A thread"
        description="Type @ for the mention list, and Ctrl or ⌘ Enter to send. A send shows at once, a failure stays in place with Retry, and new comments wait behind a count."
        layout="stack"
      >
        <FullThread />
      </Specimen>
      <Specimen title="Resolved" description="A resolved thread folds behind a button and has no composer." layout="stack">
        <ResolvedThread />
      </Specimen>
      <Specimen title="Read-only" description="With no permissions there are no controls at all." layout="stack">
        <ReadOnlyThread />
      </Specimen>
      <Specimen title="Unavailable with a reason" description="A string for a capability keeps the control, disabled, and shows why." layout="stack">
        <ReasonedThread />
      </Specimen>
      <Specimen title="In a fixed box" description="With fill, comments scroll and the composer stays at the foot." layout="stack">
        <ScrollingThread />
      </Specimen>
      <Specimen title="Loading and error" description="Each state takes the place of the comments." layout="stack" wide>
        <ThreadStates />
      </Specimen>
    </SectionPage>
  )
}
