import { ContainerLab, Rules, SectionPage, Specimen, TierBox, TierRow, TokenTable } from "../kit.js"
import { BYTES, Sunburst, Treemap, type HierarchyDatum } from "../../ui/charts/index.js"
import { DISK_TREE, type DiskNode } from "./charts.fixtures.js"
import { SkeletonSwaps } from "./charts.kit.js"

/** The disk fixture as the chart's generic shape (label, value, children, group). */
function toDatum(node: DiskNode): HierarchyDatum {
  return { label: node.name, value: node.size, group: node.type, children: node.children?.map(toDatum) }
}
const DISK = toDatum(DISK_TREE)
const KINDS = ["system", "documents", "apps", "media", "cache", "other"]

const treemap = { label: "Disk usage · C: · NST-C106", title: "C: · Local disk", data: DISK, nameLabel: "Folder", ...BYTES }

export default function ChartsHierarchySection() {
  return (
    <SectionPage>
      <Specimen
        title="Treemap, three tiers"
        description="C:\ on NST-C106. A proportion strip in a row; the top level as labelled tiles in a tile; two levels in a pane, folders with their contents inside. Click a folder or press Enter to open it; the path above, Backspace or Escape go back."
        wide
      >
        <TierRow testId="treemap-disk">{() => <Treemap {...treemap} />}</TierRow>
      </Specimen>

      <Specimen title="Disk usage" description="Colour by top-level folder (each branch keeps one hue all the way down), by kind of file, or by depth. Labels only where they fit; the size line only where there is height." wide>
        <div className="charts-split">
          <div className="charts-pane" data-size="tall" data-testid="treemap-branch">
            <Treemap {...treemap} />
          </div>
          <div className="charts-pane" data-size="tall" data-testid="treemap-kind">
            <Treemap {...treemap} title="C: · by kind" colourBy="group" groups={KINDS} />
          </div>
          <div className="charts-pane" data-size="tall" data-testid="treemap-depth">
            <Treemap {...treemap} title="C: · by depth" colourBy="depth" />
          </div>
        </div>
      </Specimen>

      <Specimen title="Sunburst" description="The same tree as rings, DaisyDisk-style. The centre is the focused folder; hovering an arc replaces it with that arc's size and share. Click an arc to open it, the centre to go back." wide>
        <div className="charts-pane" data-size="tall" data-testid="sunburst-disk">
          <Sunburst {...treemap} label="Disk usage rings · C: · NST-C106" title="C: · Local disk" />
        </div>
        <TierRow testId="sunburst-tiers">{() => <Sunburst {...treemap} label="Disk usage rings · C: · NST-C106" />}</TierRow>
      </Specimen>

      <Specimen title="Loading, empty and error" description="Tiles and rings in the plot's exact box." wide>
        <SkeletonSwaps id="treemap" render={(state) => <Treemap {...treemap} state={state} />} />
        <div className="gallery-tiers">
          <TierBox size="compact" label="sunburst loading">
            <Sunburst {...treemap} state="loading" />
          </TierBox>
          <TierBox size="compact" label="empty">
            <Treemap {...treemap} state="empty" emptyText="The file index has not finished on C:" />
          </TierBox>
          <TierBox size="full" label="error">
            <Treemap {...treemap} state="error" errorText="Agent offline — retry when NST-C106 reconnects" onRetry={() => undefined} />
          </TierBox>
        </div>
      </Specimen>

      <Specimen title="Over imagery" backdrop>
        <TierBox size="compact" label="treemap">
          <Treemap {...treemap} />
        </TierBox>
        <TierBox size="compact" label="sunburst">
          <Sunburst {...treemap} />
        </TierBox>
      </Specimen>

      <ContainerLab description="A strip in the row and header, labelled tiles in the tile and the tall column, two levels with the path in the pane.">
        {() => <Treemap {...treemap} />}
      </ContainerLab>

      <ContainerLab title="Container lab — sunburst" description="A strip in the row and header, two rings in the tile, three rings with the list in the pane.">
        {() => <Sunburst {...treemap} />}
      </ContainerLab>

      <Rules
        do={[
          "Size by one additive measure (bytes, counts).",
          "Colour by top-level branch, or by kind when the kind is the question.",
          "Keep the drill path in the head so the way back is always visible.",
          "Pair a treemap with a largest-items list for exact names and sizes.",
        ]}
        dont={[
          "Encode a second measure in colour; colour is identity here.",
          "Force labels into tiles that cannot hold them.",
          "Show more than two levels at once in a treemap.",
          "Use a sunburst to compare similar sizes; use bars.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--chart-1", "Largest branch"],
          ["--chart-2", "Second branch"],
          ["--chart-tile-radius", "Tile corners"],
          ["--chart-gap", "Surface gap between tiles and rings"],
          ["--fg", "Labels on tiles, hover ring"],
          ["--type-display-size", "Large centre value"],
        ]}
      />
    </SectionPage>
  )
}
