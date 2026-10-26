import { useMessages } from "../../lib/i18n/index.js"
import { asksMessages } from "./messages.js"
import { useId, useRef, useState } from "react";
import {
  IconCalendar,
  IconChat,
  IconEdit,
  IconSend,
  IconWarning,
} from "../../icons/generated/icons.js";
import { ActionButton, Button } from "../../ui/button/index.js";
import { DateTimeInput } from "../../ui/date-picker/date-time-input.js";
import { instantToWallClock } from "../../ui/date-picker/zoned-time.js";
import { Field } from "../../ui/field/index.js";
import { FormStack } from "../../ui/form/layout.js";
import { Input } from "../../ui/input/index.js";
import { Notice } from "../../ui/notice/index.js";
import { NumberField } from "../../ui/number-field/index.js";
import { RadioCard, RadioGroup } from "../../ui/radio/index.js";
import { resolveDateTime } from "./date-time.js";
import { Select } from "../../ui/select/index.js";
import { Textarea } from "../../ui/textarea/index.js";
import type { AiAsk, FormField } from "../types.js";
import { useAskAnswer } from "./choice.js";
import { AskLayout, AskShell } from "./frame.js";
import { useLocale } from "../../lib/locale/use-locale.js";
import { dateTimeFormat } from "../../lib/locale/intl.js";

type Ask<T extends AiAsk["type"]> = Extract<AiAsk, { type: T }>;

function FieldControl({
  field,
  value,
  invalid,
  onChange,
  onBlur,
}: {
  field: FormField;
  value: string;
  /** Marks the control invalid. Pair it with an accessible validation message. */
  invalid: boolean;
  /** Called with the field's new value as a string; numbers are stringified and a cleared value is `""`. */
  onChange: (value: string) => void;
  /** Called when the control loses focus; marks the field touched so its validation shows. Number fields do not fire it. */
  onBlur: () => void;
}) {
  switch (field.kind) {
    case "textarea":
      return (
        <Textarea
          name={field.name}
          value={value}
          placeholder={field.placeholder}
          minRows={2}
          maxRows={6}
          resize={false}
          invalid={invalid}
          onValueChange={onChange}
          onBlur={onBlur}
        />
      );
    case "select":
      return (
        <Select
          name={field.name}
          value={value || null}
          options={field.options ?? []}
          placeholder={field.placeholder}
          invalid={invalid}
          onValueChange={(next) => onChange(next ?? "")}
          onBlur={onBlur}
        />
      );
    case "number":
      return (
        <NumberField
          value={value === "" ? null : Number(value)}
          min={field.min}
          max={field.max}
          unit={field.unit}
          width="short"
          onValueChange={(next) => onChange(next === null ? "" : String(next))}
        />
      );
    default:
      return (
        <Input
          name={field.name}
          value={value}
          placeholder={field.placeholder}
          width="medium"
          invalid={invalid}
          onValueChange={onChange}
          onBlur={onBlur}
        />
      );
  }
}

/**
 * A short form the agent needs filled (a ticket, a schedule): stacked fields, one per row,
 * capped at the form measure (R15). Values the agent already knows arrive pre-filled.
 * Required fields validate on blur, then as you type; submitting focuses the first gap.
 */
export function FormAsk({ ask }: {
  /** The form ask: the question and its `fields`, one per row, with values the agent knows pre-filled. Answers go to the `answer` conversation handler; once answered, expired or cancelled the card shows its record. */
  ask: Ask<"form">;
}) {
  const messages = useMessages(asksMessages)

  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const { answered, submit, record } = useAskAnswer(ask);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      ask.fields.map((field) => [field.name, field.value ?? ""]),
    ),
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errorOf = (field: FormField) =>
    field.required && !values[field.name]?.trim()
      ? messages.enter(field.label.toLowerCase())
      : undefined;
  const missing = ask.fields.filter((field) => errorOf(field));

  const send = async () => {
    if (missing.length) {
      setTouched(
        Object.fromEntries(ask.fields.map((field) => [field.name, true])),
      );
      formRef.current
        ?.querySelector<HTMLElement>(`[name="${missing[0]!.name}"]`)
        ?.focus();
      throw new Error(messages.fillTheRequiredFields);
    }
    const summary = ask.fields
      .filter((field) => values[field.name])
      .slice(0, 3)
      .map((field) => {
        const option = field.options?.find(
          (item) => item.value === values[field.name],
        );
        return option?.label ?? values[field.name];
      })
      .join(" · ");
    await submit({ type: "form", values, label: summary }, messages.sentSummary(summary));
  };

  return (
    <AskShell resolved={answered} record={record}>
      <AskLayout
        id={id}
        icon={<IconEdit />}
        tone="accent"
        title={ask.question}
        meta={ask.detail}
        footer={
          <ActionButton
            variant="primary"
            size="sm"
            pendingLabel={messages.sending}
            successLabel={messages.sent}
            errorLabel={messages.checkTheFields}
            onAction={send}
          >
            {ask.submitLabel ?? messages.send}
          </ActionButton>
        }
      >
        <form
          ref={formRef}
          className="fa-ai-ask-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void send().catch(() => {});
          }}
        >
          <FormStack>
            {ask.fields.map((field) => (
              <Field
                key={field.name}
                label={field.label}
                required={field.required}
                hint={field.hint}
                error={touched[field.name] ? errorOf(field) : undefined}
              >
                <FieldControl
                  field={field}
                  value={values[field.name] ?? ""}
                  invalid={Boolean(touched[field.name] && errorOf(field))}
                  onChange={(value) =>
                    setValues((current) => ({
                      ...current,
                      [field.name]: value,
                    }))
                  }
                  onBlur={() =>
                    setTouched((current) => ({
                      ...current,
                      [field.name]: true,
                    }))
                  }
                />
              </Field>
            ))}
          </FormStack>
        </form>
      </AskLayout>
    </AskShell>
  );
}

