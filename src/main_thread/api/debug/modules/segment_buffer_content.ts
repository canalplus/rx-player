import type { ISegmentSinkMetrics } from "../../../../core/segment_sinks/segment_buffers_store";
import type { IBufferType } from "../../../../core/types";
import type {
  ITrackMetadata,
  IPeriodMetadata,
  IRepresentationMetadata,
} from "../../../../manifest";
import { getPeriodForTime } from "../../../../manifest";
import isNullOrUndefined from "../../../../utils/is_null_or_undefined";
import type { CancellationSignal } from "../../../../utils/task_canceller";
import type RxPlayer from "../../public_api";
import SegmentSinkGraph from "../buffer_graph";
import { DEFAULT_REFRESH_INTERVAL } from "../constants";
import {
  createElement,
  createGraphCanvas,
  createMetricTitle,
  isExtendedMode,
} from "../utils";

export default function createSegmentSinkGraph(
  instance: RxPlayer,
  bufferType: IBufferType,
  title: string,
  parentElt: HTMLElement,
  cancelSignal: CancellationSignal,
): HTMLElement {
  const bufferGraphWrapper = createElement("div");
  const bufferTitle = createMetricTitle(title);
  const canvasElt = createGraphCanvas();
  const currentRangeRepInfoElt = createElement("div");
  const loadingRangeRepInfoElt = createElement("div");
  const bufferGraph = new SegmentSinkGraph(canvasElt);
  const intervalId = setInterval(update, DEFAULT_REFRESH_INTERVAL);
  cancelSignal.register(() => {
    clearInterval(intervalId);
  });

  let bufferMetrics: ISegmentSinkMetrics | null = null;
  instance
    .__priv_getSegmentSinkMetrics()
    .then((metrics) => {
      bufferMetrics = metrics ?? null;
    })
    .catch(() => {
      // Do nothing
    });

  bufferGraphWrapper.appendChild(bufferTitle);
  bufferGraphWrapper.appendChild(canvasElt);
  bufferGraphWrapper.appendChild(currentRangeRepInfoElt);
  bufferGraphWrapper.appendChild(loadingRangeRepInfoElt);
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
    instance
      .__priv_getSegmentSinkMetrics()
      .then((metrics) => {
        bufferMetrics = metrics ?? null;
        updateBufferMetrics();
      })
      .catch(() => {
        // DO nothing
      });
  }

  function updateBufferMetrics() {
    const showAllInfo = isExtendedMode(parentElt);
    const inventory = bufferMetrics?.segmentSinks[bufferType].segmentInventory;
    if (bufferMetrics === null || inventory === undefined) {
      bufferGraphWrapper.style.display = "none";
      currentRangeRepInfoElt.innerHTML = "";
      loadingRangeRepInfoElt.innerHTML = "";
    } else {
      bufferGraphWrapper.style.display = "block";
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
      for (const rangeInfo of inventory) {
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
      const rep = instance.__priv_getCurrentRepresentations()?.[bufferType];
      const track = instance.__priv_getCurrentTracks()?.[bufferType];
      const manifest = instance.__priv_getManifest();
      if (manifest !== null && !isNullOrUndefined(rep) && !isNullOrUndefined(track)) {
        const period = getPeriodForTime(manifest, currentTime);
        if (period !== undefined) {
          loadingRangeRepInfoElt.appendChild(createMetricTitle("load"));
          loadingRangeRepInfoElt.appendChild(
            createElement("span", {
              textContent: constructRepresentationInfo({
                period,
                track,
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
  period: IPeriodMetadata;
  track: ITrackMetadata;
  representation: IRepresentationMetadata;
}): string {
  const { period, track, representation } = content;
  const { id, height, width, bitrate, codecs } = representation;
  let representationInfo = `"${id}" `;
  if (height !== undefined && width !== undefined) {
    representationInfo += `${width}x${height} `;
  }
  if (bitrate !== undefined) {
    representationInfo += `(${(bitrate / 1000).toFixed(0)}kbps) `;
  }
  if (codecs !== undefined && codecs.length > 0) {
    representationInfo += `c:"${codecs.join(" / ")}" `;
  }
  if (track.language !== undefined) {
    representationInfo += `l:"${track.language}" `;
  }
  if (track.trackType === "video" && typeof track.isSignInterpreted === "boolean") {
    representationInfo += `si:${track.isSignInterpreted ? 1 : 0} `;
  }
  if (track.trackType === "video" && typeof track.isTrickModeTrack === "boolean") {
    representationInfo += `tm:${track.isTrickModeTrack ? 1 : 0} `;
  }
  if (track.trackType === "audio" && typeof track.isAudioDescription === "boolean") {
    representationInfo += `ad:${track.isAudioDescription ? 1 : 0} `;
  }
  if (track.trackType === "text" && typeof track.isClosedCaption === "boolean") {
    representationInfo += `cc:${track.isClosedCaption ? 1 : 0} `;
  }
  representationInfo += `p:${period.start}-${period.end ?? "?"}`;
  return representationInfo;
}
