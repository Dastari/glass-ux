# KanbanCard

The default card content: title, a meta line, then badges and avatars at its foot. Use it inside `renderCard` to add slots.

`import { KanbanCard } from "glass-ux/kanban"`

[Live examples](https://dastari.github.io/glass-ux/components/kanban-card)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| avatars | `ReactNode` | See type | no | — | People at the foot, end side: an AvatarGroup of assignees. |
| badges | `ReactNode` | See type | no | — | Badges at the foot, start side: priority, type. |
| children | `ReactNode` | See type | no | — | Anything else, between the meta line and the foot. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| meta | `ReactNode` | See type | no | — | A line of detail under it: an identifier, a requester, a due date. |
| title | `ReactNode` | See type | yes | — | The card's name. |
