import { Heading, Text, type TextVariant } from "../../ui/text/index.js"
import { Rules, SectionPage, Specimen } from "../kit.js"

const ROLES: TextVariant[] = ["display", "headline", "title", "subtitle", "body", "label", "caption", "overline"]

export default function TextSection() {
  return (
    <SectionPage>
      <Specimen title="Type roles" description="Each role sets size, line height, weight and tracking together, and follows the interface size." layout="stack">
        <div className="grid gap-3">
          {ROLES.map((role) => (
            <div key={role} className="flex items-baseline gap-4">
              <Text as="span" variant="caption" tone="subtle" mono className="w-24 shrink-0">
                {role}
              </Text>
              <Text variant={role}>Kiln sensor recalibrated</Text>
            </div>
          ))}
        </div>
      </Specimen>
      <Specimen title="Tones and figures" description="Colour roles for secondary text and status; tabular figures for numbers that change." layout="stack">
        <div className="grid gap-2">
          <Text>Last reading 418 °C at 09:42.</Text>
          <Text tone="muted">Reported by KS-204 on the north wall.</Text>
          <Text variant="caption" tone="subtle">Calibrated 3 days ago</Text>
          <Text tone="danger">Above the 400 °C limit.</Text>
          <Text numeric variant="title">
            1,204.50 · 98.75
          </Text>
          <div className="max-w-xs">
            <Text truncate>Northstar Studio · Parramatta depot · Kiln room 2 · North wall sensor array</Text>
          </div>
        </div>
      </Specimen>
      <Specimen title="Headings" description="The level keeps the outline correct; the look can differ, so a panel's heading can be small and still an h2." layout="stack">
        <div className="grid gap-2">
          <Heading level={2}>Devices</Heading>
          <Heading level={2} variant="title">
            Devices, as a panel heading
          </Heading>
          <Heading level={3}>Alerts this week</Heading>
        </div>
      </Specimen>
      <Rules
        do={["Choose the heading level from the outline and the variant from the design.", "Use muted and subtle for secondary text, not smaller sizes."]}
        dont={["Don't skip heading levels to get a smaller look; set the variant.", "Don't colour text with status tones unless it states a status."]}
      />
    </SectionPage>
  )
}
