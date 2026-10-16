# AccountButton

The signed-in user account: avatar, display name, optional email and notification count.
Use as a Menu trigger for host-owned profile, preferences and sign-out actions:
`<Menu.Trigger render={<AccountButton … />} />`. Native button props and refs are preserved.

`import { AccountButton } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/account-button)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| avatarSrc | `string \| undefined` | See type | no | — | Profile image URL; an initials fallback is used when it is absent. |
| email | `string \| undefined` | See type | no | — | Optional second line beneath the name. Omit when the account has no public email address. |
| name | `string` | See type | yes | — | Display name for the signed-in account; also used for its accessible name and avatar fallback. |
| unread | `number \| undefined` | See type | no | 0 | Unread notifications: a count on the avatar's corner (R5.2: the avatar carries them). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
