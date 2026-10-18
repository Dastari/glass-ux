# SessionNav

The Assistant section drawer's content: New chat, search, the two views (conversations,
archived) with counts, projects, and the sessions grouped by day. Each row shows its
title, whose chat it is (the organisation's code, or All: history is never filtered by the
organisation switcher, R6.9), last activity, and what it needs — a spinner while working,
a warning dot when it waits for you (approval), a danger dot after a failed run, an accent
dot when unread. The title truncates first. Rows carry the session actions (R12): the ⋯
menu and right-click read one definition. The drawer decides the width (any width from its
narrowest up); the content never widens it.

`import { SessionNav } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/session-nav)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| activeId | `string \| undefined` | See type | no | — | Stable identifier of the active item. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| counts | `{ conversations: number; archived: number; } \| undefined` | See type | no | — | Counts grouped by category or status. |
| initialQuery | `string \| undefined` | See type | no | "" | Start with this search (templates, deep links). |
| loading | `boolean \| undefined` | false, true | no | false | Shows loading feedback in the space reserved for the content. |
| onArchive | `((session: AiSession) => void) \| undefined` | See type | no | — | Called with the session from its Archive action, offered for sessions that are not archived. |
| onDelete | `((session: AiSession) => Promise<void> \| void) \| undefined` | See type | no | — | Called with the session after the person confirms Delete; unavailable while its response is working. A returned promise keeps the action pending until it settles. |
| onNewChat | `(() => void) \| undefined` | See type | no | — | Called from New chat; the button is shown only when this is supplied. |
| onOpenSettings | `(() => void) \| undefined` | See type | no | — | Called from the AI settings row at the foot of the list; the row is shown only when this is supplied. |
| onOpenWindow | `((session: AiSession) => void) \| undefined` | See type | no | — | Called with the session from its Open in window action; the action is shown only when this is supplied. |
| onRename | `((session: AiSession, title: string) => void) \| undefined` | See type | no | — | Called with the session and its new trimmed title when an inline rename (Rename or F2) is committed with Enter or blur; not called when the title is empty, unchanged or the edit is cancelled with Esc. Supplying it enables renaming. |
| onRestore | `((session: AiSession) => void) \| undefined` | See type | no | — | Called with the session from its Restore action, offered for archived sessions. |
| onSelect | `((session: AiSession) => void) \| undefined` | See type | no | — | Called with the session whose row is clicked or activated with Enter. Pair with `activeId` to mark it current. |
| onSelectProject | `((project: AiProject) => void) \| undefined` | See type | no | — | Called with the project whose row is pressed in the Projects group. |
| onViewChange | `((view: SessionView) => void) \| undefined` | See type | no | — | Called with `conversations` or `archived` when the person picks Conversation history or Archived chats. Pair with `view` to switch the list. |
| projects | `AiProject[] \| undefined` | See type | no | [] | Projects offered by the host. |
| sessions | `AiSession[]` | See type | yes | — | Conversations or sessions shown in the navigation. |
| view | `SessionView \| undefined` | "conversations", "archived" | no | "conversations" | Currently selected presentation view. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
