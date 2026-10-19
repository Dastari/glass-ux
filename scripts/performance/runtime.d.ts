export {};
declare global {
  interface Window {
    __ready: boolean;
    __perf: { keys: number; cells: number };
    __append: () => void;
    __fixture: {
      update: () => void;
      add: () => void;
      sort: (numeric?: boolean) => { ms: number; first: string | undefined };
    };
  }
}
