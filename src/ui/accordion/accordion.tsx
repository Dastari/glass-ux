import { Accordion as BaseAccordion } from "@base-ui/react/accordion"
import { Collapsible } from "@base-ui/react/collapsible"
import type { ComponentProps, ReactNode } from "react"
import { IconChevronRight } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"

interface HeadProps {
  title: ReactNode
  /** Leading icon after the chevron. Pass it without a size. */
  icon?: ReactNode
  /** Trailing data: a count, a status, a short value. */
  meta?: ReactNode
}

function TriggerContent({ title, icon, meta }: HeadProps) {
  return (
    <>
      <IconChevronRight className="fa-accordion-chevron" />
      {icon}
      <span className="fa-accordion-title">{title}</span>
      {meta ? <span className="fa-accordion-meta">{meta}</span> : null}
    </>
  )
}

export interface AccordionRootProps extends Omit<ComponentProps<typeof BaseAccordion.Root>, "className"> {
  className?: string
}

function AccordionRoot({ className, ...rest }: AccordionRootProps) {
  return <BaseAccordion.Root {...rest} className={cx("fa-accordion", className)} />
}

export interface AccordionItemProps extends Omit<ComponentProps<typeof BaseAccordion.Item>, "className" | "title">, HeadProps {
  className?: string
  /** Heading level of the trigger, to fit the page outline. */
  level?: 2 | 3 | 4 | 5
  children: ReactNode
}

/** One section: a full-width row (chevron, icon, title, meta) and its panel. */
function AccordionItem({ title, icon, meta, level = 3, className, children, ...rest }: AccordionItemProps) {
  const Heading = `h${level}` as const
  return (
    <BaseAccordion.Item {...rest} className={cx("fa-accordion-item", className)}>
      <BaseAccordion.Header className="fa-accordion-header" render={<Heading />}>
        <BaseAccordion.Trigger className="fa-item fa-accordion-trigger">
          <TriggerContent title={title} icon={icon} meta={meta} />
        </BaseAccordion.Trigger>
      </BaseAccordion.Header>
      <BaseAccordion.Panel className="fa-accordion-panel">
        <div className="fa-accordion-content">{children}</div>
      </BaseAccordion.Panel>
    </BaseAccordion.Item>
  )
}

/**
 * Sections that open in place. The chevron turns; items are set apart by space and hover
 * fills, never by dividers (R5.8). Use for secondary detail (advanced settings, raw data),
 * not for primary navigation.
 */
export const Accordion = {
  Root: AccordionRoot,
  Item: AccordionItem,
}

export interface DisclosureProps extends Omit<ComponentProps<typeof Collapsible.Root>, "className" | "title">, HeadProps {
  className?: string
  children: ReactNode
}

/** A single show/hide section with the accordion's row and motion. */
export function Disclosure({ title, icon, meta, className, children, ...rest }: DisclosureProps) {
  return (
    <Collapsible.Root {...rest} className={cx("fa-accordion fa-accordion-item", className)}>
      <Collapsible.Trigger className="fa-item fa-accordion-trigger">
        <TriggerContent title={title} icon={icon} meta={meta} />
      </Collapsible.Trigger>
      <Collapsible.Panel className="fa-accordion-panel" data-collapsible="">
        <div className="fa-accordion-content">{children}</div>
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}
