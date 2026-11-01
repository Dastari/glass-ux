import { useState } from "react"
import { IconDownload } from "../../icons/generated/icons.js"
import { ButtonLink } from "../../ui/button-link/index.js"
import { FactList } from "../../ui/fact-list/index.js"
import { Image } from "../../ui/image/index.js"
import { Grid } from "../../ui/layout/index.js"
import { ImageViewer, Lightbox, type LightboxImage } from "../../ui/lightbox/index.js"
import { SCENE_IMAGES } from "../fixtures/scenes.js"
import { Rules, SectionPage, Specimen } from "../kit.js"

const PHOTOS: LightboxImage[] = Object.entries(SCENE_IMAGES).map(([name, src]) => ({
  id: name,
  src,
  alt: `Sample landscape: ${name}`,
  caption: `${name[0]!.toUpperCase()}${name.slice(1)} at dusk`,
  width: 1600,
  height: 1200,
}))

/** A long set: the same four scenes under their own keys, to show the strip's behaviour. */
const LONG_SET: LightboxImage[] = Array.from({ length: 240 }, (_, position) => {
  const photo = PHOTOS[position % PHOTOS.length]!
  return { ...photo, id: `frame-${position + 1}`, alt: `Sample frame ${position + 1}`, caption: `Frame ${position + 1}` }
})

const FIRST = PHOTOS[0]!
const STATES: LightboxImage[] = [
  { ...FIRST, id: "failed", src: "data:image/png;base64,AAAA", alt: "Sample landscape that failed to load", caption: "Failed" },
  { ...FIRST, id: "held", pending: true, alt: "Sample landscape not ready yet", caption: "Skeleton" },
  { ...FIRST, id: "soft", pending: true, alt: "Sample landscape with a placeholder", placeholder: PHOTOS[1]!.src, caption: "Placeholder" },
]

function pictureDetails(image: LightboxImage) {
  return (
    <FactList
      facts={[
        { label: "File", value: `${image.id}.svg` },
        { label: "Size", value: `${image.width} × ${image.height}` },
        { label: "Location", value: "Sample Bay" },
      ]}
    />
  )
}

export default function LightboxSection() {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  return (
    <SectionPage>
      <Specimen title="Gallery" description="Wheel or pinch to zoom, double press for actual size, R to rotate, F for full screen, ← → or a swipe to move." layout="stack" wide>
        <Grid columns={{ min: "sm" }}>
          {PHOTOS.map((photo, photoIndex) => (
            <button
              key={photo.id}
              type="button"
              className="fa-pressable rounded-[var(--radius-media)]"
              aria-label={`Open ${photo.alt}`}
              onClick={() => {
                setIndex(photoIndex)
                setOpen(true)
              }}
            >
              <Image src={photo.src} alt="" ratio="landscape" hover="zoom" />
            </button>
          ))}
        </Grid>
        <Lightbox
          images={PHOTOS}
          index={index}
          onIndexChange={setIndex}
          open={open}
          onOpenChange={setOpen}
          renderInfo={pictureDetails}
          actions={(image) => (
            <ButtonLink variant="ghost" size="sm" icon={<IconDownload />} href={image.src} download={`${image.id}.svg`}>
              Download
            </ButtonLink>
          )}
        />
      </Specimen>
      <Specimen title="In the page" description="ImageViewer is the same viewer without the dialog. Its keys work while focus is inside it." layout="stack" wide>
        <div className="h-136">
          <ImageViewer images={PHOTOS} renderInfo={pictureDetails} defaultInfoOpen aria-label="Sample landscapes" />
        </div>
      </Specimen>
      <Specimen title="Loading and failure" description="Each state holds the picture's shape and leaves the tools where they are." layout="stack" wide>
        <Grid columns={{ min: "md" }}>
          {STATES.map((state) => (
            <div key={state.id} className="h-96">
              <ImageViewer images={[state]} tools={[]} aria-label={`${state.caption} state`} />
            </div>
          ))}
        </Grid>
      </Specimen>
      <Specimen title="Other content" description="An item's content replaces the picture in the stage. The zoom and view tools are then unavailable." layout="stack" wide>
        <div className="h-120">
          <ImageViewer
            aria-label="Mixed items"
            images={[
              { ...FIRST, id: "summary", alt: "Survey summary", caption: "Survey summary", content: <FactList facts={[{ label: "Sites", value: "12" }, { label: "Month", value: "March" }]} /> },
              ...PHOTOS.slice(1, 3),
            ]}
          />
        </div>
      </Specimen>
      <Specimen title="A long set" description="240 pictures. Only the thumbnails near the strip's view load, and the current one stays in view." layout="stack" wide>
        <div className="h-128">
          <ImageViewer images={LONG_SET} defaultIndex={120} aria-label="Long set of frames" />
        </div>
      </Specimen>
      <Rules
        do={["Give each picture alt text and, where it helps, a caption.", "Pass width and height so the subtitle states the size and the shape is reserved."]}
        dont={["Don't open a lightbox for a picture that is already shown at full size."]}
      />
    </SectionPage>
  )
}
