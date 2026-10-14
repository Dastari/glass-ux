import type {
  AddressSuggestion,
  GeocoderAdapter,
} from "../../ui/address-field/index.js";

const addresses: AddressSuggestion[] = [
  "12 Lantern Lane",
  "28 Example Avenue",
  "43 Orchard Walk",
].map((line1, index) => ({
  id: `sample-address-${index + 1}`,
  kind: "address",
  label: line1,
  description: "Cedar Vale VIC 3000",
  value: {
    line1,
    line2: "",
    locality: "Cedar Vale",
    region: { code: "AU-VIC", name: "Victoria" },
    postcode: "3000",
    country: { code: "AU", name: "Australia" },
    location: { lat: -37.8136 + index * 0.015, lng: 144.9631 + index * 0.015 },
    pinned: false,
  },
}));
/** Deterministic fictional results; the public demo does not call a geocoding service. */
export const demoGeocoder: GeocoderAdapter = {
  attribution: {
    provider: "Glass UX sample lookup",
    data: "Fictional demo addresses",
  },
  async search(query, { signal }) {
    if (signal.aborted)
      throw new DOMException("Lookup cancelled", "AbortError");
    const matches = addresses.filter((address) =>
      `${address.label} ${address.description}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
    return matches.length ? matches : addresses;
  },
};
