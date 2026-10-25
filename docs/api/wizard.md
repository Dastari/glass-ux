# Wizard

A multi-step task: a Stepper, the current step's content, and Back, Next (or Skip for an
optional step) and Finish. Next runs the step's `validate` first and stays with its message
when it fails; the stepper marks the step. Moving between steps focuses the new step and
announces it. Steps keep their state: the Wizard only shows one at a time.

`import { Wizard } from "glass-ux/stepper"`

[Live examples](https://dastari.github.io/glass-ux/components/wizard)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — |  |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| undefined` | See type | no | — | The first step shown when uncontrolled. Default: the first step. |
| finishLabel | `string \| undefined` | See type | no | — | The Finish button's text. Default "Finish". |
| footerStart | `ReactNode` | See type | no | — | Content at the start of the footer (a Cancel button, or a draft note). |
| labels | `Partial<{ readonly steps: "Steps"; readonly stepOf: (step: number, total: number) => string; readonly complete: "complete"; readonly current: "current"; readonly error: "needs attention"; readonly optional: "Optional"; readonly skipped: "skipped"; readonly back: "Back"; readonly next: "Next"; readonly finish: "Finish"; readonly finishing: "Finishing…"; readonly finished: "Done"; readonly skip: "Skip"; }> \| undefined` | See type | no | — |  |
| locale | `string \| undefined` | See type | no | — |  |
| navigation | `StepperNavigation \| undefined` | "none", "any", "visited" | no | "visited" | Which steps the person may jump back to from the stepper. Default `visited`. |
| onFinish | `() => Promise<unknown> \| void` | See type | yes | — | Runs after the last step validates; the Finish button shows its progress and outcome. |
| onValueChange | `((id: string) => void) \| undefined` | See type | no | — | Called with the next value when a person changes the control. Update controlled state here. |
| orientation | `"horizontal" \| "vertical" \| undefined` | "horizontal", "vertical" | no | "horizontal" | `horizontal` (default): steps above the content; `vertical`: a rail of steps beside it. |
| steps | `WizardStep[]` | See type | yes | — |  |
| value | `string \| undefined` | See type | no | — | The current step's id. Pair with `onValueChange` to control it. |