/**
 * When something should happen: the agent's suggested times as one-tap choices, or an exact
 * date and time, in the stated time zone.
 */
export function DateTimeAsk({ ask }: {
  /** The date-time ask: the question, suggested times, the IANA `timezone` they are read in and an optional `earliest` bound. Answers go to the `answer` conversation handler; once answered, expired or cancelled the card shows its record. */
  ask: Ask<"datetime">;
}) {
  const messages = useMessages(asksMessages)

  const id = useId();
  const locale = useLocale();
  const { answered, submit, record } = useAskAnswer(ask);
  const [choice, setChoice] = useState<string | null>(null);
  // The exact entry: a wall clock in the ask's zone, or what the field could not accept.
  const [custom, setCustom] = useState("");
  const suggestion = ask.suggestions.find((item) => item.value === choice);
  const chosen = resolveDateTime(suggestion?.value ?? custom, ask.timezone, messages);
  const earliestValue =
    ask.earliest && ask.earliest !== "now"
      ? resolveDateTime(ask.earliest, ask.timezone, messages)
      : undefined;
  const earliest = ask.earliest === "now" ? Date.now() : earliestValue?.time;
  const error =
    earliestValue?.error ??
    chosen.error ??
    (chosen.time !== undefined &&
    earliest !== undefined &&
    chosen.time < earliest
      ? messages.timeTooEarly
      : undefined);
  const label =
    suggestion?.label ??
    (chosen.time !== undefined
      ? dateTimeFormat(locale, {
          timeZone: ask.timezone,
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
        }).format(chosen.time)
      : "");
  return (
    <AskShell resolved={answered} record={record}>
      <AskLayout
        id={id}
        icon={<IconCalendar />}
        tone="accent"
        title={ask.question}
        meta={ask.detail ?? ask.timezone}
        footer={
          <ActionButton
            variant="primary"
            size="sm"
            disabledReason={
              error ?? (!label ? messages.chooseATimeFirst : undefined)
            }
            pendingLabel={messages.scheduling}
            successLabel={messages.scheduled}
            onAction={() =>
              submit(
                {
                  type: "datetime",
                  value: new Date(chosen.time!).toISOString(),
                  label,
                },
                messages.scheduledSummary(label, ask.timezone),
              )
            }
          >
            {ask.submitLabel ?? messages.schedule}
          </ActionButton>
        }
      >
        <FormStack>
          <Field label={messages.suggestedTimes} nativeLabel={false} message="auto">
            <RadioGroup
              variant="cards"
              value={choice ?? undefined}
              aria-label={messages.suggestedTimes}
              onValueChange={(value) => {
                setChoice(value);
                setCustom("");
              }}
            >
              {ask.suggestions.map((item) => (
                <RadioCard
                  key={item.value}
                  value={item.value}
                  title={item.label}
                />
              ))}
            </RadioGroup>
          </Field>
          <Field
            label={messages.dateAndTime}
            hint={ask.timezone}
            error={custom && error ? error : undefined}
          >
            <DateTimeInput
              value={custom || null}
              timeZone={ask.timezone}
              defaultTime="09:00"
              min={
                earliest !== undefined
                  ? instantToWallClock(earliest, ask.timezone) || undefined
                  : undefined
              }
              onValueChange={(next) => {
                setCustom(next ?? "");
                setChoice(null);
              }}
              onReject={(entry) => {
                setCustom(entry);
                setChoice(null);
              }}
            />
          </Field>
        </FormStack>
      </AskLayout>
    </AskShell>
  );
}

/**
 * Yes or no on a consequence the agent spells out. A destructive confirmation takes a second
 * step inside the card, never a dialog (R13.8): the soft entry point turns the consequence
 * into a danger notice and the footer into Back and the solid danger button. Esc goes back.
 */
