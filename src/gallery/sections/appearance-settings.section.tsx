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
        description='The same rows anywhere there is room. Pick the groups an application offers; style, shape and fonts are opt-in. In Flat, the rows Flat overrides say "Not used in Flat", or flat="hide" leaves them out.'
        layout="stack"
      >
        <div className="max-w-3xl" data-testid="appearance-page">
          <AppearanceSettings sections={["style", "theme", "colours", "background", "display", "size"]} reset={false} />
        </div>
      </Specimen>

      <Rules
        do={[
          "Lock what the organisation decides with configureAppearance({ locked }); those rows show as set by your organisation.",
          "Register product palettes and backgrounds first (definePalette, defineBackground) so the panel lists them.",
          "Set the site-wide blur in configureAppearance({ defaults: { glassRendering } }); offer the style group to let people change it, or lock it.",
        ]}
        dont={[
          "Don't build a second appearance menu beside this one; one place keeps preferences consistent.",
          "Don't hide the Animation row: Still is an accessibility setting. Flat is always still, so flat=\"hide\" may leave it out there.",
        ]}
      />
    </SectionPage>
  )
}
