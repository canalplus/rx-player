import type { CancellationSignal } from "../../../utils/task_canceller.ts";
import type RxPlayer from "../public_api.ts";
import constructDebugGeneralInfo from "./modules/general_info.ts";
import createSegmentSinkGraph from "./modules/segment_buffer_content.ts";
import createSegmentSinkSizeGraph from "./modules/segment_buffer_size.ts";
import { createCompositeElement, createElement } from "./utils.ts";

export default function renderDebugElement(
  parentElt: HTMLElement,
  instance: RxPlayer,
  cancelSignal: CancellationSignal,
): void {
  const debugElementTitleElt = createElement("div", {
    textContent: "RxPlayer Debug Information",
  });
  debugElementTitleElt.style.fontWeight = "bold";
  debugElementTitleElt.style.borderBottom = "1px solid white";
  debugElementTitleElt.style.marginBottom = "5px";
  debugElementTitleElt.style.fontStyle = "italic";

  const debugWrapperElt = createCompositeElement("div", [
    debugElementTitleElt,
    constructDebugGeneralInfo(instance, parentElt, cancelSignal),
    createSegmentSinkGraph(instance, "video", "vbuf", parentElt, cancelSignal),
    createSegmentSinkGraph(instance, "audio", "abuf", parentElt, cancelSignal),
    createSegmentSinkGraph(instance, "text", "tbuf", parentElt, cancelSignal),
    createSegmentSinkSizeGraph(instance, parentElt, cancelSignal),
  ]);
  debugWrapperElt.style.backgroundColor = "#00000099";
  debugWrapperElt.style.padding = "7px";
  debugWrapperElt.style.fontSize = "13px";
  debugWrapperElt.style.fontFamily = "mono, monospace";
  debugWrapperElt.style.color = "white";
  debugWrapperElt.style.display = "inline-block";
  debugWrapperElt.style.bottom = "0px";
  parentElt.appendChild(debugWrapperElt);
  cancelSignal.register(() => {
    parentElt.removeChild(debugWrapperElt);
  });
}
