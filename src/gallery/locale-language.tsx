import { registerMessagePack, useMessages } from "../lib/i18n/index.js"
import { IconSearch } from "../icons/generated/icons.js"
import { Button } from "../ui/button/index.js"
import { Dialog } from "../ui/dialog/index.js"
import { dialogMessages } from "../ui/dialog/messages.js"
import { EmptyState } from "../ui/empty-state/index.js"
import { chartCoreMessages } from "../ui/charts/core/messages.js"
import { Pagination } from "../ui/pagination/index.js"
import { Select } from "../ui/select/index.js"
import { Toaster, toast } from "../ui/toast/index.js"
import { formMessages } from "../ui/form/messages.js"
import de from "../i18n/de.js"
import fr from "../i18n/fr.js"
import es from "../i18n/es.js"
import itPack from "../i18n/it.js"
import ptBR from "../i18n/pt-BR.js"
import nl from "../i18n/nl.js"
import ja from "../i18n/ja.js"
import zhHans from "../i18n/zh-Hans.js"
import ko from "../i18n/ko.js"
import ar from "../i18n/ar.js"
import he from "../i18n/he.js"
import { useState } from "react"
import { LocaleProvider, useLocale } from "../lib/locale/index.js"
import { DateField } from "../ui/date-picker/index.js"
import { Specimen } from "./kit.js"

registerMessagePack(de, fr, es, itPack, ptBR, nl, ja, zhHans, ko, ar, he)
const LANGUAGES = [
  { value: "en-AU", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "it", label: "Italiano" },
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "nl", label: "Nederlands" },
  { value: "ja", label: "日本語" },
  { value: "zh-Hans", label: "简体中文" },
  { value: "ko", label: "한국어" },
  { value: "ar", label: "العربية" },
  { value: "he", label: "עברית" },
]

function LanguageControls() {
  const locale = useLocale()
  const [pageIndex, setPageIndex] = useState(0)
  const dialog = useMessages(dialogMessages)
  const chart = useMessages(chartCoreMessages)
  const form = useMessages(formMessages)
  return (
    <div className="flex min-w-0 flex-col gap-4" data-language-controls>
      <Pagination pageIndex={pageIndex} pageSize={10} pageRows={10} rowCount={50} onPageChange={setPageIndex} />
      <div className="flex min-w-0 flex-wrap gap-3">
        <DateField defaultValue="2026-10-03" aria-label="Language sample date" />
        <Select width="medium" aria-label="Language sample choice" options={[{ value: "cedar", label: "Cedar" }, { value: "orbit", label: "Orbit" }]} />
      </div>
      <EmptyState icon={<IconSearch />}>{chart.noData}</EmptyState>
      <div className="flex flex-wrap gap-3">
        <Dialog.Root>
          <Dialog.Trigger render={<Button>{dialog.discardChanges}</Button>} />
          <Dialog.Popup>
            <Dialog.Header title={dialog.discardTitle} />
            <Dialog.Body>{dialog.discardDescription}</Dialog.Body>
            <Dialog.Footer><Dialog.Close render={<Button>{dialog.keepEditing}</Button>} /></Dialog.Footer>
          </Dialog.Popup>
        </Dialog.Root>
        <Button onClick={() => toast.success(form.saved, { locale })}>{form.saveChanges}</Button>
      </div>
      <Toaster />
    </div>
  )
}

export function LanguageSpecimen() {
  const [language, setLanguage] = useState("en-AU")
  return (
    <Specimen title="Language" description="Registered packs translate built-in wording. Application content and labels remain yours.">
      <div className="flex min-w-0 flex-col gap-4" data-language-specimen>
        <Select width="medium" aria-label="Language" value={language} onValueChange={(next) => next && setLanguage(next)} options={LANGUAGES} />
        <LocaleProvider locale={language}>
          <div lang={language} dir={language === "ar" || language === "he" ? "rtl" : "ltr"}>
            <LanguageControls />
          </div>
        </LocaleProvider>
      </div>
    </Specimen>
  )
}

