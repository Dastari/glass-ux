import { ToneDot } from "../../ui/tone-dot/index.js";
import { Matrix, Rules, SectionPage, Specimen } from "../kit.js";

const TONES = [
  "neutral",
  "success",
  "warning",
  "danger",
  "info",
  "accent",
  "data",
] as const;
export default function ToneDotSection() {
  return (
    <SectionPage>
      <Specimen
        title="Tones and markers"
        description="A shared state marker for activity, presence and informational measurements."
      >
        <Matrix
          columns={["Dot", "Ring", "Live pulse"]}
          rows={TONES.map((tone) => ({
            label: tone,
            cells: (["dot", "ring", "pulse"] as const).map((marker) => (
              <ToneDot
                key={marker}
                tone={tone}
                marker={marker}
                label={`${tone} ${marker}`}
              />
            )),
          }))}
        />
      </Specimen>
      <Specimen
        title="Visible equivalent labels"
        description="The decorative marker stays out of the accessibility tree when the text already names the state."
      >
        <span className="inline-flex items-center gap-inline">
          <ToneDot tone="success" />
          Ready
        </span>
        <span className="inline-flex items-center gap-inline">
          <ToneDot tone="data" marker="pulse" />
          Timer running
        </span>
      </Specimen>
      <Rules
        do={[
          "Name a standalone dot with label.",
          "Reserve pulses for live activity; reduced motion stops the halo.",
        ]}
        dont={["Use status tones as decoration."]}
      />
    </SectionPage>
  );
}
