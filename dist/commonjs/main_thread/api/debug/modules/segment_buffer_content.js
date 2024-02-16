"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var manifest_1 = require("../../../../manifest");
var is_null_or_undefined_1 = require("../../../../utils/is_null_or_undefined");
var buffer_graph_1 = require("../buffer_graph");
var constants_1 = require("../constants");
var utils_1 = require("../utils");
function createSegmentSinkGraph(instance, bufferType, title, parentElt, cancelSignal) {
    var bufferGraphWrapper = (0, utils_1.createElement)("div");
    var bufferTitle = (0, utils_1.createMetricTitle)(title);
    var canvasElt = (0, utils_1.createGraphCanvas)();
    var currentRangeRepInfoElt = (0, utils_1.createElement)("div");
    var loadingRangeRepInfoElt = (0, utils_1.createElement)("div");
    var bufferGraph = new buffer_graph_1.default(canvasElt);
    var intervalId = setInterval(update, constants_1.DEFAULT_REFRESH_INTERVAL);
    cancelSignal.register(function () {
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
        var showAllInfo = (0, utils_1.isExtendedMode)(parentElt);
        var inventory = instance.__priv_getSegmentSinkContent(bufferType);
        if (inventory === null) {
            bufferGraphWrapper.style.display = "none";
            currentRangeRepInfoElt.innerHTML = "";
            loadingRangeRepInfoElt.innerHTML = "";
        }
        else {
            bufferGraphWrapper.style.display = "block";
            var currentTime = instance.getPosition();
            var width = Math.min(parentElt.clientWidth - 150, 600);
            bufferGraph.update({
                currentTime: currentTime,
                minimumPosition: (_a = instance.getMinimumPosition()) !== null && _a !== void 0 ? _a : undefined,
                maximumPosition: (_b = instance.getMaximumPosition()) !== null && _b !== void 0 ? _b : undefined,
                inventory: inventory,
                width: width,
                height: 10,
            });
            if (!showAllInfo) {
                currentRangeRepInfoElt.innerHTML = "";
                loadingRangeRepInfoElt.innerHTML = "";
                return;
            }
            currentRangeRepInfoElt.innerHTML = "";
            for (var i = 0; i < inventory.length; i++) {
                var rangeInfo = inventory[i];
                var bufferedStart = rangeInfo.bufferedStart, bufferedEnd = rangeInfo.bufferedEnd, infos = rangeInfo.infos;
                if (bufferedStart !== undefined &&
                    bufferedEnd !== undefined &&
                    currentTime >= bufferedStart &&
                    currentTime < bufferedEnd) {
                    currentRangeRepInfoElt.appendChild((0, utils_1.createMetricTitle)("play"));
                    currentRangeRepInfoElt.appendChild((0, utils_1.createElement)("span", {
                        textContent: constructRepresentationInfo(infos),
                    }));
                    break;
                }
            }
            loadingRangeRepInfoElt.innerHTML = "";
            var rep = (_c = instance.__priv_getCurrentRepresentations()) === null || _c === void 0 ? void 0 : _c[bufferType];
            var adap = (_d = instance.__priv_getCurrentAdaptation()) === null || _d === void 0 ? void 0 : _d[bufferType];
            var manifest = instance.__priv_getManifest();
            if (manifest !== null && !(0, is_null_or_undefined_1.default)(rep) && !(0, is_null_or_undefined_1.default)(adap)) {
                var period = (0, manifest_1.getPeriodForTime)(manifest, currentTime);
                if (period !== undefined) {
                    loadingRangeRepInfoElt.appendChild((0, utils_1.createMetricTitle)("load"));
                    loadingRangeRepInfoElt.appendChild((0, utils_1.createElement)("span", {
                        textContent: constructRepresentationInfo({
                            period: period,
                            adaptation: adap,
                            representation: rep,
                        }),
                    }));
                }
            }
        }
    }
}
exports.default = createSegmentSinkGraph;
function constructRepresentationInfo(content) {
    var _a;
    var period = content.period;
    var _b = content.adaptation, language = _b.language, isAudioDescription = _b.isAudioDescription, isClosedCaption = _b.isClosedCaption, isTrickModeTrack = _b.isTrickModeTrack, isSignInterpreted = _b.isSignInterpreted, bufferType = _b.type;
    var _c = content.representation, id = _c.id, height = _c.height, width = _c.width, bitrate = _c.bitrate, codecs = _c.codecs;
    var representationInfo = "\"".concat(id, "\" ");
    if (height !== undefined && width !== undefined) {
        representationInfo += "".concat(width, "x").concat(height, " ");
    }
    if (bitrate !== undefined) {
        representationInfo += "(".concat((bitrate / 1000).toFixed(0), "kbps) ");
    }
    if (codecs !== undefined && codecs.length > 0) {
        representationInfo += "c:\"".concat(codecs.join(" / "), "\" ");
    }
    if (language !== undefined) {
        representationInfo += "l:\"".concat(language, "\" ");
    }
    if (bufferType === "video" && typeof isSignInterpreted === "boolean") {
        representationInfo += "si:".concat(isSignInterpreted ? 1 : 0, " ");
    }
    if (bufferType === "video" && typeof isTrickModeTrack === "boolean") {
        representationInfo += "tm:".concat(isTrickModeTrack ? 1 : 0, " ");
    }
    if (bufferType === "audio" && typeof isAudioDescription === "boolean") {
        representationInfo += "ad:".concat(isAudioDescription ? 1 : 0, " ");
    }
    if (bufferType === "text" && typeof isClosedCaption === "boolean") {
        representationInfo += "cc:".concat(isClosedCaption ? 1 : 0, " ");
    }
    representationInfo += "p:".concat(period.start, "-").concat((_a = period.end) !== null && _a !== void 0 ? _a : "?");
    return representationInfo;
}
