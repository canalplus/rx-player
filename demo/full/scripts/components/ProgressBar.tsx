import * as React from "react";

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
}: {
  seek: (newPosition: number) => void;
  position: number;
  bufferGap: number;
  minimumPosition: number | null | undefined;
  maximumPosition: number | null | undefined;
  onMouseMove: (pos: number, evt: React.MouseEvent) => void;
  onMouseOut: (evt: React.MouseEvent) => void;
}): JSX.Element {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const usedMinimum = minimumPosition ?? 0;
  const usedMaximum = maximumPosition ?? 300;

  const duration = Math.max(usedMaximum - usedMinimum, 0);

  const getMousePosition = React.useCallback(
    (event: React.MouseEvent) => {
      if (wrapperRef.current === null) {
        return null;
      }
      const rect = wrapperRef.current.getBoundingClientRect();
      const point0 = rect.left;
      const clickPosPx = Math.max(event.clientX - point0, 0);
      const endPointPx = Math.max(rect.right - point0, 0);
      if (!endPointPx) {
        return 0;
      }
      return (clickPosPx / endPointPx) * duration + usedMinimum;
    },
    [duration, usedMinimum],
  );

  // weird rx-player design decision. Should be fixed (or done in the
  // module)
  const bufferGapHotFix = isFinite(bufferGap) ? bufferGap : 0;
  const relativePosition = Math.max(position - usedMinimum, 0);
  const percentBuffered =
    Math.min((bufferGapHotFix + relativePosition) / duration, 1) * 100;

  const percentPosition = Math.min(relativePosition / duration, 1) * 100;

  const onProgressBarClick = React.useCallback(
    (event: React.MouseEvent) => {
      const mousePosition = getMousePosition(event);
      if (mousePosition !== null) {
        seek(mousePosition);
      }
    },
    [getMousePosition, seek],
  );

  const onProgressMouseMove = React.useCallback(
    (event: React.MouseEvent) => {
      const mousePosition = getMousePosition(event);
      if (mousePosition !== null) {
        onMouseMove(mousePosition, event);
      }
    },
    [getMousePosition, onMouseMove],
  );

  return (
    <div
      className="progress-bar-wrapper"
      ref={wrapperRef}
      onClick={onProgressBarClick}
      onMouseOut={onMouseOut}
      onMouseMove={onProgressMouseMove}
    >
      <div
        className="progress-bar-current"
        style={{
          width: `${percentPosition}%`,
        }}
      />
      <div
        className="progress-bar-buffered"
        style={{
          width: `${percentBuffered}%`,
        }}
      />
    </div>
  );
}

export default React.memo(ProgressBar);
