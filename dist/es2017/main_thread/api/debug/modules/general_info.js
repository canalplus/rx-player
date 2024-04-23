import hasMseInWorker from "../../../../compat/has_mse_in_worker";
import { DEFAULT_REFRESH_INTERVAL } from "../constants";
import { createCompositeElement, createElement, createMetricTitle, isExtendedMode, } from "../utils";
export default function constructDebugGeneralInfo(instance, parentElt, cancelSignal) {
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
        var _a, _b, _c, _d, _e, _f;
        const videoElement = instance.getVideoElement();
        if (videoElement === null) {
            // disposed player. Clean-up everything
            generalInfoElt.innerHTML = "";
            adaptationsElt.innerHTML = "";
            representationsElt.innerHTML = "";
            clearInterval(generalInfoItv);
            return;
        }
        else {
            const currentTime = instance.getPosition();
            const bufferGap = instance.getCurrentBufferGap();
            const bufferGapStr = bufferGap === Infinity ? "0" : bufferGap.toFixed(2);
            const valuesLine1 = [
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
            if (((_a = instance.getCurrentModeInformation()) === null || _a === void 0 ? void 0 : _a.useWorker) === true) {
                if (hasMseInWorker) {
                    valuesLine1.push(["wo", "2"]);
                }
                else {
                    valuesLine1.push(["wo", "1"]);
                }
            }
            else {
                valuesLine1.push(["wo", "0"]);
            }
            const valuesLine2 = [];
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
            const valuesLine3 = [];
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
                        lineInfoElt.appendChild(createElement("span", {
                            textContent: value[1] + " ",
                        }));
                    }
                    generalInfoElt.appendChild(lineInfoElt);
                }
            }
            if (isExtendedMode(parentElt)) {
                const url = (_b = instance.getContentUrls()) === null || _b === void 0 ? void 0 : _b[0];
                if (url !== undefined) {
                    const reducedUrl = url.length > 100 ? url.substring(0, 99) + "…" : url;
                    generalInfoElt.appendChild(createCompositeElement("div", [
                        createMetricTitle("url"),
                        createElement("span", {
                            textContent: reducedUrl,
                        }),
                    ]));
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
            const adaptations = instance.__priv_getCurrentAdaptation();
            const videoBitratesStr = (_d = (_c = adaptations === null || adaptations === void 0 ? void 0 : adaptations.video) === null || _c === void 0 ? void 0 : _c.representations.map((r) => {
                var _a;
                return (String((_a = r.bitrate) !== null && _a !== void 0 ? _a : "N/A") +
                    (r.isSupported !== false ? "" : " U!") +
                    (r.decipherable !== false ? "" : " E!"));
            })) !== null && _d !== void 0 ? _d : [];
            const audioBitratesStr = (_f = (_e = adaptations === null || adaptations === void 0 ? void 0 : adaptations.audio) === null || _e === void 0 ? void 0 : _e.representations.map((r) => {
                var _a;
                return (String((_a = r.bitrate) !== null && _a !== void 0 ? _a : "N/A") +
                    (r.isSupported !== false ? "" : " U!") +
                    (r.decipherable !== false ? "" : " E!"));
            })) !== null && _f !== void 0 ? _f : [];
            representationsElt.innerHTML = "";
            if (videoBitratesStr.length > 0) {
                representationsElt.appendChild(createMetricTitle("vb"));
                representationsElt.appendChild(createElement("span", {
                    textContent: videoBitratesStr.join(" ") + " ",
                }));
            }
            if (audioBitratesStr.length > 0) {
                representationsElt.appendChild(createMetricTitle("ab"));
                representationsElt.appendChild(createElement("span", {
                    textContent: audioBitratesStr.join(" ") + " ",
                }));
            }
        }
        else {
            adaptationsElt.innerHTML = "";
            representationsElt.innerHTML = "";
        }
    }
}
