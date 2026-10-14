# EntityPickerAsk

Pick one or more entities: a search field over the application's resolver, the agent's
suggestions as the starting list, and the picks as removable chips.

`import { EntityPickerAsk } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/entity-picker-ask)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| ask | `{ type: "entity"; entityKind: import("../types.js").EntityKind; suggestions: EntityRef[]; multiple?: boolean; } & { id: string; question: string; detail?: string; status?: import("../types.js").AskState; answer?: string; answeredBy?: string; answeredAt?: number; submitLabel?: string; }` | See type | yes | — | The typed request and its current resolution state. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
