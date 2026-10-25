import { defineMessages, resolveMessages, plural } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for ipField. */
export const ipFieldMessages = defineMessages("ipField", {
  copyAddress: "Copy address",
  copyRange: "Copy range",
  hostBitsSetTheNetworkIs: (address: string, prefix: null | number) => `Host bits set: the network is ${address}/${prefix}`,
  versionFourName: "an IPv4 address",
  versionSixName: "an IPv6 address",
  enter: (kind: string) => `Enter ${kind}`,
  invalidAddressExample: (kind: string, example: string) => `Enter ${kind} ${example}`,
  singleAddressRequired: "Enter one address, without a prefix length",
  enterAPrefixLengthAfterTheSuch: "Enter a prefix length after the /, such as /24",
  versionSixPrefix: "Add a prefix length, such as /64",
  versionFourPrefix: "Add a prefix length, such as /24",
  invalidVersionFour: (example: string) => `Enter an IPv4 address ${example}`,
  invalidVersionSix: (example: string) => `Enter an IPv6 address ${example}`,
  prefixOutOfRange: (maximum: number) => `Enter a prefix length from 0 to ${maximum}`,
  network: (address: string, prefix: number) => `Network ${address}/${prefix}`,
  pointToPointRange: (first: string, last: string) => `2 hosts · ${first}–${last}`,
  hosts: (count: string, first: string, last: string) => `${count} hosts · ${first}–${last}`,
  private: "Private",
  loopback: "Loopback",
  linkLocal: "Link-local",
  carrierGradeNat: "Carrier-grade NAT",
  multicast: "Multicast",
  uniqueLocal: "Unique local",
  aNetwork: "a network",
  anIpAddress: 'an IP address',
  versionFourExample: 'such as 192.168.1.10',
  versionSixExample: 'such as 2001:db8::1',
  exampleAny: 'such as 192.168.1.10 or 2001:db8::1',
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
