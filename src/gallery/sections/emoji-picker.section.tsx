import { useState } from "react"
import { IconSmile } from "../../icons/generated/icons.js"
import { Button } from "../../ui/button/index.js"
import { EmojiPicker, EmojiPopover, type EmojiPick, type EmojiSkinTone } from "../../ui/emoji-picker/index.js"
import { SectionPage, Specimen } from "../kit.js"

const RECENT = ["👍", "🎉", "🙏🏽", "🚀"]

function InPage() {
  const [picked, setPicked] = useState<EmojiPick | null>(null)
  const [tone, setTone] = useState<EmojiSkinTone>(0)
  return (
    <div className="w-full max-w-sm" data-testid="emoji-inline">
      <EmojiPicker recent={RECENT} skinTone={tone} onSkinToneChange={setTone} onPick={setPicked} />
      <p data-testid="emoji-picked">{picked ? `${picked.emoji} ${picked.name}` : "Nothing picked"}</p>
    </div>
  )
}

function InPopover() {
  const [picked, setPicked] = useState("")
  return (
    <div className="flex items-center gap-3" data-testid="emoji-popover">
      <EmojiPopover onPick={({ emoji }) => setPicked(emoji)} trigger={<Button icon={<IconSmile />}>Choose an emoji</Button>} />
      <p data-testid="emoji-popover-picked">{picked || "Nothing picked"}</p>
    </div>
  )
}

const FRENCH = () => Promise.resolve<Record<string, string>>({ "😀": "visage souriant sourire", "👍": "pouce levé bravo" })

function LocalisedNames() {
  const [picked, setPicked] = useState("")
  return (
    <div className="w-full max-w-sm" data-testid="emoji-names">
      <EmojiPicker aria-label="Emoji picker with supplied names" loadNames={FRENCH} skinTones={false} onPick={({ name }) => setPicked(name)} />
      <p>{picked || "Nothing picked"}</p>
    </div>
  )
}

export default function EmojiPickerSection() {
  return (
    <SectionPage>
      <Specimen
        title="In a page"
        description="The list is one tab stop: arrow keys move, Enter or Space picks, and typing searches. ↓ enters the list from the search. The host keeps the recent emoji."
        layout="stack"
      >
        <InPage />
      </Specimen>
      <Specimen title="In a popover" description="The picker's code and data load when it first opens." layout="stack">
        <InPopover />
      </Specimen>
      <Specimen title="Names from the application" description="Search is in English unless loadNames supplies the locale's names. This one names two emoji in French: try sourire." layout="stack">
        <LocalisedNames />
      </Specimen>
    </SectionPage>
  )
}
