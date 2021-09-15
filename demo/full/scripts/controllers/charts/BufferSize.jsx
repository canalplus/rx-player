import React, {
  useEffect,
  useRef,
} from "react";

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
const CANVAS_HEIGHT = DRAWABLE_HEIGHT +
  HEIGHT_MARGIN_TOP +
  HEIGHT_MARGIN_BOTTOM;

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
function BufferSizeChart({ module }) {
  const canvasEl = useRef(null);
  let canvasCtx;
  let currentMaxSize = MINIMUM_MAX_BUFFER_SIZE;

  useEffect(() => {
    if (!canvasEl.current) {
      return;
    }
    canvasCtx = canvasEl.current.getContext("2d");
  }, []);

  useEffect(() => {
    const subscription = module.$get("data")
      .subscribe(data => {
        if (data.length > 0) {
          const lastDate = data.length === 0 ?
            null :
            data[data.length - 1].date;
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
      });
    return function cleanUpSubscription() {
      subscription.unsubscribe();
    };
  }, [module]);

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

  function onNewData(data) {
    clearAndResizeCanvas(canvasCtx);
    if (data.length === 0) {
      return;
    }

    currentMaxSize = getNewMaxBufferSize();
    const minDate = data[0].date;

    const gridHeight = DRAWABLE_HEIGHT / currentMaxSize;
    const gridWidth = DRAWABLE_WIDTH / TIME_SAMPLES_MS;

    drawData();
    drawGrid();

    /**
     * Get more appropriate maximum buffer size to put on top of the graph
     * according to current data.
     */
    function getNewMaxBufferSize() {
      const maxPoint = Math.max(...data.map(d => d.value || 0));
      if (maxPoint >= currentMaxSize) {
        return maxPoint + 5;
      } else if (maxPoint < (currentMaxSize - 5)) {
        return Math.max(maxPoint + 5, MINIMUM_MAX_BUFFER_SIZE);
      }
      return currentMaxSize;
    }

    /**
     * Draw grid lines on canvas and their correspinding values.
     */
    function drawGrid () {
      canvasCtx.beginPath();
      canvasCtx.strokeStyle = "lightgrey";
      canvasCtx.lineWidth = 1;
      const stepHeight = DRAWABLE_HEIGHT / NUMBER_GRID_LINES_HEIGHT;
      const stepVal = currentMaxSize / NUMBER_GRID_LINES_HEIGHT;
      for (let i = 0; i <= NUMBER_GRID_LINES_HEIGHT; i++) {
        const height = stepHeight * i + HEIGHT_MARGIN_TOP;
        canvasCtx.moveTo(0, height);
        canvasCtx.font = "14px Arial";
        const currStepVal = (stepVal * (NUMBER_GRID_LINES_HEIGHT - i))
          .toFixed(1);
        canvasCtx.fillText(`${currStepVal} s`, 0, height - 5);
        canvasCtx.lineTo(CANVAS_WIDTH, height);
      }
      canvasCtx.stroke();
    }

    /**
     * Draw all data contained in `data` in the canvas given.
     */
    function drawData() {
      canvasCtx.beginPath();
      canvasCtx.strokeStyle = "rgb(200, 100, 200)";
      canvasCtx.lineWidth = 2;
      canvasCtx.moveTo(0, bufferValueToY(data[0].value));
      for (let i = 1; i < data.length; i++) {
        canvasCtx.lineTo(dateToX(data[i].date), bufferValueToY(data[i].value));
      }
      canvasCtx.stroke();
    }

    /**
     * Convert a value of a given data point, to a u coordinate in the canvas.
     * @param {number} bufferVal - Value to convert
     * @returns {number} - y coordinate
     */
    function bufferValueToY(bufferVal) {
      return HEIGHT_MARGIN_TOP +
        (currentMaxSize - bufferVal) * gridHeight;
    }

    /**
     * Convert a date of a given data point, to a x coordinate in the canvas.
     * @param {number} date - Date to convert, in milliseconds
     * @returns {number} - x coordinate
     */
    function dateToX(date) {
      return (date - minDate) * gridWidth;
    }
  }
}

/**
 * Clear the whole canvas.
 * @param {CanvasRenderingContext2D} canvasContext
 */
function clearAndResizeCanvas(canvasContext) {
  const canvasElt = canvasContext.canvas;
  canvasElt.width = CANVAS_WIDTH;
  canvasElt.height = CANVAS_HEIGHT;
  canvasContext.clearRect(0, 0, canvasElt.width, canvasElt.height);
}

export default React.memo(BufferSizeChart);
