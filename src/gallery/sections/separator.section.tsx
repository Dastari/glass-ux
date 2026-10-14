import { Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { IconClipboard, IconCursor, IconDisplays, IconFullscreen, IconKeyboard, IconMoreHorizontal, IconPower } from "../../icons/generated/icons.js"
import { Button } from "../../ui/button/index.js"
import { Separator } from "../../ui/separator/index.js"

export default function SeparatorSection() {
  return (
    <SectionPage>
      <Specimen
        title="Between action groups"
        description="R5.8 allows a divider in three places only: between action groups (a toolbar, a menu — at most two per menu), as table row lines, and as a scroll edge. Everywhere else, space separates."
        wide
      >
        <div className="glass-control flex h-12 items-center gap-1 rounded-control px-1.5" role="toolbar" aria-label="Remote control">
          <Button variant="ghost" size="sm" icon={<IconDisplays />} aria-label="Switch display" />
          <Button variant="ghost" size="sm" icon={<IconCursor />} aria-label="Show remote cursor" />
          <Separator orientation="vertical" />
          <Button variant="ghost" size="sm" icon={<IconKeyboard />} aria-label="Send keys" />
          <Button variant="ghost" size="sm" icon={<IconClipboard />} aria-label="Sync clipboard" />
          <Separator orientation="vertical" />
          <Button variant="ghost" size="sm" icon={<IconFullscreen />} aria-label="Full screen" />
          <Button variant="ghost" size="sm" icon={<IconPower />} aria-label="Power" />
          <Button variant="ghost" size="sm" icon={<IconMoreHorizontal />} aria-label="More tools" />
        </div>
      </Specimen>

      <Specimen title="Horizontal" description="Full width, one hairline in --line.">
        <div className="flex w-80 flex-col gap-3">
          <span className="type-label">Restart agent</span>
          <Separator />
          <span className="type-label text-danger-text">Remove from Northstar Studio</span>
        </div>
      </Specimen>

      <Rules
        do={[
          "Reach for space first, then grouping (a shared surface or inset fill), then a separator.",
          "Use a vertical separator between groups of related toolbar actions.",
          "Put the destructive group behind a separator at the end of a menu (R12.2).",
        ]}
        dont={[
          "Draw a line under a heading, between form fields or between panels.",
          "Frame a footer with a line when nothing scrolls beneath it.",
          "Use more than two separators in one menu.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--line", "Colour"],
          ["--border-width", "Thickness"],
          ["--space-1-5", "Vertical inset in toolbars"],
        ]}
      />
    </SectionPage>
  )
}
