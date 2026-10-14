# AccountButton

The signed-in user, with the notifications badge on the avatar. Spreads props on the
button, so it can be a Menu trigger: <Menu.Trigger render={<AccountButton … />} />.

`import { AccountButton } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/account-button)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| avatarSrc | `string \| undefined` | See type | no | — | Profile image URL; an initials fallback is used when it is absent. |
| email | `string` | See type | yes | — | The account’s displayed email address. |
| name | `string` | See type | yes | — | The component’s name or native form field name, as specified by its value type. |
| unread | `number \| undefined` | See type | no | 0 | Unread notifications: a count on the avatar's corner (R5.2: the avatar carries them). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
