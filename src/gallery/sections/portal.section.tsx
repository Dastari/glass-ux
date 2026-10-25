import { useRef, useState } from "react";
import { Button } from "../../ui/button/index.js";
import { Portal } from "../../ui/portal/index.js";
import { SectionPage, Specimen } from "../kit.js";

export default function PortalSection() {
  const target = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  return (
    <SectionPage>
      <Specimen
        layout="stack"
        title="Container destination"
        description="The button renders into the destination while retaining its React state and context."
      >
        <div
          ref={target}
          className="flex min-h-12 items-center"
          data-testid="portal-target"
        />
        <Portal container={target}>
          <Button onClick={() => setCount((value) => value + 1)}>
            Count {count}
          </Button>
        </Portal>
      </Specimen>
    </SectionPage>
  );
}
