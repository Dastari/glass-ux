import { useLocale } from "../../lib/locale/use-locale.js"
import { useMessages } from "../../lib/i18n/index.js"
import { asksMessages } from "./messages.js"
import { useId, useState, type KeyboardEvent } from "react";
import {
  IconArrowDown,
  IconArrowUp,
  IconGrip,
  IconHelp,
  IconList,
  IconSort,
} from "../../icons/generated/icons.js";
import { ActionButton, Button } from "../../ui/button/index.js";
import { TruncatedText } from "../../ui/truncated-text/index.js";
import { Checkbox, CheckboxGroup } from "../../ui/checkbox/index.js";
import { RadioCard, RadioGroup } from "../../ui/radio/index.js";
import { useConversationHandlers, type AskAnswer } from "../handlers.js";
import type { AiAsk, ChoiceOption } from "../types.js";
import { useAskDockApi, useAskResolution } from "./dock-state.js";
import { AskLayout, AskRecord, AskShell, RESOLVE_HOLD_MS } from "./frame.js";
import { listFormat } from "../../lib/locale/intl.js"

type Ask<T extends AiAsk["type"]> = Extract<AiAsk, { type: T }>;

/**
 * Answer an ask through the host, hold the ✓, then fold (shared by every ask). An answer
 * given in the ask dock is shared with the transcript, where the marker becomes the record.
 */
export function useAskAnswer(ask: AiAsk) {
  const messages = useMessages(asksMessages)

  const handlers = useConversationHandlers();
  const dock = useAskDockApi();
  const shared = useAskResolution(ask.id);
  const [local, setLocal] = useState<{ label: string; at: number } | null>(
    null,
  );
  const resolved =
    local ??
    (shared?.label !== undefined
      ? { label: shared.label, at: shared.at }
      : null);
  const answered =
    ask.status === "answered" ||
    ask.status === "expired" ||
    ask.status === "cancelled" ||
    resolved !== null;
  const text = ask.answer ?? resolved?.label ?? "";
  const submit = async (answer: AskAnswer, label: string) => {
    await handlers.answer(ask.id, answer);
    setTimeout(() => {
      const at = Date.now();
      setLocal({ label, at });
      dock?.resolve(ask.id, { label, at });
    }, RESOLVE_HOLD_MS);
  };
  const record = (
    <AskRecord
      status={
        ask.status === "expired"
          ? "queued"
          : ask.status === "cancelled"
            ? "cancelled"
            : "succeeded"
      }
      by={ask.answeredBy}
      actor={ask.answeredByEntity}
      at={ask.answeredAt ?? resolved?.at}
    >
      {ask.status === "expired"
        ? messages.expiredQuestion(ask.question)
        : ask.status === "cancelled"
          ? messages.cancelled(ask.question)
          : text}
    </AskRecord>
  );
  return { answered, submit, record };
}

function OptionIcon({ option }: { option: ChoiceOption }) {
  const Icon = option.icon;
  return Icon ? <Icon /> : undefined;
}

/** One choice from a few options, each with a sentence: radio cards that reflow by width. */
export function SingleChoiceAsk({ ask }: {
  /** The single-choice ask: the question and its `options`. Answers go to the `answer` conversation handler; once answered, expired or cancelled the card shows its record. */
  ask: Ask<"single">;
}) {
  const messages = useMessages(asksMessages)

  const id = useId();
  const { answered, submit, record } = useAskAnswer(ask);
  const [value, setValue] = useState<string | null>(null);
  const chosen = ask.options.find((option) => option.value === value);
  return (
    <AskShell resolved={answered} record={record}>
      <AskLayout
        id={id}
        icon={<IconHelp />}
        tone="accent"
        title={ask.question}
        meta={ask.detail}
        footer={
          <ActionButton
            variant="primary"
            size="sm"
            disabledReason={chosen ? undefined : messages.chooseAnOptionFirst}
            pendingLabel={messages.sending}
            successLabel={messages.sent}
            onAction={() =>
              submit(
                { type: "choice", value: chosen!.value, label: chosen!.label },
                messages.chose(chosen!.label, chosen!.meta),
              )
            }
          >
            {ask.submitLabel ?? messages.choose}
          </ActionButton>
        }
      >
        <RadioGroup
          variant="cards"
          value={value ?? undefined}
          onValueChange={(next) => setValue(next as string)}
          aria-labelledby={`${id}-title`}
          className="fa-ai-ask-cards"
        >
          {ask.options.map((option) => (
            <RadioCard
              key={option.value}
              value={option.value}
              title={option.label}
              description={
                [option.description, option.meta].filter(Boolean).join(" · ") ||
                undefined
              }
              icon={<OptionIcon option={option} />}
            />
          ))}
        </RadioGroup>
      </AskLayout>
    </AskShell>
  );
}

