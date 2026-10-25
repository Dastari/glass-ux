/** Internal optimistic edit state. Tokens prevent a late save from replacing a newer edit. */
export interface EditState {
  value: unknown;
  submitted: unknown;
  previous: unknown;
  source?: unknown;
  status: "pending" | "saved" | "error";
  error?: string;
  token: number;
}
export type EditEvent =
  | {
      type: "save";
      value: unknown;
      previous: unknown;
      source?: unknown;
      token: number;
    }
  | { type: "resolve"; token: number }
  | { type: "reject"; token: number; error: string };

export function editReducer(
  state: EditState | null,
  event: EditEvent,
): EditState | null {
  if (event.type === "save")
    return {
      value: event.value,
      submitted: event.value,
      source: event.source,
      previous: event.previous,
      status: "pending",
      token: event.token,
    };
  if (!state || state.token !== event.token) return state;
  if (event.type === "resolve") return { ...state, status: "saved" };
  return {
    ...state,
    value: state.previous,
    status: "error",
    error: event.error,
  };
}

/** Per-table save state survives virtual row/card unmounts. Subscribers watch only their cell. */
export class CellEditStore {
  private states = new Map<string, EditState>();
  private listeners = new Map<string, Set<() => void>>();
  private sequence = 0;
  nextToken() {
    return ++this.sequence;
  }
  read = (key: string): EditState | null => this.states.get(key) ?? null;
  subscribe = (key: string, listener: () => void) => {
    const set = this.listeners.get(key) ?? new Set();
    set.add(listener);
    this.listeners.set(key, set);
    return () => {
      set.delete(listener);
      if (!set.size) this.listeners.delete(key);
    };
  };
  dispatch = (key: string, event: EditEvent) => {
    const previous = this.read(key);
    const next = editReducer(previous, event);
    if (next === previous || !next) return;
    this.states.set(key, next);
    this.listeners.get(key)?.forEach((notify) => notify());
  };
}
