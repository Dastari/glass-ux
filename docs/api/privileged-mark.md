# PrivilegedMark

A small lock beside the label of a setting that needs MFA to change (PrivilegedWrite,
): reassignment, credentials, routing, removal. Saving a change to one asks for
step-up first ("Verify and save"). Reads never do.

`import { PrivilegedMark } from "glass-ux/entity-settings"`

[Live examples](https://dastari.github.io/glass-ux/components/privileged-mark)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
