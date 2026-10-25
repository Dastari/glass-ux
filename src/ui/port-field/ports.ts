import { portFieldMessages, getPortFieldMessages } from "./messages.js"
/**
 * TCP and UDP ports: the bounds, and the well-known services a technician recognises, for the
 * hint beside a port ("443 · HTTPS"). Only services an MSP meets day to day; a port that is
 * not listed simply has no hint.
 */

export const PORT_MIN = 1
/** The highest TCP or UDP port number. */
export const PORT_MAX = 65535

/** Port → service name, as people say it. */
export const WELL_KNOWN_PORTS: Readonly<Record<number, string>> = {
  20: portFieldMessages.defaults.service20,
  21: portFieldMessages.defaults.service21,
  22: portFieldMessages.defaults.service22,
  23: portFieldMessages.defaults.service23,
  25: portFieldMessages.defaults.service25,
  53: portFieldMessages.defaults.service53,
  67: portFieldMessages.defaults.service67,
  68: portFieldMessages.defaults.service68,
  69: portFieldMessages.defaults.service69,
  80: portFieldMessages.defaults.service80,
  88: portFieldMessages.defaults.service88,
  110: portFieldMessages.defaults.service110,
  123: portFieldMessages.defaults.service123,
  135: portFieldMessages.defaults.service135,
  137: portFieldMessages.defaults.service137,
  138: portFieldMessages.defaults.service138,
  139: portFieldMessages.defaults.service139,
  143: portFieldMessages.defaults.service143,
  161: portFieldMessages.defaults.service161,
  162: portFieldMessages.defaults.service162,
  389: portFieldMessages.defaults.service389,
  443: portFieldMessages.defaults.service443,
  445: portFieldMessages.defaults.service445,
  465: portFieldMessages.defaults.service465,
  500: portFieldMessages.defaults.service500,
  514: portFieldMessages.defaults.service514,
  515: portFieldMessages.defaults.service515,
  587: portFieldMessages.defaults.service587,
  631: portFieldMessages.defaults.service631,
  636: portFieldMessages.defaults.service636,
  853: portFieldMessages.defaults.service853,
  873: portFieldMessages.defaults.service873,
  993: portFieldMessages.defaults.service993,
  995: portFieldMessages.defaults.service995,
  1194: portFieldMessages.defaults.service1194,
  1433: portFieldMessages.defaults.service1433,
  1521: portFieldMessages.defaults.service1521,
  1701: portFieldMessages.defaults.service1701,
  1723: portFieldMessages.defaults.service1723,
  1812: portFieldMessages.defaults.service1812,
  1813: portFieldMessages.defaults.service1813,
  1883: portFieldMessages.defaults.service1883,
  2049: portFieldMessages.defaults.service2049,
  3268: portFieldMessages.defaults.service3268,
  3269: portFieldMessages.defaults.service3269,
  3306: portFieldMessages.defaults.service3306,
  3389: portFieldMessages.defaults.service3389,
  4500: portFieldMessages.defaults.service4500,
  5060: portFieldMessages.defaults.service5060,
  5061: portFieldMessages.defaults.service5061,
  5353: portFieldMessages.defaults.service5353,
  5432: portFieldMessages.defaults.service5432,
  5900: portFieldMessages.defaults.service5900,
  5985: portFieldMessages.defaults.service5985,
  5986: portFieldMessages.defaults.service5986,
  6379: portFieldMessages.defaults.service6379,
  8006: portFieldMessages.defaults.service8006,
  8080: portFieldMessages.defaults.service8080,
  8291: portFieldMessages.defaults.service8291,
  8443: portFieldMessages.defaults.service8443,
  8883: portFieldMessages.defaults.service8883,
  9100: portFieldMessages.defaults.service9100,
  10000: portFieldMessages.defaults.service10000,
  27017: portFieldMessages.defaults.service27017,
  51820: portFieldMessages.defaults.service51820,
}

/** The service usually on a port, or undefined. */
export const serviceOf = (port: number | null | undefined, messages: ReturnType<typeof getPortFieldMessages> = getPortFieldMessages()) => (port === null || port === undefined ? undefined : (messages[("service" + port) as keyof typeof messages] as string | undefined))

/** True for an integer from 1 to 65535. */
export const isPort = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= PORT_MIN && value <= PORT_MAX

/** Parse typed text ("443", " 8080 ", "https"→443 by name); null when it is not a port. */
export function parsePort(text: string): number | null {
  const source = text.trim()
  if (/^\d{1,5}$/.test(source)) {
    const value = Number(source)
    return isPort(value) ? value : null
  }
  const named = source.toLowerCase()
  if (!named) return null
  for (const [port, name] of Object.entries(WELL_KNOWN_PORTS)) if (name.toLowerCase() === named) return Number(port)
  return null
}
