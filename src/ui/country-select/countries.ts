/**
 * Countries: ISO 3166-1 alpha-2 codes and their international calling codes, shared by
 * CountrySelect, PhoneInput and AddressInput. Names come from the platform
 * (Intl.DisplayNames), so they follow the locale and need no table.
 *
 * The table lists every ISO 3166-1 code, plus Kosovo (XK, user-assigned but in common use),
 * and two phone-only territories that have their own calling plans (AC Ascension, TA Tristan
 * da Cunha; marked *). Calling codes come from libphonenumber-js; countries.test.ts keeps them
 * in step with it. Codes without a calling code (Antarctica, Bouvet…) are places, not
 * phone plans.
 */

/** "CODE:calling" pairs; a * after the code marks a phone-only territory (not an ISO country). */
const TABLE =
  "AC*:247 AD:376 AE:971 AF:93 AG:1 AI:1 AL:355 AM:374 AO:244 AQ: AR:54 AS:1 AT:43 AU:61 AW:297 AX:358 " +
  "AZ:994 BA:387 BB:1 BD:880 BE:32 BF:226 BG:359 BH:973 BI:257 BJ:229 BL:590 BM:1 BN:673 BO:591 BQ:599 " +
  "BR:55 BS:1 BT:975 BV: BW:267 BY:375 BZ:501 CA:1 CC:61 CD:243 CF:236 CG:242 CH:41 CI:225 CK:682 CL:56 " +
  "CM:237 CN:86 CO:57 CR:506 CU:53 CV:238 CW:599 CX:61 CY:357 CZ:420 DE:49 DJ:253 DK:45 DM:1 DO:1 " +
  "DZ:213 EC:593 EE:372 EG:20 EH:212 ER:291 ES:34 ET:251 FI:358 FJ:679 FK:500 FM:691 FO:298 FR:33 " +
  "GA:241 GB:44 GD:1 GE:995 GF:594 GG:44 GH:233 GI:350 GL:299 GM:220 GN:224 GP:590 GQ:240 GR:30 GS: " +
  "GT:502 GU:1 GW:245 GY:592 HK:852 HM: HN:504 HR:385 HT:509 HU:36 ID:62 IE:353 IL:972 IM:44 IN:91 " +
  "IO:246 IQ:964 IR:98 IS:354 IT:39 JE:44 JM:1 JO:962 JP:81 KE:254 KG:996 KH:855 KI:686 KM:269 KN:1 " +
  "KP:850 KR:82 KW:965 KY:1 KZ:7 LA:856 LB:961 LC:1 LI:423 LK:94 LR:231 LS:266 LT:370 LU:352 LV:371 " +
  "LY:218 MA:212 MC:377 MD:373 ME:382 MF:590 MG:261 MH:692 MK:389 ML:223 MM:95 MN:976 MO:853 MP:1 " +
  "MQ:596 MR:222 MS:1 MT:356 MU:230 MV:960 MW:265 MX:52 MY:60 MZ:258 NA:264 NC:687 NE:227 NF:672 NG:234 " +
  "NI:505 NL:31 NO:47 NP:977 NR:674 NU:683 NZ:64 OM:968 PA:507 PE:51 PF:689 PG:675 PH:63 PK:92 PL:48 " +
  "PM:508 PN: PR:1 PS:970 PT:351 PW:680 PY:595 QA:974 RE:262 RO:40 RS:381 RU:7 RW:250 SA:966 SB:677 " +
  "SC:248 SD:249 SE:46 SG:65 SH:290 SI:386 SJ:47 SK:421 SL:232 SM:378 SN:221 SO:252 SR:597 SS:211 " +
  "ST:239 SV:503 SX:1 SY:963 SZ:268 TA*:290 TC:1 TD:235 TF: TG:228 TH:66 TJ:992 TK:690 TL:670 TM:993 " +
  "TN:216 TO:676 TR:90 TT:1 TV:688 TW:886 TZ:255 UA:380 UG:256 UM: US:1 UY:598 UZ:998 VA:39 VC:1 VE:58 " +
  "VG:1 VI:1 VN:84 VU:678 WF:681 WS:685 XK:383 YE:967 YT:262 ZA:27 ZM:260 ZW:263"

