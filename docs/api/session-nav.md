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
| onArchive | `((session: AiSession) => void) \| undefined` | See type | no | — | Called when archive occurs. The callback type specifies its arguments. |
| onDelete | `((session: AiSession) => Promise<void> \| void) \| undefined` | See type | no | — | Called when delete occurs. The callback type specifies its arguments. |
| onNewChat | `(() => void) \| undefined` | See type | no | — | Called when new chat occurs. The callback type specifies its arguments. |
| onOpenSettings | `(() => void) \| undefined` | See type | no | — | Called when open settings occurs. The callback type specifies its arguments. |
| onOpenWindow | `((session: AiSession) => void) \| undefined` | See type | no | — | Called when open window occurs. The callback type specifies its arguments. |
| onRename | `((session: AiSession, title: string) => void) \| undefined` | See type | no | — | Called when rename occurs. The callback type specifies its arguments. |
| onRestore | `((session: AiSession) => void) \| undefined` | See type | no | — | Called when restore occurs. The callback type specifies its arguments. |
| onSelect | `((session: AiSession) => void) \| undefined` | See type | no | — | Called when select occurs. The callback type specifies its arguments. |
| onSelectProject | `((project: AiProject) => void) \| undefined` | See type | no | — | Called when select project occurs. The callback type specifies its arguments. |
| onViewChange | `((view: SessionView) => void) \| undefined` | See type | no | — | Called when view change occurs. The callback type specifies its arguments. |
| projects | `AiProject[] \| undefined` | See type | no | [] | Projects offered by the host. |
| sessions | `AiSession[]` | See type | yes | — | Conversations or sessions shown in the navigation. |
| view | `SessionView \| undefined` | "conversations", "archived" | no | "conversations" | Currently selected presentation view. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
