import { useMessages } from "../../lib/i18n/index.js"
import { chipOverflowMessages } from "./messages.js"
import { useState, type ReactNode } from "react";
import { Button } from "../button/index.js";
import { EmptyState } from "../empty-state/index.js";
import { SearchField } from "../input/index.js";
import { Popover } from "../popover/index.js";
export interface OverflowChip {
  /** Stable entity identifier. */ id: string;
  /** Searchable label. */ label: string;
  /** Host-owned identity chip. */ content: ReactNode;
}
export interface ChipOverflowProps {
  /** Full collection, before limiting visible chips. */ items: readonly OverflowChip[];
  /** Chips visible before the overflow trigger. */ limit?: number;
  /** Accessible collection name and search label. */ label: string;
}
/** A compact chip collection with a searchable +N overflow popover. */
export function ChipOverflow({ items, limit = 2, label }: ChipOverflowProps) {
  const messages = useMessages(chipOverflowMessages)

  const [query, setQuery] = useState("");
  const visible = Number.isFinite(limit)
    ? Math.max(0, Math.floor(limit))
    : items.length;
  const found = items.filter((item) =>
    item.label.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <span className="fa-chip-overflow">
      {items.slice(0, visible).map((item) => (
        <span key={item.id}>{item.content}</span>
      ))}
      {items.length > visible ? (
        <Popover.Root
          onOpenChange={(open) => {
            if (!open) setQuery("");
          }}
        >
          <Popover.Trigger
            render={
              <Button
                size="xs"
                variant="ghost"
                aria-label={messages.more(items.length - visible, label)}
              >
                +{items.length - visible}
              </Button>
            }
          />
          <Popover.Popup title={label} align="start">
            <SearchField
              aria-label={messages.search(label)}
              value={query}
              onValueChange={setQuery}
            />
            {found.length ? (
              <ul className="fa-chip-overflow-list" aria-label={label}>
                {found.map((item) => (
                  <li key={item.id}>{item.content}</li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={null}>{messages.noMatches}</EmptyState>
            )}
          </Popover.Popup>
        </Popover.Root>
      ) : null}
    </span>
  );
}