export function ConfirmAsk({ ask }: {
  /** The confirmation ask: the question, `consequence`, `confirmLabel` and `tone`; `danger` adds the in-card second step. Answers go to the `answer` conversation handler; once answered, expired or cancelled the card shows its record. */
  ask: Ask<"confirm">;
}) {
  const messages = useMessages(asksMessages)

  const id = useId();
  const { answered, submit, record } = useAskAnswer(ask);
  const [confirming, setConfirming] = useState(false);
  const entryRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const danger = ask.tone === "danger";
  const confirm = () =>
    submit(
      { type: "confirm", confirmed: true },
      messages.confirmed(ask.confirmLabel),
    );
  const step = (next: boolean) => {
    setConfirming(next);
    requestAnimationFrame(() =>
      (next ? backRef.current : entryRef.current)?.focus(),
    );
  };
  return (
    <AskShell resolved={answered} record={record}>
      <AskLayout
        id={id}
        icon={<IconWarning />}
        tone={ask.tone === "accent" ? "accent" : ask.tone}
        title={ask.question}
        meta={ask.detail}
        confirming={confirming}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || !confirming) return;
          event.stopPropagation();
          step(false);
        }}
        footerStart={
          confirming ? (
            <Button
              ref={backRef}
              variant="ghost"
              size="sm"
              onClick={() => step(false)}
            >
              {messages.back} </Button>
          ) : (
            <ActionButton
              variant="ghost"
              size="sm"
              pendingLabel={messages.sending}
              successLabel={messages.sent}
              onAction={() =>
                submit(
                  { type: "confirm", confirmed: false },
                  messages.declined(ask.question),
                )
              }
            >
              {messages.no} </ActionButton>
          )
        }
        footer={
          danger && !confirming ? (
            <Button
              ref={entryRef}
              variant="danger-soft"
              size="sm"
              onClick={() => step(true)}
            >
              {ask.confirmLabel}
            </Button>
          ) : (
            <ActionButton
              variant={
                danger
                  ? "danger"
                  : ask.tone === "accent"
                    ? "primary"
                    : "warning"
              }
              size="sm"
              pendingLabel={messages.confirming}
              successLabel={messages.confirmedStatus}
              onAction={confirm}
            >
              {ask.confirmLabel}
            </ActionButton>
          )
        }
      >
        {confirming ? (
          <Notice tone="danger" className="fa-ai-ask-confirm-notice">
            {ask.consequence}
          </Notice>
        ) : (
          <p className="fa-ai-ask-consequence">{ask.consequence}</p>
        )}
      </AskLayout>
    </AskShell>
  );
}

/**
 * A free-text clarification: the agent's question, its best guesses as one-tap answers, and
 * a field for anything else. Enter sends; Shift+Enter adds a line.
 */
export function ClarifyAsk({ ask }: {
  /** The clarification ask: the question, optional `suggestions` as one-tap answers and the free-text `placeholder`. Answers go to the `answer` conversation handler; once answered, expired or cancelled the card shows its record. */
  ask: Ask<"clarify">;
}) {
  const messages = useMessages(asksMessages)

  const id = useId();
  const { answered, submit, record } = useAskAnswer(ask);
  const [text, setText] = useState("");
  const send = (value: string) =>
    submit({ type: "text", value }, messages.replied(value));
  return (
    <AskShell resolved={answered} record={record}>
      <AskLayout
        id={id}
        icon={<IconChat />}
        tone="accent"
        title={ask.question}
        meta={ask.detail}
        footer={
          <ActionButton
            variant="primary"
            size="sm"
            icon={<IconSend />}
            disabledReason={text.trim() ? undefined : messages.typeAReplyFirst}
            pendingLabel={messages.sending}
            successLabel={messages.sent}
            onAction={() => send(text.trim())}
          >
            {messages.reply} </ActionButton>
        }
      >
        <FormStack>
          {ask.suggestions?.length ? (
            <div
              className="fa-ai-ask-times"
              role="group"
              aria-label={messages.suggestedAnswers}
            >
              {ask.suggestions.map((suggestion) => (
                <ActionButton
                  key={suggestion}
                  size="sm"
                  className="fa-ai-quick-option"
                  pendingLabel={suggestion}
                  successLabel={suggestion}
                  onAction={() => send(suggestion)}
                >
                  {suggestion}
                </ActionButton>
              ))}
            </div>
          ) : null}
          <Field label={messages.yourAnswer} message="auto">
            <Textarea
              value={text}
              placeholder={ask.placeholder}
              minRows={1}
              maxRows={4}
              resize={false}
              onValueChange={setText}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing &&
                  text.trim()
                ) {
                  event.preventDefault();
                  void send(text.trim());
                }
              }}
            />
          </Field>
        </FormStack>
      </AskLayout>
    </AskShell>
  );
}
