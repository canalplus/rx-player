import * as React from "react";
import { render } from "github-buttons";

const {
  useEffect,
  useRef,
} = React;

const GitHubButton = ({
  href,
  ariaLabel,
  dataColorScheme = "no-preference: dark_high_contrast; light: dark_high_contrast; dark: dark_high_contrast;",
  dataIcon,
  dataShowCount,
  dataSize = "large",
  dataText,
  title,
  children,
}: {
  href: string;
  ariaLabel?: string;
  dataColorScheme?: string;
  dataIcon?: string;
  dataShowCount?: boolean | string;
  dataSize?: string;
  dataText?: string;
  title?: string;
  children?: React.ReactNode;
}): JSX.Element => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const aRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // Apply github-buttons's render on a new span
    if (spanRef.current && aRef.current) {
      const newSpan = spanRef.current.appendChild(document.createElement("span"));
      render(
        newSpan.appendChild(aRef.current),
        el => newSpan.parentNode?.replaceChild(el, newSpan),
      );
    }

    return () => {
      // Reset
      if (aRef.current && spanRef.current?.lastChild) {
        spanRef.current.replaceChild(aRef.current, spanRef.current.lastChild);
      }
    };
  });

  return (
    <span
      ref={spanRef}
      className="button-gh"
    >
      <a
        ref={aRef}
        href={href}
        aria-label={ariaLabel}
        data-icon={dataIcon}
        data-color-scheme={dataColorScheme}
        data-show-count={dataShowCount}
        data-size={dataSize}
        data-text={dataText}
        title={title}
      >
        {children}
      </a>
    </span>
  );
};

export default GitHubButton;