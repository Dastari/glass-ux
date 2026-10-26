import { useMessages } from "../../lib/i18n/index.js"
import { richTextMessages } from "./messages.js"
/** Internal block choices shared with the loading toolbar's intrinsic label measure. */
export function richTextBlocks(messages: typeof richTextMessages.defaults) { return [
  { value: "paragraph", label: messages.paragraph },
  { value: "h1", label: messages.headingOne },
  { value: "h2", label: messages.headingTwo },
  { value: "h3", label: messages.headingThree },
  { value: "quote", label: messages.quote },
  { value: "code", label: messages.codeBlock },
] }

/** English block choices for internal typing. */
export const RICH_TEXT_BLOCKS = richTextBlocks(richTextMessages.defaults)

/** Keep the widest option in layout using the actual control font at every UI scale. */
export function BlockStyleLabel({ value }: { value: string }) {
  const messages = useMessages(richTextMessages)
  return (
    <span className="fa-rich-text-block-labels" aria-hidden="true">
      {richTextBlocks(messages).map((item) => (
        <span
          key={item.value}
          data-active={item.value === value ? "" : undefined}
        >
          {item.label}
        </span>
      ))}
    </span>
  );
}