/** Several items from a list, with Select all. Checkboxes are for picking items (R15.4). */
export function MultiChoiceAsk({ ask }: {
  /** The multiple-choice ask: the question, its `options` and `min`, the fewest picks that can be sent (default 1). Answers go to the `answer` conversation handler; once answered, expired or cancelled the card shows its record. */
  ask: Ask<"multi">;
}) {
  const messages = useMessages(asksMessages)
  const locale = useLocale()

  const id = useId();
  const { answered, submit, record } = useAskAnswer(ask);
  const all = ask.options.map((option) => option.value);
  const [values, setValues] = useState<string[]>([]);
  const min = ask.min ?? 1;
  const labels = ask.options
    .filter((option) => values.includes(option.value))
    .map((option) => option.label);
  return (
    <AskShell resolved={answered} record={record}>
      <AskLayout
        id={id}
        icon={<IconList />}
        tone="accent"
        title={ask.question}
        meta={ask.detail}
        footerStart={
          <span className="fa-ai-ask-count" data-numeric aria-live="polite">
            {messages.selectionStatus(values.length, all.length)} </span>
        }
        footer={
          <ActionButton
            variant="primary"
            size="sm"
            disabledReason={
              values.length < min ? messages.selectAtLeast(min) : undefined
            }
            pendingLabel={messages.sending}
            successLabel={messages.sent}
            onAction={() =>
              submit(
                { type: "choices", values, label: listFormat(locale, { type: "unit" }).format(labels) },
                messages.selectedSummary(labels.length === all.length ? messages.all(all.length) : listFormat(locale, { type: "unit" }).format(labels)),
              )
            }
          >
            {ask.submitLabel ?? messages.continue}
          </ActionButton>
        }
      >
        <CheckboxGroup
          value={values}
          onValueChange={setValues}
          allValues={all}
          aria-labelledby={`${id}-title`}
          className="fa-ai-ask-checks"
        >
          <Checkbox
            parent
            label={messages.selectAll}
            aria-label={messages.selectAll}
            className="fa-ai-ask-check-all"
          />
          {ask.options.map((option) => (
            <Checkbox
              key={option.value}
              value={option.value}
              label={option.label}
              aria-label={option.label}
              description={
                [option.description, option.meta].filter(Boolean).join(" · ") ||
                undefined
              }
            />
          ))}
        </CheckboxGroup>
      </AskLayout>
    </AskShell>
  );
}

/**
 * Quick replies: a handful of short answers as pills. One tap answers; nothing else to
 * submit. The agent still accepts a typed reply in the composer.
 */
export function QuickRepliesAsk({ ask }: {
  /** The quick-reply ask: the question and the `options` shown as pills; one tap answers. Answers go to the `answer` conversation handler; once answered, expired or cancelled the card shows its record. */
  ask: Ask<"quick">;
}) {
  const messages = useMessages(asksMessages)

  const id = useId();
  const { answered, submit, record } = useAskAnswer(ask);
  const [pending, setPending] = useState<string | null>(null);
  return (
    <AskShell resolved={answered} record={record}>
      <div className="fa-ai-quick" role="group" aria-labelledby={`${id}-title`}>
        <p id={`${id}-title`} className="fa-ai-quick-question">
          {ask.question}
        </p>
        <div className="fa-ai-quick-options">
          {ask.options.map((option) => {
            const Icon = option.icon;
            return (
              <ActionButton
                key={option.value}
                className="fa-ai-quick-option"
                size="sm"
                icon={Icon ? <Icon /> : undefined}
                disabled={pending !== null && pending !== option.value}
                pendingLabel={option.label}
                successLabel={option.label}
                onAction={async () => {
                  setPending(option.value);
                  await submit(
                    {
                      type: "choice",
                      value: option.value,
                      label: option.label,
                    },
                    messages.replied(option.label),
                  );
                }}
              >
                {option.label}
              </ActionButton>
            );
          })}
        </div>
      </div>
    </AskShell>
  );
}

