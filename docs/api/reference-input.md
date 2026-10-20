# ReferenceInput

Link entities to the one being edited, the way the AI composer adds context: type @ (or
press Link…) to search people, devices, sites, tickets and documents, pick one, and it
becomes a chip. Results group by kind with the current organisation first; chips in the
popup narrow to one kind (Alt ← →). Each chip is the entity's own identity (pass the
application's renderer), removable with ✕ or Backspace, with a relation menu in front of
it. Linking an entity twice flashes the existing chip instead.

Read-only (or `direction="from"` for backlinks) it lists the chips in a recessed well.

`import { ReferenceInput } from "glass-ux/reference-input"`

[Live examples](https://dastari.github.io/glass-ux/components/reference-input)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| aria-labelledby | `string \| undefined` | See type | no | — | IDs of elements that provide the accessible name. |
| className | `string \| undefined` | See type | no | — | Layout only. Applied to the control box. |
| currentOrganisation | `string \| undefined` | See type | no | — | Results from this organisation come first; others carry their organisation's name. |
| defaultRelation | `R \| undefined` | See type | no | — | The relation a new link starts with. Default: the first relation. |
| defaultValue | `ReferenceLink<R>[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| direction | `"from" \| "to" \| undefined` | "from", "to" | no | "to" | `from`: backlinks, read with each relation's inverse label. Implies read-only. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| disabledReason | `((target: ReferenceTarget) => string \| undefined) \| undefined` | See type | no | — | Why a target cannot be linked here ("This device"), or nothing. |
| emptyText | `string \| undefined` | See type | no | "None" | What a read-only input with no links says. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| invalid | `boolean \| undefined` | false, true | no | — | Marks the control invalid. Pair it with an accessible validation message. |
| kindFilter | `boolean \| undefined` | false, true | no | — | Show the kind filter chips in the popup (default when there is more than one kind). |
| kinds | `readonly ReferenceKind[]` | See type | yes | — | The kinds that can be linked, in the order results group by. |
| max | `number \| undefined` | See type | no | — | Most links allowed. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| onBlur | `((event: FocusEvent<HTMLInputElement>) => void) \| undefined` | See type | no | — | Called when the search input loses focus, so a form can mark the field touched. |
| onValueChange | `((links: ReferenceLink<R>[]) => void) \| undefined` | See type | no | — | Called with the full, de-duplicated list of links whenever one is added, removed or given another relation. Pair with `value` to control it; use `defaultValue` otherwise. |
| placeholder | `string \| undefined` | See type | no | "Type @ to link" | The prompt shown while the value is empty. It does not replace the field’s label. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| relations | `readonly ReferenceRelation<R>[] \| undefined` | See type | no | — | Relations a chip's menu offers. Omit for plain context chips (the AI composer). |
| renderChip | `((target: ReferenceTarget, options: ReferenceChipOptions) => ReactNode) \| undefined` | See type | no | — | Draw a linked entity as a chip. Pass the application's identity (the AI resolver's chip tier) so a link looks the same here as in an answer. Default: EntityIdentity's chip. |
| renderGlyph | `((target: ReferenceTarget) => ReactNode) \| undefined` | See type | no | — | The glyph in a result row. Default: the kind's icon. |
| source | `ReferenceSource` | See type | yes | — | Where |
| value | `ReferenceLink<R>[] \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Available width or named width tier. |
