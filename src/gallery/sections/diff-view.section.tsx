import { DiffView, type DiffLine } from "../../ui/diff-view/index.js";
import { SectionPage, Specimen, TokenTable } from "../kit.js";

const CHANGE: DiffLine[] = [
  { type: "context", text: "[archive]", before: 41, after: 41 },
  { type: "context", text: "path = /volumes/cedar" },
  { type: "remove", text: "retention = 30" },
  { type: "remove", text: "compress = false" },
  { type: "add", text: "retention = 90" },
  { type: "add", text: "compress = true" },
  { type: "add", text: "verify = weekly" },
  { type: "context", text: "" },
  { type: "context", text: "[sync]" },
];

const LONG: DiffLine[] = [
  { type: "remove", text: "notify = mira.rowan@cedar.example, avery.quinn@cedar.example, noor.haddad@cedar.example, archive-reports@cedar.example" },
  { type: "add", text: "notify = archive-reports@cedar.example" },
];

export default function DiffViewSection() {
  return (
    <SectionPage>
      <Specimen title="A change to a file" description="The sign is in the gutter, so a change reads without colour. This hunk starts at line 41.">
        <div className="w-full max-w-2xl" data-testid="diff-view-demo">
          <DiffView label="storage.conf" lines={CHANGE} />
        </div>
      </Specimen>
      <Specimen title="In a narrow box" description="Below 25rem the line numbers drop, and long lines scroll inside the region.">
        <div className="w-full max-w-xs" data-testid="diff-view-narrow">
          <DiffView label="alerts.conf" lines={LONG} />
        </div>
      </Specimen>
      <Specimen title="Only additions" description="A new file has no old numbers.">
        <div className="w-full max-w-2xl">
          <DiffView label="retention.conf" lines={[{ type: "add", text: "retention = 90" }, { type: "add", text: "compress = true" }]} />
        </div>
      </Specimen>
      <TokenTable
        tokens={[
          ["--code-add-tint", "Fill of an added line"],
          ["--code-remove-tint", "Fill of a removed line"],
          ["--code-add-text", "Sign of an added line"],
          ["--code-remove-text", "Sign of a removed line"],
          ["--fg-muted", "Line numbers"],
        ]}
      />
    </SectionPage>
  );
}
