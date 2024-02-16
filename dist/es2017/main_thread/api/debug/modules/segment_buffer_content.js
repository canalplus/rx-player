import { getPeriodForTime } from "../../../../manifest";
import isNullOrUndefined from "../../../../utils/is_null_or_undefined";
import SegmentSinkGraph from "../buffer_graph";
import { DEFAULT_REFRESH_INTERVAL } from "../constants";
import { createElement, createGraphCanvas, createMetricTitle, isExtendedMode, } from "../utils";
export default function createSegmentSinkGraph(instance, bufferType, title, parentElt, cancelSignal) {
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
    bufferGraphWrapper.appendChild(bufferTitle);
    bufferGraphWrapper.appendChild(canvasElt);
    bufferGraphWrapper.appendChild(currentRangeRepInfoElt);
    bufferGraphWrapper.appendChild(loadingRangeRepInfoElt);
    bufferGraphWrapper.style.padding = "5px 0px";
    update();
    return bufferGraphWrapper;
    function update() {
        var _a, _b, _c, _d;
        if (instance.getVideoElement() === null) {
            // disposed player. Clean-up everything
            bufferGraphWrapper.style.display = "none";
            bufferGraphWrapper.innerHTML = "";
            clearInterval(intervalId);
            return;
        }
        const showAllInfo = isExtendedMode(parentElt);
        const inventory = instance.__priv_getSegmentSinkContent(bufferType);
        if (inventory === null) {
            bufferGraphWrapper.style.display = "none";
            currentRangeRepInfoElt.innerHTML = "";
            loadingRangeRepInfoElt.innerHTML = "";
        }
        else {
            bufferGraphWrapper.style.display = "block";
            const currentTime = instance.getPosition();
            const width = Math.min(parentElt.clientWidth - 150, 600);
            bufferGraph.update({
                currentTime,
                minimumPosition: (_a = instance.getMinimumPosition()) !== null && _a !== void 0 ? _a : undefined,
                maximumPosition: (_b = instance.getMaximumPosition()) !== null && _b !== void 0 ? _b : undefined,
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
                if (bufferedStart !== undefined &&
                    bufferedEnd !== undefined &&
                    currentTime >= bufferedStart &&
                    currentTime < bufferedEnd) {
                    currentRangeRepInfoElt.appendChild(createMetricTitle("play"));
                    currentRangeRepInfoElt.appendChild(createElement("span", {
                        textContent: constructRepresentationInfo(infos),
                    }));
                    break;
                }
            }
            loadingRangeRepInfoElt.innerHTML = "";
            const rep = (_c = instance.__priv_getCurrentRepresentations()) === null || _c === void 0 ? void 0 : _c[bufferType];
            const adap = (_d = instance.__priv_getCurrentAdaptation()) === null || _d === void 0 ? void 0 : _d[bufferType];
            const manifest = instance.__priv_getManifest();
            if (manifest !== null && !isNullOrUndefined(rep) && !isNullOrUndefined(adap)) {
                const period = getPeriodForTime(manifest, currentTime);
                if (period !== undefined) {
                    loadingRangeRepInfoElt.appendChild(createMetricTitle("load"));
                    loadingRangeRepInfoElt.appendChild(createElement("span", {
                        textContent: constructRepresentationInfo({
                            period,
                            adaptation: adap,
                            representation: rep,
                        }),
                    }));
                }
            }
        }
    }
}
function constructRepresentationInfo(content) {
    var _a;
    const period = content.period;
    const { language, isAudioDescription, isClosedCaption, isTrickModeTrack, isSignInterpreted, type: bufferType, } = content.adaptation;
    const { id, height, width, bitrate, codecs } = content.representation;
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
    representationInfo += `p:${period.start}-${(_a = period.end) !== null && _a !== void 0 ? _a : "?"}`;
    return representationInfo;
}
