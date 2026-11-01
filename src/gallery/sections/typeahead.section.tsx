import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconFileText, IconFolder, IconImage } from "../../icons/generated/icons.js";
import { Input } from "../../ui/input/index.js";
import {
  Typeahead,
  TypeaheadOption,
  TypeaheadPopup,
  useTypeahead,
  type TypeaheadItem,
} from "../../ui/typeahead/index.js";
import { SectionPage, Specimen } from "../kit.js";

interface FileItem extends TypeaheadItem {
  modified: string;
}

const FILES: FileItem[] = [
  { id: "brief", label: "Studio brief.md", description: "Cedar Studio", icon: <IconFileText />, modified: "Edited by Mira Rowan on 12 March" },
  { id: "plans", label: "Floor plans", description: "Cedar Studio", icon: <IconFolder />, modified: "Holds 14 drawings" },
  { id: "photo", label: "Site photo.jpg", description: "Harbour Works", icon: <IconImage />, modified: "Added by Avery Quinn on 2 April" },
  { id: "notes", label: "Meeting notes.md", description: "Harbour Works", icon: <IconFileText />, modified: "Edited by Noor Haddad on 9 April" },
];

const LATE: FileItem[] = [
  { id: "budget", label: "Budget review.md", description: "Archive", icon: <IconFileText />, modified: "Edited by Mira Rowan in January" },
  { id: "survey", label: "Survey photos", description: "Archive", icon: <IconFolder />, modified: "Holds 62 pictures" },
];

/** The host's own matching: the list shows whatever it is given. */
const matching = (rows: FileItem[], query: string) =>
  rows.filter((file) => file.label.toLowerCase().includes(query.toLowerCase()));

function FilePicker({
  label,
  rows,
  loading,
  detail,
  reserveRows,
  onQuery,
}: {
  label: string;
  rows: (query: string) => FileItem[];
  loading?: boolean;
  detail?: (file: FileItem) => ReactNode;
  reserveRows?: number;
  onQuery?: (query: string) => void;
}) {
  const fieldRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const typeahead = useTypeahead({
    open,
    query,
    items: rows(query),
    onPick: (file) => {
      setQuery(file.label);
      setOpen(false);
    },
    onClose: () => setOpen(false),
  });
  return (
    <div className="w-full max-w-sm">
      <Input
        ref={fieldRef}
        {...typeahead.textProps}
        aria-label={label}
        placeholder="Find a file"
        value={query}
        onValueChange={(next) => {
          setQuery(next);
          setOpen(true);
          onQuery?.(next);
        }}
        onFocus={() => {
          setOpen(true);
          onQuery?.(query);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={typeahead.onKeyDown}
      />
      <Typeahead
        state={typeahead}
        anchor={fieldRef}
        label="Files"
        loading={loading}
        reserveRows={reserveRows}
        renderDetail={detail}
      />
    </div>
  );
}

/** Two rows at once, the rest 3 seconds after the query, as a slow search would give them. */
function LateFiles() {
  const [delivered, setDelivered] = useState<string | null>(null);
  const [query, setQuery] = useState<string | null>(null);
  useEffect(() => {
    if (query === null) return;
    setDelivered(null);
    const timer = setTimeout(() => setDelivered(query), 3000);
    return () => clearTimeout(timer);
  }, [query]);
  const ready = query !== null && delivered === query;
  return (
    <FilePicker
      label="Find a file, slowly"
      rows={(typed) => matching(ready ? [...LATE, ...FILES] : FILES.slice(0, 2), typed)}
      loading={!ready}
      reserveRows={5}
      onQuery={setQuery}
    />
  );
}

/** A caret rectangle needs no element: anything that yields a box can hold the list. */
function RectangleDemo() {
  const [open, setOpen] = useState(false);
  const typeahead = useTypeahead({
    id: "typeahead-rectangle",
    open,
    items: FILES,
    onPick: () => setOpen(false),
    onClose: () => setOpen(false),
  });
  return (
    <div className="w-full max-w-sm">
      <Input
        {...typeahead.textProps}
        aria-label="Open at the top of the window"
        placeholder="Focus to open"
        readOnly
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={typeahead.onKeyDown}
      />
      <TypeaheadPopup
        open={open}
        onClose={typeahead.close}
        anchor={{ x: 24, y: 24, width: 0, height: 20 }}
        label="Files"
        className="fa-typeahead"
      >
        <div id={typeahead.id} role="listbox" aria-label="Files" className="fa-typeahead-list">
          {typeahead.items.map((file, index) => (
            <TypeaheadOption
              key={file.id}
              listId={typeahead.id}
              index={index}
              active={index === typeahead.activeIndex}
              onPick={() => typeahead.pick(file)}
              onActive={typeahead.setActiveIndex}
            >
              {file.label}
            </TypeaheadOption>
          ))}
        </div>
      </TypeaheadPopup>
    </div>
  );
}

export default function TypeaheadSection() {
  return (
    <SectionPage>
      <Specimen
        title="Host-supplied rows"
        description="The host matches and the list shows what it is given. Arrow keys move the highlight while focus stays in the field; Enter or Tab picks."
      >
        <FilePicker label="Find a file" rows={(query) => matching(FILES, query)} />
      </Specimen>
      <Specimen
        title="Detail beside the list"
        description="The detail follows the highlight and moves under the list in a narrow box."
      >
        <FilePicker
          label="Find a file with detail"
          rows={(query) => matching(FILES, query)}
          detail={(file) => file.modified}
        />
      </Specimen>
      <Specimen
        title="Results that arrive late"
        description="Two rows show at once and more arrive after 3 seconds. The box is reserved, and rows wait behind a moved pointer or arrow key."
      >
        <LateFiles />
      </Specimen>
      <Specimen
        title="Any rectangle"
        description="The anchor is a rectangle in viewport coordinates, such as a caret. This one is near the top of the window."
      >
        <RectangleDemo />
      </Specimen>
    </SectionPage>
  );
}
