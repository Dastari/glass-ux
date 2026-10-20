import {
  IconEndpoint,
  IconMoreHorizontal,
  IconSettings,
} from "../../icons/generated/icons.js";
import { useAppearance } from "../../lib/appearance/index.js";
import { Button } from "../../ui/button/index.js";
import { Skeleton } from "../../ui/skeleton/index.js";
import { Slider } from "../../ui/slider/index.js";
import { Panel, PanelBody, PanelHeader } from "../../ui/surface/index.js";
import { SectionPage, Specimen } from "../kit.js";

interface KnobProps {
  label: string;
  token: string;
  value: number;
  /** Lower allowed value. */
  min: number;
  /** Upper value or visible-item limit, as specified by the type. */
  max: number;
  /** Increment used by keyboard and stepper interaction. */
  step: number;
  /** Unit displayed with a numeric value. */
  unit?: string;
  /** Called with the new value, in the knob's unit, as the person drags or steps the slider. */
  onChange: (value: number) => void;
}

function Knob({
  label,
  token,
  value,
  min,
  max,
  step,
  unit = "",
  onChange,
}: KnobProps) {
  return (
    <label className="knob">
      <span className="flex items-baseline justify-between gap-3">
        <span className="fa-label">{label}</span>
        <span className="type-caption text-fg-muted" data-numeric>
          {value}
          {unit}
        </span>
      </span>
      <Slider
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={(value) => onChange(Number(value))}
      />
      <code className="type-caption text-fg-subtle">{token}</code>
    </label>
  );
}

export default function KnobsSection() {
  const { appearance, update, reset } = useAppearance();
  return (
    <SectionPage>
      <Specimen
        title="Knobs"
        description="These change the tokens on the root, so every component on every screen follows. Saved per user on this device."
        layout="stack"
      >
        <div className="knobs">
          <Knob
            label="Corner radius"
            token="--radius-scale"
            value={appearance.radiusScale}
            min={0}
            max={1.5}
            step={0.05}
            unit="×"
            onChange={(radiusScale) => update({ radiusScale })}
          />
          <Knob
            label="Hairline"
            token="--border-width"
            value={appearance.borderWidth}
            min={0.5}
            max={2}
            step={0.25}
            unit="px"
            onChange={(borderWidth) => update({ borderWidth })}
          />
          <Knob
            label="Interface scale"
            token="--ui-scale"
            value={appearance.uiScale}
            min={0.875}
            max={1.25}
            step={0.025}
            unit="×"
            onChange={(uiScale) => update({ uiScale })}
          />
        </div>
        <div>
          <Button variant="ghost" size="sm" onClick={reset}>
            Reset all appearance
          </Button>
        </div>
      </Specimen>

      <Panel>
        <PanelHeader
          icon={<IconEndpoint />}
          title="NST-C106"
          description="HP EliteOne 1000 G2 · AzureAD\MiraRowan"
          actions={
            <>
              <Button
                variant="ghost"
                icon={<IconMoreHorizontal />}
                aria-label="More actions"
              />
              <Button icon={<IconSettings />}>Settings</Button>
              <Button variant="primary" icon={<IconEndpoint />}>
                Connect
              </Button>
            </>
          }
        />
        <PanelBody>
          <div className="knobs-preview">
            {[0, 1, 2].map((index) => (
              <div key={index} className="glass-control knobs-tile">
                <Skeleton.Block
                  width="var(--tile-icon-box)"
                  height="var(--tile-icon-box)"
                  radius="control"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <Skeleton.Text type="caption" width="50%" />
                  <Skeleton.Text type="label" width="80%" />
                </span>
              </div>
            ))}
          </div>
        </PanelBody>
      </Panel>
    </SectionPage>
  );
}
