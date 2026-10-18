import { useEffect, useState } from "react";
import { Button } from "../../ui/button/index.js";
import {
  ContextSwitcher,
  type ContextItem,
} from "../../shell/context-switcher/index.js";

const DIRECTORY = [
  { id: "harbour-works", name: "Harbour Works", keywords: ["coastal"] },
  { id: "juniper-lab", name: "Juniper Lab", keywords: ["research"] },
  { id: "cedar-orbit", name: "Cedar Orbit", keywords: ["design"] },
  { id: "summit-loom", name: "Summit Loom", keywords: ["textiles"] },
] satisfies ContextItem[];

const REMOTE_LABELS = { placeholder: "Name or alternate name" };

/** Fictional cancellable adapter. A real host supplies authenticated bounded reads. */
export function RemoteContextSwitcherExample() {
  const [value, setValue] = useState<string | null>("summit-loom");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(2);
  const [attempt, setAttempt] = useState(0);
  const [fail, setFail] = useState(false);
  const [page, setPage] = useState<{
    items: ContextItem[];
    /** Count or definition of remaining items. */
    more: boolean;
    /** Shows loading feedback in the space reserved for the content. */
    loading: boolean;
    error?: string;
  }>({ items: [], more: false, loading: true });
  useEffect(() => {
    let active = true;
    const pending = setTimeout(() => {
      if (active)
        setPage((previous) => ({
          ...previous,
          loading: true,
          error: undefined,
        }));
    }, 0);
    const response = setTimeout(() => {
      if (!active) return;
      if (fail) {
        setPage({
          items: [],
          more: false,
          loading: false,
          error: "The directory could not be loaded.",
        });
        return;
      }
      const search = query.trim().toLocaleLowerCase();
      const matches = DIRECTORY.filter((org) =>
        `${org.name} ${org.keywords.join(" ")}`
          .toLocaleLowerCase()
          .includes(search),
      );
      setPage({
        items: matches.slice(0, limit),
        more: matches.length > limit,
        loading: false,
      });
    }, 250);
    return () => {
      active = false;
      clearTimeout(pending);
      clearTimeout(response);
    };
  }, [query, limit, fail, attempt]);
  return (
    <div
      data-testid="context-switcher-remote"
      className="flex flex-col items-start gap-controls"
    >
      <ContextSwitcher
        items={page.items}
        value={value}
        onValueChange={setValue}
        labels={REMOTE_LABELS}
        remote={{
          query,
          onQueryChange: (next) => {
            setPage((previous) => ({ ...previous, loading: true }));
            setQuery(next);
            setLimit(2);
          },
          loading: page.loading,
          error: page.error,
          onRetry: () => {
            setFail(false);
            setAttempt((previous) => previous + 1);
          },
          hasNextPage: page.more,
          onLoadMore: () => {
            setPage((previous) => ({ ...previous, loading: true }));
            setLimit((previous) => previous + 2);
          },
          selected: DIRECTORY.find((org) => org.id === value),
          status: "Fictional directory · pages of two organisations",
        }}
      />
      <Button size="sm" variant="ghost" onClick={() => setFail(true)}>
        Simulate read failure
      </Button>
    </div>
  );
}
