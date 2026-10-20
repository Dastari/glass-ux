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

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| ref | `Ref<HTMLButtonElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| value | `string \| number \| readonly string[] \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |

Also accepts the element’s standard HTML attributes and React DOM events.
