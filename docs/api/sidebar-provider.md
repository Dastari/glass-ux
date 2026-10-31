# SidebarProvider

Holds one sidebar's state (expanded, phone sheet, width, groups and shortcut) and lays its
Sidebar and SidebarInset out side by side, filling the container.

`import { SidebarProvider } from "glass-ux/sidebar"`

[Live examples](https://dastari.github.io/glass-ux/components/sidebar-provider)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| defaultOpen | `boolean \| undefined` | false, true | no | — | Whether the desktop sidebar starts expanded when uncontrolled and nothing is remembered. |
| mobileQuery | `string \| undefined` | See type | no | — | Below this media query the sidebar becomes a sheet from its edge. |
| name | `string \| undefined` | See type | no | — | Names this provider so a SidebarTrigger or `useSidebar(name)` inside a nested provider can reach it. |
| nonce | `string \| undefined` | See type | no | — | Content-Security-Policy nonce for the inline boot script rendered during server rendering. |
| onOpenChange | `((open: boolean, details: SidebarChangeDetails) => void) \| undefined` | See type | no | — | Called with the next desktop state and why it changed (a trigger, the shortcut, the Rail, a drag past the minimum width). Update controlled state here. |
| onOpenMobileChange | `((open: boolean, details: SidebarChangeDetails) => void) \| undefined` | See type | no | — | Called with the next phone sheet state and why: a trigger, a destination chosen in it, or swipe, Esc or the scrim. |
| open | `boolean \| undefined` | false, true | no | — | Whether the desktop sidebar is expanded (controlled). Pair with `onOpenChange`. |
| openMobile | `boolean \| undefined` | false, true | no | — | Whether the phone sheet is open (controlled). Pair with `onOpenMobileChange`. |
| shortcut | `string \| false \| undefined` | See type | no | — | The keys that toggle the sidebar from anywhere on the page, or `false` for none. The default is `"mod+b"` (⌘B, Ctrl+B) for a start sidebar and none for an end one. It is ignored while focus is in rich text or a custom text box, where Ctrl+B means bold. Triggers show it in their tooltips and `aria-keyshortcuts`. |
| storageKey | `string \| undefined` | See type | no | — | Remember the open state, the dragged width and the open groups under this localStorage key, so they survive a reload without a flash. Inside a storage scope (a window body) the scope is appended. Absent: nothing persists. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
