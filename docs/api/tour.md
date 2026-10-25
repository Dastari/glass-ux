# Tour

A guided tour of an application's UI. Each step dims the page except its target (the
spotlight, in the scrim colour) and shows a card anchored to it with an arrow: the
title, a sentence or two, "Step 2 of 5", Skip, Back and Next (Done on the last step).
Targets scroll into view, and the spotlight and card follow them through scrolling and
resizing. A step whose target is missing waits up to `targetTimeout`, then is skipped.

The card is a non-modal dialog named by its title: focus moves to it when the tour opens
and returns where it was when it closes, and nothing else on the page is made inert. ← and
→ step while focus is in the card; Esc skips. The spotlight is decorative. Still and
reduced motion move the spotlight without animating.

`import { Tour } from "glass-ux/tour"`

[Live examples](https://dastari.github.io/glass-ux/components/tour)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| defaultOpen | `boolean \| undefined` | false, true | no | false | Show the tour at first (uncontrolled). Ignored once `storageKey` records it as completed. |
| defaultStep | `number \| undefined` | See type | no | 0 | The step shown first when the step is uncontrolled. Default 0. |
| labels | `Partial<{ progress: (step: number, total: number) => string; next: string; back: string; done: string; skip: string; announce: ({ step, total, title }: { step: number; total: number; title: string; }) => string; }> \| undefined` | See type | no | — | Wording for this instance, over the language pack and `MessagesProvider`. |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for the wording. Default: the nearest `LocaleProvider`. |
| onComplete | `(() => void) \| undefined` | See type | no | — | Called when the person presses Done on the last step. |
| onOpenChange | `((open: boolean, details: { reason: TourCloseReason \| "open"; }) => void) \| undefined` | See type | no | — | Called with false and the reason when the tour finishes, is skipped or Esc closes it. |
| onSkip | `((step: number) => void) \| undefined` | See type | no | — | Called with the step's index when the person skips the tour (Skip or Esc). |
| onStepChange | `((step: number) => void) \| undefined` | See type | no | — | Called with the step's index when Next, Back or the arrow keys change it, or a missing target is skipped. |
| open | `boolean \| undefined` | false, true | no | — | Whether the tour is showing. Controlled while defined. |
| step | `number \| undefined` | See type | no | — | The current step's index. Controlled while defined. |
| steps | `TourStep[]` | See type | yes | — | The steps, in order. A step whose target is missing is skipped (after `targetTimeout`). |
| storageKey | `string \| undefined` | See type | no | — | Remember completion in localStorage under this key: finishing or skipping records it, and an uncontrolled tour does not open again. Include the user and the tour's version ("onboarding:v2:user-42"). `useTourCompletion` reads and resets it. |
| targetTimeout | `number \| undefined` | See type | no | 1000 | How long to wait for a step's target to appear (ms) before skipping it. Default 1000. |
