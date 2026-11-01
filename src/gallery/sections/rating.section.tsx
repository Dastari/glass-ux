import { useState } from "react"
import { z } from "zod"
import { IconHeart } from "../../icons/generated/icons.js"
import { Form, FormActions, FormStack, formBehaviour, useAppForm } from "../../ui/form/index.js"
import { Field } from "../../ui/field/index.js"
import { Rating, ratingSchema } from "../../ui/rating/index.js"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { wait } from "./forms.fixtures.js"
import { Usage } from "./inputs.kit.js"

function Chosen() {
  const [value, setValue] = useState<number | null>(3)
  return (
    <div className="flex items-center gap-3" data-testid="rating-basic">
      <Rating aria-label="Service" value={value} onValueChange={setValue} />
      <output className="type-caption text-fg-muted" data-numeric data-testid="rating-value">
        {value ?? "–"}
      </output>
    </div>
  )
}

function ReviewForm() {
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { quality: null as number | null },
    validators: { onDynamic: z.object({ quality: ratingSchema({ required: true }) }) },
    onSubmit: () => wait(600),
  })
  return (
    <Form form={form} aria-label="Review" className="w-full" data-testid="rating-form">
      <FormStack>
        <form.AppField name="quality">{(field) => <field.RatingField label="Quality" required />}</form.AppField>
        <FormActions>
          <form.SubmitButton>Send review</form.SubmitButton>
        </FormActions>
      </FormStack>
    </Form>
  )
}

export default function RatingSection() {
  return (
    <SectionPage>
      <Specimen title="Choose a rating" description="Arrow keys move and choose, Home and End go to the ends. The pointer previews a rating in colour only.">
        <Chosen />
      </Specimen>

      <Specimen title="Half steps and clearing" description="Each icon is two choices. Choosing the current rating again, or Delete, clears it.">
        <div data-testid="rating-half">
          <Rating aria-label="Comfort" step={0.5} clearable size="lg" defaultValue={3.5} />
        </div>
      </Specimen>

      <Specimen title="Display" description="A read-only rating is one image named with its value, filled to the exact figure.">
        <div className="flex flex-col gap-2" data-testid="rating-display">
          <Rating readOnly aria-label="Harbour Cafe" value={4.3} />
          <Rating readOnly aria-label="Cedar Hall" value={2.8} size="sm" />
          <Rating readOnly aria-label="Stonebridge Rooms" value={null} size="sm" />
        </div>
      </Specimen>

      <Specimen title="Another icon">
        <Rating aria-label="Appeal" icon={<IconHeart />} max={3} defaultValue={2} valueText={(value, max) => `${value} of ${max} hearts`} />
      </Specimen>

      <Specimen title="Sizes and states" layout="grid">
        <Rating aria-label="Small" size="sm" defaultValue={2} />
        <Rating aria-label="Medium" defaultValue={2} />
        <Rating aria-label="Large" size="lg" defaultValue={2} />
        <Rating aria-label="Disabled" disabled defaultValue={4} />
        <Field label="Invalid" error="Choose a rating">
          <Rating invalid />
        </Field>
      </Specimen>

      <Specimen title="In a form">
        <ReviewForm />
      </Specimen>

      <Specimen title="Right to left" description="The fill starts at the reading start; the arrows still point the way they move.">
        <div dir="rtl" data-testid="rating-rtl">
          <Rating aria-label="Service" step={0.5} defaultValue={2.5} />
        </div>
      </Specimen>

      <ContainerLab>
        <div className="flex h-full items-center p-1">
          <Rating aria-label="Service" size="lg" defaultValue={4} />
        </div>
      </ContainerLab>

      <Usage
        code={`
import { Rating, ratingSchema } from "glass-ux/rating"

<Rating aria-label="Service" defaultValue={3} onValueChange={save} />
<Rating readOnly aria-label="Harbour Cafe" value={4.3} />

const schema = z.object({ quality: ratingSchema({ required: true }) })
<form.AppField name="quality">{(field) => <field.RatingField label="Quality" />}</form.AppField>`}
      />

      <Rules
        do={["Name the group (`aria-label` or a Field label) so each choice reads \"3 of 5 stars\".", "Use a read-only rating for averages; it fills to the exact value."]}
        dont={["Use half steps on a small touch target; each half is half an icon wide.", "Show a number as the only way to read the rating."]}
      />

      <TokenTable
        tokens={[
          ["--accent-text", "Chosen part"],
          ["--fg-muted", "Empty outline"],
          ["--icon-xl", "Medium icon"],
          ["--target-aa", "Smallest pointer target"],
        ]}
      />
    </SectionPage>
  )
}
