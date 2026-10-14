# InheritedSetting

A setting that can come from a broader level (R6.9): workspace → organisation →
site → this entity. Inherited, it says where the value comes from and what it is, with
Override. Overridden, it says so ("Overridden for this device"), shows the control (or
the fields beneath), and offers Reset to inherit again. Enforced by a broader level, it
names the enforcer and cannot be overridden.

`import { InheritedSetting } from "glass-ux/entity-settings"`

[Live examples](https://dastari.github.io/glass-ux/components/inherited-setting)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | false, true | no | — | Fields under the row while overridden: a credential profile. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| control | `ReactNode` | false, true | no | — | The control for a setting row while overridden: a Switch, a Segmented. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| disabledReason | `string \| undefined` | See type | no | — | Why the setting cannot be overridden here (permissions). An enforcer supplies its own. |
| enforcedBy | `string \| undefined` | See type | no | — | A broader level enforces the value ("Orbit Workspace"): the row says "Enforced by Orbit Workspace" with a lock, offers no Override, and its disabled reason names the enforcer. |
| inheritedValue | `ReactNode` | false, true | no | — | The inherited value in words: "On", "v2c · port 161 · every 5 min". |
| label | `ReactNode` | false, true | yes | — | Names the setting: "Show signed-in user's photo", "SNMP credentials". |
| onOverride | `() => void` | See type | yes | — | Start an override (copy the inherited value into the entity's own). |
| onReset | `() => void` | See type | yes | — | Drop the override and inherit again. |
| overridden | `boolean` | false, true | yes | — | The entity sets its own value. |
| scope | `string \| undefined` | See type | no | "this item" | Whose override it is: "this device" → "Overridden for this device". |
| source | `ReactNode` | false, true | yes | — | Who the value comes from while not overridden, as the UI names them: "Orbit Workspace", "Central studio (site)", "the workspace". |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
