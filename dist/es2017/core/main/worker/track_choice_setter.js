import log from "../../../log";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import objectAssign from "../../../utils/object_assign";
import SharedReference from "../../../utils/reference";
export default class TrackChoiceSetter {
    constructor() {
        this._refs = new Map();
    }
    reset() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        for (const key of this._refs.keys()) {
            // Ensure no event listener is still listening to track/representations choices.
            // This should be unnecessary if the rest of the code is well-written but
            // better safe than sorry.
            (_b = (_a = this._refs.get(key)) === null || _a === void 0 ? void 0 : _a.audio) === null || _b === void 0 ? void 0 : _b.trackReference.finish();
            (_d = (_c = this._refs.get(key)) === null || _c === void 0 ? void 0 : _c.audio) === null || _d === void 0 ? void 0 : _d.representations.finish();
            (_f = (_e = this._refs.get(key)) === null || _e === void 0 ? void 0 : _e.video) === null || _f === void 0 ? void 0 : _f.trackReference.finish();
            (_h = (_g = this._refs.get(key)) === null || _g === void 0 ? void 0 : _g.video) === null || _h === void 0 ? void 0 : _h.representations.finish();
            (_k = (_j = this._refs.get(key)) === null || _j === void 0 ? void 0 : _j.text) === null || _k === void 0 ? void 0 : _k.trackReference.finish();
            (_m = (_l = this._refs.get(key)) === null || _l === void 0 ? void 0 : _l.text) === null || _m === void 0 ? void 0 : _m.representations.finish();
        }
        this._refs = new Map();
    }
    addTrackSetter(periodId, bufferType, ref) {
        var _a, _b;
        let obj = this._refs.get(periodId);
        if (obj === undefined) {
            obj = {};
            this._refs.set(periodId, obj);
        }
        if (obj[bufferType] !== undefined) {
            log.warn("WP: Track for periodId already declared", periodId, bufferType);
            (_a = obj[bufferType]) === null || _a === void 0 ? void 0 : _a.trackReference.finish();
            (_b = obj[bufferType]) === null || _b === void 0 ? void 0 : _b.representations.finish();
        }
        const val = ref.getValue();
        let representations;
        if (isNullOrUndefined(val)) {
            // When no track is chosen yet, set default empty Representation choices
            representations = new SharedReference({
                representationIds: [],
                switchingMode: "lazy",
            });
        }
        else {
            // Re-add `representations` key as a SharedReference so we're able to
            // update it.
            representations = new SharedReference(val.representations.getValue());
            ref.setValue(objectAssign({}, val, {
                representations,
            }));
        }
        obj[bufferType] = {
            trackReference: ref,
            representations,
        };
    }
    setTrack(periodId, bufferType, choice) {
        var _a;
        const ref = (_a = this._refs.get(periodId)) === null || _a === void 0 ? void 0 : _a[bufferType];
        if (ref === undefined) {
            log.debug("WP: Setting track for inexistent periodId", periodId, bufferType);
            return false;
        }
        if (isNullOrUndefined(choice)) {
            // When no track is chosen, set default empty Representation choices
            ref.representations = new SharedReference({
                representationIds: [],
                switchingMode: "lazy",
            });
            ref.trackReference.setValue(choice);
        }
        else {
            ref.representations = new SharedReference(choice.initialRepresentations);
            ref.trackReference.setValue({
                adaptationId: choice.adaptationId,
                switchingMode: choice.switchingMode,
                representations: ref.representations,
                relativeResumingPosition: choice.relativeResumingPosition,
            });
        }
        return true;
    }
    updateRepresentations(periodId, adaptationId, bufferType, choice) {
        var _a;
        const ref = (_a = this._refs.get(periodId)) === null || _a === void 0 ? void 0 : _a[bufferType];
        if (ref === undefined) {
            log.debug("WP: Setting track for inexistent periodId", periodId, bufferType);
            return false;
        }
        const val = ref.trackReference.getValue();
        if (isNullOrUndefined(val) || val.adaptationId !== adaptationId) {
            log.debug("WP: Desynchronized Adaptation id", val === null || val === void 0 ? void 0 : val.adaptationId, adaptationId);
            return false;
        }
        ref.representations.setValue(choice);
        return true;
    }
    removeTrackSetter(periodId, bufferType) {
        const obj = this._refs.get(periodId);
        const ref = obj === null || obj === void 0 ? void 0 : obj[bufferType];
        if (obj === undefined || ref === undefined) {
            log.debug("WP: Removing track setter for inexistent periodId", periodId, bufferType);
            return false;
        }
        ref.trackReference.finish();
        ref.representations.finish();
        delete obj[bufferType];
        if (Object.keys(obj).length === 0) {
            this._refs.delete(periodId);
        }
        return true;
    }
}
