/** Internal block choices shared with the loading toolbar's intrinsic label measure. */
export const RICH_TEXT_BLOCKS = [
  { value: "paragraph", label: "Paragraph" },
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
  { value: "quote", label: "Quote" },
  { value: "code", label: "Code block" },
];

/** Keep the widest option in layout using the actual control font at every UI scale. */
export function BlockStyleLabel({ value }: { value: string }) {
  return (
    <span className="fa-rich-text-block-labels" aria-hidden="true">
      {RICH_TEXT_BLOCKS.map((item) => (
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
