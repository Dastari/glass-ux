import { useState } from "react"
import { Button } from "../../ui/button/index.js"
import { Image } from "../../ui/image/index.js"
import { Lightbox, type LightboxImage } from "../../ui/lightbox/index.js"
import { Masonry } from "../../ui/masonry/index.js"
import { Surface } from "../../ui/surface/index.js"
import { SCENE_IMAGES } from "../fixtures/scenes.js"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Usage } from "./inputs.kit.js"

const SCENES = ["harbour", "dunes", "ridge", "dusk"] as const
const RATIOS = [1, 1.5, 0.75, 2, 1.25, 0.6, 1.5, 0.8, 1, 1.78, 0.67, 1.33]

interface Photo extends LightboxImage {
  ratio: number
}

/** A fixed, fictional set: the four sample scenes in turn, each cropped to its own shape. */
const photo = (index: number): Photo => {
  const scene = SCENES[index % SCENES.length]!
  return { id: `photo-${index + 1}`, src: SCENE_IMAGES[scene], alt: `Sample ${scene} view, number ${index + 1}`, caption: `View ${index + 1}`, width: 1600, height: 1200, ratio: RATIOS[index % RATIOS.length]! }
}
const PHOTOS = Array.from({ length: 30 }, (_, index) => photo(index))

const NOTES = [
  "Booked for the quarterly review on the 14th.",
  "Two rooms free in the afternoon. Catering can be added up to a day before, and numbers can change until noon the day before the event.",
  "Open from seven.",
  "The loading dock is behind the east entrance. Deliveries are accepted between nine and three, and a booking is needed for anything over two pallets.",
  "Parking is limited to twelve spaces.",
  "Cancellations are free until seven days before the date.",
  "Accessible entrance on the north side.",
  "Projector and two screens available.",
]

function Photographs({ initial = 18, adding = true, testId = "masonry-photos", ...rest }: { initial?: number; adding?: boolean; testId?: string; dir?: "rtl" }) {
  const [count, setCount] = useState(initial)
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const shown = PHOTOS.slice(0, count)
  return (
    <div className="flex w-full flex-col gap-3" data-testid={testId} {...rest}>
      {adding ? (
        <div>
          <Button size="sm" disabledReason={count >= PHOTOS.length ? "All photographs are shown" : undefined} onClick={() => setCount((current) => Math.min(PHOTOS.length, current + 6))}>
            Add 6 photographs
          </Button>
        </div>
      ) : null}
      <Masonry
        aria-label="Photographs"
        items={shown}
        getKey={(item) => item.id ?? item.src}
        getRatio={(item) => item.ratio}
        columnWidth="sm"
        renderItem={(item, position) => (
          <button
            type="button"
            className="fa-pressable block h-full w-full rounded-[var(--radius-media)]"
            aria-label={`Open ${item.caption}`}
            onClick={() => {
              setIndex(position)
              setOpen(true)
            }}
          >
            <Image src={item.src} alt="" ratio={item.ratio} hover="zoom" />
          </button>
        )}
      />
      <Lightbox images={shown} index={index} onIndexChange={setIndex} open={open} onOpenChange={setOpen} />
    </div>
  )
}

export default function MasonrySection() {
  return (
    <SectionPage>
      <Specimen title="Photographs" description="Each photograph's shape is known, so its box is reserved before it loads. Tab follows the way the grid reads, and a photograph opens in the Lightbox.">
        <Photographs />
      </Specimen>

      <Specimen title="Measured items" description="Items without a ratio are measured once they render; later items in their column move when the height settles.">
        <div className="w-full" data-testid="masonry-notes">
          <Masonry
            aria-label="Notes"
            items={NOTES}
            getKey={(note) => note}
            columnWidth="xs"
            renderItem={(note) => (
              <Surface material="card" radius="tile" padding="tile">
                <p className="type-body">{note}</p>
              </Surface>
            )}
          />
        </div>
      </Specimen>

      <Specimen title="Right to left" description="The first column is at the right and the order of reading follows it.">
        <Photographs initial={9} adding={false} testId="masonry-rtl" dir="rtl" />
      </Specimen>

      <ContainerLab>
        <div className="h-full overflow-auto p-2">
          <Masonry
            aria-label="Photographs"
            items={PHOTOS.slice(0, 12)}
            getKey={(item) => item.id ?? item.src}
            getRatio={(item) => item.ratio}
            columnWidth="xs"
            renderItem={(item) => <Image src={item.src} alt="" ratio={item.ratio} />}
          />
        </div>
      </ContainerLab>

      <Usage
        description="Give each item its shape, and every box is reserved before anything loads."
        code={`
import { Masonry } from "glass-ux/masonry"

<Masonry
  aria-label="Photographs"
  items={photos}
  getKey={(photo) => photo.id}
  getRatio={(photo) => photo.width / photo.height}
  columnWidth="sm"
  renderItem={(photo) => <Image src={photo.src} alt={photo.alt} ratio={photo.width / photo.height} />}
/>

// To render only what is near the viewport, place the items yourself:
const { placements, height } = layoutMasonry(photos.length, { width, gap, minColumnWidth }, (index, columnWidth) => columnWidth / ratios[index])`}
      />

      <Rules
        do={["Pass a ratio for every item that has one: pictures, video, fixed-height cards.", "Name the list, and put a button or link inside each item, not on the list item itself.", "Load a long list in pages and append; earlier items never move."]}
        dont={["Rely on CSS `columns` for a gallery: it fills a column at a time and sends Tab down one column before the next.", "Put thousands of items in one Masonry; it renders them all."]}
      />

      <TokenTable
        tokens={[
          ["--gap-tiles", "Default gap"],
          ["--space-3", "Default gap through --gap-tiles"],
          ["--radius-media", "Picture corners"],
        ]}
      />
    </SectionPage>
  )
}
