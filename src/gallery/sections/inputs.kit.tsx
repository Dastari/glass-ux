/**
 * Shared pieces for the typed-input sections (address, phone, email, IP…): the usage block
 * that shows how a control pairs with its schema helper, and the realistic Glass UX values.
 */
import type { ReactNode } from "react"
import { Specimen } from "../kit.js"

/** The import and the schema pairing, as an agent or a person would type them. */
export function Usage({ code, description }: { code: string; description?: ReactNode }) {
  return (
    <Specimen title="Usage" description={description ?? "Bind the field with form.AppField and validate it with its schema helper in the form's Zod schema."} layout="stack" wide>
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scroll region must be keyboard scrollable (R20.6) */}
      <div className="gallery-usage" role="region" tabIndex={0} aria-label="Usage example" data-scroll-container="">
        <pre>
          <code>{code.trim()}</code>
        </pre>
      </div>
    </Specimen>
  )
}

/** The workspace's home region (Hobart), for address bias and map fallbacks. */
export const HOME_BIAS = { lat: -42.8821, lng: 147.3272, zoom: 7 }
