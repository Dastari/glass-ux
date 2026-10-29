import { useState } from "react"
import { IconImage } from "../../icons/generated/icons.js"
import { Button } from "../../ui/button/index.js"
import { ContainerLab, Example, Rules, SectionPage, Specimen, SwapSlot, TokenTable } from "../kit.js"
import {
  Avatar,
  AvatarDialog,
  AvatarGroup,
  AvatarSkeleton,
  EditableAvatar,
  type AvatarChange,
  type AvatarSaveContext,
  type AvatarSize,
} from "../../ui/avatar/index.js"
import { PORTRAITS } from "../fixtures/organisations.js"
import { Usage } from "./inputs.kit.js"

const SIZES: AvatarSize[] = ["xs", "sm", "md", "lg", "xl", "2xl"]

/** A pause that ends early, rejecting, when the dialog aborts the save. */
function pause(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener("abort", () => {
      clearTimeout(timer)
      reject(signal.reason)
    })
  })
}

/** A stand-in upload that reports progress in ten steps. */
async function upload(_change: AvatarChange, { signal, setProgress }: AvatarSaveContext) {
  for (let step = 1; step <= 10; step++) {
    await pause(120, signal)
    setProgress(step / 10)
  }
}

const PROFILE_REQUIREMENTS = { maxSize: 5 * 1024 * 1024, minWidth: 256, minHeight: 256 }

/** A profile photo the visitor can change: the saved blob becomes the new src. */
function ProfilePhoto() {
  const [src, setSrc] = useState<string | undefined>(PORTRAITS[1])
  return (
    <EditableAvatar
      name="Avery Quinn"
      src={src}
      presence="online"
      requirements={PROFILE_REQUIREMENTS}
      onSave={async (change, context) => {
        await upload(change, context)
        setSrc(URL.createObjectURL(change.blob))
      }}
      onRemove={async () => {
        await pause(400)
        setSrc(undefined)
      }}
      data-testid="profile-photo"
    />
  )
}

function FailingSave() {
  return (
    <EditableAvatar
      name="Ellis Park"
      src={PORTRAITS[3]}
      onSave={async (_change, { signal }) => {
        await pause(700, signal)
        throw new Error("The photo service is unavailable. Try again in a few minutes.")
      }}
    />
  )
}

function StandaloneDialog() {
  const [src, setSrc] = useState<string | undefined>()
  return (
    <div className="flex items-center gap-3">
      <Avatar name="Noa Finch" src={src} size="lg" />
      <AvatarDialog
        trigger={<Button icon={<IconImage />}>Change photo</Button>}
        name="Noa Finch"
        src={src}
        requirements={{
          accept: "image/png,image/jpeg",
          maxSize: 2 * 1024 * 1024,
          minWidth: 400,
          minHeight: 400,
          validate: (_file, { width, height }) => (Math.max(width, height) > 3 * Math.min(width, height) ? "Choose a photo closer to square." : undefined),
        }}
        output={{ size: 256, type: "image/jpeg", quality: 0.85 }}
        onSave={async (change, context) => {
          await upload(change, context)
          setSrc(URL.createObjectURL(change.blob))
        }}
      />
    </div>
  )
}
const PEOPLE = [
  { name: "Avery Quinn", src: PORTRAITS[1] },
  { name: "Mira Rowan", src: PORTRAITS[0] },
  { name: "Ellis Park", src: PORTRAITS[3] },
  { name: "Noa Finch", src: PORTRAITS[4] },
  { name: "Rory Lake", src: PORTRAITS[5] },
  { name: "Casey Reed", src: PORTRAITS[6] },
  { name: "Sage Winter", src: PORTRAITS[7] },
]

