import { memo, type ComponentProps, type ReactNode } from "react";
import {
  IconEdit,
  IconPopOut,
  IconRefresh,
  IconThumbsDown,
  IconThumbsUp,
} from "../../icons/generated/icons.js";
import { cx } from "../../lib/cx.js";
import { ActionButton, Button, ButtonGroup } from "../../ui/button/index.js";
import { CopyButton } from "../../ui/copy-button/index.js";
import { Notice } from "../../ui/notice/index.js";
import { Skeleton } from "../../ui/skeleton/index.js";
import { TruncatedText } from "../../ui/truncated-text/index.js";
import { Tooltip } from "../../ui/tooltip/index.js";
import { AiMark } from "../ai-mark/index.js";
import { MessageBlocks } from "../blocks/index.js";
import { EntityChip } from "../entity-chip/index.js";
import { formatAbsolute, formatClock } from "../format.js";
import { useConversationHandlers } from "../handlers.js";
import { FileRowItem, ImageTile } from "../results/index.js";
import { ProviderActivity } from "../tool-activity/index.js";
import type {
  AiAttachment,
  AiMessage,
  AiProviderStatus,
  EntityRef,
} from "../types.js";

/** The text of a message for copy: its prose blocks joined. */
export function messageText(message: AiMessage) {
  return message.blocks
    .map((block) => (block.kind === "markdown" ? block.text : null))
    .filter(Boolean)
    .join("\n\n");
}

function Time({ at }: { at: number }) {
  return (
    <Tooltip content={formatAbsolute(at)}>
      <time
        className="fa-ai-msg-time"
        dateTime={new Date(at).toISOString()}
        data-numeric
        suppressHydrationWarning
      >
        {formatClock(at)}
      </time>
    </Tooltip>
  );
}

/* ── User ─────────────────────────────────────────────────────────────────── */

/** `@[NST-C106](endpoint:NST-C106)` mentions in user text become entity chips. */
const MENTION = /@\[([^\]]{1,80})\]\(([a-z-]{1,24}):([^)\s]{1,128})\)/g;

function UserText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(MENTION)) {
    const [whole, label, kind, id] = match;
    if (match.index > last) parts.push(text.slice(last, match.index));
    const entity: EntityRef = { kind: kind!, id: id!, label: label! };
    parts.push(<EntityChip key={match.index} entity={entity} />);
    last = match.index + whole.length;
  }
  parts.push(text.slice(last));
  return <p className="fa-ai-bubble-text">{parts}</p>;
}

