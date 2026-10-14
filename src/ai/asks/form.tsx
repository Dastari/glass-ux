import { useId, useRef, useState } from "react"
import { IconCalendar, IconChat, IconEdit, IconSend, IconWarning } from "../../icons/generated/icons.js"
import { ActionButton, Button } from "../../ui/button/index.js"
import { Field } from "../../ui/field/index.js"
import { FormStack } from "../../ui/form/index.js"
import { Input } from "../../ui/input/index.js"
import { Notice } from "../../ui/notice/index.js"
import { NumberField } from "../../ui/number-field/index.js"
import { Select } from "../../ui/select/index.js"
import { Textarea } from "../../ui/textarea/index.js"
import type { AiAsk, FormField } from "../types.js"
import { useAskAnswer } from "./choice.js"
import { AskLayout, AskShell } from "./frame.js"

type Ask<T extends AiAsk["type"]> = Extract<AiAsk, { type: T }>

function FieldControl({ field, value, invalid, onChange, onBlur }: { field: FormField; value: string; invalid: boolean; onChange: (value: string) => void; onBlur: () => void }) {
  switch (field.kind) {
    case "textarea":
      return <Textarea name={field.name} value={value} placeholder={field.placeholder} minRows={2} maxRows={6} resize={false} invalid={invalid} onValueChange={onChange} onBlur={onBlur} />
    case "select":
      return <Select name={field.name} value={value || null} options={field.options ?? []} placeholder={field.placeholder} invalid={invalid} onValueChange={(next) => onChange(next ?? "")} onBlur={onBlur} />
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
      )
    default:
      return <Input name={field.name} value={value} placeholder={field.placeholder} width="medium" invalid={invalid} onValueChange={onChange} onBlur={onBlur} />
  }
}

/**
 * A short form the agent needs filled (a ticket, a schedule): stacked fields, one per row,
 * capped at the form measure (R15). Values the agent already knows arrive pre-filled.
 * Required fields validate on blur, then as you type; submitting focuses the first gap.
 */
export function FormAsk({ ask }: { ask: Ask<"form"> }) {
  const id = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const { answered, submit, record } = useAskAnswer(ask)
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(ask.fields.map((field) => [field.name, field.value ?? ""])))
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const errorOf = (field: FormField) => (field.required && !values[field.name]?.trim() ? `Enter ${field.label.toLowerCase()}` : undefined)
  const missing = ask.fields.filter((field) => errorOf(field))

  const send = async () => {
    if (missing.length) {
      setTouched(Object.fromEntries(ask.fields.map((field) => [field.name, true])))
      formRef.current?.querySelector<HTMLElement>(`[name="${missing[0]!.name}"]`)?.focus()
      throw new Error("Fill the required fields")
    }
    const summary = ask.fields
      .filter((field) => values[field.name])
      .slice(0, 3)
      .map((field) => {
        const option = field.options?.find((item) => item.value === values[field.name])
        return option?.label ?? values[field.name]
      })
      .join(" · ")
    await submit({ type: "form", values, label: summary }, `Sent · ${summary}`)
  }

  return (
    <AskShell resolved={answered} record={record}>
      <AskLayout
        id={id}
        icon={<IconEdit />}
        tone="accent"
        title={ask.question}
        meta={ask.detail}
        footer={
          <ActionButton variant="primary" size="sm" pendingLabel="Sending…" successLabel="Sent" errorLabel="Check the fields" onAction={send}>
            {ask.submitLabel ?? "Send"}
          </ActionButton>
        }
      >
        <form
          ref={formRef}
          className="fa-ai-ask-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void send().catch(() => {})
          }}
        >
          <FormStack>
            {ask.fields.map((field) => (
              <Field key={field.name} label={field.label} required={field.required} hint={field.hint} error={touched[field.name] ? errorOf(field) : undefined}>
                <FieldControl
                  field={field}
                  value={values[field.name] ?? ""}
                  invalid={Boolean(touched[field.name] && errorOf(field))}
                  onChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))}
                  onBlur={() => setTouched((current) => ({ ...current, [field.name]: true }))}
                />
              </Field>
            ))}
          </FormStack>
        </form>
      </AskLayout>
    </AskShell>
  )
}

/**
 * When something should happen: the agent's suggested times as one-tap choices, or an exact
 * date and time, in the stated time zone.
 */
