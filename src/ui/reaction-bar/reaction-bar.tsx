import { Toolbar as BaseToolbar } from "@base-ui/react/toolbar"
import type { ComponentProps } from "react"
import { useAnnounce } from "../../hooks/use-announce.js"
import { IconSmile } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/index.js"
import { listFormat, numberFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Button } from "../button/index.js"
import { EmojiPopover } from "../emoji-picker/emoji-popover.js"
import type { EmojiPick } from "../emoji-picker/emoji-picker.js"
import { Tooltip } from "../tooltip/index.js"
import { reactionBarMessages } from "./messages.js"

/** One emoji's reactions. */
export interface Reaction {
  /** The emoji, drawn in the system font. */
  emoji: string
  /** How many reacted. A count of zero is not drawn. */
  count: number
  /** The current person is one of them; the reaction shows pressed. */
  reacted?: boolean
  /** The emoji's name for assistive technology: "thumbs up". The six common reactions have translated names; without one a screen reader reads the emoji itself. */
  label?: string
  /** Who reacted, for the tooltip. Pass a few names; the application decides how many. */
  people?: readonly string[]
}

/** What changed, passed with the next reactions. */
export interface ReactionChange {
  /** The emoji that changed. */
  emoji: string
  /** The person's reaction after the change. */
  reacted: boolean
}

export interface ReactionBarProps extends Omit<ComponentProps<"div">, "children" | "defaultValue" | "onChange"> {
  /** The reactions, controlled, in the order to draw them. */
  reactions?: readonly Reaction[]
  /** The reactions at first when uncontrolled. The bar counts the person's own changes itself. */
  defaultReactions?: readonly Reaction[]
  /** Called when a person adds or removes a reaction, with the next reactions and the change. */
  onReactionsChange?: (reactions: readonly Reaction[], change: ReactionChange) => void
  /** Show the counts with no way to react: no buttons and no add control. */
  readOnly?: boolean
  /** Why this person cannot react now. Reactions and the add control stay, disabled, and show it (R12.3). */
  disabledReason?: string
  /** Emoji offered first in the picker. Default 👍 ❤️ 😄 🎉 😮 😢. */
  suggested?: readonly string[]
  /** Offer the add control. Without it people only join the reactions already drawn. Default true. */
  picker?: boolean
  /** Names the bar. Default "Reactions". */
  "aria-label"?: string
}

const COMMON = ["👍", "❤️", "😄", "🎉", "😮", "😢"] as const

type Names = typeof reactionBarMessages.defaults

/** Names of the common reactions, in the locale. Anything else is the host's `label`, or the emoji. */
function nameOf({ emoji, label }: Pick<Reaction, "emoji" | "label">, messages: Names) {
  if (label) return label
  const known: Record<string, string> = {
    "👍": messages.thumbsUp,
    "❤️": messages.heart,
    "😄": messages.smile,
    "🎉": messages.party,
    "😮": messages.surprised,
    "😢": messages.sad,
  }
  return known[emoji] ?? emoji
}

function toggled(reactions: readonly Reaction[], { emoji, reacted }: ReactionChange, label?: string): readonly Reaction[] {
  if (!reactions.some((reaction) => reaction.emoji === emoji)) return [...reactions, { emoji, count: 1, reacted: true, label }]
  return reactions
    .map((reaction) => (reaction.emoji === emoji ? { ...reaction, reacted, count: reaction.count + (reacted ? 1 : -1) } : reaction))
    .filter((reaction) => reaction.count > 0)
}

/**
 * Reactions with counts, each a toggle named for what it says: "2 people reacted with thumbs
 * up", pressed when one of them is the current person. The bar is one tab stop (R11.5) and
 * arrow keys move along it in reading order. The add control comes first, so a reaction
 * arriving at the end moves nothing. The picker loads on demand when it first opens.
 */
export function ReactionBar({
  reactions,
  defaultReactions = [],
  onReactionsChange,
  readOnly = false,
  disabledReason,
  suggested = COMMON,
  picker = true,
  className,
  "aria-label": label,
  ...rest
}: ReactionBarProps) {
  const messages = useMessages(reactionBarMessages)
  const locale = useLocale()
  const announce = useAnnounce()
  const [current, setCurrent] = useControllable(reactions, defaultReactions)
  const shown = current.filter((reaction) => reaction.count > 0)

  const change = (next: ReactionChange, name: string, emojiLabel?: string) => {
    const list = toggled(current, next, emojiLabel)
    setCurrent(list)
    onReactionsChange?.(list, next)
    announce(next.reacted ? messages.added(name) : messages.removed(name))
  }

  const chipName = (reaction: Reaction) => messages.reacted({ count: reaction.count, name: nameOf(reaction, messages) }, locale)
  const face = (reaction: Reaction) => (
    <>
      <span className="fa-emoji-glyph fa-reaction-glyph" aria-hidden>
        {reaction.emoji}
      </span>
      <span className="fa-reaction-count" data-numeric aria-hidden>
        {numberFormat(locale).format(reaction.count)}
      </span>
    </>
  )
  const who = (reaction: Reaction) => (reaction.people?.length ? listFormat(locale, { type: "conjunction" }).format(reaction.people) : undefined)

  if (readOnly) {
    if (!shown.length) return null
    return (
      <div {...rest} className={cx("fa-reactions", className)} role="group" aria-label={label ?? messages.reactions} data-read-only="">
        {shown.map((reaction) => (
          <Tooltip key={reaction.emoji} content={who(reaction)} enabled={Boolean(reaction.people?.length)}>
            <span className="fa-reaction" role="img" aria-label={chipName(reaction)}>
              {face(reaction)}
            </span>
          </Tooltip>
        ))}
      </div>
    )
  }

  const onPick = ({ emoji, name }: EmojiPick) => {
    const existing = current.find((reaction) => reaction.emoji === emoji)
    if (existing?.reacted) return
    change({ emoji, reacted: true }, existing ? nameOf(existing, messages) : nameOf({ emoji, label: name }, messages), name)
  }

  return (
    <BaseToolbar.Root {...rest} className={cx("fa-reactions", className)} aria-label={label ?? messages.reactions}>
      {picker ? (
        disabledReason ? (
          <BaseToolbar.Button
            render={<Button variant="ghost" size="xs" className="fa-reaction-add" icon={<IconSmile />} aria-label={messages.addReaction} disabledReason={disabledReason} />}
          />
        ) : (
          <EmojiPopover
            recent={suggested}
            onPick={onPick}
            trigger={<BaseToolbar.Button render={<Button variant="ghost" size="xs" className="fa-reaction-add" icon={<IconSmile />} aria-label={messages.addReaction} />} />}
          />
        )
      ) : null}
      {shown.map((reaction) => (
        <BaseToolbar.Button
          key={reaction.emoji}
          render={
            <Button
              variant={reaction.reacted ? "soft" : "ghost"}
              size="xs"
              className="fa-reaction"
              aria-label={chipName(reaction)}
              aria-pressed={Boolean(reaction.reacted)}
              disabledReason={disabledReason}
              tooltip={who(reaction) ?? false}
              onClick={() => change({ emoji: reaction.emoji, reacted: !reaction.reacted }, nameOf(reaction, messages))}
            >
              {face(reaction)}
            </Button>
          }
        />
      ))}
    </BaseToolbar.Root>
  )
}
