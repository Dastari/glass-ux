import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for portField. */
export const portFieldMessages = defineMessages("portField", {
  enterAPortFromTo: (minimum: number, maximum: number) => `Enter a port from ${minimum} to ${maximum}`,
  serviceFtpData: "FTP data",
  serviceFtp: "FTP",
  serviceSsh: "SSH",
  serviceTelnet: "Telnet",
  serviceSmtp: "SMTP",
  serviceDns: "DNS",
  serviceDhcpServer: "DHCP server",
  serviceDhcpClient: "DHCP client",
  serviceTftp: "TFTP",
  serviceHttp: "HTTP",
  serviceKerberos: "Kerberos",
  servicePop: "POP3",
  serviceNtp: "NTP",
  serviceRpc: "RPC",
  serviceNetbiosName: "NetBIOS name",
  serviceNetbiosDatagram: "NetBIOS datagram",
  serviceNetbiosSession: "NetBIOS session",
  serviceImap: "IMAP",
  serviceSnmp: "SNMP",
  serviceSnmpTrap: "SNMP trap",
  serviceLdap: "LDAP",
  serviceHttps: "HTTPS",
  serviceSmb: "SMB",
  serviceSmtps: "SMTPS",
  serviceIkeIpsec: "IKE (IPsec)",
  serviceSyslog: "Syslog",
  serviceLpdPrinting: "LPD printing",
  serviceSmtpSubmission: "SMTP submission",
  serviceIppPrinting: "IPP printing",
  serviceLdaps: "LDAPS",
  serviceDnsOverTls: "DNS over TLS",
  serviceRsync: "rsync",
  serviceImaps: "IMAPS",
  servicePopSecure: "POP3S",
  serviceOpenvpn: "OpenVPN",
  serviceSqlServer: "SQL Server",
  serviceOracle: "Oracle",
  serviceLtp: "L2TP",
  servicePptp: "PPTP",
  serviceRadius: "RADIUS",
  serviceRadiusAccounting: "RADIUS accounting",
  serviceMqtt: "MQTT",
  serviceNfs: "NFS",
  serviceGlobalCatalog: "Global catalog",
  serviceGlobalCatalogTls: "Global catalog (TLS)",
  serviceMysql: "MySQL",
  serviceRdp: "RDP",
  serviceIpsecNatT: "IPsec NAT-T",
  serviceSip: "SIP",
  serviceSipTls: "SIP (TLS)",
  serviceMdns: "mDNS",
  servicePostgresql: "PostgreSQL",
  serviceVnc: "VNC",
  serviceWinrm: "WinRM",
  serviceWinrmHttps: "WinRM (HTTPS)",
  serviceRedis: "Redis",
  serviceProxmox: "Proxmox",
  serviceHttpAlternate: "HTTP alternate",
  serviceWinbox: "Winbox",
  serviceHttpsAlternate: "HTTPS alternate",
  serviceMqttTls: "MQTT (TLS)",
  serviceRawPrinting: "Raw printing",
  serviceWebmin: "Webmin",
  serviceMongodb: "MongoDB",
  serviceWireguard: "WireGuard",
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
