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
  20: "FTP data",
  21: "FTP",
  22: "SSH",
  23: "Telnet",
  25: "SMTP",
  53: "DNS",
  67: "DHCP server",
  68: "DHCP client",
  69: "TFTP",
  80: "HTTP",
  88: "Kerberos",
  110: "POP3",
  123: "NTP",
  135: "RPC",
  137: "NetBIOS name",
  138: "NetBIOS datagram",
  139: "NetBIOS session",
  143: "IMAP",
  161: "SNMP",
  162: "SNMP trap",
  389: "LDAP",
  443: "HTTPS",
  445: "SMB",
  465: "SMTPS",
  500: "IKE (IPsec)",
  514: "Syslog",
  515: "LPD printing",
  587: "SMTP submission",
  631: "IPP printing",
  636: "LDAPS",
  853: "DNS over TLS",
  873: "rsync",
  993: "IMAPS",
  995: "POP3S",
  1194: "OpenVPN",
  1433: "SQL Server",
  1521: "Oracle",
  1701: "L2TP",
  1723: "PPTP",
  1812: "RADIUS",
  1813: "RADIUS accounting",
  1883: "MQTT",
  2049: "NFS",
  3268: "Global catalog",
  3269: "Global catalog (TLS)",
  3306: "MySQL",
  3389: "RDP",
  4500: "IPsec NAT-T",
  5060: "SIP",
  5061: "SIP (TLS)",
  5353: "mDNS",
  5432: "PostgreSQL",
  5900: "VNC",
  5985: "WinRM",
  5986: "WinRM (HTTPS)",
  6379: "Redis",
  8006: "Proxmox",
  8080: "HTTP alternate",
  8291: "Winbox",
  8443: "HTTPS alternate",
  8883: "MQTT (TLS)",
  9100: "Raw printing",
  10000: "Webmin",
  27017: "MongoDB",
  51820: "WireGuard",
}

/** The service usually on a port, or undefined. */
export const serviceOf = (port: number | null | undefined) => (port === null || port === undefined ? undefined : WELL_KNOWN_PORTS[port])

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
