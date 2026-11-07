/** One line of the card list as drawn: a card, or a line across the list. */
export interface DrawnLine {
  index: number;
  /** The line's top edge. */
  top: number;
  /** Its distance from the list's start edge, in the reading direction. */
  start: number;
}

/** Lines closer than this (px) sit in one row of the grid. */
const SAME_ROW = 1;

/** The list's lines where the browser drew them, in order. */
export function drawnLines(list: HTMLElement): DrawnLine[] {
  const box = list.getBoundingClientRect();
  const rtl = getComputedStyle(list).direction === "rtl";
  return Array.from(
    list.querySelectorAll<HTMLElement>(":scope > [data-index]"),
    (element) => {
      const line = element.getBoundingClientRect();
      return {
        index: Number(element.dataset.index),
        top: line.top,
        start: rtl ? box.right - line.right : line.left - box.left,
      };
    },
  );
}

/** How many cards share the row of line `from`. */
export function linesAcross(lines: readonly DrawnLine[], from: number) {
  const origin = lines.find((line) => line.index === from);
  if (!origin) return 1;
  return lines.filter((line) => Math.abs(line.top - origin.top) < SAME_ROW)
    .length;
}

/**
 * The line an up or down arrow reaches: in the next row of the grid, the one nearest the same
 * column. From a line across the list, that is the row's first card. `from` when there is none.
 */
export function lineInNextRow(
  lines: readonly DrawnLine[],
  from: number,
  step: 1 | -1,
) {
  const origin = lines.find((line) => line.index === from);
  if (!origin) return from;
  let row: DrawnLine[] = [];
  for (const line of lines) {
    const distance = (line.top - origin.top) * step;
    if (distance < SAME_ROW) continue;
    const nearest = row[0] ? (row[0].top - origin.top) * step : Infinity;
    if (distance < nearest - SAME_ROW) row = [line];
    else if (Math.abs(distance - nearest) < SAME_ROW) row.push(line);
  }
  let best = from;
  let bestGap = Infinity;
  for (const line of row) {
    const gap = Math.abs(line.start - origin.start);
    if (gap < bestGap) {
      best = line.index;
      bestGap = gap;
    }
  }
  return best;
}
