import * as React from "react";
import useModuleState from "../../lib/useModuleState";
import { IChartModule } from "../../modules/ChartData";

const { useEffect, useRef } = React;

/**
 * Margin on the bottom of the canvas.
 * No line will be drawn below it.
 */
const HEIGHT_MARGIN_BOTTOM = 5;

/**
 * Margin on the top of the canvas.
 * No line will be drawn above it.
 */
const HEIGHT_MARGIN_TOP = 20;

/**
 * "Drawable" height of the canvas.
 * The drawable height is basically the full height minus height margins.
 */
const DRAWABLE_HEIGHT = 400;

/**
 * "Drawable" with of the canvas.
 * The drawable width is basically the full width minus potential width
 * margins.
 */
const DRAWABLE_WIDTH = 960;

/**
 * Maximum history of the buffer size that will be displayed, in milliseconds.
 * For example, a value of `3000` indicates that we will just show at most the
 * buffer size evolution during the last 3 seconds.
 */
const TIME_SAMPLES_MS = 30000;

/** Full width of the canvas. */
const CANVAS_WIDTH = DRAWABLE_WIDTH;

/** Full height of the canvas. */
const CANVAS_HEIGHT = DRAWABLE_HEIGHT + HEIGHT_MARGIN_TOP + HEIGHT_MARGIN_BOTTOM;

/**
 * At minimum, that value will be taken in the chart as a maximum buffer size,
 * in seconds.
 * If samples go higher than this size, the chart will adapt automatically to
 * a higher scale.
 * However if values go below that value, the chart won't scale down more than
 * this.
 */
const MINIMUM_MAX_BUFFER_SIZE = 20;

/** Number of grid lines that will be represented on the canvas. */
const NUMBER_GRID_LINES_HEIGHT = 10;

/**
 * Display a chart showing the evolution of the buffer size over time.
 * @param {Object} props
 * @returns {Object}
 */
function BufferSizeChart({ module }: { module: IChartModule }): React.JSX.Element {
  const data = useModuleState(module, "data");
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const canvasCtx = useRef<CanvasRenderingContext2D | null>(null);
  const currentMaxSize = useRef<number>(MINIMUM_MAX_BUFFER_SIZE);

  const onNewData = React.useCallback(
    (
      innerData: Array<{
        date: number;
        value: number;
      }>,
    ) => {
      if (canvasCtx.current === null) {
        return;
      }
      clearAndResizeCanvas(canvasCtx.current);
      if (innerData.length === 0) {
        return;
      }

      currentMaxSize.current = getNewMaxBufferSize();
      const minDate = innerData[0].date;

      const gridHeight = DRAWABLE_HEIGHT / currentMaxSize.current;
      const gridWidth = DRAWABLE_WIDTH / TIME_SAMPLES_MS;

      drawData();
      drawGrid();

      /**
       * Get more appropriate maximum buffer size to put on top of the graph
       * according to current data.
       */
      function getNewMaxBufferSize(): number {
        const maxPoint = Math.max(...innerData.map((d) => d.value || 0));
        if (maxPoint >= currentMaxSize.current) {
          return maxPoint + 5;
        } else if (maxPoint < currentMaxSize.current - 5) {
          return Math.max(maxPoint + 5, MINIMUM_MAX_BUFFER_SIZE);
        }
        return currentMaxSize.current;
      }

      /**
       * Draw grid lines on canvas and their correspinding values.
       */
      function drawGrid(): void {
        if (canvasCtx.current === null) {
          return;
        }
        canvasCtx.current.beginPath();
        canvasCtx.current.strokeStyle = "lightgrey";
        canvasCtx.current.lineWidth = 1;
        const stepHeight = DRAWABLE_HEIGHT / NUMBER_GRID_LINES_HEIGHT;
        const stepVal = currentMaxSize.current / NUMBER_GRID_LINES_HEIGHT;
        for (let i = 0; i <= NUMBER_GRID_LINES_HEIGHT; i++) {
          const height = stepHeight * i + HEIGHT_MARGIN_TOP;
          canvasCtx.current.moveTo(0, height);
          canvasCtx.current.font = "14px Arial";
          const currStepVal = (stepVal * (NUMBER_GRID_LINES_HEIGHT - i)).toFixed(1);
          canvasCtx.current.fillText(`${currStepVal} s`, 0, height - 5);
          canvasCtx.current.lineTo(CANVAS_WIDTH, height);
        }
        canvasCtx.current.stroke();
      }

      /**
       * Draw all data contained in `data` in the canvas given.
       */
      function drawData(): void {
        if (canvasCtx.current === null) {
          return;
        }
        canvasCtx.current.beginPath();
        canvasCtx.current.strokeStyle = "rgb(200, 100, 200)";
        canvasCtx.current.lineWidth = 2;
        canvasCtx.current.moveTo(0, bufferValueToY(innerData[0].value));
        for (let i = 1; i < innerData.length; i++) {
          canvasCtx.current.lineTo(
            dateToX(innerData[i].date),
            bufferValueToY(innerData[i].value),
          );
        }
        canvasCtx.current.stroke();
      }

      /**
       * Convert a value of a given data point, to a u coordinate in the canvas.
       * @param {number} bufferVal - Value to convert
       * @returns {number} - y coordinate
       */
      function bufferValueToY(bufferVal: number): number {
        return HEIGHT_MARGIN_TOP + (currentMaxSize.current - bufferVal) * gridHeight;
      }

      /**
       * Convert a date of a given data point, to a x coordinate in the canvas.
       * @param {number} date - Date to convert, in milliseconds
       * @returns {number} - x coordinate
       */
      function dateToX(date: number): number {
        return (date - minDate) * gridWidth;
      }
    },
    [],
  );

  React.useEffect((): void => {
    if (data.length > 0) {
      const lastDate = data[data.length - 1].date;
      const minimumTime = lastDate - TIME_SAMPLES_MS;
      let i;
      for (i = data.length - 1; i >= 1; i--) {
        if (data[i].date <= minimumTime) {
          break;
        }
      }
      const consideredData = data.slice(i);
      onNewData(consideredData);
    } else {
      onNewData([]);
    }
  }, [data, onNewData]);

  useEffect(() => {
    if (!canvasEl.current) {
      return;
    }
    canvasCtx.current = canvasEl.current.getContext("2d");
  }, []);

  return (
    <div className="canvas-buffer-size-container">
      <canvas
        className="canvas-buffer-size"
        ref={canvasEl}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
      />
    </div>
  );
}

/**
 * Clear the whole canvas.
 * @param {CanvasRenderingContext2D} canvasContext
 */
function clearAndResizeCanvas(canvasContext: CanvasRenderingContext2D) {
  const canvasElt = canvasContext.canvas;
  canvasElt.width = CANVAS_WIDTH;
  canvasElt.height = CANVAS_HEIGHT;
  canvasContext.clearRect(0, 0, canvasElt.width, canvasElt.height);
}

export default React.memo(BufferSizeChart);
