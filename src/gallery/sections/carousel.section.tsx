import { useState } from "react"
import { Button } from "../../ui/button/index.js"
import { Carousel } from "../../ui/carousel/index.js"
import { Image } from "../../ui/image/index.js"
import { Surface } from "../../ui/surface/index.js"
import { SCENE_IMAGES } from "../fixtures/scenes.js"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Usage } from "./inputs.kit.js"

const SCENES = [
  { id: "harbour", name: "Harbour", alt: "Fictional harbour in daylight" },
  { id: "dunes", name: "Dunes", alt: "Fictional dunes in warm light" },
  { id: "ridge", name: "Ridge", alt: "Fictional ridge in morning mist" },
  { id: "dusk", name: "Dusk", alt: "Fictional hills at dusk" },
] as const

const pictures = SCENES.map((scene) => <Image key={scene.id} src={SCENE_IMAGES[scene.id]} alt={scene.alt} ratio="wide" radius="media" />)
const names = SCENES.map((scene) => scene.name)

function Controlled() {
  const [index, setIndex] = useState(1)
  return (
    <div className="flex w-full flex-col gap-2" data-testid="carousel-images">
      <Carousel aria-label="Sample landscapes" index={index} onIndexChange={setIndex} slideNames={names} ratio={16 / 9}>
        {pictures}
      </Carousel>
      <output className="type-caption text-fg-muted" data-numeric data-testid="carousel-value">{`Slide ${index + 1}`}</output>
    </div>
  )
}

const note = (title: string, body: string, action: string) => (
  <Surface material="card" radius="tile" padding="tile" className="flex h-full flex-col items-start gap-2">
    <h3 className="type-label">{title}</h3>
    <p className="type-body text-fg-muted">{body}</p>
    <Button size="sm">{action}</Button>
  </Surface>
)

export default function CarouselSection() {
  return (
    <SectionPage>
      <Specimen title="Pictures" description="Swipe, use the buttons or indicators, or focus an indicator and use the arrow keys. The height is fixed by `ratio`.">
        <Controlled />
      </Specimen>

      <Specimen title="Mixed content" description="Without `ratio` the tallest slide sets the height for every slide. Controls in slides you cannot see are not reachable.">
        <div className="w-full" data-testid="carousel-cards">
          <Carousel aria-label="Notes">
            {note("Cedar Hall", "Booked for the quarterly review on the 14th. Seating is for forty.", "Open booking")}
            {note("Stonebridge Rooms", "Two rooms free in the afternoon. Catering can be added up to a day before, and changes to numbers are accepted until noon the day before the event.", "Add catering")}
            {note("Harbour Cafe", "Open from seven.", "See menu")}
          </Carousel>
        </div>
      </Specimen>

      <Specimen title="Automatic advance" description="It starts paused here. Running, it holds while the pointer is over it, focus is inside it or the page is hidden, and the button stops it.">
        <div className="w-full" data-testid="carousel-auto">
          <Carousel aria-label="Sample landscapes, automatic" autoplay={4000} defaultPlaying={false} loop slideNames={names} ratio={16 / 9}>
            {pictures}
          </Carousel>
        </div>
      </Specimen>

      <Specimen title="Right to left" description="The strip starts at the right and the buttons keep their meaning.">
        <div dir="rtl" className="w-full" data-testid="carousel-rtl">
          <Carousel aria-label="Sample landscapes, right to left" slideNames={names} ratio={16 / 9}>
            {pictures}
          </Carousel>
        </div>
      </Specimen>

      <Specimen title="Many slides" description="Indicators show while one 24px target each fits; the slide count takes over when they do not.">
        <div className="w-full max-w-xs" data-testid="carousel-narrow">
          <Carousel aria-label="Numbered slides" ratio={2}>
            {Array.from({ length: 12 }, (_, position) => (
              <Surface key={position} material="card" radius="tile" padding="tile" className="flex h-full items-center justify-center">
                <span className="type-title" data-numeric>{`Panel ${position + 1}`}</span>
              </Surface>
            ))}
          </Carousel>
        </div>
      </Specimen>

      <ContainerLab>
        <div className="flex h-full items-center p-1">
          <Carousel aria-label="Sample landscapes" ratio={16 / 9} className="w-full">
            {pictures}
          </Carousel>
        </div>
      </ContainerLab>

      <Usage
        description="Each child is one slide."
        code={`
import { Carousel } from "glass-ux/carousel"

<Carousel aria-label="Harbour photographs" ratio={16 / 9} slideNames={["Dusk", "Dawn"]} onIndexChange={save}>
  <Image src={dusk} alt="Harbour at dusk" ratio="wide" />
  <Image src={dawn} alt="Harbour at dawn" ratio="wide" />
</Carousel>

// Automatic advance: the Pause button, hold on hover, focus and a hidden page, and no start under reduced motion.
<Carousel aria-label="Notices" autoplay={6000}>{slides}</Carousel>`}
      />

      <Rules
        do={["Give the carousel a name, and the slides names for the indicators.", "Fix the shape with `ratio` when slides load pictures, so nothing moves as they arrive.", "Keep autoplay off unless the content must rotate; leave at least five seconds on each slide."]}
        dont={["Put the only route to important content in a slide that may not be seen.", "Use it for a row of cards that people compare side by side."]}
      />

      <TokenTable
        tokens={[
          ["--target-aa", "Indicator target"],
          ["--accent-text", "Current indicator"],
          ["--fg-subtle", "Other indicators"],
          ["--radius-media", "Strip corners"],
        ]}
      />
    </SectionPage>
  )
}
