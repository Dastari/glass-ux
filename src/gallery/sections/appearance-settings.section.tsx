import { IconPalette, IconSettings } from "../../icons/generated/icons.js"
import { AppearanceSettings } from "../../ui/appearance-settings/index.js"
import { Button } from "../../ui/button/index.js"
import { Dialog, SettingsDialog } from "../../ui/dialog/index.js"
import { Rules, SectionPage, Specimen } from "../kit.js"

export default function AppearanceSettingsSection() {
  return (
    <SectionPage>
      <Specimen
        title="In a settings dialog"
        description="The usual home: one section of the application's settings. Changes apply at once and are remembered for this person."
        layout="stack"
      >
        <div>
          <SettingsDialog
            trigger={<Button icon={<IconSettings />}>Settings</Button>}
            icon={<IconSettings />}
            title="Settings"
            subtitle="Northstar Studio"
            sections={[
              { value: "appearance", label: "Appearance", icon: <IconPalette />, content: <AppearanceSettings /> },
              {
                value: "shape",
                label: "Shape and fonts",
                icon: <IconSettings />,
                content: <AppearanceSettings sections={["shape", "fonts"]} reset={false} />,
              },
            ]}
            footer={<Dialog.Close render={<Button>Done</Button>} />}
          />
        </div>
      </Specimen>

      <Specimen
        title="On a page"
        description="The same rows anywhere there is room. Pick the groups an application offers; shape and fonts are opt-in."
        layout="stack"
      >
        <div className="max-w-3xl">
          <AppearanceSettings sections={["theme", "colours", "background"]} reset={false} />
        </div>
      </Specimen>

      <Rules
        do={[
          "Lock what the organisation decides with configureAppearance({ locked }); those rows show as set by your organisation.",
          "Register product palettes and backgrounds first (definePalette, defineBackground) so the panel lists them.",
          "Keep the application's own rendering choice (live or baked blur) out of personal settings.",
        ]}
        dont={[
          "Don't build a second appearance menu beside this one; one place keeps preferences consistent.",
          "Don't hide the Animation row: Still is an accessibility setting.",
        ]}
      />
    </SectionPage>
  )
}
