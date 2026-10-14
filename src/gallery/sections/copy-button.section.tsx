import { Matrix, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { CopyButton } from "../../ui/copy-button/index.js"
import { Input } from "../../ui/input/index.js"

export default function CopyButtonSection() {
  return (
    <SectionPage>
      <Specimen title="Variants" description="Icon only (its label is the tooltip) or with the label. A drawn ✓ confirms in place; a refused clipboard shows ✕ and says so.">
        <Matrix
          columns={["Icon", "Labelled", "Disabled"]}
          rows={[
            {
              label: "ghost",
              cells: [
                <CopyButton key="a" value="+61412345678" label="Copy number" />,
                <CopyButton key="b" value="+61412345678" label="Copy number" showLabel />,
                <CopyButton key="c" value="" label="Copy number" />,
              ],
            },
            {
              label: "secondary",
              cells: [
                <CopyButton key="a" value="00:15:65:AA:BB:CC" label="Copy MAC address" variant="secondary" />,
                <CopyButton key="b" value="00:15:65:AA:BB:CC" label="Copy MAC address" variant="secondary" showLabel />,
                <CopyButton key="c" value="" label="Copy MAC address" variant="secondary" />,
              ],
            },
          ]}
        />
      </Specimen>

      <Specimen title="Inside a field" description="In an Input's box it takes fa-input-btn, like the clear and reveal buttons.">
        <Input defaultValue="10.13.4.1" readOnly aria-label="Gateway" className="w-72" trailing={<CopyButton value="10.13.4.1" label="Copy address" className="fa-input-btn" />} />
      </Specimen>

      <Rules do={["Offer copy for identifiers people paste elsewhere: IPs, MACs, E.164 numbers, keys.", "Name what is copied in the label."]} dont={["Show a toast for a successful copy; the ✓ says it.", "Copy a value different from the one shown without saying so."]} />

      <TokenTable tokens={[["--feedback-hold", "How long ✓ shows"]]} />
    </SectionPage>
  )
}