export interface CountryEntry {
  /** ISO 3166-1 alpha-2 ("AU"). */
  code: string
  /** International calling code without the plus ("61"), or "" when the place has none. */
  callingCode: string
  /** An ISO 3166-1 country or territory (false for phone-only territories such as AC). */
  iso: boolean
}

/** Every known country and territory code with its calling code, including phone-only territories (`iso: false`). */
export const COUNTRY_TABLE: readonly CountryEntry[] = TABLE.split(" ").map((pair) => {
  const [code = "", callingCode = ""] = pair.split(":")
  return { code: code.replace("*", ""), callingCode, iso: !code.endsWith("*") }
})

const BY_CODE = new Map(COUNTRY_TABLE.map((entry) => [entry.code, entry]))

/** Every ISO 3166-1 code (and XK), for address and country pickers. */
export const COUNTRY_CODES: readonly string[] = COUNTRY_TABLE.filter((entry) => entry.iso).map((entry) => entry.code)

/** Every code with a calling plan, for phone pickers. */
export const PHONE_COUNTRY_CODES: readonly string[] = COUNTRY_TABLE.filter((entry) => entry.callingCode).map((entry) => entry.code)

/** The main country of a calling code several share (+1 is the US, +44 the UK), from libphonenumber's metadata. */
export const MAIN_COUNTRY_FOR_CALLING_CODE: Readonly<Record<string, string>> = {
  "1": "US",
  "7": "RU",
  "39": "IT",
  "44": "GB",
  "47": "NO",
  "61": "AU",
  "212": "MA",
  "262": "RE",
  "290": "SH",
  "358": "FI",
  "590": "GP",
  "599": "CW",
}

/** Whether a code, in any case, is in `COUNTRY_TABLE`, phone-only territories included. */
export const isCountryCode = (code: string) => BY_CODE.has(code.toUpperCase())

/** "61" for AU; "" when unknown. */
export const callingCodeOf = (code: string) => BY_CODE.get(code.toUpperCase())?.callingCode ?? ""

const namers = new Map<string, Intl.DisplayNames | null>()

/** The country's name in the locale ("Australia"); the code when the platform has none. */
export function countryName(code: string, locale = "en-AU"): string {
  let namer = namers.get(locale)
  if (namer === undefined) {
    try {
      namer = new Intl.DisplayNames([locale], { type: "region" })
    } catch {
      namer = null
    }
    namers.set(locale, namer)
  }
  try {
    return namer?.of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

export interface Country extends CountryEntry {
  name: string
}

/**
 * Countries by name in the locale. `only` restricts the list; `priority` codes come first, in
 * the order given (the workspace's own country, then its neighbours).
 */
export function listCountries(options: { locale?: string; only?: readonly string[]; priority?: readonly string[]; phone?: boolean } = {}): Country[] {
  const codes = options.phone ? PHONE_COUNTRY_CODES : COUNTRY_CODES
  const allowed = options.only ? new Set(options.only.map((code) => code.toUpperCase())) : null
  const collator = new Intl.Collator(options.locale ?? "en-AU")
  const rows = codes
    .filter((code) => !allowed || allowed.has(code))
    .map((code) => ({ ...BY_CODE.get(code)!, name: countryName(code, options.locale) }))
    .toSorted((a, b) => collator.compare(a.name, b.name))
  const priority = (options.priority ?? []).map((code) => code.toUpperCase())
  if (!priority.length) return rows
  const first = priority.map((code) => rows.find((row) => row.code === code)).filter((row): row is Country => row !== undefined)
  return [...first, ...rows.filter((row) => !priority.includes(row.code))]
}
