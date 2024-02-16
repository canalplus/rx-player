"use strict";
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
var has_mse_in_worker_1 = require("../../../../compat/has_mse_in_worker");
var constants_1 = require("../constants");
var utils_1 = require("../utils");
function constructDebugGeneralInfo(instance, parentElt, cancelSignal) {
    var generalInfoElt = (0, utils_1.createElement)("div");
    var adaptationsElt = (0, utils_1.createElement)("div");
    var representationsElt = (0, utils_1.createElement)("div");
    updateGeneralInfo();
    var generalInfoItv = setInterval(function () {
        updateGeneralInfo();
    }, constants_1.DEFAULT_REFRESH_INTERVAL);
    cancelSignal.register(function () {
        clearInterval(generalInfoItv);
    });
    return (0, utils_1.createCompositeElement)("div", [
        generalInfoElt,
        adaptationsElt,
        representationsElt,
    ]);
    function updateGeneralInfo() {
        var e_1, _a, e_2, _b;
        var _c, _d, _e, _f, _g, _h;
        var videoElement = instance.getVideoElement();
        if (videoElement === null) {
            // disposed player. Clean-up everything
            generalInfoElt.innerHTML = "";
            adaptationsElt.innerHTML = "";
            representationsElt.innerHTML = "";
            clearInterval(generalInfoItv);
            return;
        }
        else {
            var currentTime = instance.getPosition();
            var bufferGap = instance.getCurrentBufferGap();
            var bufferGapStr = bufferGap === Infinity ? "0" : bufferGap.toFixed(2);
            var valuesLine1 = [
                ["ct", currentTime.toFixed(2)],
                ["bg", bufferGapStr],
                ["rs", String(videoElement.readyState)],
                ["pr", String(videoElement.playbackRate)],
                ["sp", String(instance.getPlaybackRate())],
                ["pa", String(videoElement.paused ? 1 : 0)],
                ["en", String(videoElement.ended ? 1 : 0)],
                ["li", String(instance.isLive() ? 1 : 0)],
                ["wba", String(instance.getWantedBufferAhead())],
                ["st", "\"".concat(instance.getPlayerState(), "\"")],
            ];
            if (((_c = instance.getCurrentModeInformation()) === null || _c === void 0 ? void 0 : _c.useWorker) === true) {
                if (has_mse_in_worker_1.default) {
                    valuesLine1.push(["wo", "2"]);
                }
                else {
                    valuesLine1.push(["wo", "1"]);
                }
            }
            else {
                valuesLine1.push(["wo", "0"]);
            }
            var valuesLine2 = [];
            var ks = instance.getKeySystemConfiguration();
            if (ks !== null) {
                valuesLine2.push(["ks", ks.keySystem]);
            }
            var mbb = instance.getMaxBufferBehind();
            if (mbb !== Infinity) {
                valuesLine2.push(["mbb", String(mbb)]);
            }
            var mba = instance.getMaxBufferAhead();
            if (mba !== Infinity) {
                valuesLine2.push(["mba", String(mba)]);
            }
            var mbs = instance.getMaxVideoBufferSize();
            if (mbs !== Infinity) {
                valuesLine2.push(["mbs", String(mbs)]);
            }
            var minPos = instance.getMinimumPosition();
            if (minPos !== null) {
                valuesLine1.push(["mip", minPos.toFixed(2)]);
                valuesLine2.push(["dmi", (currentTime - minPos).toFixed(2)]);
            }
            var maxPos = instance.getMaximumPosition();
            if (maxPos !== null) {
                valuesLine1.push(["map", maxPos.toFixed(2)]);
                valuesLine2.push(["dma", (maxPos - currentTime).toFixed(2)]);
            }
            var valuesLine3 = [];
            var error = instance.getError();
            if (error !== null) {
                valuesLine3.push(["er", "\"".concat(String(error), "\"")]);
            }
            generalInfoElt.innerHTML = "";
            try {
                for (var _j = __values([valuesLine1, valuesLine2, valuesLine3]), _k = _j.next(); !_k.done; _k = _j.next()) {
                    var valueSet = _k.value;
                    if (valueSet.length > 0) {
                        var lineInfoElt = (0, utils_1.createElement)("div");
                        try {
                            for (var valueSet_1 = (e_2 = void 0, __values(valueSet)), valueSet_1_1 = valueSet_1.next(); !valueSet_1_1.done; valueSet_1_1 = valueSet_1.next()) {
                                var value = valueSet_1_1.value;
                                lineInfoElt.appendChild((0, utils_1.createMetricTitle)(value[0]));
                                lineInfoElt.appendChild((0, utils_1.createElement)("span", {
                                    textContent: value[1] + " ",
                                }));
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (valueSet_1_1 && !valueSet_1_1.done && (_b = valueSet_1.return)) _b.call(valueSet_1);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                        generalInfoElt.appendChild(lineInfoElt);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_k && !_k.done && (_a = _j.return)) _a.call(_j);
                }
                finally { if (e_1) throw e_1.error; }
            }
            if ((0, utils_1.isExtendedMode)(parentElt)) {
                var url = (_d = instance.getContentUrls()) === null || _d === void 0 ? void 0 : _d[0];
                if (url !== undefined) {
                    var reducedUrl = url.length > 100 ? url.substring(0, 99) + "…" : url;
                    generalInfoElt.appendChild((0, utils_1.createCompositeElement)("div", [
                        (0, utils_1.createMetricTitle)("url"),
                        (0, utils_1.createElement)("span", {
                            textContent: reducedUrl,
                        }),
                    ]));
                }
            }
        }
        if ((0, utils_1.isExtendedMode)(parentElt)) {
            var videoId = instance
                .getAvailableVideoTracks()
                .map(function (_a) {
                var id = _a.id, active = _a.active;
                return (active ? "*".concat(id) : id);
            });
            var audioId = instance
                .getAvailableAudioTracks()
                .map(function (_a) {
                var id = _a.id, active = _a.active;
                return (active ? "*".concat(id) : id);
            });
            var textId = instance
                .getAvailableTextTracks()
                .map(function (_a) {
                var id = _a.id, active = _a.active;
                return (active ? "*".concat(id) : id);
            });
            adaptationsElt.innerHTML = "";
            if (videoId.length > 0) {
                var textContent = "".concat(videoId.length, ":").concat(videoId.join(" "), " ");
                if (textContent.length > 100) {
                    textContent = textContent.substring(0, 98) + "… ";
                }
                var videoAdaps = (0, utils_1.createCompositeElement)("div", [
                    (0, utils_1.createMetricTitle)("vt"),
                    (0, utils_1.createElement)("span", { textContent: textContent }),
                ]);
                adaptationsElt.appendChild(videoAdaps);
            }
            if (audioId.length > 0) {
                var textContent = "".concat(audioId.length, ":").concat(audioId.join(" "), " ");
                if (textContent.length > 100) {
                    textContent = textContent.substring(0, 98) + "… ";
                }
                var audioAdaps = (0, utils_1.createCompositeElement)("div", [
                    (0, utils_1.createMetricTitle)("at"),
                    (0, utils_1.createElement)("span", { textContent: textContent }),
                ]);
                adaptationsElt.appendChild(audioAdaps);
            }
            if (textId.length > 0) {
                var textContent = "".concat(textId.length, ":").concat(textId.join(" "), " ");
                if (textContent.length > 100) {
                    textContent = textContent.substring(0, 98) + "… ";
                }
                var textAdaps = (0, utils_1.createCompositeElement)("div", [
                    (0, utils_1.createMetricTitle)("tt"),
                    (0, utils_1.createElement)("span", { textContent: textContent }),
                ]);
                adaptationsElt.appendChild(textAdaps);
            }
            var adaptations = instance.__priv_getCurrentAdaptation();
            var videoBitratesStr = (_f = (_e = adaptations === null || adaptations === void 0 ? void 0 : adaptations.video) === null || _e === void 0 ? void 0 : _e.representations.map(function (r) {
                var _a;
                return (String((_a = r.bitrate) !== null && _a !== void 0 ? _a : "N/A") +
                    (r.isSupported !== false ? "" : " U!") +
                    (r.decipherable !== false ? "" : " E!"));
            })) !== null && _f !== void 0 ? _f : [];
            var audioBitratesStr = (_h = (_g = adaptations === null || adaptations === void 0 ? void 0 : adaptations.audio) === null || _g === void 0 ? void 0 : _g.representations.map(function (r) {
                var _a;
                return (String((_a = r.bitrate) !== null && _a !== void 0 ? _a : "N/A") +
                    (r.isSupported !== false ? "" : " U!") +
                    (r.decipherable !== false ? "" : " E!"));
            })) !== null && _h !== void 0 ? _h : [];
            representationsElt.innerHTML = "";
            if (videoBitratesStr.length > 0) {
                representationsElt.appendChild((0, utils_1.createMetricTitle)("vb"));
                representationsElt.appendChild((0, utils_1.createElement)("span", {
                    textContent: videoBitratesStr.join(" ") + " ",
                }));
            }
            if (audioBitratesStr.length > 0) {
                representationsElt.appendChild((0, utils_1.createMetricTitle)("ab"));
                representationsElt.appendChild((0, utils_1.createElement)("span", {
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
exports.default = constructDebugGeneralInfo;
