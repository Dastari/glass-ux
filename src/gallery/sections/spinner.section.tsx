import { Spinner } from "../../ui/spinner/index.js";
import { SectionPage, Specimen } from "../kit.js";

export default function SpinnerSection() {
  return (
    <SectionPage>
      <Specimen title="Sizes and tones">
        <div
          className="flex flex-wrap items-center gap-4"
          data-testid="spinner-sizes"
        >
          <Spinner size="xs" label="Loading records" />
          <Spinner size="sm" tone="muted" label="Loading details" />
          <Spinner size="md" tone="accent" />
          <Spinner size="lg" label="" />
          <Spinner size="xl" label="" />
          <Spinner size="2xl" label="" />
        </div>
      </Specimen>
    </SectionPage>
  );
}
