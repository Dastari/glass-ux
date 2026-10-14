# EntitySettingsDialog

Every entity's Settings dialog (R12.6, glass-ux-components-plan §5.1): an `lg` dialog whose
header is the entity's identity tile with "Settings" and a data subtitle, an L3 tab rail,
and Cancel / Save. One form spans every tab, so Save sends one document.

- A tab with unsaved changes shows a neutral dot; after a refused save, tabs with errors
  show a danger dot, the dialog opens the first of them and focuses the field.
- Server errors (`SettingsSaveError.fieldErrors`) appear at their fields and clear as the
  field changes.
- Save is disabled until something changes, then confirms in place (R15.10). Changes to
  privileged fields (reassignment, credentials, routing) make it "Verify and save": a
  step-up first, then the save.
- A save refused because someone else saved first (SettingsConflictError) keeps the
  edits and says so beside Save, with Reload.
- Closing with unsaved changes asks first (R13.7). Cancel reverts and closes.
- On phones it is a bottom sheet; the rail becomes chips, or a picker past six tabs.

`import { EntitySettingsDialog } from "glass-ux/entity-settings"`

[Live examples](https://dastari.github.io/glass-ux/components/entity-settings-dialog)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| defaultTab | `string \| undefined` | See type | no | — | Initially selected tab. |
| entityName | `string \| undefined` | See type | no | — | Names the entity in the discard question: "Discard changes to NST-C106?". |
| footerStart | `ReactNode` | false, true | no | — | Tertiary footer actions on the left. |
| form | `EntitySettingsForm` | See type | yes | — | The form every tab edits: one `useAppForm` with the entity's Zod schema. |
| loading | `boolean \| undefined` | false, true | no | false | The document is loading: every tab shows its skeleton and Save waits. |
| media | `ReactNode` | false, true | no | — | The entity's identity tile: its glyph or photo with the state dot. |
| onOpenChange | `(open: boolean) => void` | See type | yes | — | Called when open change occurs. The callback type specifies its arguments. |
| onReload | `((fields: readonly string[]) => Promise<void>) \| undefined` | See type | no | — | After a conflict (SettingsConflictError), reload the documents behind these fields: they take the server's values and lose their edits; every other edit stays. |
| onSaved | `(() => void) \| undefined` | See type | no | — | After a save is confirmed (the saved values are the new baseline). |
| onSaveError | `((error: unknown) => void) \| undefined` | See type | no | — | A save failed: the Save button shows ✕; put the reason in a toast here. |
| onTabChange | `((tab: string) => void) \| undefined` | See type | no | — | Called when tab change occurs. The callback type specifies its arguments. |
| onVerify | `(() => Promise<void>) \| undefined` | See type | no | — | The step-up: resolves once verified, throws if it was declined or failed. |
| open | `boolean` | false, true | yes | — | Controls whether the overlay is open. |
| preview | `boolean \| undefined` | false, true | no | false | Render in the page flow, open and non-modal (gallery specimens). |
| privileged | `readonly string[] \| undefined` | See type | no | [] | Fields (names or prefixes) that need MFA to change (PrivilegedWrite). While the changes include one, Save reads "Verify and save" and runs `onVerify` first. Mark their labels with PrivilegedMark. Reads never need it. |
| size | `"lg" \| "xl" \| undefined` | "lg", "xl" | no | "lg" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| subtitle | `ReactNode` | false, true | no | — | Data only (R2.2): "NST-C106 · Northstar Studio". |
| tab | `string \| undefined` | See type | no | — | The open tab, when it lives in the URL (`?settings=snmp`). |
| tabs | `readonly EntitySettingsTab[]` | See type | yes | — | Tab definitions in display order. |
| title | `ReactNode` | false, true | no | "Settings" | Default "Settings". |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
