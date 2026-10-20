# ActionMenu

The row ⋯ menu (R12.1): a ghost icon button that opens every action for the row.

`import { ActionMenu } from "glass-ux/actions"`

[Live examples](https://dastari.github.io/glass-ux/components/action-menu)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| align | `"center" \| "start" \| "end" \| undefined` | "center", "start", "end" | no | "end" | Alignment of the overlay relative to its anchor. |
| label | `string` | See type | yes | — | The target's name, for the trigger's accessible name: "Actions for NST-C106". |
| set | `ActionSet<T>` | See type | yes | — | Shared action definitions used by menus, headers and the command palette. |
| size | `ButtonSize \| undefined` | "xs", "sm", "md", "lg" | no | "sm" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| targets | `readonly T[]` | See type | yes | — | Selected entities passed to action visibility, enablement, confirmation and execution. |
| trigger | `ReactElement<unknown, string \| import("react").JSXElementConstructor<any>> \| undefined` | See type | no | — | Replace the ⋯ trigger (it must forward its ref and spread props). |
