import { useRef, useState, type Key } from "react";
import { Button } from "../../ui/button/index.js";
import { ScrollArea } from "../../ui/scroll-area/index.js";
import {
  VirtualList,
  type VirtualListHandle,
} from "../../ui/virtual-list/index.js";
import { SectionPage, Specimen } from "../kit.js";

const rows = Array.from({ length: 10_000 }, (_, index) => ({
  id: `record-${index}`,
  label: `Northstar record ${index + 1}`,
}));
const getKey = (row: (typeof rows)[number]) => row.id;

export default function VirtualListSection() {
  const list = useRef<VirtualListHandle>(null);
  const [selected, setSelected] = useState<Key | null>(null);
  return (
    <SectionPage>
      <Specimen
        layout="stack"
        title="10,000 records"
        description="Scroll or focus a row and jump to the end. The focused row stays mounted."
      >
        <div className="flex flex-col gap-3">
          <Button
            onClick={() =>
              list.current?.scrollToIndex(rows.length - 1, { align: "end" })
            }
          >
            Scroll to last record
          </Button>
          <div className="h-72" data-testid="virtual-list-frame">
            <VirtualList
              ref={list}
              items={rows}
              getKey={getKey}
              estimateSize={40}
              aria-label="Records"
              renderItem={(row) => (
                <button type="button" className="fa-item w-full text-left">
                  {row.label}
                </button>
              )}
            />
          </div>
        </div>
      </Specimen>
      <Specimen layout="stack" title="Single selection in ScrollArea">
        <div className="flex flex-col gap-3">
          <div className="h-72" data-testid="virtual-scroll-area-frame">
            <ScrollArea>
              <VirtualList
                items={rows}
                getKey={getKey}
                estimateSize={40}
                role="listbox"
                aria-label="Choose a record"
                selectedKey={selected}
                onSelectedKeyChange={setSelected}
                renderItem={(row) => <div className="fa-item">{row.label}</div>}
              />
            </ScrollArea>
          </div>
          <output className="min-h-6">
            {selected === null ? "No record selected" : `Selected ${selected}`}
          </output>
        </div>
      </Specimen>
    </SectionPage>
  );
}
