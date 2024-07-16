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
var log_1 = require("../../log");
var create_uuid_1 = require("../../utils/create_uuid");
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
var task_canceller_1 = require("../../utils/task_canceller");
/**
 * `rtp`, for "REQUESTED_MAXIMUM_THROUGHPUT", indicates the maximum throughput
 * needed to load a given segment without experience degration.
 * It acts as a hint to a CDN so it can scale its resources between multiple
 * clients.
 *
 * We could indicate through `rtp` the exact minimum bandwidth needed, but this
 * may lead to much higher risk of rebuffering, so we prefer to multiply that
 * value by a safe-enough factor, this `RTP_FACTOR`.
 */
var RTP_FACTOR = 4;
/**
 * Class allowing to easily obtain "Common Media Client Data" (CMCD) properties
 * that may be relied on while performing HTTP(S) requests on a CDN.
 *
 * @class CmcdDataBuilder
 */
var CmcdDataBuilder = /** @class */ (function () {
    /**
     * Create a new `CmcdDataBuilder`, linked to the given options (see type
     * definition).
     * @param {Object} options
     */
    function CmcdDataBuilder(options) {
        var _a, _b;
        this._sessionId = (_a = options.sessionId) !== null && _a !== void 0 ? _a : (0, create_uuid_1.default)();
        this._contentId = (_b = options.contentId) !== null && _b !== void 0 ? _b : (0, create_uuid_1.default)();
        this._typePreference =
            options.communicationType === "headers"
                ? 0 /* TypePreference.Headers */
                : 1 /* TypePreference.QueryString */;
        this._bufferStarvationToggle = false;
        this._playbackObserver = null;
        this._lastThroughput = {};
        this._canceller = null;
    }
    /**
     * Start listening to the given `playbackObserver` so the `CmcdDataBuilder`
     * can extract some playback-linked metadata that it needs.
     *
     * It will keep listening for media data until `stopMonitoringPlayback` is called.
     *
     * If `startMonitoringPlayback` is called again, the previous monitoring is
     * also cancelled.
     * @param {Object} playbackObserver
     */
    CmcdDataBuilder.prototype.startMonitoringPlayback = function (playbackObserver) {
        var _this = this;
        var _a;
        (_a = this._canceller) === null || _a === void 0 ? void 0 : _a.cancel();
        this._canceller = new task_canceller_1.default();
        this._playbackObserver = playbackObserver;
        playbackObserver.listen(function (obs) {
            if (obs.rebuffering !== null) {
                _this._bufferStarvationToggle = true;
            }
        }, { includeLastObservation: true, clearSignal: this._canceller.signal });
    };
    /**
     * Stop the monitoring of playback conditions started from the last
     * `stopMonitoringPlayback` call.
     */
    CmcdDataBuilder.prototype.stopMonitoringPlayback = function () {
        var _a;
        (_a = this._canceller) === null || _a === void 0 ? void 0 : _a.cancel();
        this._canceller = null;
        this._playbackObserver = null;
    };
    /**
     * Update the last measured throughput for a specific media type.
     * Needed for some of CMCD's properties.
     * @param {string} trackType
     * @param {number|undefined} throughput - Last throughput measured for that
     * media type. `undefined` if unknown.
     */
    CmcdDataBuilder.prototype.updateThroughput = function (trackType, throughput) {
        this._lastThroughput[trackType] = throughput;
    };
    /**
     * Returns the base of data that is common to all resources' requests.
     * @param {number|undefined} lastThroughput - The last measured throughput to
     * provide. `undefined` to provide no throughput.
     * @returns {Object}
     */
    CmcdDataBuilder.prototype._getCommonCmcdData = function (lastThroughput) {
        var _a;
        var props = {};
        props.bs = this._bufferStarvationToggle;
        this._bufferStarvationToggle = false;
        props.cid = this._contentId;
        props.mtp =
            lastThroughput !== undefined
                ? Math.floor(Math.round(lastThroughput / 1000 / 100) * 100)
                : undefined;
        props.sid = this._sessionId;
        var lastObservation = (_a = this._playbackObserver) === null || _a === void 0 ? void 0 : _a.getReference().getValue();
        props.pr =
            lastObservation === undefined || lastObservation.speed === 1
                ? undefined
                : lastObservation.speed;
        if (lastObservation !== undefined) {
            props.su = lastObservation.rebuffering !== null;
        }
        return props;
    };
    /**
     * For the given type of Manifest, returns the corresponding CMCD payload
     * that should be provided alongside its request.
     * @param {string} transportType
     * @returns {Object}
     */
    CmcdDataBuilder.prototype.getCmcdDataForManifest = function (transportType) {
        var _a;
        var props = this._getCommonCmcdData((_a = this._lastThroughput.video) !== null && _a !== void 0 ? _a : this._lastThroughput.audio);
        props.ot = "m";
        switch (transportType) {
            case "dash":
                props.sf = "d";
                break;
            case "smooth":
                props.sf = "s";
                break;
            default:
                props.sf = "o";
                break;
        }
        return this._producePayload(props);
    };
    /**
     * For the given segment information, returns the corresponding CMCD payload
     * that should be provided alongside its request.
     * @param {Object} content
     * @returns {Object}
     */
    CmcdDataBuilder.prototype.getCmcdDataForSegmentRequest = function (content) {
        var e_1, _a;
        var _b, _c, _d, _e;
        var lastObservation = (_b = this._playbackObserver) === null || _b === void 0 ? void 0 : _b.getReference().getValue();
        var props = this._getCommonCmcdData(this._lastThroughput[content.adaptation.type]);
        props.br = Math.round(content.representation.bitrate / 1000);
        props.d = Math.round(content.segment.duration * 1000);
        // TODO nor (next object request) and nrr (next range request)
        switch (content.adaptation.type) {
            case "video":
                props.ot = "v";
                break;
            case "audio":
                props.ot = "a";
                break;
            case "text":
                props.ot = "c";
                break;
        }
        if (content.segment.isInit) {
            props.ot = "i";
        }
        var precizeBufferLengthMs;
        if (lastObservation !== undefined &&
            (props.ot === "v" || props.ot === "a" || props.ot === "av")) {
            var bufferedForType = lastObservation.buffered[content.adaptation.type];
            if (!(0, is_null_or_undefined_1.default)(bufferedForType)) {
                // TODO more precize position estimate?
                var position = (_e = (_d = (_c = this._playbackObserver) === null || _c === void 0 ? void 0 : _c.getCurrentTime()) !== null && _d !== void 0 ? _d : lastObservation.position.getWanted()) !== null && _e !== void 0 ? _e : lastObservation.position.getPolled();
                try {
                    for (var bufferedForType_1 = __values(bufferedForType), bufferedForType_1_1 = bufferedForType_1.next(); !bufferedForType_1_1.done; bufferedForType_1_1 = bufferedForType_1.next()) {
                        var range = bufferedForType_1_1.value;
                        if (position >= range.start && position < range.end) {
                            precizeBufferLengthMs = (range.end - position) * 1000;
                            props.bl = Math.floor(Math.round(precizeBufferLengthMs / 100) * 100);
                            break;
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (bufferedForType_1_1 && !bufferedForType_1_1.done && (_a = bufferedForType_1.return)) _a.call(bufferedForType_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
        }
        var precizeDeadlineMs = precizeBufferLengthMs === undefined || lastObservation === undefined
            ? undefined
            : precizeBufferLengthMs / lastObservation.speed;
        props.dl =
            precizeDeadlineMs === undefined
                ? undefined
                : Math.floor(Math.round(precizeDeadlineMs / 100) * 100);
        if (precizeDeadlineMs !== undefined) {
            // estimate the file size, in kilobits
            var estimatedFileSizeKb = (content.representation.bitrate * content.segment.duration) / 1000;
            var wantedCeilBandwidthKbps = estimatedFileSizeKb / (precizeDeadlineMs / 1000);
            props.rtp = Math.floor(Math.round((wantedCeilBandwidthKbps * RTP_FACTOR) / 100) * 100);
        }
        switch (content.manifest.transport) {
            case "dash":
                props.sf = "d";
                break;
            case "smooth":
                props.sf = "s";
                break;
            default:
                props.sf = "o";
                break;
        }
        props.st = content.manifest.isDynamic ? "l" : "v";
        props.tb = content.adaptation.representations.reduce(function (acc, representation) {
            if (representation.isSupported !== true ||
                representation.decipherable === false) {
                return acc;
            }
            if (acc === undefined) {
                return Math.round(representation.bitrate / 1000);
            }
            return Math.max(acc, Math.round(representation.bitrate / 1000));
        }, undefined);
        return this._producePayload(props);
    };
    /**
     * From the given CMCD properties, produce the corresponding payload according
     * to current settings.
     * @param {Object} props
     * @returns {Object}
     */
    CmcdDataBuilder.prototype._producePayload = function (props) {
        var _this = this;
        var headers = {
            object: "",
            request: "",
            session: "",
            status: "",
        };
        var queryStringPayload = "";
        var addPayload = function (payload, headerName) {
            if (_this._typePreference === 0 /* TypePreference.Headers */) {
                headers[headerName] += payload;
            }
            else {
                queryStringPayload += payload;
            }
        };
        var addNumberProperty = function (prop, headerName) {
            var val = props[prop];
            if (val !== undefined) {
                var toAdd = "".concat(prop, "=").concat(String(val), ",");
                addPayload(toAdd, headerName);
            }
        };
        var addBooleanProperty = function (prop, headerName) {
            if (props[prop] === true) {
                var toAdd = "".concat(prop, ",");
                addPayload(toAdd, headerName);
            }
        };
        var addStringProperty = function (prop, headerName) {
            var val = props[prop];
            if (val !== undefined) {
                var formatted = "\"".concat(val.replace("\\", "\\\\").replace('"', '\\"'), "\"");
                var toAdd = "prop=".concat(formatted, ",");
                addPayload(toAdd, headerName);
            }
        };
        var addTokenProperty = function (prop, headerName) {
            var val = props[prop];
            if (val !== undefined) {
                var toAdd = "prop=".concat(val, ",");
                addPayload(toAdd, headerName);
            }
        };
        addNumberProperty("br", "object");
        addNumberProperty("bl", "request");
        addBooleanProperty("bs", "status");
        addStringProperty("cid", "session");
        addNumberProperty("d", "object");
        addNumberProperty("dl", "request");
        addNumberProperty("mtp", "request");
        addTokenProperty("ot", "object");
        addNumberProperty("pr", "session");
        addNumberProperty("rtp", "status");
        addTokenProperty("sf", "session");
        addStringProperty("sid", "session");
        addTokenProperty("st", "session");
        addBooleanProperty("su", "request");
        addNumberProperty("tb", "object");
        if (this._typePreference === 0 /* TypePreference.Headers */) {
            if (headers.object[headers.object.length - 1] === ",") {
                headers.object = headers.object.substring(0, headers.object.length - 1);
            }
            if (headers.request[headers.request.length - 1] === ",") {
                headers.request = headers.request.substring(0, headers.request.length - 1);
            }
            if (headers.session[headers.session.length - 1] === ",") {
                headers.session = headers.session.substring(0, headers.session.length - 1);
            }
            if (headers.status[headers.status.length - 1] === ",") {
                headers.status = headers.status.substring(0, headers.status.length - 1);
            }
            log_1.default.debug("CMCD: proposing headers payload");
            return {
                type: "headers",
                value: {
                    /* eslint-disable @typescript-eslint/naming-convention */
                    "CMCD-Object": headers.object,
                    "CMCD-Request": headers.request,
                    "CMCD-Session": headers.session,
                    "CMCD-Status": headers.status,
                    /* eslint-enable @typescript-eslint/naming-convention */
                },
            };
        }
        if (queryStringPayload[queryStringPayload.length - 1] === ",") {
            queryStringPayload = queryStringPayload.substring(0, queryStringPayload.length - 1);
        }
        queryStringPayload = encodeURIComponent(queryStringPayload);
        log_1.default.debug("CMCD: proposing query string payload", queryStringPayload);
        return {
            type: "query",
            value: [["CMCD", queryStringPayload]],
        };
    };
    return CmcdDataBuilder;
}());
exports.default = CmcdDataBuilder;
