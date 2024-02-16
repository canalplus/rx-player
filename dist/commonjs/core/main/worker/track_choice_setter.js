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
var log_1 = require("../../../log");
var is_null_or_undefined_1 = require("../../../utils/is_null_or_undefined");
var object_assign_1 = require("../../../utils/object_assign");
var reference_1 = require("../../../utils/reference");
var TrackChoiceSetter = /** @class */ (function () {
    function TrackChoiceSetter() {
        this._refs = new Map();
    }
    TrackChoiceSetter.prototype.reset = function () {
        var e_1, _a;
        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        try {
            for (var _p = __values(this._refs.keys()), _q = _p.next(); !_q.done; _q = _p.next()) {
                var key = _q.value;
                // Ensure no event listener is still listening to track/representations choices.
                // This should be unnecessary if the rest of the code is well-written but
                // better safe than sorry.
                (_c = (_b = this._refs.get(key)) === null || _b === void 0 ? void 0 : _b.audio) === null || _c === void 0 ? void 0 : _c.trackReference.finish();
                (_e = (_d = this._refs.get(key)) === null || _d === void 0 ? void 0 : _d.audio) === null || _e === void 0 ? void 0 : _e.representations.finish();
                (_g = (_f = this._refs.get(key)) === null || _f === void 0 ? void 0 : _f.video) === null || _g === void 0 ? void 0 : _g.trackReference.finish();
                (_j = (_h = this._refs.get(key)) === null || _h === void 0 ? void 0 : _h.video) === null || _j === void 0 ? void 0 : _j.representations.finish();
                (_l = (_k = this._refs.get(key)) === null || _k === void 0 ? void 0 : _k.text) === null || _l === void 0 ? void 0 : _l.trackReference.finish();
                (_o = (_m = this._refs.get(key)) === null || _m === void 0 ? void 0 : _m.text) === null || _o === void 0 ? void 0 : _o.representations.finish();
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_q && !_q.done && (_a = _p.return)) _a.call(_p);
            }
            finally { if (e_1) throw e_1.error; }
        }
        this._refs = new Map();
    };
    TrackChoiceSetter.prototype.addTrackSetter = function (periodId, bufferType, ref) {
        var _a, _b;
        var obj = this._refs.get(periodId);
        if (obj === undefined) {
            obj = {};
            this._refs.set(periodId, obj);
        }
        if (obj[bufferType] !== undefined) {
            log_1.default.warn("WP: Track for periodId already declared", periodId, bufferType);
            (_a = obj[bufferType]) === null || _a === void 0 ? void 0 : _a.trackReference.finish();
            (_b = obj[bufferType]) === null || _b === void 0 ? void 0 : _b.representations.finish();
        }
        var val = ref.getValue();
        var representations;
        if ((0, is_null_or_undefined_1.default)(val)) {
            // When no track is chosen yet, set default empty Representation choices
            representations = new reference_1.default({
                representationIds: [],
                switchingMode: "lazy",
            });
        }
        else {
            // Re-add `representations` key as a SharedReference so we're able to
            // update it.
            representations = new reference_1.default(val.representations.getValue());
            ref.setValue((0, object_assign_1.default)({}, val, {
                representations: representations,
            }));
        }
        obj[bufferType] = {
            trackReference: ref,
            representations: representations,
        };
    };
    TrackChoiceSetter.prototype.setTrack = function (periodId, bufferType, choice) {
        var _a;
        var ref = (_a = this._refs.get(periodId)) === null || _a === void 0 ? void 0 : _a[bufferType];
        if (ref === undefined) {
            log_1.default.debug("WP: Setting track for inexistent periodId", periodId, bufferType);
            return false;
        }
        if ((0, is_null_or_undefined_1.default)(choice)) {
            // When no track is chosen, set default empty Representation choices
            ref.representations = new reference_1.default({
                representationIds: [],
                switchingMode: "lazy",
            });
            ref.trackReference.setValue(choice);
        }
        else {
            ref.representations = new reference_1.default(choice.initialRepresentations);
            ref.trackReference.setValue({
                adaptationId: choice.adaptationId,
                switchingMode: choice.switchingMode,
                representations: ref.representations,
                relativeResumingPosition: choice.relativeResumingPosition,
            });
        }
        return true;
    };
    TrackChoiceSetter.prototype.updateRepresentations = function (periodId, adaptationId, bufferType, choice) {
        var _a;
        var ref = (_a = this._refs.get(periodId)) === null || _a === void 0 ? void 0 : _a[bufferType];
        if (ref === undefined) {
            log_1.default.debug("WP: Setting track for inexistent periodId", periodId, bufferType);
            return false;
        }
        var val = ref.trackReference.getValue();
        if ((0, is_null_or_undefined_1.default)(val) || val.adaptationId !== adaptationId) {
            log_1.default.debug("WP: Desynchronized Adaptation id", val === null || val === void 0 ? void 0 : val.adaptationId, adaptationId);
            return false;
        }
        ref.representations.setValue(choice);
        return true;
    };
    TrackChoiceSetter.prototype.removeTrackSetter = function (periodId, bufferType) {
        var obj = this._refs.get(periodId);
        var ref = obj === null || obj === void 0 ? void 0 : obj[bufferType];
        if (obj === undefined || ref === undefined) {
            log_1.default.debug("WP: Removing track setter for inexistent periodId", periodId, bufferType);
            return false;
        }
        ref.trackReference.finish();
        ref.representations.finish();
        delete obj[bufferType];
        if (Object.keys(obj).length === 0) {
            this._refs.delete(periodId);
        }
        return true;
    };
    return TrackChoiceSetter;
}());
exports.default = TrackChoiceSetter;
