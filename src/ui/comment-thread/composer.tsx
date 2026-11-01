import { useState, type KeyboardEvent, type Ref } from "react"
import { IconSend } from "../../icons/generated/icons.js"
import { useMessages } from "../../lib/i18n/index.js"
import { Button } from "../button/index.js"
import { RichTextInput, type RichTextMentions } from "../rich-text/index.js"
import { commentThreadMessages } from "./messages.js"

interface ComposerProps {
  label: string
  placeholder: string
  mentions?: RichTextMentions
  /** Disabled, with this reason (R12.3). */
  disabledReason?: string
  focusOnMount?: boolean
  onSend: (body: string) => void
  /** Offers Cancel. */
  onCancel?: () => void
}

/** Takes focus when the editor mounts, and only then: an inline ref would run on every keystroke. */
const takeFocus: Ref<HTMLDivElement | HTMLTextAreaElement> = (element) => element?.focus()

/** The composer: Markdown from RichTextInput, sent with the button or Ctrl/⌘ Enter. */
export function Composer({ label, placeholder, mentions, disabledReason, focusOnMount, onSend, onCancel }: ComposerProps) {
  const messages = useMessages(commentThreadMessages)
  const [body, setBody] = useState("")
  const empty = body.trim() === ""
  const send = () => {
    if (empty || disabledReason) return
    onSend(body)
    setBody("")
  }
  const onKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      event.stopPropagation()
      send()
    } else if (event.key === "Escape" && onCancel && empty) {
      event.stopPropagation()
      onCancel()
    }
  }
  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- keys from the editor inside
    <div className="fa-comment-composer" onKeyDownCapture={onKeyDownCapture}>
      <RichTextInput
        ref={focusOnMount ? takeFocus : undefined}
        aria-label={label}
        placeholder={placeholder}
        value={body}
        onValueChange={setBody}
        mentions={mentions}
        sourceView={false}
        resize={false}
        minHeight={64}
        maxHeight={200}
        disabled={Boolean(disabledReason)}
      />
      <div className="fa-comment-composer-actions">
        <span className="fa-comment-hint">{messages.sendHint}</span>
        {onCancel ? (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {messages.cancel}
          </Button>
        ) : null}
        <Button
          variant="primary"
          size="sm"
          icon={<IconSend />}
          disabledReason={disabledReason ?? (empty ? messages.nothingToSend : undefined)}
          onClick={send}
        >
          {messages.send}
        </Button>
      </div>
    </div>
  )
}

/** Changes a comment's text in place. A failed save keeps the editor and its text. */
export function CommentEditor({ initial, mentions, onSave, onClose }: { initial: string; mentions?: RichTextMentions; onSave: (body: string) => Promise<void>; onClose: () => void }) {
  const messages = useMessages(commentThreadMessages)
  const [body, setBody] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const unchanged = body === initial
  const save = async () => {
    setSaving(true)
    setFailed(false)
    try {
      await onSave(body)
    } catch {
      setSaving(false)
      setFailed(true)
    }
  }
  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- keys from the editor inside
    <div
      className="fa-comment-composer"
      onKeyDownCapture={(event) => {
        if (event.key === "Escape" && unchanged) {
          event.stopPropagation()
          onClose()
        } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault()
          event.stopPropagation()
          if (!unchanged && body.trim()) void save()
        }
      }}
    >
      <RichTextInput
        ref={takeFocus}
        aria-label={messages.editLabel}
        value={body}
        onValueChange={setBody}
        mentions={mentions}
        sourceView={false}
        resize={false}
        minHeight={64}
        maxHeight={200}
        readOnly={saving}
      />
      <div className="fa-comment-composer-actions">
        {/* Its line is always there, so a failure moves neither button (R9.1). */}
        <span className="fa-comment-error" role="status">
          {failed ? messages.saveFailed : null}
        </span>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
          {messages.cancel}
        </Button>
        <Button
          variant="primary"
          size="sm"
          status={saving ? "pending" : "idle"}
          pendingLabel={messages.saving}
          statusAnnouncement={false}
          disabled={unchanged || !body.trim()}
          onClick={() => void save()}
        >
          {messages.save}
        </Button>
      </div>
    </div>
  )
}
