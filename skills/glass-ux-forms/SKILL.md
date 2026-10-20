---
name: glass-ux-forms
description: Build Glass UX forms and settings with typed values, TanStack Form bindings, schema helpers and consistent validation and submission behaviour.
---

# Build typed forms

Before composing UI, read and apply the installed package's `docs/ui-rules.md`, especially
Screen content rules. These defaults apply to consuming websites and applications unless
explicit user or project instructions say otherwise: do not overuse subheadings, add
motivational/irrelevant/cheerful/promotional copy, overexplain the page, push primary content
down with redundant framing, repeat a route title already named by navigation, or introduce
content shifts that move buttons or menus. Use factual labels and reserve asynchronous
content space. Deliberate long-form documents may contain necessary headings and prose.

Read the installed package's `docs/getting-started.md`, `docs/components/README.md`,
`docs/api/form.md` and the guide for the chosen typed input.

Choose the control by its value contract. Money stores minor units, duration stores seconds,
byte size stores bytes, phone values use E.164, dates use calendar-date strings, times use
`HH:mm`, a date and time is a wall clock (`2026-10-21T09:30`) with its IANA zone held beside it,
and structured addresses retain their parts. Do not convert those contracts into display strings
or instants in form state; resolve a wall clock with `resolveWallClock` when sending it.

Use `useAppForm`, `formBehaviour`, the control's schema helper and `form.AppField` for a bound
field. Use the bare input only when the host owns its state and field chrome. Normalisation
happens on blur, validation begins on blur, and an invalid field revalidates on change.

Stack one text or choice field per row. Switches and short segmented choices use setting rows.
Use the form's submit action and dirty-state behaviour; show validation in the reserved message
slot and explain submission failures through the documented error handler.

Read the schema helper's options before composing validation. Do not impose a second parser
with different empty/required behaviour. Fields format and read values in the resolved locale
(the `locale` prop, `LocaleProvider`, `configureLocale()`, `<html lang>`, then `en-US`). Schema
messages use `configureLocale()` or `<html lang>`. Pass a field's explicit `locale` to its
schema helper as well. Address lookup needs an application-supplied adapter
or matching server route; a demo fixture is not a production provider.

Use `RichTextField` with `richTextSchema` for Markdown documents and notes. Read
`docs/components/rich-text.md`: visual editing is the default, source mode is optional, and
the persisted value remains Markdown. Supply an application-owned `uploadAttachment` adapter
when needed; the field owns editing, not storage, authorization, revisions or credential custody.
Do not build another toolbar or textarea/preview toggle around this field.
