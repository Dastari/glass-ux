import { Badge } from "../../ui/badge/index.js"
import { Button } from "../../ui/button/index.js"
import { Field } from "../../ui/field/index.js"
import { Input } from "../../ui/input/index.js"
import { Grid, Stack } from "../../ui/layout/index.js"
import { Surface } from "../../ui/surface/index.js"
import { Text } from "../../ui/text/index.js"
import { Rules, SectionPage, Specimen } from "../kit.js"

const SITES = ["Parramatta depot", "Hobart office", "Perth warehouse", "Geelong lab", "Cairns kiosk", "Darwin yard"]

export default function LayoutSection() {
  return (
    <SectionPage>
      <Specimen title="Stack" description="A column of fields uses the fields gap; a row of buttons the controls gap. Both follow density." layout="stack">
        <Stack className="max-w-md">
          <Field label="Site name">
            <Input defaultValue="Parramatta depot" />
          </Field>
          <Field label="Contact">
            <Input defaultValue="Rivka Holm" />
          </Field>
          <Stack direction="row" justify="end">
            <Button>Cancel</Button>
            <Button variant="primary">Save</Button>
          </Stack>
        </Stack>
      </Specimen>
      <Specimen title="Grid" description="As many columns as fit at a minimum width, so tiles reflow with their container, not the window." layout="stack" wide>
        <Grid columns={{ min: "sm" }}>
          {SITES.map((site, index) => (
            <Surface key={site} material="panel" padding="tile" radius="tile">
              <Stack gap="inline">
                <Text variant="label">{site}</Text>
                <Stack direction="row" gap="inline">
                  <Badge size="sm" tone={index % 3 ? "success" : "warning"}>
                    {index % 3 ? "Online" : "Degraded"}
                  </Badge>
                  <Text as="span" variant="caption" tone="subtle" numeric>
                    {12 + index * 7} devices
                  </Text>
                </Stack>
              </Stack>
            </Surface>
          ))}
        </Grid>
      </Specimen>
      <Rules
        do={["Let the container own spacing; children carry no margins.", "Use the gap roles so density applies everywhere."]}
        dont={["Don't nest stacks to fake alignment a grid gives you.", "Don't use raw space values where a role says what the gap is for."]}
      />
    </SectionPage>
  )
}
