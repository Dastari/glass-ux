import {
  TRANSFORMERS,
  CHECK_LIST,
  type TextMatchTransformer,
  type Transformer,
} from "@lexical/markdown";
import { MarkdownImageNode, $isMarkdownImageNode } from "./image-node.js";

const unescape = (value: string) => value.replace(/\\([\\[\]()<>"'])/g, "$1");
const IMAGE_PATTERN =
  /!\[((?:\\.|[^\]\\])*)\]\((<(?:\\.|[^>\\])*>|(?:\\.|[^\s)\\])+)(?:\s+"((?:\\.|[^"\\])*)")?\)/;

const IMAGE: TextMatchTransformer = {
  type: "text-match",
  dependencies: [MarkdownImageNode],
  importRegExp: IMAGE_PATTERN,
  regExp: new RegExp(`${IMAGE_PATTERN.source}$`),
  trigger: ")",
  export: (node) => ($isMarkdownImageNode(node) ? node.toMarkdown() : null),
  replace: (node, match) => {
    const raw = match[2] ?? "";
    const url = raw.startsWith("<") ? raw.slice(1, -1) : raw;
    node.replace(
      new MarkdownImageNode(
        unescape(url),
        unescape(match[1] ?? ""),
        match[3] ? unescape(match[3]) : undefined,
      ),
    );
  },
};

/** Image matching precedes links so image labels cannot be mistaken for a link. */
export const MARKDOWN_TRANSFORMERS: Transformer[] = [
  IMAGE,
  CHECK_LIST,
  ...TRANSFORMERS,
];
