import { expect, it } from "vitest"
import { createServerGeocoder, localiseGeocoderAttribution } from "./geocoder.js"
import { addressFieldMessages } from "./messages.js"

it("translates default attribution while retaining explicit application wording, even when it matches English", () => {
  const messages = { ...addressFieldMessages.defaults, searchByPhoton: "Suche mit Photon", openstreetmapContributors: "© OpenStreetMap-Mitwirkende" }
  const builtIn = createServerGeocoder()
  expect(localiseGeocoderAttribution(builtIn.attribution, messages).provider).toBe("Suche mit Photon")
  const customised = createServerGeocoder({ attribution: { provider: "Search by Photon" } })
  const result = localiseGeocoderAttribution(customised.attribution, messages)
  expect(result.provider).toBe("Search by Photon")
  expect(result.data).toBe("© OpenStreetMap-Mitwirkende")
  expect(result.providerHref).toBe(customised.attribution.providerHref)
})
