import { defineMessages, resolveMessages, plural } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for ipField. */
export const ipFieldMessages = defineMessages("ipField", {
  copyAddress: "Copy address",
  copyRange: "Copy range",
  hostBitsSetTheNetworkIs: (address: string, prefix: null | number) => `Host bits set: the network is ${address}/${prefix}`,
  enter: (version: 4 | 6 | "any" | "network"): string => version === "network" ? "Enter a network" : version === 4 ? "Enter an IPv4 address" : version === 6 ? "Enter an IPv6 address" : "Enter an IP address",
  invalidAddressExample: (version: 4 | 6 | "any"): string => version === 4 ? "Enter an IPv4 address such as 192.168.1.10" : version === 6 ? "Enter an IPv6 address such as 2001:db8::1" : "Enter an IP address such as 192.168.1.10 or 2001:db8::1",
  singleAddressRequired: "Enter one address, without a prefix length",
  enterAPrefixLengthAfterTheSuch: "Enter a prefix length after the /, such as /24",
  versionSixPrefix: "Add a prefix length, such as /64",
  versionFourPrefix: "Add a prefix length, such as /24",
  prefixOutOfRange: (maximum: number) => `Enter a prefix length from 0 to ${maximum}`,
  network: (address: string, prefix: number) => `Network ${address}/${prefix}`,
  pointToPointRange: (first: string, last: string) => `2 hosts · ${first}–${last}`,
  hosts: ({ count, first, last }: { count: string; first: string; last: string }) => `${count} hosts · ${first}–${last}`,
  private: "Private",
  loopback: "Loopback",
  linkLocal: "Link-local",
  carrierGradeNat: "Carrier-grade NAT",
  multicast: "Multicast",
  uniqueLocal: "Unique local",
  hostCount: (count: number, locale = "en-US") => plural(locale, count, { one: `${count} host`, other: `${count} hosts` }),
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    ipField: typeof ipFieldMessages.defaults
  }
}

/** Resolve ipField wording outside React; pass the component's locale. */
export function getIpFieldMessages(locale = getLocale()): typeof ipFieldMessages.defaults {
  return resolveMessages(ipFieldMessages.namespace, ipFieldMessages.defaults, locale)
}
