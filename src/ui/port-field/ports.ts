import { portFieldMessages, getPortFieldMessages } from "./messages.js"
/**
 * TCP and UDP ports: the bounds, and the well-known services a technician recognises, for the
 * hint beside a port ("443 · HTTPS"). Only services an MSP meets day to day; a port that is
 * not listed simply has no hint.
 */

export const PORT_MIN = 1
/** The highest TCP or UDP port number. */
export const PORT_MAX = 65535

const SERVICE_KEYS = {
  20: "serviceFtpData",
  21: "serviceFtp",
  22: "serviceSsh",
  23: "serviceTelnet",
  25: "serviceSmtp",
  53: "serviceDns",
  67: "serviceDhcpServer",
  68: "serviceDhcpClient",
  69: "serviceTftp",
  80: "serviceHttp",
  88: "serviceKerberos",
  110: "servicePop",
  123: "serviceNtp",
  135: "serviceRpc",
  137: "serviceNetbiosName",
  138: "serviceNetbiosDatagram",
  139: "serviceNetbiosSession",
  143: "serviceImap",
  161: "serviceSnmp",
  162: "serviceSnmpTrap",
  389: "serviceLdap",
  443: "serviceHttps",
  445: "serviceSmb",
  465: "serviceSmtps",
  500: "serviceIkeIpsec",
  514: "serviceSyslog",
  515: "serviceLpdPrinting",
  587: "serviceSmtpSubmission",
  631: "serviceIppPrinting",
  636: "serviceLdaps",
  853: "serviceDnsOverTls",
  873: "serviceRsync",
  993: "serviceImaps",
  995: "servicePopSecure",
  1194: "serviceOpenvpn",
  1433: "serviceSqlServer",
  1521: "serviceOracle",
  1701: "serviceLtp",
  1723: "servicePptp",
  1812: "serviceRadius",
  1813: "serviceRadiusAccounting",
  1883: "serviceMqtt",
  2049: "serviceNfs",
  3268: "serviceGlobalCatalog",
  3269: "serviceGlobalCatalogTls",
  3306: "serviceMysql",
  3389: "serviceRdp",
  4500: "serviceIpsecNatT",
  5060: "serviceSip",
  5061: "serviceSipTls",
  5353: "serviceMdns",
  5432: "servicePostgresql",
  5900: "serviceVnc",
  5985: "serviceWinrm",
  5986: "serviceWinrmHttps",
  6379: "serviceRedis",
  8006: "serviceProxmox",
  8080: "serviceHttpAlternate",
  8291: "serviceWinbox",
  8443: "serviceHttpsAlternate",
  8883: "serviceMqttTls",
  9100: "serviceRawPrinting",
  10000: "serviceWebmin",
  27017: "serviceMongodb",
  51820: "serviceWireguard",
} as const

/** Port → service name, as people say it. */
export const WELL_KNOWN_PORTS: Readonly<Record<number, string>> = Object.fromEntries(
  Object.entries(SERVICE_KEYS).map(([port, key]) => [port, portFieldMessages.defaults[key]]),
)

/** The service usually on a port, or undefined. */
export function serviceOf(port: number | null | undefined, messages: ReturnType<typeof getPortFieldMessages> = getPortFieldMessages()) {
  if (port === null || port === undefined) return undefined
  const key = SERVICE_KEYS[port as keyof typeof SERVICE_KEYS]
  return key ? messages[key] : undefined
}

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
