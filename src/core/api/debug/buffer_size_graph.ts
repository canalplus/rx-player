/**
 * Maximum history of the buffer size that will be displayed, in milliseconds.
 * For example, a value of `3000` indicates that we will just show at most the
 * buffer size evolution during the last 3 seconds.
 */
const TIME_SAMPLES_MS = 30000;

/**
 * At minimum, that value will be taken in the chart as a maximum buffer size,
 * in seconds.
 * If samples go higher than this size, the chart will adapt automatically to
 * a higher scale.
 * However if values go below that value, the chart won't scale down more than
 * this.
 */
const MINIMUM_MAX_BUFFER_SIZE = 20;

export default class BufferSizeGraph {
  private _history : IHistoryItem[];

  /** Canvas that will contain the buffer size graph itself. */
  private readonly _canvasElt : HTMLCanvasElement;

  private readonly _canvasCtxt : CanvasRenderingContext2D | null;

  constructor(canvasElt : HTMLCanvasElement) {
    this._canvasElt = canvasElt;
    this._canvasCtxt = this._canvasElt.getContext("2d");
    this._history = [];
  }

  public pushBufferSize(bufferSize : number) : void {
    const now = performance.now();
    this._history.push({ timestamp: now, bufferSize });
    if (this._history.length > 0) {
      const minimumTime = now - TIME_SAMPLES_MS;
      let i;
      for (i = this._history.length - 1; i >= 1; i--) {
        if (this._history[i].timestamp <= minimumTime) {
          break;
        }
      }
      this._history = this._history.slice(i);
    } else {
      this._history = [];
    }
  }

  public clear() {
    if (this._canvasCtxt !== null) {
      this._canvasCtxt.clearRect(0, 0, this._canvasElt.width, this._canvasElt.height);
    }
  }

  public reRender(width : number, height : number) : void {
    this._canvasElt.style.width = `${width}px`;
    this._canvasElt.style.height = `${height}px`;
    this._canvasElt.width = width;
    this._canvasElt.height = height;
    this.clear();
    const history = this._history;
    const canvasCtx = this._canvasCtxt;

    if (history.length === 0) {
      return;
    }

    const currentMaxSize = getNewMaxBufferSize();
    const minDate = history[0].timestamp;

    const gridHeight = height / currentMaxSize;
    const gridWidth = width / TIME_SAMPLES_MS;

    drawData();
    // drawGrid();

    /**
     * Get more appropriate maximum buffer size to put on top of the graph
     * according to current history.
     */
    function getNewMaxBufferSize() {
      const maxPoint = Math.max(...history.map(d => d.bufferSize));
      return Math.max(maxPoint + 5, MINIMUM_MAX_BUFFER_SIZE);
    }

    /**
     * Draw all data contained in `history` in the canvas given.
     */
    function drawData() {
      if (canvasCtx === null) {
        return;
      }
      canvasCtx.beginPath();
      canvasCtx.fillStyle = "rgb(200, 100, 200)";
      for (let i = 1; i < history.length; i++) {
        const diff = dateToX(history[i].timestamp) -
          dateToX(history[i - 1].timestamp);
        const y = height - bufferValueToHeight(history[i].bufferSize);
        canvasCtx.fillRect(
          dateToX(history[i - 1].timestamp),
          y,
          diff,
          height);
      }
      canvasCtx.stroke();
    }

    /**
     * Convert a value of a given data point, to a u coordinate in the canvas.
     * @param {number} bufferVal - Value to convert
     * @returns {number} - y coordinate
     */
    function bufferValueToHeight(bufferVal : number) : number {
      return height - (currentMaxSize - bufferVal) * gridHeight;
    }

    /**
     * Convert a date of a given data point, to a x coordinate in the canvas.
     * @param {number} date - Date to convert, in milliseconds
     * @returns {number} - x coordinate
     */
    function dateToX(date : number) : number {
      return (date - minDate) * gridWidth;
    }
  }
}

interface IHistoryItem {
  timestamp : number;
  bufferSize : number;
}
