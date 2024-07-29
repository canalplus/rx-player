import hasMseInWorker from "../../../../compat/has_mse_in_worker";
import type { CancellationSignal } from "../../../../utils/task_canceller";
import type RxPlayer from "../../public_api";
import { DEFAULT_REFRESH_INTERVAL } from "../constants";
import {
  createCompositeElement,
  createElement,
  createMetricTitle,
  isExtendedMode,
} from "../utils";

export default function constructDebugGeneralInfo(
  instance: RxPlayer,
  parentElt: HTMLElement,
  cancelSignal: CancellationSignal,
): HTMLElement {
  const generalInfoElt = createElement("div");
  const adaptationsElt = createElement("div");
  const representationsElt = createElement("div");
  updateGeneralInfo();
  const generalInfoItv = setInterval(() => {
    updateGeneralInfo();
  }, DEFAULT_REFRESH_INTERVAL);
  cancelSignal.register(() => {
    clearInterval(generalInfoItv);
  });

  return createCompositeElement("div", [
    generalInfoElt,
    adaptationsElt,
    representationsElt,
  ]);
  function updateGeneralInfo() {
    const videoElement = instance.getVideoElement();
    if (videoElement === null) {
      // disposed player. Clean-up everything
      generalInfoElt.innerHTML = "";
      adaptationsElt.innerHTML = "";
      representationsElt.innerHTML = "";
      clearInterval(generalInfoItv);
      return;
    } else {
      const currentTime = instance.getPosition();
      const bufferGap = instance.getCurrentBufferGap();
      const bufferGapStr = bufferGap === Infinity ? "0" : bufferGap.toFixed(2);
      const valuesLine1: Array<[string, string]> = [
        ["ct", currentTime.toFixed(2)],
        ["bg", bufferGapStr],
        ["rs", String(videoElement.readyState)],
        ["pr", String(videoElement.playbackRate)],
        ["sp", String(instance.getPlaybackRate())],
        ["pa", String(videoElement.paused ? 1 : 0)],
        ["en", String(videoElement.ended ? 1 : 0)],
        ["li", String(instance.isLive() ? 1 : 0)],
        ["wba", String(instance.getWantedBufferAhead())],
        ["st", `"${instance.getPlayerState()}"`],
      ];
      if (instance.getCurrentModeInformation()?.useWorker === true) {
        if (hasMseInWorker) {
          valuesLine1.push(["wo", "2"]);
        } else {
          valuesLine1.push(["wo", "1"]);
        }
      } else {
        valuesLine1.push(["wo", "0"]);
      }

      const valuesLine2: Array<[string, string]> = [];
      const ks = instance.getKeySystemConfiguration();
      if (ks !== null) {
        valuesLine2.push(["ks", ks.keySystem]);
      }
      const mbb = instance.getMaxBufferBehind();
      if (mbb !== Infinity) {
        valuesLine2.push(["mbb", String(mbb)]);
      }
      const mba = instance.getMaxBufferAhead();
      if (mba !== Infinity) {
        valuesLine2.push(["mba", String(mba)]);
      }
      const mbs = instance.getMaxVideoBufferSize();
      if (mbs !== Infinity) {
        valuesLine2.push(["mbs", String(mbs)]);
      }
      const minPos = instance.getMinimumPosition();
      if (minPos !== null) {
        valuesLine1.push(["mip", minPos.toFixed(2)]);
        valuesLine2.push(["dmi", (currentTime - minPos).toFixed(2)]);
      }
      const maxPos = instance.getMaximumPosition();
      if (maxPos !== null) {
        valuesLine1.push(["map", maxPos.toFixed(2)]);
        valuesLine2.push(["dma", (maxPos - currentTime).toFixed(2)]);
      }
      const valuesLine3: Array<[string, string]> = [];
      const error = instance.getError();
      if (error !== null) {
        valuesLine3.push(["er", `"${String(error)}"`]);
      }
      generalInfoElt.innerHTML = "";
      for (const valueSet of [valuesLine1, valuesLine2, valuesLine3]) {
        if (valueSet.length > 0) {
          const lineInfoElt = createElement("div");
          for (const value of valueSet) {
            lineInfoElt.appendChild(createMetricTitle(value[0]));
            lineInfoElt.appendChild(
              createElement("span", {
                textContent: value[1] + " ",
              }),
            );
          }
          generalInfoElt.appendChild(lineInfoElt);
        }
      }
      if (isExtendedMode(parentElt)) {
        const url = instance.getContentUrls()?.[0];
        if (url !== undefined) {
          const reducedUrl = url.length > 100 ? url.substring(0, 99) + "…" : url;

          generalInfoElt.appendChild(
            createCompositeElement("div", [
              createMetricTitle("url"),
              createElement("span", {
                textContent: reducedUrl,
              }),
            ]),
          );
        }
      }
    }
    if (isExtendedMode(parentElt)) {
      const videoId = instance
        .getAvailableVideoTracks()
        .map(({ id, active }) => (active ? `*${id}` : id));
      const audioId = instance
        .getAvailableAudioTracks()
        .map(({ id, active }) => (active ? `*${id}` : id));
      const textId = instance
        .getAvailableTextTracks()
        .map(({ id, active }) => (active ? `*${id}` : id));
      adaptationsElt.innerHTML = "";
      if (videoId.length > 0) {
        let textContent = `${videoId.length}:${videoId.join(" ")} `;
        if (textContent.length > 100) {
          textContent = textContent.substring(0, 98) + "… ";
        }
        const videoAdaps = createCompositeElement("div", [
          createMetricTitle("vt"),
          createElement("span", { textContent }),
        ]);
        adaptationsElt.appendChild(videoAdaps);
      }
      if (audioId.length > 0) {
        let textContent = `${audioId.length}:${audioId.join(" ")} `;
        if (textContent.length > 100) {
          textContent = textContent.substring(0, 98) + "… ";
        }
        const audioAdaps = createCompositeElement("div", [
          createMetricTitle("at"),
          createElement("span", { textContent }),
        ]);
        adaptationsElt.appendChild(audioAdaps);
      }
      if (textId.length > 0) {
        let textContent = `${textId.length}:${textId.join(" ")} `;
        if (textContent.length > 100) {
          textContent = textContent.substring(0, 98) + "… ";
        }
        const textAdaps = createCompositeElement("div", [
          createMetricTitle("tt"),
          createElement("span", { textContent }),
        ]);
        adaptationsElt.appendChild(textAdaps);
      }
      const tracks = instance.__priv_getCurrentTracks();
      const videoBitratesStr =
        tracks?.video?.representations.map((r) => {
          return (
            String(r.bitrate ?? "N/A") +
            (r.isSupported !== false ? "" : " U!") +
            (r.decipherable !== false ? "" : " E!")
          );
        }) ?? [];
      const audioBitratesStr =
        tracks?.audio?.representations.map((r) => {
          return (
            String(r.bitrate ?? "N/A") +
            (r.isSupported !== false ? "" : " U!") +
            (r.decipherable !== false ? "" : " E!")
          );
        }) ?? [];
      representationsElt.innerHTML = "";
      if (videoBitratesStr.length > 0) {
        representationsElt.appendChild(createMetricTitle("vb"));
        representationsElt.appendChild(
          createElement("span", {
            textContent: videoBitratesStr.join(" ") + " ",
          }),
        );
      }
      if (audioBitratesStr.length > 0) {
        representationsElt.appendChild(createMetricTitle("ab"));
        representationsElt.appendChild(
          createElement("span", {
            textContent: audioBitratesStr.join(" ") + " ",
          }),
        );
      }
    } else {
      adaptationsElt.innerHTML = "";
      representationsElt.innerHTML = "";
    }
  }
}
