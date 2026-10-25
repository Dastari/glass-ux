import { defineMessages, resolveMessages, plural } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for ipField. */
export const ipFieldMessages = defineMessages("ipField", {
  copyAddress: "Copy address",
  copyRange: "Copy range",
  hostBitsSetTheNetworkIs: (value0: unknown, value1: unknown) => `Host bits set: the network is ${value0}/${value1}`,
  anIpv4Address: "an IPv4 address",
  anIpv6Address: "an IPv6 address",
  enter: (value0: unknown) => `Enter ${value0}`,
  enter2: (value0: unknown, value1: unknown) => `Enter ${value0} ${value1}`,
  enterOneAddressWithoutAPrefixLength: "Enter one address, without a prefix length",
  enterAPrefixLengthAfterTheSuch: "Enter a prefix length after the /, such as /24",
  addAPrefixLengthSuchAs64: "Add a prefix length, such as /64",
  addAPrefixLengthSuchAs24: "Add a prefix length, such as /24",
  enterAnIpv4Address: (value0: unknown) => `Enter an IPv4 address ${value0}`,
  enterAnIpv6Address: (value0: unknown) => `Enter an IPv6 address ${value0}`,
  enterAPrefixLengthFrom0To: (value0: unknown) => `Enter a prefix length from 0 to ${value0}`,
  network: (value0: unknown, value1: unknown) => `Network ${value0}/${value1}`,
  count2Hosts: (value0: unknown, value1: unknown) => `2 hosts · ${value0}–${value1}`,
  hosts: (value0: unknown, value1: unknown, value2: unknown) => `${value0} hosts · ${value1}–${value2}`,
  private: "Private",
  loopback: "Loopback",
  linkLocal: "Link-local",
  carrierGradeNat: "Carrier-grade NAT",
  multicast: "Multicast",
  uniqueLocal: "Unique local",
  aNetwork: "a network",
  anIpAddress: 'an IP address',
  example4: 'such as 192.168.1.10',
  example6: 'such as 2001:db8::1',
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
