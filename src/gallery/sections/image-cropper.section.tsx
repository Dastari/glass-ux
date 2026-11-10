import { useState } from "react"
import { z } from "zod"
import { Button } from "../../ui/button/index.js"
import { Field } from "../../ui/field/index.js"
import { Form, FormActions, FormStack, formBehaviour, useAppForm } from "../../ui/form/index.js"
import {
  ImageCropDialog,
  ImageCropper,
  ImageInput,
  imageSchema,
  type ImageChange,
  type ImageCropAspect,
  type ImageCropRect,
  type ImageFieldValue,
  type ImageSaveContext,
} from "../../ui/image-cropper/index.js"
import { SCENE_IMAGES, WIDE_MARK } from "../fixtures/scenes.js"
import { ContainerLab, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { wait } from "./forms.fixtures.js"
import { Usage } from "./inputs.kit.js"

const SCENE = SCENE_IMAGES.harbour
const SCENE_SIZE = { width: 1600, height: 1200 }
const ASPECTS = [
  { value: "free", label: "Free" },
  { value: 1, label: "Square" },
  { value: 16 / 9, label: "16:9" },
  { value: 3 / 4, label: "3:4" },
] as const

function Report({ crop }: { crop: ImageCropRect | null }) {
  return (
    <output className="type-caption text-fg-muted" data-numeric data-testid="crop-report">
      {crop ? `${crop.width} × ${crop.height} at ${crop.x}, ${crop.y}` : "No crop"}
    </output>
  )
}

function LockedDemo() {
  const [crop, setCrop] = useState<ImageCropRect | null>(null)
  return (
    <div className="flex w-full flex-col items-center gap-2" data-testid="crop-locked">
      <ImageCropper className="w-full" src={SCENE} image={SCENE_SIZE} aspect={16 / 9} defaultValue={{ x: 320, y: 330, width: 960, height: 540 }} onValueChange={setCrop} minWidth={320} />
      <Report crop={crop} />
    </div>
  )
}

function FreeDemo() {
  const [crop, setCrop] = useState<ImageCropRect | null>(null)
  const [aspect, setAspect] = useState<ImageCropAspect>("free")
  return (
    <div className="flex w-full flex-col items-center gap-2" data-testid="crop-free">
      <ImageCropper
        className="w-full"
        src={SCENE}
        image={SCENE_SIZE}
        aspect={aspect}
        onAspectChange={setAspect}
        aspects={ASPECTS}
        defaultValue={{ x: 400, y: 300, width: 800, height: 600 }}
        onValueChange={setCrop}
        minWidth={120}
        minHeight={120}
      />
      <Report crop={crop} />
    </div>
  )
}

/** A stand-in upload that reports progress in ten steps. */
async function upload(_change: ImageChange, { signal, setProgress }: ImageSaveContext) {
  for (let step = 1; step <= 10 && !signal.aborted; step++) {
    await wait(80)
    setProgress(step / 10)
  }
}

function DialogDemo() {
  const [saved, setSaved] = useState("Nothing saved")
  return (
    <div className="flex flex-col items-start gap-2">
      <ImageCropDialog
        trigger={<Button>Change banner</Button>}
        title="Change banner"
        aspect={3}
        fields={false}
        output={{ width: 1500, type: "image/jpeg" }}
        requirements={{ maxSize: 5 * 1024 * 1024, minWidth: 600, minHeight: 200 }}
        onSave={async (change, context) => {
          await upload(change, context)
          setSaved(`${change.width} × ${change.height}, ${change.type}`)
        }}
      />
      <output className="type-caption text-fg-muted" data-numeric>
        {saved}
      </output>
    </div>
  )
}

function FormDemo() {
  const [edits, setEdits] = useState(0)
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { cover: null as ImageFieldValue },
    validators: { onDynamic: z.object({ cover: imageSchema({ required: true }) }) },
    onSubmit: () => wait(600),
  })
  return (
    <Form form={form} aria-label="Album" className="w-full" data-testid="image-form">
      <FormStack>
        <form.AppField name="cover">{(field) => <field.ImageField label="Cover" required aspect={1} onEdit={() => setEdits((count) => count + 1)} />}</form.AppField>
        <output className="type-caption text-fg-muted" data-numeric>{`Host editor opened ${edits} times`}</output>
        <FormActions>
          <form.SubmitButton>Save album</form.SubmitButton>
        </FormActions>
      </FormStack>
    </Form>
  )
}

