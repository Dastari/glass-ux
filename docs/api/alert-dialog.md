# AlertDialog

A confirmation for destructive or irreversible actions. Cancel takes focus first; Esc
cancels; outside presses do nothing. While the action runs, it cannot be dismissed.

`import { AlertDialog } from "glass-ux/alert-dialog"`

[Live examples](https://dastari.github.io/glass-ux/components/alert-dialog)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| cancelLabel | `string \| undefined` | See type | no | "Cancel" | Visible label for cancelling or dismissing the request. |
| confirmLabel | `string` | See type | yes | — | A verb naming the outcome: "Remove device". |
| defaultOpen | `boolean \| undefined` | false, true | no | false | Opens the uncontrolled overlay initially. |
| description | `ReactNode` | See type | no | — | One factual sentence: what happens, and whether it can be undone. |
| failureTitle | `string \| undefined` | See type | no | — | Title of the failure toast. Default: "<confirmLabel> failed". |
| icon | `ReactNode` | See type | no | — | An icon element without an explicit size; the component sizes it through its tokens. |
| onConfirm | `() => unknown` | See type | yes | — | Runs in place: the confirm button shows pending, then ✓ and the dialog closes. If it throws, the button shakes ✕, the dialog stays open and the reason goes to a toast. |
| onOpenChange | `((open: boolean) => void) \| undefined` | See type | no | — | Called with the next open state when the trigger opens it, Cancel or Esc dismisses it, or it closes after `onConfirm` succeeds. Not called for dismissals while the action runs. Pair with `open` to control it. |
| onOpenChangeComplete | `((open: boolean) => void) \| undefined` | See type | no | — | Called with the final open state once the open or close animation has finished. |
| open | `boolean \| undefined` | false, true | no | — | Controls whether the overlay is open. |
| pendingLabel | `string \| undefined` | See type | no | — | Label shown while the asynchronous action runs. Its width is reserved with the other feedback labels. |
| title | `ReactNode` | See type | yes | — | Names the target: "Remove NST-C106 from Northstar Studio?" (R12.4). |
| tone | `AlertTone \| undefined` | "danger", "warning", "default" | no | "danger" | The semantic tone. Use danger and warning for consequences and states. |
| trigger | `ReactElement<unknown, string \| import("react").JSXElementConstructor<any>> \| undefined` | See type | no | — | The element that opens it. Omit when controlling `open`. |
