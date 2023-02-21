import { CancellationSignal } from "../../../utils/task_canceller";
import RxPlayer from "../public_api";
import constructDebugGeneralInfo from "./modules/general_info";
import createSegmentBufferGraph from "./modules/segment_buffer_content";
import createSegmentBufferSizeGraph from "./modules/segment_buffer_size";
import { createCompositeElement, createElement } from "./utils";

export default function renderDebugElement(
  parentElt : HTMLElement,
  instance : RxPlayer,
  cancelSignal : CancellationSignal
) : void {
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
    createSegmentBufferGraph(instance, "video", "vbuf", parentElt, cancelSignal),
    createSegmentBufferGraph(instance, "audio", "abuf", parentElt, cancelSignal),
    createSegmentBufferGraph(instance, "text", "tbuf", parentElt, cancelSignal),
    createSegmentBufferSizeGraph(instance, parentElt, cancelSignal),
  ]);
  debugWrapperElt.style.backgroundColor = "#00000099";
  debugWrapperElt.style.padding = "7px";
  debugWrapperElt.style.fontSize = "13px";
  debugWrapperElt.style.fontFamily = "mono";
  debugWrapperElt.style.color = "white";
  debugWrapperElt.style.display = "inline-block";
  debugWrapperElt.style.bottom = "0px";
  parentElt.appendChild(debugWrapperElt);
  cancelSignal.register(() => {
    parentElt.removeChild(debugWrapperElt);
  });
}
