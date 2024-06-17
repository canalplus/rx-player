import * as React from "react";
import type {
  IVideoRepresentation,
} from "../../../../src/public_types";
import capitalizeFirstLetter from "../lib/capitalizeFirstLetter";
import shuffleArray from "../lib/shuffleArray";
import ToolTip from "./ToolTip";
import { IBufferedChunkSnapshot } from "../../../../src/core/segment_sinks/segment_buffers_store";

const { useEffect, useMemo, useRef, useState } = React;

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
 */
function clearCanvas(canvasContext: CanvasRenderingContext2D): void {
  canvasContext.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

/**
 * Represent the current position in the canvas.
 * @param {number|undefined} position - The current position
 * @param {number} minimumPosition - minimum possible position represented in
 * the canvas.
 * @param {number} maximumPosition - maximum possible position represented in
 * the canvas.
 * @param {Object} canvasCtx - The canvas' 2D context
 */
function paintCurrentPosition(
  position: number | undefined,
  minimumPosition: number,
  maximumPosition: number,
  canvasCtx: CanvasRenderingContext2D,
): void {
  if (
    typeof position === "number" &&
    position >= minimumPosition &&
    position < maximumPosition
  ) {
    const lengthCanvas = maximumPosition - minimumPosition;
    canvasCtx.fillStyle = COLOR_CURRENT_POSITION;
    canvasCtx.fillRect(
      Math.ceil(((position - minimumPosition) / lengthCanvas) * CANVAS_WIDTH) - 1,
      0,
      2,
      CANVAS_HEIGHT,
    );
  }
}

interface IScaledBufferedData {
  scaledStart: number;
  scaledEnd: number;
  bufferedInfos: IBufferedChunkSnapshot;
}

/**
 * Scale given bufferedData in terms of percentage between the minimum and
 * maximum position. Filter out segment which are not part of it.
 * @param {Array.<Object>} bufferedData
 * @param {number} minimumPosition
 * @param {number} maximumPosition
 * @returns {Array.<Object>}
 */
function scaleSegments(
  bufferedData: IBufferedChunkSnapshot[],
  minimumPosition: number,
  maximumPosition: number,
): IScaledBufferedData[] {
  const scaledSegments = [];
  const wholeDuration = maximumPosition - minimumPosition;
  for (let i = 0; i < bufferedData.length; i++) {
    const bufferedInfos = bufferedData[i];
    const start =
      bufferedInfos.bufferedStart === undefined
        ? bufferedInfos.start
        : bufferedInfos.bufferedStart;
    const end =
      bufferedInfos.bufferedEnd === undefined
        ? bufferedInfos.end
        : bufferedInfos.bufferedEnd;
    if (end > minimumPosition && start < maximumPosition) {
      const startPoint = Math.max(start - minimumPosition, 0);
      const endPoint = Math.min(end - minimumPosition, maximumPosition);
      const scaledStart = startPoint / wholeDuration;
      const scaledEnd = endPoint / wholeDuration;
      scaledSegments.push({ scaledStart, scaledEnd, bufferedInfos });
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
}: {
  currentTime: number | undefined;
  data: IBufferedChunkSnapshot[];
  minimumPosition: number | null | undefined;
  maximumPosition: number | null | undefined;
  seek: (pos: number) => void;
  type: "audio" | "video" | "text";
}): JSX.Element {
  const randomColors = useMemo<string[]>(() => shuffleArray(COLORS), []);
  const [tipVisible, setTipVisible] = useState(false);
  const [tipPosition, setTipPosition] = useState(0);
  const [tipText, setTipText] = useState("");
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const representationsIdEncountered = useRef<string[]>([]);
  const usedMaximum = maximumPosition ?? 300;
  const usedMinimum = minimumPosition ?? 0;
  const duration = Math.max(usedMaximum - usedMinimum, 0);

  /**
   * Paint a given segment in the canvas
   * @param {Object} scaledSegment - Buffered segment information with added
   * "scaling" information to know where it fits in the canvas.
   * @param {Object} canvasCtx - The canvas' 2D context
   */
  const paintSegment = React.useCallback(
    (scaledSegment: IScaledBufferedData, canvasCtx: CanvasRenderingContext2D): void => {
      const representation = scaledSegment.bufferedInfos.infos.representation;
      let indexOfRepr = representationsIdEncountered.current.indexOf(representation.uniqueId);
      if (indexOfRepr < 0) {
        representationsIdEncountered.current.push(representation.uniqueId);
        indexOfRepr = representationsIdEncountered.current.length - 1;
      }
      const colorIndex = indexOfRepr % COLORS.length;
      const color = randomColors[colorIndex];
      const startX = scaledSegment.scaledStart * CANVAS_WIDTH;
      const endX = scaledSegment.scaledEnd * CANVAS_WIDTH;
      canvasCtx.fillStyle = color;
      canvasCtx.fillRect(Math.ceil(startX), 0, Math.ceil(endX - startX), CANVAS_HEIGHT);
    },
    [randomColors],
  );

  const currentSegmentsScaled = useMemo(() => {
    return scaleSegments(data, usedMinimum, usedMaximum);
  }, [data, usedMinimum, usedMaximum]);

  useEffect(() => {
    if (canvasEl.current === null) {
      return;
    }
    const ctx = canvasEl.current.getContext("2d");
    if (ctx === null) {
      return;
    }
    canvasEl.current.width = CANVAS_WIDTH;
    canvasEl.current.height = CANVAS_HEIGHT;
    clearCanvas(ctx);

    if (
      usedMinimum === undefined ||
      usedMaximum === undefined ||
      usedMinimum >= usedMaximum
    ) {
      return;
    }
    for (let i = 0; i < currentSegmentsScaled.length; i++) {
      paintSegment(currentSegmentsScaled[i], ctx);
    }
    paintCurrentPosition(currentTime, usedMinimum, usedMaximum, ctx);
  }, [usedMinimum, usedMaximum, currentSegmentsScaled]);

  const getMousePositionInPercentage = React.useCallback((event: React.MouseEvent) => {
    if (canvasEl.current === null) {
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
  }, []);

  const getMousePosition = React.useCallback(
    (event: React.MouseEvent) => {
      const mousePercent = getMousePositionInPercentage(event);
      return mousePercent === undefined
        ? undefined
        : mousePercent * duration + usedMinimum;
    },
    [getMousePositionInPercentage, duration, usedMinimum],
  );

  const toolTipOffset =
    canvasEl !== null && canvasEl.current !== null
      ? canvasEl.current.getBoundingClientRect().left
      : 0;

  const hideTip = React.useCallback(() => {
    setTipVisible(false);
    setTipPosition(0);
    setTipText("");
  }, []);

  const onMouseMove = React.useCallback(
    (event: React.MouseEvent) => {
      const mousePercent = getMousePositionInPercentage(event);
      if (mousePercent === undefined) {
        return;
      }
      for (let i = 0; i < currentSegmentsScaled.length; i++) {
        const scaledSegment = currentSegmentsScaled[i];
        if (
          mousePercent >= scaledSegment.scaledStart &&
          mousePercent < scaledSegment.scaledEnd
        ) {
          const { start, end } = scaledSegment.bufferedInfos;
          const { adaptation, representation } = scaledSegment.bufferedInfos.infos;
          setTipVisible(true);
          setTipPosition(event.clientX);

          let newTipText = "";
          switch (adaptation.type) {
            case "video": {
              const rep = representation as IVideoRepresentation;
              newTipText +=
                `width: ${rep.width ?? "?"}` +
                "\n" +
                `height: ${rep.height ?? "?"}` +
                "\n" +
                `codec: ${representation.codecs ?? "?"}` +
                "\n" +
                `bitrate: ${representation.bitrate ?? "?"}` +
                "\n";
              break;
            }
            case "audio":
              newTipText +=
                `language: ${adaptation.language ?? "?"}` +
                "\n" +
                `audioDescription: ${String(adaptation.isAudioDescription) ?? false}` +
                "\n" +
                `codec: ${representation.codecs ?? "?"}` +
                "\n" +
                `bitrate: ${representation.bitrate ?? "?"}` +
                "\n";
              break;
            case "text":
              newTipText +=
                `language: ${adaptation.language ?? "?"}` +
                "\n" +
                `closedCaption: ${String(adaptation.isClosedCaption) ?? "?"}` +
                "\n";
              break;
          }
          newTipText += `segment: [${start.toFixed(1)}, ${end.toFixed(1)}]`;
          setTipText(newTipText);
          return;
        }
      }
      hideTip(); // if none found
    },
    [getMousePositionInPercentage, currentSegmentsScaled, hideTip],
  );

  const onCanvasClick = React.useCallback(
    (event: React.MouseEvent) => {
      const mousePosition = getMousePosition(event);
      if (mousePosition !== undefined) {
        seek(mousePosition);
      }
    },
    [getMousePosition, seek],
  );

  return (
    <div className="container-buffer-graph">
      <div className="buffer-graph-title">{`${capitalizeFirstLetter(type)} Buffer`}</div>
      <div
        className="canvas-buffer-graph-container"
        onMouseLeave={hideTip}
        onMouseMove={onMouseMove}
      >
        {tipVisible ? (
          <ToolTip
            className="buffer-content-tip"
            text={tipText}
            xPosition={tipPosition}
            offset={toolTipOffset}
          />
        ) : null}
        <canvas
          onClick={onCanvasClick}
          height={String(CANVAS_HEIGHT)}
          width={String(CANVAS_WIDTH)}
          className="canvas-buffer-graph"
          ref={canvasEl}
        />
      </div>
    </div>
  );
}
