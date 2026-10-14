import { MeterCell } from "../../ui/meter-cell/index.js";
import { SectionPage, Specimen } from "../kit.js";

export default function MeterCellSection() {
  return (
    <SectionPage>
      <Specimen
        title="Measurements and thresholds"
        description="The shared meter carries its accessible name, exact reading, and warning/danger thresholds."
      >
        <div className="flex w-full max-w-xl flex-col gap-controls">
          <MeterCell
            label="Storage used"
            value={24}
            max={50}
            valueText="24 GB of 50 GB"
            description="26 GB available"
          />
          <MeterCell
            label="Storage used"
            value={42}
            max={50}
            valueText="42 GB of 50 GB"
            description="8 GB available"
          />
          <MeterCell
            label="Storage used"
            value={49}
            max={50}
            valueText="49 GB of 50 GB"
            description="1 GB available"
          />
        </div>
      </Specimen>
      <Specimen
        title="Narrow cell"
        description="Below eight rem, the track gives way while the reading and exact breakdown remain reachable."
      >
        <div className="w-24">
          <MeterCell
            label="Seats used"
            value={8}
            max={10}
            valueText="8 / 10"
            description="8 assigned seats of 10 purchased; 2 available"
          />
        </div>
      </Specimen>
    </SectionPage>
  );
}
