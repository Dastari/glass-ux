/** Link speeds as the map labels them (R2.7: a thin space before the unit). */

/** "100 Mbps", "1 Gbps", "2.5 Gbps". */
export function formatLinkSpeed(mbps: number): string {
  if (mbps >= 1000) {
    const gbps = mbps / 1000
    return `${Number.isInteger(gbps) ? gbps : gbps.toFixed(1)} Gbps`
  }
  return `${Math.round(mbps)} Mbps`
}

/** One label for several links: "1 Gbps", or the range "100 Mbps–1 Gbps". */
export function speedRange(speeds: readonly number[]): string | undefined {
  if (!speeds.length) return undefined
  const low = Math.min(...speeds)
  const high = Math.max(...speeds)
  return low === high ? formatLinkSpeed(low) : `${formatLinkSpeed(low)}–${formatLinkSpeed(high)}`
}
