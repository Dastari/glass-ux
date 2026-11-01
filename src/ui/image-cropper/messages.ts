import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for ImageCropper, ImageCropDialog and ImageField. */
export const imageCropperMessages = defineMessages("imageCropper", {
  cropRole: "image crop",
  cropLabel: "Crop area",
  cropInstructions: "Drag, or use the arrow keys, to move the image. Plus and minus zoom; 0 fits the whole image.",
  freeInstructions: "Drag the box or its handles. The arrow keys move the box; Alt with an arrow key resizes it; 0 selects the whole image.",
  zoom: "Zoom",
  aspect: "Aspect ratio",
  free: "Free",
  left: "Left",
  top: "Top",
  width: "Width",
  height: "Height",
  changeImage: "Change image",
  chooseImage: "Choose an image",
  dropImage: "Drop to use this image",
  chooseImageFirst: "Choose an image first",
  save: "Save",
  saving: "Saving…",
  saved: "Saved",
  notSaved: "Not saved",
  cancel: "Cancel",
  removeImage: "Remove image",
  removing: "Removing…",
  savingImage: "Saving image",
  saveFailed: "The image could not be saved.",
  removeFailed: "The image could not be removed.",
  anyImage: "any image",
  notSupported: (name: string, formats: string) => `${name} is not a supported image. Use ${formats}.`,
  tooLarge: (name: string, size: string) => `${name} is larger than ${size}.`,
  unreadable: (name: string) => `${name} could not be opened as an image.`,
  tooSmall: (width: string, height: string) => `The image must be at least ${width} × ${height} pixels.`,
  maxFileSize: (size: string) => `Max ${size}`,
  minPixels: (width: string, height: string) => `At least ${width} × ${height} px`,
  noImage: "No image",
  chosenImage: "Chosen image",
  replace: "Replace",
  crop: "Crop",
  edit: "Edit",
  remove: "Remove",
  addImage: "Add image",
  imageRequired: "Add an image",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    imageCropper: typeof imageCropperMessages.defaults
  }
}

/** Resolve image cropper wording outside React; pass the component's locale. */
export function getImageCropperMessages(locale = getLocale()): typeof imageCropperMessages.defaults {
  return resolveMessages(imageCropperMessages.namespace, imageCropperMessages.defaults, locale)
}
