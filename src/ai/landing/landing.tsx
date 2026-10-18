import type { ComponentProps, ReactNode } from "react";
import { TruncatedText } from "../../ui/truncated-text/index.js";
import { cx } from "../../lib/cx.js";
import { AiMark } from "../ai-mark/index.js";

export interface Suggestion {
  id: string;
  /** The prompt it fills in. */
  prompt: string;
  /** The pill's text; defaults to the prompt. */
  label?: string;
  icon?: ReactNode;
}

export interface AiHeroProps extends Omit<ComponentProps<"div">, "title"> {
  /** The headline; the part in `emphasis` takes the accent gradient (one per screen). */
  title?: string;
  /** Portion of the heading receiving emphasis. */
  emphasis?: string;
  /** The composer, then the suggestions. */
  children?: ReactNode;
}

/**
 * The Assistant landing: the mark and one question, directly on the canvas (R4.6), on the
 * reading column. Inside a ConversationLog it is the `landing` (the log places the composer
 * and suggestions under it, so the composer survives the first message); on its own it can
 * hold the composer and suggestions as children. No subtitle — the composer says the rest.
 */
export function AiHero({
  title = "What can I help you with?",
  emphasis = "help you",
  className,
  children,
  ...rest
}: AiHeroProps) {
  const at = title.indexOf(emphasis);
  const heading =
    at >= 0 && emphasis ? (
      <>
        {title.slice(0, at)}
        <span className="text-accent-gradient">{emphasis}</span>
        {title.slice(at + emphasis.length)}
      </>
    ) : (
      title
    );
  return (
    <div {...rest} className={cx("fa-ai-hero", className)}>
      <AiMark size="lg" className="fa-ai-hero-mark" />
      <h1 className="fa-ai-hero-title">{heading}</h1>
      {children ? <div className="fa-ai-hero-body">{children}</div> : null}
    </div>
  );
}

export interface SuggestionChipsProps extends Omit<
  ComponentProps<"div">,
  "onSelect"
> {
  /** Initial or ranked choices offered before a search. */
  suggestions: Suggestion[];
  /** Called with the suggestion whose pill is pressed; the host normally puts its `prompt` in the composer. */
  onSelect: (suggestion: Suggestion) => void;
  /** Centre them (the landing) or start-align them (a scoped pane). */
  align?: "center" | "start";
}

/** Prompt suggestions as glass pills: one tap puts the prompt in the composer. */
export function SuggestionChips({
  suggestions,
  onSelect,
  align = "center",
  className,
  ...rest
}: SuggestionChipsProps) {
  return (
    <div
      {...rest}
      className={cx("fa-ai-suggestions", className)}
      data-align={align}
      role="group"
      aria-label="Suggestions"
    >
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          type="button"
          className="glass-control fa-pressable fa-lit fa-ai-suggestion"
          onClick={() => onSelect(suggestion)}
        >
          {suggestion.icon ? (
            <span className="fa-ai-suggestion-icon">{suggestion.icon}</span>
          ) : null}
          <TruncatedText className="fa-ai-suggestion-label">
            {suggestion.label ?? suggestion.prompt}
          </TruncatedText>
        </button>
      ))}
    </div>
  );
}
