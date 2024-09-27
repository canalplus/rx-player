import type { IAdaptation, IPeriod, IRepresentation } from "../../../../public_types";
import isNullOrUndefined from "../../../../utils/is_null_or_undefined";
import type { CancellationSignal } from "../../../../utils/task_canceller";
import type { IBufferType } from "../../../segment_buffers";
import type RxPlayer from "../../public_api";
import SegmentBufferGraph from "../buffer_graph";
import { DEFAULT_REFRESH_INTERVAL } from "../constants";
import {
  createElement,
  createGraphCanvas,
  createMetricTitle,
  isExtendedMode,
} from "../utils";

export default function createSegmentBufferGraph(
  instance: RxPlayer,
  bufferType: IBufferType,
  title: string,
  parentElt: HTMLElement,
  cancelSignal: CancellationSignal,
): HTMLElement {
  const bufferGraphWrapper = createElement("div");
  const bufferTitle = createMetricTitle(title);
  const canvasElt = createGraphCanvas();
  const bufferSizeElt = document.createElement("span");
  const currentRangeRepInfoElt = createElement("div");
  const loadingRangeRepInfoElt = createElement("div");
  const bufferGraph = new SegmentBufferGraph(canvasElt);
  const intervalId = setInterval(update, DEFAULT_REFRESH_INTERVAL);
  cancelSignal.register(() => {
    clearInterval(intervalId);
  });
  bufferGraphWrapper.appendChild(bufferTitle);
  bufferGraphWrapper.appendChild(canvasElt);
  bufferGraphWrapper.appendChild(bufferSizeElt);
  bufferGraphWrapper.appendChild(currentRangeRepInfoElt);
  bufferGraphWrapper.appendChild(loadingRangeRepInfoElt);
  bufferSizeElt.style.marginLeft = "5px";
  bufferSizeElt.style.fontSize = "0.9em";
  bufferGraphWrapper.style.padding = "5px 0px";
  update();
  return bufferGraphWrapper;

  function update() {
    if (instance.getVideoElement() === null) {
      // disposed player. Clean-up everything
      bufferGraphWrapper.style.display = "none";
      bufferGraphWrapper.innerHTML = "";
      clearInterval(intervalId);
      return;
    }
    const showAllInfo = isExtendedMode(parentElt);
    const inventory = instance.__priv_getSegmentBufferContent(bufferType);
    if (inventory === null) {
      bufferGraphWrapper.style.display = "none";
      bufferSizeElt.innerHTML = "";
      currentRangeRepInfoElt.innerHTML = "";
      loadingRangeRepInfoElt.innerHTML = "";
    } else {
      let sizeEstimate: number | undefined;
      for (const segment of inventory) {
        if (segment.chunkSize === undefined) {
          sizeEstimate = undefined;
          break;
        } else if (sizeEstimate === undefined) {
          sizeEstimate = segment.chunkSize;
        } else {
          sizeEstimate += segment.chunkSize;
        }
      }
      bufferGraphWrapper.style.display = "block";
      if (sizeEstimate !== undefined) {
        let sizeStr: string;
        if (sizeEstimate > 2e6) {
          sizeStr = (sizeEstimate / 1e6).toFixed(2) + "MB";
        } else if (sizeEstimate > 2e3) {
          sizeStr = (sizeEstimate / 1e3).toFixed(2) + "kB";
        } else {
          sizeStr = sizeEstimate + "B";
        }
        bufferSizeElt.innerHTML = sizeStr;
      } else {
        bufferSizeElt.innerHTML = "";
      }
      const currentTime = instance.getPosition();
      const width = Math.min(parentElt.clientWidth - 150, 600);
      bufferGraph.update({
        currentTime,
        minimumPosition: instance.getMinimumPosition() ?? undefined,
        maximumPosition: instance.getMaximumPosition() ?? undefined,
        inventory,
        width,
        height: 10,
      });

      if (!showAllInfo) {
        currentRangeRepInfoElt.innerHTML = "";
        loadingRangeRepInfoElt.innerHTML = "";
        return;
      }

      currentRangeRepInfoElt.innerHTML = "";
      for (let i = 0; i < inventory.length; i++) {
        const rangeInfo = inventory[i];
        const { bufferedStart, bufferedEnd, infos } = rangeInfo;
        if (
          bufferedStart !== undefined &&
          bufferedEnd !== undefined &&
          currentTime >= bufferedStart &&
          currentTime < bufferedEnd
        ) {
          currentRangeRepInfoElt.appendChild(createMetricTitle("play"));
          currentRangeRepInfoElt.appendChild(
            createElement("span", {
              textContent: constructRepresentationInfo(infos),
            }),
          );
          break;
        }
      }

      loadingRangeRepInfoElt.innerHTML = "";
      const rep = instance.getCurrentRepresentations()?.[bufferType];
      const adap = instance.getCurrentAdaptations()?.[bufferType];
      const manifest = instance.getManifest();
      if (manifest !== null && !isNullOrUndefined(rep) && !isNullOrUndefined(adap)) {
        const period = manifest.getPeriodForTime(currentTime);
        if (period !== undefined) {
          loadingRangeRepInfoElt.appendChild(createMetricTitle("load"));
          loadingRangeRepInfoElt.appendChild(
            createElement("span", {
              textContent: constructRepresentationInfo({
                period,
                adaptation: adap,
                representation: rep,
              }),
            }),
          );
        }
      }
    }
  }
}

function constructRepresentationInfo(content: {
  period: IPeriod;
  adaptation: IAdaptation;
  representation: IRepresentation;
}): string {
  const period = content.period;
  const {
    language,
    isAudioDescription,
    isClosedCaption,
    isTrickModeTrack,
    isSignInterpreted,
    type: bufferType,
  } = content.adaptation;
  const { id, height, width, bitrate, codec } = content.representation;
  let representationInfo = `"${id}" `;
  if (height !== undefined && width !== undefined) {
    representationInfo += `${width}x${height} `;
  }
  if (bitrate !== undefined) {
    representationInfo += `(${(bitrate / 1000).toFixed(0)}kbps) `;
  }
  if (codec !== undefined) {
    representationInfo += `c:"${codec}" `;
  }
  if (language !== undefined) {
    representationInfo += `l:"${language}" `;
  }
  if (bufferType === "video" && typeof isSignInterpreted === "boolean") {
    representationInfo += `si:${isSignInterpreted ? 1 : 0} `;
  }
  if (bufferType === "video" && typeof isTrickModeTrack === "boolean") {
    representationInfo += `tm:${isTrickModeTrack ? 1 : 0} `;
  }
  if (bufferType === "audio" && typeof isAudioDescription === "boolean") {
    representationInfo += `ad:${isAudioDescription ? 1 : 0} `;
  }
  if (bufferType === "text" && typeof isClosedCaption === "boolean") {
    representationInfo += `cc:${isClosedCaption ? 1 : 0} `;
  }
  representationInfo += `p:${period.start}-${period.end ?? "?"}`;
  return representationInfo;
}
