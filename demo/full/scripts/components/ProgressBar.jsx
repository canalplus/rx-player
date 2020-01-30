import React from "react";

/**
 * Horizontal (left-to-right) progress bar component which:
 *
 *   - represents the current position and the buffer relatively to the
 *     minimum / maximum position.
 *
 *   - triggers a seek function with the clicked position on click
 *
 *   - call a onMouseMove function with the hovered position and the event when
 *     the mouse hover the component
 *
 *   - call a onMouseOut when it stops hovering it
 *
 * @param {Object} props
 * @returns {Object}
 */
function ProgressBar({
  seek, // seek callback, will be called with the position clicked
  position,
  bufferGap,
  minimumPosition,
  maximumPosition,
  onMouseOut, // callback called when the mouse stops hovering
  onMouseMove, // callback called when the mouse starts hovering, with the
               // position and the event in arguments
}) {
  let element;

  const duration = Math.max(maximumPosition - minimumPosition, 0);

  const getMousePosition = (event) => {
    const rect = element.getBoundingClientRect();
    const point0 = rect.left;
    const clickPosPx = Math.max(event.clientX - point0, 0);
    const endPointPx = Math.max(rect.right - point0, 0);
    if (!endPointPx) {
      return 0;
    }
    return ((clickPosPx / endPointPx) * duration) + minimumPosition;
  };

  // weird rx-player design decision. Should be fixed (or done in the
  // module)
  const bufferGapHotFix = isFinite(bufferGap) ? bufferGap : 0;
  const relativePosition = Math.max(position - minimumPosition, 0);
  const percentBuffered = Math.min(
    (bufferGapHotFix + relativePosition) / duration
    , 1) * 100;

  const percentPosition = Math.min(relativePosition / duration, 1) * 100;

  return (
    <div
      className="progress-bar-wrapper"
      ref={el => element = el }
      onClick={(event) => seek(getMousePosition(event))}
      onMouseOut={onMouseOut}
      onMouseMove={evt => onMouseMove(getMousePosition(evt), evt)}
    >
      <div
        className="progress-bar-current"
        style={{
          "width": percentPosition + "%",
        }}
      />
      <div
        className="progress-bar-buffered"
        style={{
          "width": percentBuffered + "%",
        }}
      />
    </div>
  );
}

export default React.memo(ProgressBar);
