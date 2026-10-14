/** A cluster block's label line, as the canvas draws it and the layout sizes it: "Storage and power · 1". */
export function clusterLabel(label: string, count: number) {
  return `${label} · ${count.toLocaleString("en-AU")}`
}
