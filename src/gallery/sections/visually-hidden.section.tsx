import { IconSearch } from "../../icons/generated/icons.js";
import { Button } from "../../ui/button/index.js";
import { VisuallyHidden } from "../../ui/visually-hidden/index.js";
import { Tooltip } from "../../ui/tooltip/index.js";
import { SectionPage, Specimen } from "../kit.js";

export default function VisuallyHiddenSection() {
  return (
    <SectionPage>
      <Specimen title="Accessible label">
        <Tooltip content="Find a record">
          <Button icon={<IconSearch />}>
            <VisuallyHidden>Find a record</VisuallyHidden>
          </Button>
        </Tooltip>
      </Specimen>
    </SectionPage>
  );
}
