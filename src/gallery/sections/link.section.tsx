import { IconEndpoint } from "../../icons/generated/icons.js"
import { Link } from "../../ui/link/index.js"
import { Text } from "../../ui/text/index.js"
import { Rules, SectionPage, Specimen } from "../kit.js"

export default function LinkSection() {
  return (
    <SectionPage>
      <Specimen title="Variants" description="Inline in sentences, standalone on its own line, subtle for names in lists and tables." layout="stack">
        <div className="grid max-w-prose gap-4">
          <Text>
            The sensor at the depot reported 418 °C. Read the <Link href="#calibration">calibration guide</Link> before changing its limits.
          </Text>
          <Link variant="standalone" href="#devices" icon={<IconEndpoint />}>
            View all devices
          </Link>
          <Text>
            Assigned to <Link variant="subtle" href="#rivka">Rivka Holm</Link>
          </Text>
        </div>
      </Specimen>
      <Specimen title="New tabs and disabled links" description="A link that opens a new tab says so, visibly and to screen readers." layout="stack">
        <div className="grid max-w-prose gap-4">
          <Text>
            Firmware notes are on the <Link href="https://example.com/firmware" newTab>vendor's site</Link>.
          </Text>
          <Text>
            <Link href="#report" disabled>
              Export report
            </Link>{" "}
            <Text as="span" variant="caption" tone="subtle">
              Available when the scan finishes
            </Text>
          </Text>
        </div>
      </Specimen>
      <Rules
        do={["Write link text that says where it goes.", "Pass the router's link through render so navigation stays client-side."]}
        dont={["Don't use a link for an action that changes something; use a Button.", "Don't open new tabs without saying so."]}
      />
    </SectionPage>
  )
}
