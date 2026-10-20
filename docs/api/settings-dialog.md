# SettingsDialog

The settings pattern (R13.2): header with icon tile, title and a data subtitle; an L3
rail of sections beside a scrolling pane; a pinned footer. The rail is the shared
VerticalTabs, so it becomes a chip strip (or a picker) when the dialog is narrow — on a
phone sheet, in a small window. Its height is fixed so switching sections never
resizes the dialog.

`import { SettingsDialog } from "glass-ux/dialog"`

[Live examples](https://dastari.github.io/glass-ux/components/settings-dialog)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| defaultSection | `string \| undefined` | See type | no | — | Initially active section. |
| dirty | `boolean \| undefined` | false, true | no | false | Guard closing while there are unsaved changes. |
| footer | `ReactNode` | See type | no | — | Footer actions, primary last: Cancel, then an ActionButton "Save changes". |
| footerStart | `ReactNode` | See type | no | — | Footer start slot (Reset to defaults). |
| icon | `ReactNode` | See type | no | — | An icon element without an explicit size; the component sizes it through its tokens. |
| onDiscard | `(() => void) \| undefined` | See type | no | — | Called when the person confirms discarding unsaved changes, just before the dialog closes; revert the form here. |
| onOpenChange | `((open: boolean) => void) \| undefined` | See type | no | — | Called with the next open state when the dialog opens or closes. While `dirty`, a dismissal first asks to discard and only reports false once the person confirms. Pair with `open` to control it. |
| onSectionChange | `((section: string) => void) \| undefined` | See type | no | — | Write the section to the URL when it is a place (R6.2). |
| open | `boolean \| undefined` | false, true | no | — | Controls whether the overlay is open. |
| section | `string \| undefined` | See type | no | — | Active section identifier. |
| sections | `SettingsSection[]` | See type | yes | — | Section definitions in display order. |
| size | `"lg" \| "xl" \| undefined` | "lg", "xl" | no | "xl" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| subtitle | `ReactNode` | See type | no | — | Data: the target, e.g. "LMN-7C71". |
| title | `ReactNode` | See type | yes | — | "Agent settings" |
| trigger | `ReactElement<unknown, string \| import("react").JSXElementConstructor<any>> \| undefined` | See type | no | — | Control that opens the overlay or action. |
