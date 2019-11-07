import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import capitalizeFirstLetter from "../lib/capitalizeFirstLetter.js";
import shuffleArray from "../lib/shuffleArray.js";
import ToolTip from "./ToolTip.jsx";

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 1;
const COLORS = [
  // "#fe4a49",
  "#2ab7ca",
  "#fed766",
  "#4dd248",
  "#a22c28",
  "#556b2f", // darkolivegreen
  "#add8e6", // lightblue
  "#90ee90", // lightgreen
  "#444444",
  "#40bfc1",
  "#57557e",
  "#fbe555",
  // "#f0134d",
];
const COLOR_CURRENT_POSITION = "#FF2323";

/**
 * Clear the whole canvas.
 * @param {Object} canvasContext
 * @param {number} width
 * @param {number} height
 */
function clearCanvas(canvasContext, width, height) {
  canvasContext.clearRect(0, 0, width, height);
}

/**
 * Scale given bufferedData in terms of percentage between the minimum and
 * maximum position. Filter out segment which are not part of it.
 * @param {Array.<Object>} bufferedData
 * @param {number} minimumPosition
 * @param {number} maximumPosition
 * @returns {Array.<Object>}
 */
function scaleSegments(bufferedData, minimumPosition, maximumPosition) {
  const scaledSegments = [];
  const wholeDuration = maximumPosition - minimumPosition;
  for (let i = 0; i < bufferedData.length; i++) {
    const bufferedInfos = bufferedData[i];
    const start = bufferedInfos.bufferedStart === undefined ?
      bufferedInfos.start :
      bufferedInfos.bufferedStart;
    const end = bufferedInfos.bufferedEnd === undefined ?
      bufferedInfos.end :
      bufferedInfos.bufferedEnd;
    if (end > minimumPosition && start < maximumPosition) {
      const startPoint = Math.max(start - minimumPosition, 0);
      const endPoint = Math.min(end - minimumPosition, maximumPosition);
      const scaledStart = startPoint / wholeDuration;
      const scaledEnd = endPoint / wholeDuration;
      scaledSegments.push({ scaledStart,
                            scaledEnd,
                            bufferedInfos });
    }
  }
  return scaledSegments;
}

/**
 * Display a graph representing what has been buffered according to the data
 * given.
 * Allow to seek on click, display the current time, and display a tooltip
 * describing the buffered data when hovering represented data.
 * @param {Object}
 */
