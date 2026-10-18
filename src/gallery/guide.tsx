import { useEffect, useState } from "react";
import { Markdown } from "../ai/markdown/index.js";
import { Notice } from "../ui/notice/index.js";
import { Skeleton } from "../ui/skeleton/index.js";
import { DOCUMENTATION_VERSION } from "./release.generated.js";

export { libraryGuides } from "./library-guides.js";

/** A version-matched human guide from the installed release. */
export function LibraryGuide({ id }: { id: string }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setText("");
    setError("");
    fetch(new URL(`./guides/${id}.md`, import.meta.url).href)
      .then((response) => {
        if (!response.ok) throw new Error("The guide could not load.");
        return response.text();
      })
      .then((value) => {
        if (active)
          setText(
            value.replace(
              /\]\((?!https?:|#)([^)]+)\)/g,
              (_match, path) =>
                `](${new URL(path, `https://github.com/Dastari/glass-ux/blob/v${DOCUMENTATION_VERSION}/docs/`).href})`,
            ),
          );
      })
      .catch((reason) => {
        if (active) setError(String(reason));
      });
    return () => {
      active = false;
    };
  }, [id]);
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
