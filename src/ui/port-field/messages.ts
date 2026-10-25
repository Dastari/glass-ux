import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for portField. */
export const portFieldMessages = defineMessages("portField", {
  enterAPortFromTo: (value0: unknown, value1: unknown) => `Enter a port from ${value0} to ${value1}`,
  service20: "FTP data",
  service21: "FTP",
  service22: "SSH",
  service23: "Telnet",
  service25: "SMTP",
  service53: "DNS",
  service67: "DHCP server",
  service68: "DHCP client",
  service69: "TFTP",
  service80: "HTTP",
  service88: "Kerberos",
  service110: "POP3",
  service123: "NTP",
  service135: "RPC",
  service137: "NetBIOS name",
  service138: "NetBIOS datagram",
  service139: "NetBIOS session",
  service143: "IMAP",
  service161: "SNMP",
  service162: "SNMP trap",
  service389: "LDAP",
  service443: "HTTPS",
  service445: "SMB",
  service465: "SMTPS",
  service500: "IKE (IPsec)",
  service514: "Syslog",
  service515: "LPD printing",
  service587: "SMTP submission",
  service631: "IPP printing",
  service636: "LDAPS",
  service853: "DNS over TLS",
  service873: "rsync",
  service993: "IMAPS",
  service995: "POP3S",
  service1194: "OpenVPN",
  service1433: "SQL Server",
  service1521: "Oracle",
  service1701: "L2TP",
  service1723: "PPTP",
  service1812: "RADIUS",
  service1813: "RADIUS accounting",
  service1883: "MQTT",
  service2049: "NFS",
  service3268: "Global catalog",
  service3269: "Global catalog (TLS)",
  service3306: "MySQL",
  service3389: "RDP",
  service4500: "IPsec NAT-T",
  service5060: "SIP",
  service5061: "SIP (TLS)",
  service5353: "mDNS",
  service5432: "PostgreSQL",
  service5900: "VNC",
  service5985: "WinRM",
  service5986: "WinRM (HTTPS)",
  service6379: "Redis",
  service8006: "Proxmox",
  service8080: "HTTP alternate",
  service8291: "Winbox",
  service8443: "HTTPS alternate",
  service8883: "MQTT (TLS)",
  service9100: "Raw printing",
  service10000: "Webmin",
  service27017: "MongoDB",
  service51820: "WireGuard",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    portField: typeof portFieldMessages.defaults
  }
}

/** Resolve portField wording outside React; pass the component's locale. */
export function getPortFieldMessages(locale = getLocale()): typeof portFieldMessages.defaults {
  return resolveMessages(portFieldMessages.namespace, portFieldMessages.defaults, locale)
}
