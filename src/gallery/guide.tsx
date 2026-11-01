import { useEffect, useState } from "react";
import { Markdown } from "../ai/markdown/index.js";
import { Notice } from "../ui/notice/index.js";
import { Skeleton } from "../ui/skeleton/index.js";
import { useDocsSite } from "./site.js";

/** A version-matched human guide from the installed release. */
export function LibraryGuide({ id }: { id: string }) {
  const site = useDocsSite();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setText("");
    setError("");
    site
      .loadGuide(id)
      .then((value) => {
        const base = site.docsSourceUrl;
        if (active)
          setText(
            base
              ? value.replace(
                  /\]\((?!https?:|#)([^)]+)\)/g,
                  (_match, path) => `](${new URL(path, base).href})`,
                )
              : value,
          );
      })
      .catch((reason) => {
        if (active) setError(String(reason));
      });
    return () => {
      active = false;
    };
  }, [site, id]);
  return (
    <article className="gallery-documentation gallery-guide-document">
      {error ? (
        <Notice tone="danger">{error}</Notice>
      ) : text ? (
        <Markdown wrapTableCells anchors text={text} />
      ) : (
        <Skeleton.Text lines={4} />
      )}
    </article>
  );
}
