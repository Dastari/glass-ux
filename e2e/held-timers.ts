import type { Page } from "@playwright/test";

/**
 * Hold every timer of this exact delay until `release` runs, so a test can measure the state
 * while a demo's simulated request is open however slowly the machine is running.
 */
export async function holdTimers(page: Page, delay: number) {
  await page.evaluate((delay) => {
    const held: Array<() => void> = [];
    const original = window.setTimeout;
    window.setTimeout = ((run: () => void, ms?: number, ...rest: unknown[]) => {
      if (ms !== delay) return original(run, ms, ...rest);
      held.push(run);
      return 0;
    }) as typeof window.setTimeout;
    (window as unknown as { releaseTimers: () => void }).releaseTimers = () => {
      window.setTimeout = original;
      held.splice(0).forEach((run) => run());
    };
  }, delay);
  return () => page.evaluate(() => (window as unknown as { releaseTimers: () => void }).releaseTimers());
}
