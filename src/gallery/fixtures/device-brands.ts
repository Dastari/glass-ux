/** Catalogue search categories; a manufacturer can appear in several device classes. */
const DEVICE_CATEGORIES: Array<[keywords: string, names: string[]]> = [
  ["computer laptop desktop workstation server motherboard processor gpu", [
    "acer", "amd", "asus", "dell", "fujitsu", "gigabyte", "hp", "hpe", "intel", "lenovo", "msi", "nvidia", "panasonic", "samsung", "supermicro",
  ]],
  ["voip phone telephone handset communications pbx sip", [
    "alcatel-lucent", "audiocodes", "avaya", "fanvil", "gigaset", "grandstream", "mitel", "poly", "snom", "yealink", "cisco", "panasonic",
  ]],
  ["printer scanner printing copier multifunction mfp", [
    "brother", "canon", "epson", "kyocera", "lexmark", "oki", "ricoh", "sharp", "xerox", "zebra", "hp", "samsung",
  ]],
  ["network networking router switch wireless wifi firewall security access point", [
    "aruba", "cisco", "d-link", "fortinet", "huawei", "juniper", "mikrotik", "netgear", "palo-alto", "ruckus", "sonicwall", "sophos", "tp-link", "ubiquiti", "watchguard", "zyxel", "hpe",
  ]],
  ["storage nas san disk drive backup", ["qnap", "seagate", "synology", "western-digital"]],
  ["ups power battery pdu rack infrastructure", ["apc", "eaton", "schneider-electric", "vertiv"]],
  ["peripheral headset camera surveillance security iot building automation", [
    "axis", "bosch", "dahua", "hikvision", "honeywell", "jabra", "logitech", "reolink",
  ]],
  ["av audio video display television conference conferencing room speaker", [
    "crestron", "jabra", "logitech", "philips", "poly", "samsung", "sonos", "sony", "yamaha",
  ]],
]

/** Device icons are filed once, while search also accepts device classes and common aliases. */
export const DEVICE_BRAND_NAMES = [...new Set(DEVICE_CATEGORIES.flatMap(([, names]) => names))].sort()

export const DEVICE_BRAND_KEYWORDS = new Map<string, string>()
for (const [keywords, names] of DEVICE_CATEGORIES) {
  for (const name of names) {
    DEVICE_BRAND_KEYWORDS.set(name, `${DEVICE_BRAND_KEYWORDS.get(name) ?? ""} ${keywords}`)
  }
}
// These manufacturers already have a home in the company-logo group.
DEVICE_BRAND_KEYWORDS.set("apple", "computer laptop desktop workstation phone tablet")
DEVICE_BRAND_KEYWORDS.set("microsoft", "computer laptop desktop tablet")
for (const [name, aliases] of [
  ["hp", "hewlett packard"], ["hpe", "hewlett packard enterprise"],
  ["palo-alto", "palo alto networks"], ["western-digital", "wd wdc"],
  ["poly", "polycom plantronics"], ["axis", "axis communications"],
  ["apc", "american power conversion"], ["aruba", "aruba instant on"],
] as const) {
  DEVICE_BRAND_KEYWORDS.set(name, `${DEVICE_BRAND_KEYWORDS.get(name) ?? ""} ${aliases}`)
}
