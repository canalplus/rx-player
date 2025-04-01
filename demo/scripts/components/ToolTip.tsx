import * as React from "react";

const { useEffect, useRef } = React;

function ToolTip({
  className,
  offset,
  text,
  xPosition,
}: {
  className: string;
  offset: number;
  text: string;
  xPosition: number;
}): React.JSX.Element {
  const wrapperEl = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isNaN(+xPosition) || !wrapperEl.current) {
      return;
    }

    const rect = wrapperEl.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const toSlideY = -height - 11;
    const toSlideX = xPosition - offset - width / 2;
    wrapperEl.current.style.transform = `translate(${toSlideX}px, ${toSlideY}px)`;
  });
  return (
    <div className="tooltip-wrapper" ref={wrapperEl}>
      <pre className={"tooltip " + className}>{text}</pre>
    </div>
  );
}

export default React.memo(ToolTip);
