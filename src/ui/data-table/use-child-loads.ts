import type { RowData } from "@tanstack/react-table";
import { useCallback, useEffect, useRef, useState } from "react";
import { announce } from "../../lib/announce.js";
import type { ChildStatus } from "./expansion.js";
import type { DataTableMessages } from "./messages.js";
import type { DataTableTree } from "./types.js";

interface LoadEntry {
  status: "loading" | "failed";
  /** Children loaded when it started: new children end it, with or without a promise. */
  loaded: number;
}

/** The row a load is for. */
export interface ChildLoadRow<T> {
  id: string;
  original: T;
  subRows: readonly unknown[];
}

export interface ChildLoads {
  /** Changes when a load starts, ends or fails. */
  entries: ReadonlyMap<string, LoadEntry>;
  /** Rows whose load finished: an empty `getSubRows` after that means no children. */
  finished: ReadonlySet<string>;
}

/**
 * Lazy children (`DataTableTree.onLoadChildren`). One request per batch for a row, keyed by the
 * children it already has, so an open row scrolled in and out of view never asks twice. A
 * load lasts until new children arrive, or its promise settles; a new result abandons them all.
 */
export function useChildLoads<T extends RowData>({
  tree,
  resultKey,
  getLabel,
  messages,
}: {
  tree: DataTableTree<T> | undefined;
  /** Identity of the result: a new one starts over. */
  resultKey: string;
  getLabel: (row: T) => string;
  messages: DataTableMessages;
}) {
  const [entries, setEntries] = useState<ReadonlyMap<string, LoadEntry>>(
    () => new Map(),
  );
  const [finished, setFinished] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const latest = useRef({ tree, getLabel, messages });
  latest.current = { tree, getLabel, messages };
  const requested = useRef(new Set<string>());
  const controllers = useRef(new Map<string, AbortController>());

  const write = useCallback((id: string, entry: LoadEntry | null) => {
    setEntries((current) => {
      const next = new Map(current);
      if (entry) next.set(id, entry);
      else next.delete(id);
      return next;
    });
  }, []);

  const start = useCallback(
    (row: ChildLoadRow<T>) => {
      const { tree: current } = latest.current;
      if (!current?.onLoadChildren || controllers.current.has(row.id)) return;
      const controller = new AbortController();
      controllers.current.set(row.id, controller);
      const loaded = row.subRows.length;
      write(row.id, { status: "loading", loaded });
      const settle = (ok: boolean) => {
        if (controller.signal.aborted) return;
        controllers.current.delete(row.id);
        const { getLabel: label, messages: m } = latest.current;
        write(row.id, ok ? null : { status: "failed", loaded });
        if (ok) setFinished((set) => new Set(set).add(row.id));
        announce(
          (ok ? m.childrenLoaded : m.childrenFailed)(label(row.original)),
        );
      };
      let result: unknown;
      try {
        result = current.onLoadChildren(row.original, {
          loaded,
          signal: controller.signal,
        });
      } catch {
        settle(false);
        return;
      }
      if (typeof (result as PromiseLike<unknown> | undefined)?.then === "function")
        (result as PromiseLike<unknown>).then(
          () => settle(true),
          () => settle(false),
        );
      // No promise: the host brings the children when it can, and their arrival ends the load.
      else controllers.current.delete(row.id);
    },
    [write],
  );

  /** The row is showing as open with children missing: ask, unless that was asked already. */
  const request = useCallback(
    (row: ChildLoadRow<T>) => {
      const key = `${row.id}\u0000${row.subRows.length}`;
      if (requested.current.has(key)) return;
      requested.current.add(key);
      start(row);
    },
    [start],
  );

  /** A person asked again: Retry, or "Show more". */
  const retry = useCallback(
    (row: ChildLoadRow<T>) => {
      requested.current.add(`${row.id}\u0000${row.subRows.length}`);
      start(row);
    },
    [start],
  );

  /** The row closed: a failure there is forgotten, so opening it again tries again. */
  const forget = useCallback(
    (row: ChildLoadRow<T>) => {
      requested.current.delete(`${row.id}\u0000${row.subRows.length}`);
      setEntries((current) => {
        if (current.get(row.id)?.status !== "failed") return current;
        const next = new Map(current);
        next.delete(row.id);
        return next;
      });
    },
    [],
  );

  const abandon = useCallback(() => {
    for (const controller of controllers.current.values()) controller.abort();
    controllers.current.clear();
    requested.current.clear();
    setEntries((current) => (current.size ? new Map() : current));
    setFinished((current) => (current.size ? new Set() : current));
  }, []);

  const lastResult = useRef(resultKey);
  useEffect(() => {
    if (lastResult.current === resultKey) return;
    lastResult.current = resultKey;
    abandon();
  }, [resultKey, abandon]);
  useEffect(() => abandon, [abandon]);

  return { entries, finished, request, retry, forget };
}

/** How a row's children stand now. */
export function childStatus(
  { entries }: ChildLoads,
  row: { id: string; subRows: readonly unknown[] },
): ChildStatus {
  const entry = entries.get(row.id);
  return entry && entry.loaded === row.subRows.length ? entry.status : "idle";
}
