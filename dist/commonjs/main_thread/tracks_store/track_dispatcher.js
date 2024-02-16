"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var array_includes_1 = require("../../utils/array_includes");
var event_emitter_1 = require("../../utils/event_emitter");
var noop_1 = require("../../utils/noop");
var reference_1 = require("../../utils/reference");
var task_canceller_1 = require("../../utils/task_canceller");
/**
 * Class handling track changes and quality locking for a single Period and
 * Adaptation type.
 * @class TrackDispatcher
 */
var TrackDispatcher = /** @class */ (function (_super) {
    __extends(TrackDispatcher, _super);
    /**
     * Create a new `TrackDispatcher` by giving its Reference and an initial track
     * setting.
     * This constructor will update the Reference with the right preferences
     * synchronously.
     * @param {Object} adaptationRef
     */
    function TrackDispatcher(adaptationRef) {
        var _this = _super.call(this) || this;
        _this._canceller = new task_canceller_1.default();
        _this._adaptationRef = adaptationRef;
        _this._updateToken = false;
        _this.refresh = noop_1.default;
        return _this;
    }
    /**
     * @param {Object|null} initialTrackInfo
     */
    TrackDispatcher.prototype.start = function (initialTrackInfo) {
        this._updateToken = true;
        if (initialTrackInfo === null) {
            this._lastEmitted = null;
            this._updateToken = false;
            this._adaptationRef.setValue(null);
            return;
        }
        var reference = this._constructLockedRepresentationsReference(initialTrackInfo);
        if (!this._updateToken) {
            return;
        }
        this._lastEmitted = {
            adaptation: initialTrackInfo.adaptation,
            switchingMode: initialTrackInfo.switchingMode,
            lockedRepresentations: null,
        };
        this._updateToken = false;
        this._adaptationRef.setValue({
            adaptationId: initialTrackInfo.adaptation.id,
            switchingMode: initialTrackInfo.switchingMode,
            representations: reference,
            relativeResumingPosition: undefined,
        });
    };
    /**
     * Update the wanted track on the Reference linked to this `TrackDispatcher`.
     * @param {Object|null} newTrackInfo
     */
    TrackDispatcher.prototype.updateTrack = function (newTrackInfo) {
        this._updateToken = true;
        if (newTrackInfo === null) {
            if (this._lastEmitted === null) {
                return;
            }
            this._updateToken = false;
            this._canceller.cancel();
            // has no point but let's still create one for simplicity sake
            this._canceller = new task_canceller_1.default();
            this._lastEmitted = null;
            this._adaptationRef.setValue(null);
            return;
        }
        var adaptation = newTrackInfo.adaptation, switchingMode = newTrackInfo.switchingMode, relativeResumingPosition = newTrackInfo.relativeResumingPosition;
        this._canceller.cancel();
        this._canceller = new task_canceller_1.default();
        var reference = this._constructLockedRepresentationsReference(newTrackInfo);
        if (!this._updateToken) {
            return;
        }
        this._lastEmitted = {
            adaptation: adaptation,
            switchingMode: switchingMode,
            lockedRepresentations: null,
        };
        this._updateToken = false;
        this._adaptationRef.setValue({
            adaptationId: adaptation.id,
            switchingMode: switchingMode,
            representations: reference,
            relativeResumingPosition: relativeResumingPosition,
        });
    };
    /**
     * Create a shared reference which will emit the wanted locked Representations
     * based on the current capabilities and the last user settings.
     *
     * @param {Object} trackInfo
     * @returns {Object}
     */
    TrackDispatcher.prototype._constructLockedRepresentationsReference = function (trackInfo) {
        /* Initialize it. Will be at its true value at the end of the function. */
        var reference = new reference_1.default({
            representationIds: [],
            switchingMode: "lazy",
        });
        /* eslint-disable-next-line @typescript-eslint/no-this-alias */
        var self = this;
        this.refresh = updateReferenceIfNeeded;
        this._canceller.signal.register(removeListeners);
        trackInfo.lockedRepresentations.onUpdate(updateReferenceIfNeeded, {
            clearSignal: this._canceller.signal,
            emitCurrentValue: false,
        });
        updateReferenceIfNeeded();
        return reference;
        function updateReferenceIfNeeded() {
            var repSettings = trackInfo.lockedRepresentations.getValue();
            /* eslint-disable @typescript-eslint/no-duplicate-type-constituents */
            var switchingMode;
            /* eslint-enable @typescript-eslint/no-duplicate-type-constituents */
            /** Representations for which a `RepresentationStream` can be created. */
            var playableRepresentations;
            if (repSettings === null) {
                // unlocking
                playableRepresentations = trackInfo.adaptation.representations.filter(function (representation) {
                    return (representation.isSupported === true && representation.decipherable !== false);
                });
                // No need to remove the previous content when unlocking
                switchingMode = "lazy";
            }
            else {
                var representationIds_1 = repSettings.representationIds;
                switchingMode = repSettings.switchingMode;
                var representations = trackInfo.adaptation.representations.filter(function (r) {
                    return (0, array_includes_1.default)(representationIds_1, r.id);
                });
                playableRepresentations = representations.filter(function (r) { return r.isSupported === true && r.decipherable !== false; });
                if (playableRepresentations.length === 0) {
                    self.trigger("noPlayableLockedRepresentation", null);
                    return;
                }
            }
            if (playableRepresentations.length <= 0) {
                trackInfo.adaptation.isSupported = false;
                self.trigger("noPlayableRepresentation", null);
                return;
            }
            // Check if Locked Representations have changed
            var oldRef = reference.getValue();
            var sortedReps = playableRepresentations
                .map(function (r) { return r.id; })
                .slice()
                .sort();
            if (sortedReps.length !== oldRef.representationIds.length) {
                reference.setValue({ representationIds: sortedReps, switchingMode: switchingMode });
                return;
            }
            for (var i = 0; i < sortedReps.length; i++) {
                if (oldRef.representationIds[i] !== sortedReps[i]) {
                    reference.setValue({ representationIds: sortedReps, switchingMode: switchingMode });
                    return;
                }
            }
        }
        function removeListeners() {
            self.refresh = noop_1.default;
        }
    };
    /**
     * Free the resources (e.g. `Manifest` event listeners) linked to this
     * `TrackDispatcher`.
     */
    TrackDispatcher.prototype.dispose = function () {
        this.removeEventListener();
        this._canceller.cancel();
        this._adaptationRef.finish();
    };
    return TrackDispatcher;
}(event_emitter_1.default));
exports.default = TrackDispatcher;
