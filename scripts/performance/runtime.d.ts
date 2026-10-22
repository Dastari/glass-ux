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
      scrollUp: () => Promise<number>;
      jump: (index: number) => Promise<number>;
      slide: () => void;
      change: () => void;
      timeSlide: () => number;
      remove: () => void;
    };
    __mountMs: number;
    __commits: { phase: string; ms: number; at: number }[];
    __hydration: { ms: number; longTasks: number[]; consumerRenders: number };
  }
}
