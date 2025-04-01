import * as React from "react";
import { render } from "github-buttons";

const { useEffect, useRef } = React;

const GitHubButton = ({
  href,
  ariaLabel,
  dataColorScheme = "dark_high_contrast",
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
}): React.JSX.Element => {
  const aRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const aElement = aRef.current;
    if (aElement !== null) {
      render(aElement, (newA) => aElement?.parentNode?.replaceChild(newA, aElement));
    }
  });

  return (
    <span className="button-gh">
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
