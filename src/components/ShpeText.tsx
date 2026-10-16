import { Fragment } from "react";

/**
 * Renders text with every "SHPE" set in the SHPE wordmark style
 * (heavy, condensed). Use it in headings and buttons.
 */
export default function ShpeText({ children }: { children: string }) {
  const parts = children.split(/(SHPE)/g);
  return (
    <>
      {parts.map((part, i) =>
        part === "SHPE" ? (
          <span key={i} className="font-shpe">
            SHPE
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}