export default function AvatarSection() {
  return (
    <SectionPage>
      <Specimen title="Sizes" description="xs 20 · sm 24 · md 32 · lg 40 · xl 56 · 2xl 96 for profile pages. Sample portraits at each size; the final avatar shows initials when no image is supplied.">
        {SIZES.map((size) => (
          <Example key={size} label={size}>
            <Avatar name="Avery Quinn" src={PORTRAITS[1]} size={size} />
            <Avatar name="Mira Rowan" src={PORTRAITS[0]} size={size} />
            <Avatar name="AzureAD\EllisPark" size={size} />
          </Example>
        ))}
      </Specimen>

      <Specimen title="Tints" description="Without profile images, the same person always gets the same initials and tint in every palette and mode.">
        {PEOPLE.map((person) => (
          <Avatar key={person.name} name={person.name} size="lg" />
        ))}
        <Avatar name="SYSTEM" size="lg" />
      </Specimen>

      <Specimen title="Presence" description="The shared status dot on the corner: online, away, busy, offline.">
        <Avatar name="Avery Quinn" src={PORTRAITS[1]} size="lg" presence="online" />
        <Avatar name="Mira Rowan" src={PORTRAITS[0]} size="lg" presence="away" />
        <Avatar name="Ellis Park" src={PORTRAITS[3]} size="lg" presence="busy" />
        <Avatar name="Noa Finch" src={PORTRAITS[4]} size="lg" presence="offline" />
        <Avatar name="Avery Quinn" src={PORTRAITS[1]} size="sm" presence="online" />
        <Avatar name="Noa Finch" src={PORTRAITS[4]} size="sm" presence="offline" />
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

      <Specimen
        title="Editable"
        description="The edit button opens the photo dialog: drop, browse for or paste a photo, then drag, pinch, scroll or use the arrow keys to position it. Dropping a photo on the avatar opens the dialog with it. The saved photo shows at once."
      >
        <Example label="2xl · upload with progress">
          <ProfilePhoto />
        </Example>
        <Example label="xl · edit button top-start">
          <EditableAvatar name="Mira Rowan" src={PORTRAITS[0]} size="xl" editPlacement="top-start" onSave={upload} />
        </Example>
        <Example label="md · the avatar is the button">
          <EditableAvatar name="Rory Lake" size="md" onSave={upload} />
        </Example>
        <Example label="Save fails">
          <FailingSave />
        </Example>
      </Specimen>

      <Specimen title="Photo dialog" description="AvatarDialog on its own, opened from a button. These requirements take PNG or JPEG up to 2 MB, at least 400 × 400 pixels and no wider than three to one; the result is a 256-pixel JPEG.">
        <StandaloneDialog />
      </Specimen>

      <Specimen title="Loading" description="The skeleton is the same circle.">
        <Example label="Skeleton · loaded">
          <AvatarSkeleton size="lg" />
          <Avatar name="Avery Quinn" src={PORTRAITS[1]} size="lg" />
          <AvatarSkeleton size="md" />
          <Avatar name="Avery Quinn" src={PORTRAITS[1]} size="md" />
        </Example>
        <SwapSlot id="avatar" skeleton={<AvatarSkeleton size="lg" />} loaded={<Avatar name="Avery Quinn" src={PORTRAITS[1]} size="lg" />} />
      </Specimen>

      <Specimen title="Over imagery" description="Initials use opaque palette colours; portrait groups keep a surface ring over imagery." backdrop>
        <Example label="Initials without an image">
          <Avatar name="Avery Quinn" size="xl" presence="online" />
        </Example>
        <Example label="Profile images">
          <AvatarGroup people={PEOPLE} max={4} size="md" />
        </Example>
      </Specimen>

      <ContainerLab description="Avatars keep their size; a group never wraps.">
        {() => (
          <div className="flex items-center gap-3 p-2">
            <Avatar name="Avery Quinn" src={PORTRAITS[1]} presence="online" />
            <AvatarGroup people={PEOPLE} max={4} />
          </div>
        )}
      </ContainerLab>

      <Usage
        code={`
import { EditableAvatar } from "glass-ux/avatar"

<EditableAvatar
  name={user.name}
  src={user.photoUrl}
  requirements={{ maxSize: 5 * 1024 * 1024, minWidth: 256, minHeight: 256 }}
  onSave={async ({ blob }, { signal, setProgress }) => {
    const { url } = await uploadPhoto(blob, { signal, onProgress: setProgress })
    setUser({ ...user, photoUrl: url })
  }}
  onRemove={() => removePhoto()}
/>`}
      />

      <Rules
        do={[
          "Pass the person's display name; initials, tint and the accessible name follow.",
          "Let people change their own photo where they see it, with EditableAvatar.",
          "Throw an Error with a message written for the person when a save fails.",
          "Mark an avatar decorative when the name is printed beside it.",
          "Use presence only where it is live (chat, sessions).",
        ]}
        dont={[
          "Pick a tint by hand or use a status colour for a person.",
          "Use an avatar for an endpoint or organisation; those have icons.",
          "Show more than five faces in a group.",
          "Make avatars editable in lists and tables; edit from the profile.",
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
