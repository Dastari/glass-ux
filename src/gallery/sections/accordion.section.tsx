import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { IconCpu, IconDisk, IconNetwork, IconSoftware } from "../../icons/generated/icons.js"
import { Accordion, Disclosure } from "../../ui/accordion/index.js"
import { DetailGrid, DetailTile } from "../../ui/detail-tile/index.js"

export default function AccordionSection() {
  return (
    <SectionPage>
      <Specimen title="Accordion" description="Rows are the shared fa-item; the chevron turns and the panel grows in place. Space and the hover fill separate items — no dividers." wide>
        <div className="w-160 max-w-full">
          <Accordion.Root defaultValue={["network"]} multiple>
            <Accordion.Item value="cpu" title="Processor" icon={<IconCpu />} meta="Intel(R) Core(TM) i5-8500T">
              6 cores · 6 threads · 2.10 GHz base · 3.50 GHz boost
            </Accordion.Item>
            <Accordion.Item value="network" title="Network adapters" icon={<IconNetwork />} meta="2">
              <DetailGrid min="sm">
                <DetailTile label="Ethernet" value="10.4.12.106" detail="Intel I219-LM · 1 Gbps" numeric />
                <DetailTile label="Wi-Fi" value="Disconnected" detail="Intel AX201" />
              </DetailGrid>
            </Accordion.Item>
            <Accordion.Item value="disks" title="Disks" icon={<IconDisk />} meta="256 GB">
              C: · Local disk · 212 GB of 256 GB used
            </Accordion.Item>
            <Accordion.Item value="software" title="Installed software" icon={<IconSoftware />} meta="142" disabled>
              Inventory is still being collected.
            </Accordion.Item>
          </Accordion.Root>
        </div>
      </Specimen>

      <Specimen title="Disclosure" description="One section that shows and hides, with the same row and motion.">
        <div className="w-120 max-w-full">
          <Disclosure title="Advanced" meta="3 settings">
            Proxy, update channel and log level for LMN-7C71.
          </Disclosure>
        </div>
      </Specimen>

      <ContainerLab description="Titles and meta truncate; the panel scrolls with its container.">
        {() => (
          <div className="h-full overflow-auto" data-scroll-container>
            <Accordion.Root defaultValue={["cpu"]}>
              <Accordion.Item value="cpu" title="Processor" icon={<IconCpu />} meta="Intel(R) Core(TM) i5-8500T">
                6 cores · 6 threads · 2.10 GHz
              </Accordion.Item>
              <Accordion.Item value="disks" title="Disks" icon={<IconDisk />} meta="256 GB">
                C: · 212 GB of 256 GB used
              </Accordion.Item>
            </Accordion.Root>
          </div>
        )}
      </ContainerLab>

      <Rules
        do={[
          "Use it for secondary detail a reader opens on demand.",
          "Put a count or the key value in meta so a closed row still informs.",
          "Allow several open at once when sections are independent.",
        ]}
        dont={[
          "Hide primary content or required fields in a closed panel.",
          "Draw dividers between items (R5.8).",
          "Nest accordions; split the content or use a vertical tab rail.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--item-h", "Row height"],
          ["--fill-hover", "Row hover"],
          ["--duration-base", "Open and chevron"],
          ["--space-half", "Space between items"],
        ]}
      />
    </SectionPage>
  )
}
