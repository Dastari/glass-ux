import { Badge } from "../../ui/badge/index.js";
import { RelativeTime } from "../../ui/data-table/cells/relative-time.js";
import { FactList } from "../../ui/fact-list/index.js";
import { SectionPage, Specimen } from "../kit.js";

export default function FactListSection() {
  return (
    <SectionPage>
      <Specimen
        title="Compact facts"
        description="Semantic description lists for a row, summary or popover; values can be composed controls and identities."
      >
        <FactList
          facts={[
            { label: "Owner", value: "Mira Rowan" },
            {
              label: "State",
              value: (
                <Badge size="sm" tone="success">
                  Ready
                </Badge>
              ),
            },
            {
              label: "Updated",
              value: <RelativeTime value={Date.now() - 3_600_000} />,
            },
          ]}
        />
      </Specimen>
      <Specimen
        title="Narrow container"
        description="Long prose and identifiers wrap within the supplied width, preserving the full value."
      >
        <div className="w-48 max-w-full">
          <FactList
            facts={[
              {
                label: "Document identifier with a long descriptive label",
                value: "Studio-preview-with-a-long-descriptive-filename.md",
              },
              {
                label: "Summary",
                value:
                  "The draft is ready for the review group to read and comment on.",
              },
            ]}
          />
        </div>
      </Specimen>
    </SectionPage>
  );
}
