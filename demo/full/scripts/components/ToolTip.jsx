import React, {
  useEffect,
  useRef,
} from "react";

/**
 * Props:
 *   - className {string}
 *   - timeText {number}
 *   - xPosition {number}
 * @class ToolTip
 */
function ToolTip({
  className,
  offset,
  text,
  xPosition,
}) {
  const wrapperEl = useRef(null);
  useEffect(() => {
    if (isNaN(+xPosition) || !wrapperEl.current) {
      return null;
    }

    const rect = wrapperEl.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const toSlideY = -height - 11;
    const toSlideX = xPosition - offset - width / 2;
    wrapperEl.current.style.transform = `translate(${toSlideX}px, ${toSlideY}px)`;
  });
  return (
    <div className="tooltip-wrapper" ref={wrapperEl} >
      <pre className={"tooltip " + className} >
        {text}
      </pre>
    </div>
  );
}

export default React.memo(ToolTip);