export default function ImageCropperSection() {
  return (
    <SectionPage>
      <Specimen title="Locked aspect" description="The image moves under a frame of one shape: drag, pinch, wheel or the arrow keys, and the slider zooms. The crop is reported in source pixels once a gesture ends.">
        <LockedDemo />
      </Specimen>

      <Specimen title="Free and preset shapes" description="Free shows the whole image with a box to move and resize. The host supplies the presets. The number fields are the way to place the crop without dragging.">
        <FreeDemo />
      </Specimen>

      <Specimen title="Round" description="A round crop is still a rectangle of the image; the corners are dimmed.">
        <ImageCropper className="w-full" src={SCENE} image={SCENE_SIZE} aspect={1} shape="round" fields={false} />
      </Specimen>

      <Specimen title="Dialog" description="Picks, checks and crops a file, then hands the result to onSave with signal and setProgress. The application uploads it.">
        <DialogDemo />
      </Specimen>

      <Specimen title="In a form" description="ImageField holds a URL, a new crop or null. onEdit opens the host's own editor, and the field does not know what that is.">
        <FormDemo />
      </Specimen>

      <Specimen title="States" layout="grid">
        <FormStack>
          <Field label="Empty" nativeLabel={false}>
            <ImageInput aspect={16 / 9} />
          </Field>
          <Field label="Chosen" nativeLabel={false}>
            <ImageInput aspect={16 / 9} defaultValue={SCENE} alt="Fictional harbour" />
          </Field>
          <Field label="Missing" nativeLabel={false} error="Add an image">
            <ImageInput aspect={16 / 9} invalid />
          </Field>
          <Field label="A wide logo, free aspect" nativeLabel={false}>
            <div data-testid="image-input-wide">
              <ImageInput defaultValue={WIDE_MARK} alt="Fictional wordmark" />
            </div>
          </Field>
        </FormStack>
        <FormStack>
          <Field label="Read-only" nativeLabel={false}>
            <ImageInput aspect={1} defaultValue={SCENE} readOnly alt="Fictional harbour" />
          </Field>
          <Field label="Disabled" nativeLabel={false}>
            <ImageInput aspect={1} shape="round" defaultValue={SCENE} disabled alt="Fictional harbour" />
          </Field>
          <ImageCropper aspect={16 / 9} fields={false} disabled />
        </FormStack>
      </Specimen>

      <ContainerLab>
        <div className="h-full overflow-auto p-1">
          <ImageCropper src={SCENE} image={SCENE_SIZE} aspect="free" />
        </div>
      </ContainerLab>

      <Usage
        code={`
import { cropToBlob, ImageCropper, imageSchema } from "glass-ux/image-cropper"

// A bare cropper: the host keeps the file and encodes when it wants to.
<ImageCropper src={url} aspect={16 / 9} onValueChange={setCrop} />
const blob = await cropToBlob(file, crop, { width: 1600, type: "image/jpeg" })

// A form value: upload a new crop on submit, or pass onSave to upload as the dialog closes.
const schema = z.object({ cover: imageSchema({ required: true }) })
<form.AppField name="cover">
  {(field) => <field.ImageField label="Cover" aspect={1} onEdit={(value) => openEditor(value)} />}
</form.AppField>`}
      />

      <Rules
        do={[
          "Offer presets that match where the image will show.",
          "Pass minWidth and minHeight, so a crop always has enough source pixels.",
          "Keep the number fields unless another single-pointer way to place the crop is on screen.",
        ]}
        dont={["Upload from the library: onSave and the form's submit are the application's.", "Rely on the crop preview for a round picture's final shape; style the saved image round."]}
      />

      <TokenTable
        tokens={[
          ["--fill-muted", "Frame and empty tile"],
          ["--line-strong", "Crop edge and handles"],
          ["--surface-3", "Shade outside the crop"],
          ["--image-cropper-frame", "The frame's largest side"],
        ]}
      />
    </SectionPage>
  )
}
