import { Badge } from "../../ui/badge/index.js";
import { ChipOverflow } from "../../ui/chip-overflow/index.js";
import { SectionPage, Specimen } from "../kit.js";

const REVIEWERS = ["Mira Rowan", "Alex Vale", "Robin Marsh", "Avery Quinn"].map(
  (name) => ({ id: name, label: name, content: <Badge>{name}</Badge> }),
);
export default function ChipOverflowSection() {
  return (
    <SectionPage>
      <Specimen
        title="Searchable collection"
        description="The first chip stays visible. The +N trigger opens every entry in a named searchable popover; Esc closes it and returns focus."
      >
        <ChipOverflow label="Reviewers" limit={1} items={REVIEWERS} />
      </Specimen>
      <Specimen
        title="Short and empty collections"
        description="Collections that fit need no overflow trigger."
      >
        <ChipOverflow label="Editors" limit={2} items={REVIEWERS.slice(0, 2)} />
        <ChipOverflow label="Observers" items={[]} />
      </Specimen>
      <Specimen
        title="All entries in the popover"
        description="A zero limit keeps the collection compact without discarding any entries."
      >
        <ChipOverflow label="Contributors" limit={0} items={REVIEWERS} />
      </Specimen>
    </SectionPage>
  );
}
