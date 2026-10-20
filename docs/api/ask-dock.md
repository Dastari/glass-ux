# AskDock

The ask dock (R13.8): every pending ask in the conversation, pinned directly above the
composer until it is answered. Oldest first; with several, one shows with "1 of 3" and
previous/next, the others keep their state (a half-filled form survives paging). It folds
to one line (the question) and unfolds upwards; its height is capped with the rest
scrolling inside, so the transcript always shows above it. Nothing is blocked: the
composer and the transcript keep working.

`import { AskDock } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/ask-dock)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
