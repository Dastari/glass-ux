import { ContainerLab, Example, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { StatusBadge } from "../../ui/badge/index.js"
import { ScrollArea } from "../../ui/scroll-area/index.js"
import { ENDPOINTS, manyEndpoints } from "./nav.fixtures.js"

const LIST = manyEndpoints(40)

function EndpointList() {
  return (
    <ul className="flex flex-col p-1">
      {LIST.map((endpoint) => (
        <li key={endpoint.id} className="fa-item">
          <span className="fa-item-label tabular-nums">{endpoint.name}</span>
          <span className="fa-item-trail min-w-0 truncate">{endpoint.user}</span>
        </li>
      ))}
    </ul>
  )
}

export default function ScrollAreaSection() {
  return (
    <SectionPage>
      <Specimen title="Edges" description="Scrollbars appear while you hover or scroll. The hairline appears only at an edge with content beyond it (R5.8); fade masks it softly instead.">
        <Example label="Hairline">
          <div className="glass-inset h-72 w-80 rounded-tile">
            <ScrollArea aria-label="Endpoints, hairline edges">
              <EndpointList />
            </ScrollArea>
          </div>
        </Example>
        <Example label="Fade">
          <div className="glass-inset h-72 w-80 rounded-tile">
            <ScrollArea edges="fade" aria-label="Endpoints, faded edges">
              <EndpointList />
            </ScrollArea>
          </div>
        </Example>
      </Specimen>

      <Specimen title="Horizontal" description="A strip that scrolls sideways fades at the edge it continues past.">
        <div className="h-12 w-110 max-w-full">
          <ScrollArea orientation="horizontal" edges="fade" aria-label="Endpoint states">
            <div className="flex h-12 items-center gap-2 px-1">
              {ENDPOINTS.map((endpoint) => (
                <StatusBadge key={endpoint.id} status={endpoint.status}>
                  {endpoint.name}
                </StatusBadge>
              ))}
            </div>
          </ScrollArea>
        </div>
      </Specimen>

      <ContainerLab description="It fills the box and scrolls inside it at every size.">
        {() => (
          <ScrollArea aria-label="Endpoints in a lab frame">
            <EndpointList />
          </ScrollArea>
        )}
      </ContainerLab>

      <Rules
        do={[
          "Give the parent a height; the area fills it and scrolls inside (R5.1).",
          "Use hairline edges under headers and above footers, fade for strips and previews.",
          "Name a scroll area that holds more than a list so keyboard users can find it.",
        ]}
        dont={[
          "Scroll the page; the shell owns the viewport.",
          "Draw a permanent border where a scrolled edge hairline belongs.",
          "Nest scroll areas on the same axis.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--line-strong", "Thumb"],
          ["--fg-subtle", "Thumb on hover"],
          ["--line", "Edge hairline"],
          ["--space-6", "Fade length"],
          ["--duration-base", "Show and hide"],
        ]}
      />
    </SectionPage>
  )
}
