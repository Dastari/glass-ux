import { LinkNode } from "@lexical/link";
import type { EditorConfig } from "lexical";
import { isSafeRichTextUrl } from "./urls.js";

/** Preserve Markdown destinations while applying one policy to DOM links and toolbar input. */
export class MarkdownLinkNode extends LinkNode {
  override $config() {
    return this.config("glass-markdown-link", { extends: LinkNode });
  }

  override sanitizeUrl(url: string): string {
    return isSafeRichTextUrl(url) ? url : "";
  }

  override updateLinkDOM(
    previous: this | null,
    anchor: HTMLAnchorElement | HTMLSpanElement,
    config: EditorConfig,
  ) {
    super.updateLinkDOM(previous, anchor, config);
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");
    if (!isSafeRichTextUrl(this.getURL())) {
      anchor.removeAttribute("href");
      anchor.setAttribute("aria-disabled", "true");
    } else anchor.removeAttribute("aria-disabled");
  }
}

/** Use Lexical's replacement mechanism so its link commands and Markdown transformer still apply. */
export const MARKDOWN_LINK_NODES = [
  MarkdownLinkNode,
  {
    replace: LinkNode,
    with: (node: LinkNode) =>
      new MarkdownLinkNode(node.getURL(), {
        rel: node.getRel(),
        target: node.getTarget(),
        title: node.getTitle(),
      }),
    withKlass: MarkdownLinkNode,
  },
];