export function DateTimeAsk({ ask }: { ask: Ask<"datetime"> }) {
  const id = useId()
  const { answered, submit, record } = useAskAnswer(ask)
  const [choice, setChoice] = useState<string | null>(null)
  const [custom, setCustom] = useState("")
  const suggestion = ask.suggestions.find((item) => item.value === choice)
  const label = suggestion?.label ?? (custom ? new Date(custom).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "")
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
            disabledReason={label ? undefined : "Choose a time first"}
            pendingLabel="Scheduling…"
            successLabel="Scheduled"
            onAction={() => submit({ type: "datetime", value: suggestion?.value ?? custom, label }, `Scheduled · ${label} (${ask.timezone})`)}
          >
            {ask.submitLabel ?? "Schedule"}
          </ActionButton>
        }
      >
        <FormStack>
          <Field label="Suggested times" nativeLabel={false} message="auto">
            <div className="fa-ai-ask-times" role="radiogroup" aria-label="Suggested times">
              {ask.suggestions.map((item) => (
                <Button
                  key={item.value}
                  size="sm"
                  variant={choice === item.value ? "soft" : "secondary"}
                  role="radio"
                  aria-checked={choice === item.value}
                  onClick={() => {
                    setChoice(item.value)
                    setCustom("")
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </Field>
          <Field label="Or a date and time" hint={`${ask.timezone}${ask.earliest ? ` · from ${ask.earliest}` : ""}`}>
            <Input
              type="datetime-local"
              width="medium"
              value={custom}
              onValueChange={(value) => {
                setCustom(value)
                if (value) setChoice(null)
              }}
            />
          </Field>
        </FormStack>
      </AskLayout>
    </AskShell>
  )
}

/**
 * Yes or no on a consequence the agent spells out. A destructive confirmation takes a second
 * step inside the card, never a dialog (R13.8): the soft entry point turns the consequence
 * into a danger notice and the footer into Back and the solid danger button. Esc goes back.
 */
export function ConfirmAsk({ ask }: { ask: Ask<"confirm"> }) {
  const id = useId()
  const { answered, submit, record } = useAskAnswer(ask)
  const [confirming, setConfirming] = useState(false)
  const entryRef = useRef<HTMLButtonElement>(null)
  const backRef = useRef<HTMLButtonElement>(null)
  const danger = ask.tone === "danger"
  const confirm = () => submit({ type: "confirm", confirmed: true }, `Confirmed · ${ask.confirmLabel}`)
  const step = (next: boolean) => {
    setConfirming(next)
    requestAnimationFrame(() => (next ? backRef.current : entryRef.current)?.focus())
  }
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
          if (event.key !== "Escape" || !confirming) return
          event.stopPropagation()
          step(false)
        }}
        footerStart={
          confirming ? (
            <Button ref={backRef} variant="ghost" size="sm" onClick={() => step(false)}>
              Back
            </Button>
          ) : (
            <ActionButton variant="ghost" size="sm" pendingLabel="Sending…" successLabel="Sent" onAction={() => submit({ type: "confirm", confirmed: false }, `Declined · ${ask.question}`)}>
              No
            </ActionButton>
          )
        }
        footer={
          danger && !confirming ? (
            <Button ref={entryRef} variant="danger-soft" size="sm" onClick={() => step(true)}>
              {ask.confirmLabel}
            </Button>
          ) : (
            <ActionButton variant={danger ? "danger" : ask.tone === "accent" ? "primary" : "warning"} size="sm" pendingLabel="Confirming…" successLabel="Confirmed" onAction={confirm}>
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
  )
}

/**
 * A free-text clarification: the agent's question, its best guesses as one-tap answers, and
 * a field for anything else. Enter sends; Shift+Enter adds a line.
 */
export function ClarifyAsk({ ask }: { ask: Ask<"clarify"> }) {
  const id = useId()
  const { answered, submit, record } = useAskAnswer(ask)
  const [text, setText] = useState("")
  const send = (value: string) => submit({ type: "text", value }, `Replied · ${value}`)
  return (
    <AskShell resolved={answered} record={record}>
      <AskLayout
        id={id}
        icon={<IconChat />}
        tone="accent"
        title={ask.question}
        meta={ask.detail}
        footer={
          <ActionButton variant="primary" size="sm" icon={<IconSend />} disabledReason={text.trim() ? undefined : "Type a reply first"} pendingLabel="Sending…" successLabel="Sent" onAction={() => send(text.trim())}>
            Reply
          </ActionButton>
        }
      >
        <FormStack>
          {ask.suggestions?.length ? (
            <div className="fa-ai-ask-times" role="group" aria-label="Suggested answers">
              {ask.suggestions.map((suggestion) => (
                <ActionButton key={suggestion} size="sm" className="fa-ai-quick-option" pendingLabel={suggestion} successLabel={suggestion} onAction={() => send(suggestion)}>
                  {suggestion}
                </ActionButton>
              ))}
            </div>
          ) : null}
          <Field label="Your answer" message="auto">
            <Textarea
              value={text}
              placeholder={ask.placeholder}
              minRows={1}
              maxRows={4}
              resize={false}
              onValueChange={setText}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && text.trim()) {
                  event.preventDefault()
                  void send(text.trim())
                }
              }}
            />
          </Field>
        </FormStack>
      </AskLayout>
    </AskShell>
  )
}
