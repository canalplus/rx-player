import type { CancellationSignal } from "../../../../utils/task_canceller";
import type RxPlayer from "../../public_api";
import BufferSizeGraph from "../buffer_size_graph";
import { DEFAULT_REFRESH_INTERVAL } from "../constants";
import { createElement, createGraphCanvas, createMetricTitle } from "../utils";

export default function createSegmentSinkSizeGraph(
  instance: RxPlayer,
  parentElt: HTMLElement,
  cancelSignal: CancellationSignal,
): HTMLElement {
  const bufferSizeGraphWrapperElt = createElement("div");
  const bufferSizeTitle = createMetricTitle("bgap");
  const canvasElt = createGraphCanvas();

  const bufferSizeGraph = new BufferSizeGraph(canvasElt);
  const intervalId = setInterval(addBufferSize, DEFAULT_REFRESH_INTERVAL);
  cancelSignal.register(() => {
    clearInterval(intervalId);
  });
  bufferSizeGraphWrapperElt.appendChild(bufferSizeTitle);
  bufferSizeGraphWrapperElt.appendChild(canvasElt);
  bufferSizeGraphWrapperElt.style.padding = "7px 0px";
  addBufferSize();
  return bufferSizeGraphWrapperElt;

  function addBufferSize() {
    if (instance.getVideoElement() === null) {
      // disposed player. Clean-up everything
      bufferSizeGraphWrapperElt.innerHTML = "";
      clearInterval(intervalId);
      return;
    }
    const bufferGap = instance.getCurrentBufferGap();
    if (bufferGap === Infinity) {
      bufferSizeGraph.pushBufferSize(0);
    } else {
      bufferSizeGraph.pushBufferSize(bufferGap);
    }
    const width = Math.min(parentElt.clientWidth - 150, 600);
    bufferSizeGraph.reRender(width, 10);
  }
}
