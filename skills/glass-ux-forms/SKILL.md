---
name: glass-ux-forms
description: Build Glass UX forms and settings with typed values, TanStack Form bindings, schema helpers and consistent validation and submission behaviour.
---

# Build typed forms

Read the installed package's `docs/getting-started.md`, `docs/components/README.md`,
`docs/api/form.md` and the guide for the chosen typed input.

Choose the control by its value contract. Money stores minor units, duration stores seconds,
byte size stores bytes, phone values use E.164, dates use calendar-date strings, and structured
addresses retain their parts. Do not convert those contracts into display strings in form state.

Use `useAppForm`, `formBehaviour`, the control's schema helper and `form.AppField` for a bound
field. Use the bare input only when the host owns its state and field chrome. Normalisation
happens on blur, validation begins on blur, and an invalid field revalidates on change.

Stack one text or choice field per row. Switches and short segmented choices use setting rows.
Use the form's submit action and dirty-state behaviour; show validation in the reserved message
slot and explain submission failures through the documented error handler.

Read the schema helper's options before composing validation. Do not impose a second parser
with different empty/required behaviour. Address lookup needs an application-supplied adapter
or matching server route; a demo fixture is not a production provider.

Use `RichTextField` with `richTextSchema` for Markdown documents and notes. Read
`docs/components/rich-text.md`: visual editing is the default, source mode is optional, and
the persisted value remains Markdown. Supply an application-owned `uploadAttachment` adapter
when needed; the field owns editing, not storage, authorization, revisions or credential custody.
Do not build another toolbar or textarea/preview toggle around this field.
