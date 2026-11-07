import type { FileUri } from "../../file-provider/index.js"
import { trimUri } from "../../file-provider/uri.js"
import { IconBookmark, IconFolder } from "../../icons/generated/icons.js"
import { useMessages } from "../../lib/i18n/index.js"
import { Button } from "../button/index.js"
import { Menu } from "../menu/index.js"
import { fileDialogMessages } from "./messages.js"
import type { FileDialogPlace } from "./types.js"

interface PlacesProps {
  places: readonly FileDialogPlace[]
  /** The folder showing. */
  current: FileUri | null
  /** Called with the place chosen. */
  onChoose: (place: FileDialogPlace) => void
}

const isCurrent = (place: FileDialogPlace, current: FileUri | null) => current !== null && trimUri(place.uri) === trimUri(current)

/** The shortcuts above the folders. */
export function PlaceList({ places, current, onChoose }: PlacesProps) {
  const messages = useMessages(fileDialogMessages)
  return (
    <nav className="fa-file-dialog-shortcuts" aria-label={messages.places}>
      <ul>
        {places.map((place) => (
          <li key={place.uri}>
            <button type="button" className="fa-item fa-file-dialog-shortcut" aria-current={isCurrent(place, current) ? "location" : undefined} data-active={isCurrent(place, current) ? "" : undefined} onClick={() => onChoose(place)}>
              {place.icon ?? <IconFolder />}
              <span className="fa-item-label">{place.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** The same shortcuts where there is no room beside the list. */
export function PlaceMenu({ places, current, onChoose }: PlacesProps) {
  const messages = useMessages(fileDialogMessages)
  return (
    <Menu.Root>
      <Menu.Trigger render={<Button variant="ghost" size="sm" icon={<IconBookmark />} aria-label={messages.places} />} />
      <Menu.Popup align="start" aria-label={messages.places}>
        {places.map((place) => (
          <Menu.Item key={place.uri} icon={place.icon ?? <IconFolder />} aria-current={isCurrent(place, current) ? "location" : undefined} onClick={() => onChoose(place)}>
            {place.label}
          </Menu.Item>
        ))}
      </Menu.Popup>
    </Menu.Root>
  )
}