/**
 * Put options in order (rollout groups, fallback printers). Each row moves with its arrow
 * buttons or Alt+↑ / Alt+↓; the grip shows it can be reordered.
 */
export function RankAsk({ ask }: {
  /** The ranking ask: the question and its `options` in their starting order; the answer is the reordered list. Answers go to the `answer` conversation handler; once answered, expired or cancelled the card shows its record. */
  ask: Ask<"rank">;
}) {
  const messages = useMessages(asksMessages)

  const id = useId();
  const { answered, submit, record } = useAskAnswer(ask);
  const [order, setOrder] = useState(ask.options);
  const move = (index: number, delta: number) => {
    const next = index + delta;
    if (next < 0 || next >= order.length) return;
    const copy = [...order];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item!);
    setOrder(copy);
    // Keep focus on the moved row's button in the direction it moved (or the other one at an end).
    const edge =
      next === 0
        ? "down"
        : next === order.length - 1
          ? "up"
          : delta < 0
            ? "up"
            : "down";
    requestAnimationFrame(() =>
      document.getElementById(`${id}-${item!.value}-${edge}`)?.focus(),
    );
  };
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    move(index, event.key === "ArrowUp" ? -1 : 1);
  };
  return (
    <AskShell resolved={answered} record={record}>
      <AskLayout
        id={id}
        icon={<IconSort />}
        tone="accent"
        title={ask.question}
        meta={ask.detail}
        footer={
          <ActionButton
            variant="primary"
            size="sm"
            pendingLabel={messages.sending}
            successLabel={messages.sent}
            onAction={() =>
              submit(
                {
                  type: "order",
                  values: order.map((option) => option.value),
                  label: order.map((option) => option.label).join(" → "),
                },
                messages.order(order.map((option) => option.label).join(" → ")),
              )
            }
          >
            {ask.submitLabel ?? messages.useThisOrder}
          </ActionButton>
        }
      >
        <ol className="fa-ai-rank" aria-labelledby={`${id}-title`}>
          {order.map((option, index) => (
            <li key={option.value} className="glass-control fa-ai-rank-row">
              <IconGrip className="fa-ai-rank-grip" />
              <span className="fa-ai-rank-index" data-numeric>
                {index + 1}
              </span>
              <span className="fa-ai-rank-text">
                <TruncatedText className="fa-ai-rank-label">
                  {option.label}
                </TruncatedText>
                {option.description ? (
                  <TruncatedText className="fa-ai-rank-description">
                    {option.description}
                  </TruncatedText>
                ) : null}
              </span>
              <Button
                id={`${id}-${option.value}-up`}
                variant="ghost"
                size="sm"
                icon={<IconArrowUp />}
                aria-label={messages.moveUp(option.label)}
                disabledReason={index === 0 ? messages.alreadyFirst : undefined}
                onClick={() => move(index, -1)}
                onKeyDown={(event) => onKeyDown(event, index)}
              />
              <Button
                id={`${id}-${option.value}-down`}
                variant="ghost"
                size="sm"
                icon={<IconArrowDown />}
                aria-label={messages.moveDown(option.label)}
                disabledReason={
                  index === order.length - 1 ? messages.alreadyLast : undefined
                }
                onClick={() => move(index, 1)}
                onKeyDown={(event) => onKeyDown(event, index)}
              />
            </li>
          ))}
        </ol>
      </AskLayout>
    </AskShell>
  );
}
