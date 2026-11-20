import { Fragment } from "react";

/** Small, safe formatter for authored prose; never treats content as HTML. */
export function LearningText({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  return (
    <span className={`learning-text ${className}`}>
      {children
        .split(/(`[^`]+`)/g)
        .map((part, index) =>
          part.startsWith("`") && part.endsWith("`") ? (
            <code key={index}>{part.slice(1, -1)}</code>
          ) : (
            <Fragment key={index}>{part}</Fragment>
          ),
        )}
    </span>
  );
}