function Attachments({ attachments }: { attachments: AiAttachment[] }) {
  const images = attachments.filter(
    (item) => item.mime?.startsWith("image/") && item.previewUrl,
  );
  const files = attachments.filter((item) => !images.includes(item));
  return (
    <div className="fa-ai-msg-attachments">
      {images.map((image) => (
        <ImageTile
          key={image.id}
          className="fa-ai-msg-thumb"
          cover
          image={{
            id: image.id,
            src: image.previewUrl!,
            alt: image.name,
            width: 16,
            height: 10,
          }}
        />
      ))}
      {files.length ? (
        <ul className="fa-ai-files fa-ai-msg-files">
          {files.map((file) => (
            <FileRowItem
              key={file.id}
              file={{
                id: file.id,
                name: file.name,
                size: file.size,
                mime: file.mime,
                href: file.href,
              }}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export interface UserMessageProps extends Omit<
  ComponentProps<"article">,
  "children"
> {
  /** The typed conversation message and its content blocks. */
  message: AiMessage;
  /** The newest user message: Edit shows (↑ in the composer edits it too). */
  editable?: boolean;
}

/**
 * A prompt: a compact glass-control bubble on the right, attachments above it, and edit
 * and copy below on hover or focus (always on touch).
 */
export const UserMessage = memo(function UserMessage({
  message,
  editable = false,
  className,
  ...rest
}: UserMessageProps) {
  const handlers = useConversationHandlers();
  const text = messageText(message);
  return (
    <article
      {...rest}
      className={cx("fa-ai-msg", className)}
      data-role="user"
      aria-label="You"
    >
      <div className="fa-ai-msg-body">
        {message.attachments?.length ? (
          <Attachments attachments={message.attachments} />
        ) : null}
        <div
          className="glass-control fa-ai-bubble"
          data-purged={message.state === "purged" ? "" : undefined}
        >
          {message.state === "purged" ? (
            <PurgedMessage />
          ) : (
            <UserText text={text} />
          )}
        </div>
        <footer className="fa-ai-msg-foot">
          <div className="fa-ai-msg-actions">
            {editable ? (
              <Button
                variant="ghost"
                size="sm"
                icon={<IconEdit />}
                aria-label="Edit message"
                shortcut="up"
                onClick={() => handlers.editMessage(message)}
              />
            ) : null}
            <CopyButton value={text} label="Copy message" />
          </div>
          <Time at={message.createdAt} />
        </footer>
      </div>
    </article>
  );
});

/* ── Assistant ────────────────────────────────────────────────────────────── */

function RunFailure({ message }: { message: AiMessage }) {
  const handlers = useConversationHandlers();
  const failure = message.failure;
  return (
    <Notice
      className="fa-ai-block"
      tone="danger"
      title="This response did not complete."
      action={
        failure?.retryable !== false ? (
          <ActionButton
            size="sm"
            icon={<IconRefresh />}
            pendingLabel="Retrying…"
            successLabel="Retried"
            onAction={() => handlers.retry(message)}
          >
            Retry
          </ActionButton>
        ) : undefined
      }
    >
      {failure?.reason ?? "The AI service ended this run without an answer."}
      {failure?.code ? (
        <code className="fa-ai-msg-code"> {failure.code}</code>
      ) : null}
    </Notice>
  );
}

export interface AssistantMessageProps extends Omit<
  ComponentProps<"article">,
  "children"
> {
  /** The typed conversation message and its content blocks. */
  message: AiMessage;
  /** What the model is doing right now (before or between blocks) while it streams. */
  activity?: AiProviderStatus;
  /** The newest answer: its actions stay visible. */
  latest?: boolean;
}

/**
 * An answer: no bubble — the AI mark in the gutter and the blocks on the canvas (or the
 * panel), prose across the reading column and wide blocks breaking out wider. Failure, cancellation
 * and retention show in place as the message's last block. Copy, regenerate, feedback and
 * "Open in window" sit below with the time and model.
 */
export const AssistantMessage = memo(function AssistantMessage({
  message,
  activity,
  latest = false,
  className,
  ...rest
}: AssistantMessageProps) {
  const handlers = useConversationHandlers();
  const streaming = message.state === "streaming";
  const text = messageText(message);
  return (
    <article
      {...rest}
      className={cx("fa-ai-msg", className)}
      data-role="assistant"
      data-state={message.state}
      data-latest={latest ? "" : undefined}
      aria-label="Assistant"
      aria-busy={streaming || undefined}
    >
      <div className="fa-ai-msg-mark">
        <AiMark size="sm" working={streaming} />
      </div>
      <div className="fa-ai-msg-body">
        {message.state === "purged" ? (
          <PurgedMessage />
        ) : (
          <MessageBlocks message={message} />
        )}
        {streaming && activity ? (
          <ProviderActivity className="fa-ai-block" status={activity} />
        ) : null}
        {message.state === "failed" ? <RunFailure message={message} /> : null}
        {message.state === "cancelled" ? (
          <Notice
            className="fa-ai-block"
            tone="info"
            compact
            action={
              <ActionButton
                size="sm"
                variant="ghost"
                icon={<IconRefresh />}
                pendingLabel="Regenerating…"
                successLabel="Regenerated"
                onAction={() => handlers.retry(message)}
              >
                Regenerate
              </ActionButton>
            }
          >
            You stopped this response.
          </Notice>
        ) : null}
        <footer
          className="fa-ai-msg-foot"
          data-hidden={streaming ? "" : undefined}
        >
          <span className="fa-ai-msg-meta">
            <Time at={message.createdAt} />
            {message.model ? (
              <TruncatedText className="fa-ai-msg-model">
                {message.model}
              </TruncatedText>
            ) : null}
          </span>
          <div className="fa-ai-msg-actions">
            {text ? <CopyButton value={text} label="Copy response" /> : null}
            {message.state === "complete" ? (
              <>
                <ActionButton
                  variant="ghost"
                  size="sm"
                  icon={<IconRefresh />}
                  aria-label="Regenerate"
                  onAction={() => handlers.retry(message)}
                />
                <ButtonGroup
                  className="fa-ai-msg-feedback"
                  aria-label="Feedback"
                >
                  <Button
                    variant={message.feedback === "up" ? "soft" : "ghost"}
                    size="sm"
                    icon={<IconThumbsUp />}
                    aria-label="Good response"
                    aria-pressed={message.feedback === "up"}
                    onClick={() =>
                      handlers.feedback(
                        message,
                        message.feedback === "up" ? null : "up",
                      )
                    }
                  />
                  <Button
                    variant={message.feedback === "down" ? "soft" : "ghost"}
                    size="sm"
                    icon={<IconThumbsDown />}
                    aria-label="Bad response"
                    aria-pressed={message.feedback === "down"}
                    onClick={() =>
                      handlers.feedback(
                        message,
                        message.feedback === "down" ? null : "down",
                      )
                    }
                  />
                </ButtonGroup>
              </>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              icon={<IconPopOut />}
              aria-label="Open in a window"
              onClick={() => handlers.openMessageWindow(message)}
            />
          </div>
        </footer>
      </div>
    </article>
  );
});

/* ── System notice and turns ──────────────────────────────────────────────── */

export interface SystemNoticeProps {
  icon?: ReactNode;
  children: ReactNode;
  /** Time associated with the record. */
  at?: number;
  className?: string;
}

/** A change to the conversation itself (scope switched, context added, model changed). */
export function SystemNotice({
  icon,
  children,
  at,
  className,
}: SystemNoticeProps) {
  return (
    <div className={cx("fa-ai-system", className)} role="note">
      <span className="fa-ai-system-pill">
        {icon}
        <span className="fa-ai-system-text">{children}</span>
        {at ? <Time at={at} /> : null}
      </span>
    </div>
  );
}

/** One prompt and its answers. The turn navigator jumps between turns. */
export function Turn({
  index,
  className,
  ...rest
}: ComponentProps<"section"> & { index: number }) {
  return (
    <section
      {...rest}
      className={cx("fa-ai-turn", className)}
      data-turn={index}
      aria-label={rest["aria-label"] ?? `Turn ${index}`}
    />
  );
}

export interface MessageSkeletonProps {
  /** Include the loading prompt bubble. Set false when only an assistant reply is loading. Default: true. */
  prompt?: boolean;
  /** Include the result-card placeholder. Default: true. */
  card?: boolean;
  /** Number of prose skeleton lines. Default: 3. */
  lines?: number;
}
/** The boxes of a loading turn, or an assistant-only reply, with stable loaded geometry. */
export function MessageSkeleton({
  prompt = true,
  card = true,
  lines = 3,
}: MessageSkeletonProps) {
  return (
    <div className="fa-ai-turn fa-ai-skel-turn" aria-hidden>
      {prompt ? (
        <div className="fa-ai-msg" data-role="user">
          <div className="fa-ai-msg-body">
            <Skeleton.Block className="fa-ai-skel-bubble" radius="tile" />
            <div className="fa-ai-msg-foot" />
          </div>
        </div>
      ) : null}
      <div className="fa-ai-msg" data-role="assistant">
        <div className="fa-ai-msg-mark">
          <Skeleton.Circle size="var(--_mark)" />
        </div>
        <div className="fa-ai-msg-body">
          <div className="fa-ai-md fa-ai-block">
            <Skeleton.Text
              type="body"
              lines={lines}
              width="64%"
              className="fa-ai-skel-prose"
            />
          </div>
          {card ? (
            <Skeleton.Block
              className="fa-ai-block fa-ai-skel-card"
              radius="tile"
            />
          ) : null}
          <div className="fa-ai-msg-foot" />
        </div>
      </div>
    </div>
  );
}

function PurgedMessage() {
  return <Notice>Removed under the conversation retention policy.</Notice>;
}
