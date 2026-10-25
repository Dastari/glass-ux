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
  20: portFieldMessages.defaults.serviceFtpData,
  21: portFieldMessages.defaults.serviceFtp,
  22: portFieldMessages.defaults.serviceSsh,
  23: portFieldMessages.defaults.serviceTelnet,
  25: portFieldMessages.defaults.serviceSmtp,
  53: portFieldMessages.defaults.serviceDns,
  67: portFieldMessages.defaults.serviceDhcpServer,
  68: portFieldMessages.defaults.serviceDhcpClient,
  69: portFieldMessages.defaults.serviceTftp,
  80: portFieldMessages.defaults.serviceHttp,
  88: portFieldMessages.defaults.serviceKerberos,
  110: portFieldMessages.defaults.servicePop,
  123: portFieldMessages.defaults.serviceNtp,
  135: portFieldMessages.defaults.serviceRpc,
  137: portFieldMessages.defaults.serviceNetbiosName,
  138: portFieldMessages.defaults.serviceNetbiosDatagram,
  139: portFieldMessages.defaults.serviceNetbiosSession,
  143: portFieldMessages.defaults.serviceImap,
  161: portFieldMessages.defaults.serviceSnmp,
  162: portFieldMessages.defaults.serviceSnmpTrap,
  389: portFieldMessages.defaults.serviceLdap,
  443: portFieldMessages.defaults.serviceHttps,
  445: portFieldMessages.defaults.serviceSmb,
  465: portFieldMessages.defaults.serviceSmtps,
  500: portFieldMessages.defaults.serviceIkeIpsec,
  514: portFieldMessages.defaults.serviceSyslog,
  515: portFieldMessages.defaults.serviceLpdPrinting,
  587: portFieldMessages.defaults.serviceSmtpSubmission,
  631: portFieldMessages.defaults.serviceIppPrinting,
  636: portFieldMessages.defaults.serviceLdaps,
  853: portFieldMessages.defaults.serviceDnsOverTls,
  873: portFieldMessages.defaults.serviceRsync,
  993: portFieldMessages.defaults.serviceImaps,
  995: portFieldMessages.defaults.servicePopSecure,
  1194: portFieldMessages.defaults.serviceOpenvpn,
  1433: portFieldMessages.defaults.serviceSqlServer,
  1521: portFieldMessages.defaults.serviceOracle,
  1701: portFieldMessages.defaults.serviceLtp,
  1723: portFieldMessages.defaults.servicePptp,
  1812: portFieldMessages.defaults.serviceRadius,
  1813: portFieldMessages.defaults.serviceRadiusAccounting,
  1883: portFieldMessages.defaults.serviceMqtt,
  2049: portFieldMessages.defaults.serviceNfs,
  3268: portFieldMessages.defaults.serviceGlobalCatalog,
  3269: portFieldMessages.defaults.serviceGlobalCatalogTls,
  3306: portFieldMessages.defaults.serviceMysql,
  3389: portFieldMessages.defaults.serviceRdp,
  4500: portFieldMessages.defaults.serviceIpsecNatT,
  5060: portFieldMessages.defaults.serviceSip,
  5061: portFieldMessages.defaults.serviceSipTls,
  5353: portFieldMessages.defaults.serviceMdns,
  5432: portFieldMessages.defaults.servicePostgresql,
  5900: portFieldMessages.defaults.serviceVnc,
  5985: portFieldMessages.defaults.serviceWinrm,
  5986: portFieldMessages.defaults.serviceWinrmHttps,
  6379: portFieldMessages.defaults.serviceRedis,
  8006: portFieldMessages.defaults.serviceProxmox,
  8080: portFieldMessages.defaults.serviceHttpAlternate,
  8291: portFieldMessages.defaults.serviceWinbox,
  8443: portFieldMessages.defaults.serviceHttpsAlternate,
  8883: portFieldMessages.defaults.serviceMqttTls,
  9100: portFieldMessages.defaults.serviceRawPrinting,
  10000: portFieldMessages.defaults.serviceWebmin,
  27017: portFieldMessages.defaults.serviceMongodb,
  51820: portFieldMessages.defaults.serviceWireguard,
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
