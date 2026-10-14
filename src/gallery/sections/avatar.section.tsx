import { ContainerLab, Example, Rules, SectionPage, Specimen, SwapSlot, TokenTable } from "../kit.js"
import { Avatar, AvatarGroup, AvatarSkeleton, type AvatarSize } from "../../ui/avatar/index.js"

const SIZES: AvatarSize[] = ["xs", "sm", "md", "lg", "xl"]
const PEOPLE = [
  { name: "Avery Quinn" },
  { name: "Mira Rowan" },
  { name: "Ellis Park" },
  { name: "Noa Finch" },
  { name: "Rory Lake" },
  { name: "Casey Reed" },
  { name: "Sage Winter" },
]

export default function AvatarSection() {
  return (
    <SectionPage>
      <Specimen title="Sizes" description="xs 20 · sm 24 · md 32 · lg 40 · xl 56. Initials sit on a tint chosen from the name, drawn from the palette's ambient and accent roles.">
        {SIZES.map((size) => (
          <Example key={size} label={size}>
            <Avatar name="Avery Quinn" size={size} />
            <Avatar name="Mira Rowan" size={size} />
            <Avatar name="AzureAD\EllisPark" size={size} />
          </Example>
        ))}
      </Specimen>

      <Specimen title="Tints" description="Deterministic: the same person always gets the same tint, in every palette and mode.">
        {PEOPLE.map((person) => (
          <Avatar key={person.name} name={person.name} size="lg" />
        ))}
        <Avatar name="SYSTEM" size="lg" />
      </Specimen>

      <Specimen title="Presence" description="The shared status dot on the corner: online, away, busy, offline.">
        <Avatar name="Avery Quinn" size="lg" presence="online" />
        <Avatar name="Mira Rowan" size="lg" presence="away" />
        <Avatar name="Ellis Park" size="lg" presence="busy" />
        <Avatar name="Noa Finch" size="lg" presence="offline" />
        <Avatar name="Avery Quinn" size="sm" presence="online" />
        <Avatar name="Noa Finch" size="sm" presence="offline" />
      </Specimen>

      <Specimen title="Groups" description="Who is watching or connected. Faces overlap with a surface ring; the rest collapse into +N with their names in the label.">
        <Example label="sm · max 4">
          <AvatarGroup people={PEOPLE} max={4} />
        </Example>
        <Example label="md · max 3">
          <AvatarGroup people={PEOPLE.slice(0, 5)} max={3} size="md" />
        </Example>
        <Example label="Fits exactly">
          <AvatarGroup people={PEOPLE.slice(0, 3)} max={3} size="md" />
        </Example>
      </Specimen>

      <Specimen title="Loading" description="The skeleton is the same circle.">
        <Example label="Skeleton · loaded">
          <AvatarSkeleton size="lg" />
          <Avatar name="Avery Quinn" size="lg" />
          <AvatarSkeleton size="md" />
          <Avatar name="Avery Quinn" size="md" />
        </Example>
        <SwapSlot id="avatar" skeleton={<AvatarSkeleton size="lg" />} loaded={<Avatar name="Avery Quinn" size="lg" />} />
      </Specimen>

      <Specimen title="Over imagery" description="Tints are opaque palette colours, so initials stay legible on any content." backdrop>
        <Avatar name="Avery Quinn" size="xl" presence="online" />
        <AvatarGroup people={PEOPLE} max={4} size="md" />
      </Specimen>

      <ContainerLab description="Avatars keep their size; a group never wraps.">
        {() => (
          <div className="flex items-center gap-3 p-2">
            <Avatar name="Avery Quinn" presence="online" />
            <AvatarGroup people={PEOPLE} max={4} />
          </div>
        )}
      </ContainerLab>

      <Rules
        do={[
          "Pass the person's display name; initials, tint and the accessible name follow.",
          "Mark an avatar decorative when the name is printed beside it.",
          "Use presence only where it is live (chat, sessions).",
        ]}
        dont={[
          "Pick a tint by hand or use a status colour for a person.",
          "Use an avatar for an endpoint or organisation; those have icons.",
          "Show more than five faces in a group.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--identity-1", "Tint 1 of 8, by a hash of the name (shared with organisations)"],
          ["--identity-2", "Tint 2"],
          ["--identity-8", "Tint 8"],
          ["--fill-muted", "+N"],
          ["--surface-3", "Group and presence ring"],
          ["--radius-full", "Shape"],
        ]}
      />
    </SectionPage>
  )
}