export default function BufferContentGraph({
  currentTime, // The time currently played
  data, // The buffered data for a single type of buffer (e.g. "audio")
  maximumPosition, // The maximum seekable position
  minimumPosition, // The minimum seekable position
  seek, // function allowing to seek in the content
  type, // The type of buffer (e.g. "audio", "video" or "text")
}) {
  const [ randomColors ] = useState(shuffleArray(COLORS));
  const [ tipVisible, setTipVisible ] = useState(false);
  const [ tipPosition, setTipPosition ] = useState(0);
  const [ tipText, setTipText ] = useState("");
  const canvasEl = useRef(null);
  const representationsEncountered = useRef([]);
  const duration = Math.max(maximumPosition - minimumPosition, 0);

  const currentSegmentsScaled = useMemo(() => {
    return scaleSegments(data, minimumPosition, maximumPosition);
  }, [data, minimumPosition, maximumPosition]);

  useEffect(() => {
    if (canvasEl === null || canvasEl === undefined) {
      return ;
    }
    const ctx = canvasEl.current.getContext("2d");
    if (ctx === null) {
      return;
    }
    canvasEl.current.width = CANVAS_WIDTH;
    canvasEl.current.height = CANVAS_HEIGHT;
    clearCanvas(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (minimumPosition === undefined ||
        maximumPosition === undefined ||
        minimumPosition >= maximumPosition)
    {
      return;
    }
    for (let i = 0; i < currentSegmentsScaled.length; i++) {
      const segment = currentSegmentsScaled[i];
      const representation = segment.bufferedInfos.infos.representation;
      let indexOfRepr = representationsEncountered
        .current
        .indexOf(representation);
      if (indexOfRepr < 0) {
        representationsEncountered.current.push(representation);
        indexOfRepr = representationsEncountered.current.length - 1;
      }
      const colorIndex = indexOfRepr % COLORS.length;
      const color = randomColors[colorIndex];
      const startX = segment.scaledStart * CANVAS_WIDTH;
      const endX = segment.scaledEnd * CANVAS_WIDTH;
      ctx.fillStyle = color;
      ctx.fillRect(Math.ceil(startX),
                   0,
                   Math.ceil(endX - startX),
                   CANVAS_HEIGHT);
    }
    if (typeof currentTime === "number" &&
        currentTime >= minimumPosition &&
        currentTime < maximumPosition)
    {
      const lengthCanvas = maximumPosition - minimumPosition;
      ctx.fillStyle = COLOR_CURRENT_POSITION;
      ctx.fillRect(Math.ceil((currentTime - minimumPosition) /
                               lengthCanvas * CANVAS_WIDTH) - 1,
                   0,
                   2,
                   CANVAS_HEIGHT);
    }
  }, [minimumPosition, maximumPosition, data]);

  const getMousePositionInPercentage = (event) => {
    if (canvasEl === null || canvasEl === undefined) {
      return;
    }
    const rect = canvasEl.current.getBoundingClientRect();
    const point0 = rect.left;
    const clickPosPx = Math.max(event.clientX - point0, 0);
    const endPointPx = Math.max(rect.right - point0, 0);
    if (!endPointPx) {
      return 0;
    }
    return clickPosPx / endPointPx;
  };

  const getMousePosition = (event) => {
    const mousePercent = getMousePositionInPercentage(event);
    return mousePercent === undefined ?
      undefined :
      mousePercent * duration + minimumPosition;
  };

  const toolTipOffset = canvasEl !== null && canvasEl.current !== null ?
    canvasEl.current.getBoundingClientRect().left :
    0;

  const onMouseMove = (event) => {
    const mousePercent = getMousePositionInPercentage(event);
    for (let i = 0; i < currentSegmentsScaled.length; i++) {
      const scaledSegment = currentSegmentsScaled[i];
      if (mousePercent >= scaledSegment.scaledStart &&
          mousePercent < scaledSegment.scaledEnd)
      {
        const { start, end } = scaledSegment.bufferedInfos;
        const { adaptation,
                representation } = scaledSegment.bufferedInfos.infos;
        setTipVisible(true);
        setTipPosition(event.clientX);

        let tipText = "";
        switch (adaptation.type) {
          case "video":
            tipText += `width: ${representation.width}` + "\n" +
                       `height: ${representation.height}` + "\n" +
                       `codec: ${representation.codec}` + "\n" +
                       `bitrate: ${representation.bitrate}` + "\n";
            break;
          case "audio":
            tipText += `language: ${adaptation.language}` + "\n" +
                       `audioDescription: ${!!adaptation.isAudioDescription}` + "\n" +
                       `codec: ${representation.codec}` + "\n" +
                       `bitrate: ${representation.bitrate}` + "\n";
            break;
          case "text":
            tipText += `language: ${adaptation.language}` + "\n" +
                       `closedCaption: ${!!adaptation.isClosedCaption}` + "\n";
            break;
        }
        tipText += `segment: [${start.toFixed(1)}, ${end.toFixed(1)}]`;
        setTipText(tipText);
        return;
      }
    }
    hideTip(); // if none found
  };

  const hideTip = () => {
    setTipVisible(false);
    setTipPosition(0);
    setTipText("");
  };

  return (
    <div className="container-buffer-graph">
      <div className="buffer-graph-title">
        {`${capitalizeFirstLetter(type)} Buffer`}
      </div>
      <div
        className="canvas-buffer-graph-container"
        onMouseLeave={hideTip}
        onMouseMove={onMouseMove}
      >
        { tipVisible ?
          <ToolTip
            className="buffer-content-tip"
            text={tipText}
            xPosition={tipPosition}
            offset={toolTipOffset}
          /> :
          null }
        <canvas
          onClick={(event) => seek(getMousePosition(event))}
          height={String(CANVAS_HEIGHT)}
          width={String(CANVAS_WIDTH)}
          className="canvas-buffer-graph"
          ref={canvasEl} />
      </div>
    </div>
  );
}
