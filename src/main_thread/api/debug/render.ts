import SharedReference from "../../../utils/reference";
import type { CancellationSignal } from "../../../utils/task_canceller";
import type RxPlayer from "../public_api";
import constructDebugGeneralInfo from "./modules/general_info";
import createSegmentSinkGraph from "./modules/segment_buffer_content";
import createSegmentSinkSizeGraph from "./modules/segment_buffer_size";
import { createCompositeElement, createElement } from "./utils";

const isUsed = new SharedReference<boolean>(false);

export default function renderDebugElement(
  parentElt: HTMLElement,
  instance: RxPlayer,
  cancelSignal: CancellationSignal,
): void {
  isUsed.setValue(true);
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
    isUsed.setValue(false);
    parentElt.removeChild(debugWrapperElt);
  });
}

renderDebugElement.__IS_USED = isUsed;
