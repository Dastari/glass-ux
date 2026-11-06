import { Badge } from "../../ui/badge/index.js";
import { ChipOverflow } from "../../ui/chip-overflow/index.js";
import { createDataTableColumns, DataTable } from "../../ui/data-table/index.js";
import { SectionPage, Specimen } from "../kit.js";

const REVIEWERS = ["Mira Rowan", "Alex Vale", "Robin Marsh", "Avery Quinn"].map(
  (name) => ({ id: name, label: name, content: <Badge>{name}</Badge> }),
);

const FREIGHT = ["Northern freight corridor", "Refrigerated linehaul", "Dangerous goods", "Weekend depot cover"].map(
  (name) => ({ id: name, label: name, content: <Badge>{name}</Badge> }),
);

interface Depot {
  id: string;
  name: string;
}
const DEPOTS: Depot[] = [
  { id: "halden", name: "Halden" },
  { id: "mossbridge", name: "Mossbridge" },
];
const depotColumn = createDataTableColumns<Depot>();
const DEPOT_COLUMNS = depotColumn.columns([
  depotColumn.accessor("name", { header: "Depot", width: 8 }),
  depotColumn.accessor("id", {
    header: "Routes",
    width: 16,
    cell: () => <ChipOverflow label="Routes" items={FREIGHT} wrap={false} />,
  }),
]);

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
      <Specimen
        title="One line"
        description="wrap={false} keeps the row one line high: chips share the width and end in an ellipsis, and +N keeps its size. A cut chip shows its label in a tooltip."
        layout="stack"
      >
        <div className="flex w-full flex-col gap-3" data-testid="chip-overflow-one-line">
          {["w-full", "w-64", "w-40"].map((width) => (
            <div key={width} className={`${width} max-w-full`} data-testid={`chip-overflow-${width}`}>
              <ChipOverflow label="Routes" items={FREIGHT} wrap={false} />
            </div>
          ))}
          <div className="w-40 max-w-full" data-testid="chip-overflow-no-trigger">
            <ChipOverflow label="Routes" items={FREIGHT.slice(0, 1)} wrap={false} />
          </div>
        </div>
      </Specimen>
      <Specimen title="In a table column" description="A row stays at its height however little room the column has." layout="stack">
        <div className="w-full max-w-xl" data-testid="chip-overflow-table">
          <DataTable
            id="chip-overflow-depots"
            label="Depots"
            rows={DEPOTS}
            rowCount={DEPOTS.length}
            columns={DEPOT_COLUMNS}
            getRowId={(depot) => depot.id}
            height="auto"
            selectable={false}
          />
        </div>
      </Specimen>
    </SectionPage>
  );
}
