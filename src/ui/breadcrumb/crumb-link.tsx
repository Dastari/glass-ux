/**
 * The router adapter for the breadcrumb: the only breadcrumb file that knows about TanStack
 * Router. Crumbs and siblings with `link` render as router links.
 */
import { Link, type LinkProps } from "@tanstack/react-router"
import { Breadcrumb, type BreadcrumbProps, type Crumb, type CrumbLinkRenderProps, type CrumbSibling, type CrumbTarget } from "./breadcrumb.js"

export interface RouteCrumbSibling extends CrumbSibling {
  link?: LinkProps
}

export interface RouteCrumb extends Crumb {
  link?: LinkProps
  siblings?: RouteCrumbSibling[]
}

export function renderRouteCrumbLink(target: CrumbTarget, props: CrumbLinkRenderProps) {
  if (!target.link) return null
  // Ancestors are never "the current page": only an exact match would be.
  return <Link {...(target.link as LinkProps)} {...props} activeOptions={{ exact: true }} activeProps={{}} inactiveProps={{}} />
}

export interface RouteBreadcrumbProps extends Omit<BreadcrumbProps, "items" | "renderLink"> {
  items: RouteCrumb[]
}

/** The universal breadcrumb with router links — what the shell renders from route matches. */
export function RouteBreadcrumb(props: RouteBreadcrumbProps) {
  return <Breadcrumb {...props} renderLink={renderRouteCrumbLink} />
}
