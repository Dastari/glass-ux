import {
  DecoratorNode,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
} from "lexical";
import type { ReactNode } from "react";
import { isSafeRichTextUrl } from "./urls.js";

type SerializedImage = SerializedLexicalNode & {
  url: string;
  alt: string;
  title?: string;
};
const escapeLabel = (value: string) =>
  value.replace(/([\\[\]])/g, "\\$1").replace(/\r?\n/g, " ");

/** Internal inline Markdown image; its source is kept even when its URL cannot be displayed. */
export class MarkdownImageNode extends DecoratorNode<ReactNode> {
  __url: string;
  __alt: string;
  __title?: string;

  static override getType() {
    return "glass-markdown-image";
  }
  static override clone(node: MarkdownImageNode) {
    return new MarkdownImageNode(
      node.__url,
      node.__alt,
      node.__title,
      node.__key,
    );
  }
  static override importJSON(node: SerializedImage) {
    return new MarkdownImageNode(node.url, node.alt, node.title);
  }
  constructor(url: string, alt: string, title?: string, key?: NodeKey) {
    super(key);
    this.__url = url;
    this.__alt = alt;
    this.__title = title;
  }
  override createDOM() {
    const element = document.createElement("span");
    element.className = "fa-rich-text-image";
    return element;
  }
  override updateDOM() {
    return false;
  }
  override isInline() {
    return true;
  }
  override exportJSON(): SerializedImage {
    return {
      ...super.exportJSON(),
      type: "glass-markdown-image",
      version: 1,
      url: this.__url,
      alt: this.__alt,
      title: this.__title,
    };
  }
  toMarkdown() {
    const url = this.__url.replace(/([\\<>])/g, "\\$1");
    const title = this.__title
      ? ` "${this.__title.replace(/([\\"])/g, "\\$1")}"`
      : "";
    return `![${escapeLabel(this.__alt)}](<${url}>${title})`;
  }
  override getTextContent() {
    return this.toMarkdown();
  }
  override decorate() {
    return isSafeRichTextUrl(this.__url, true) ? (
      <img
        src={this.__url}
        alt={this.__alt}
        title={this.__title}
        loading="lazy"
        draggable={false}
      />
    ) : (
      <span className="fa-rich-text-image-blocked">{this.toMarkdown()}</span>
    );
  }
}

export function $isMarkdownImageNode(
  node: LexicalNode | null | undefined,
): node is MarkdownImageNode {
  return node instanceof MarkdownImageNode;
}
