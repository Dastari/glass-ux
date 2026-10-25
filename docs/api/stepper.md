# Stepper

Progress through a multi-step task: numbered markers joined by a line, a check on finished
steps and a mark on steps that need attention. It shows progress; the content and the
Back and Next buttons belong to the page or a Wizard.

`import { Stepper } from "glass-ux/stepper"`

[Live examples](https://dastari.github.io/glass-ux/components/stepper)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Names the steps navigation. Default "Steps". |
| children | `ReactNode` | See type | no | — | Content under the current step in the vertical layout (a step-by-step form on one page). |
| className | `string \| undefined` | See type | no | — | Layout only. |
| labels | `Partial<{ steps: string; stepOf: (step: number, total: number) => string; complete: string; current: string; error: string; optional: string; skipped: string; back: string; next: string; finish: string; finishing: string; finished: string; skip: string; }> \| undefined` | See type | no | — | Wording overrides. |
| locale | `string \| undefined` | See type | no | — | Formatting and wording locale; defaults to the nearest LocaleProvider. |
| navigation | `StepperNavigation \| undefined` | "none", "any", "visited" | no | "none" | Which steps can be chosen (StepperNavigation). Default none. |
| onValueChange | `((id: string) => void) \| undefined` | See type | no | — | Called with a step's id when the person chooses it (see `navigation`). |
| orientation | `"horizontal" \| "vertical" \| undefined` | "horizontal", "vertical" | no | "horizontal" | `horizontal` (default) lays the steps along a line, and below a container width shows "Step 2 of 5" with the current step's name and a progress bar instead; `vertical` stacks them, for a side rail or a step-by-step page. |
| steps | `StepItem[]` | See type | yes | — | The steps, in order. |
| value | `string` | See type | yes | — | The current step's id. |
