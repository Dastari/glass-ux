import { useState } from "react"
import { IconDownload } from "../../icons/generated/icons.js"
import { ButtonLink } from "../../ui/button-link/index.js"
import { Image } from "../../ui/image/index.js"
import { Grid } from "../../ui/layout/index.js"
import { Lightbox, type LightboxImage } from "../../ui/lightbox/index.js"
import { SCENE_IMAGES } from "../fixtures/scenes.js"
import { Rules, SectionPage, Specimen } from "../kit.js"

const PHOTOS: LightboxImage[] = Object.entries(SCENE_IMAGES).map(([name, src]) => ({
  id: name,
  src,
  alt: `Sample landscape: ${name}`,
  caption: `${name[0]!.toUpperCase()}${name.slice(1)} at dusk`,
  width: 1600,
  height: 1000,
}))

export default function LightboxSection() {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  return (
    <SectionPage>
      <Specimen title="Gallery" description="Choose a picture to open it. ← → or a swipe move between pictures; + − zoom, and a zoomed picture pans by dragging." layout="stack" wide>
        <Grid columns={{ min: "10rem" }}> {/* tokens:allow a thumbnail width */}
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
          actions={(image) => (
            <ButtonLink variant="ghost" size="sm" icon={<IconDownload />} href={image.src} download={`${image.id}.svg`}>
              Download
            </ButtonLink>
          )}
        />
      </Specimen>
      <Rules
        do={["Give each picture alt text and, where it helps, a caption.", "Pass width and height so the subtitle states the size."]}
        dont={["Don't open a lightbox for a picture that is already shown at full size."]}
      />
    </SectionPage>
  )
}
