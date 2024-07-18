import arrayIncludes from "../../utils/array_includes";
import EventEmitter from "../../utils/event_emitter";
import noop from "../../utils/noop";
import SharedReference from "../../utils/reference";
import TaskCanceller from "../../utils/task_canceller";
/**
 * Class handling track changes and quality locking for a single Period and
 * Adaptation type.
 * @class TrackDispatcher
 */
export default class TrackDispatcher extends EventEmitter {
    /**
     * Create a new `TrackDispatcher` by giving its Reference and an initial track
     * setting.
     * This constructor will update the Reference with the right preferences
     * synchronously.
     * @param {Object} adaptationRef
     */
    constructor(adaptationRef) {
        super();
        this._canceller = new TaskCanceller();
        this._adaptationRef = adaptationRef;
        this._updateToken = false;
        this.refresh = noop;
    }
    /**
     * @param {Object|null} initialTrackInfo
     */
    start(initialTrackInfo) {
        this._updateToken = true;
        if (initialTrackInfo === null) {
            this._lastEmitted = null;
            this._updateToken = false;
            this._adaptationRef.setValue(null);
            return;
        }
        const reference = this._constructLockedRepresentationsReference(initialTrackInfo);
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
    }
    /**
     * Update the wanted track on the Reference linked to this `TrackDispatcher`.
     * @param {Object|null} newTrackInfo
     */
    updateTrack(newTrackInfo) {
        this._updateToken = true;
        if (newTrackInfo === null) {
            if (this._lastEmitted === null) {
                return;
            }
            this._updateToken = false;
            this._canceller.cancel();
            // has no point but let's still create one for simplicity sake
            this._canceller = new TaskCanceller();
            this._lastEmitted = null;
            this._adaptationRef.setValue(null);
            return;
        }
        const { adaptation, switchingMode, relativeResumingPosition } = newTrackInfo;
        this._canceller.cancel();
        this._canceller = new TaskCanceller();
        const reference = this._constructLockedRepresentationsReference(newTrackInfo);
        if (!this._updateToken) {
            return;
        }
        this._lastEmitted = {
            adaptation,
            switchingMode,
            lockedRepresentations: null,
        };
        this._updateToken = false;
        this._adaptationRef.setValue({
            adaptationId: adaptation.id,
            switchingMode,
            representations: reference,
            relativeResumingPosition,
        });
    }
    /**
     * Create a shared reference which will emit the wanted locked Representations
     * based on the current capabilities and the last user settings.
     *
     * @param {Object} trackInfo
     * @returns {Object}
     */
    _constructLockedRepresentationsReference(trackInfo) {
        /* Initialize it. Will be at its true value at the end of the function. */
        const reference = new SharedReference({
            representationIds: [],
            switchingMode: "lazy",
        });
        /* eslint-disable-next-line @typescript-eslint/no-this-alias */
        const self = this;
        this.refresh = updateReferenceIfNeeded;
        this._canceller.signal.register(removeListeners);
        trackInfo.lockedRepresentations.onUpdate(updateReferenceIfNeeded, {
            clearSignal: this._canceller.signal,
            emitCurrentValue: false,
        });
        updateReferenceIfNeeded();
        return reference;
        function updateReferenceIfNeeded() {
            const repSettings = trackInfo.lockedRepresentations.getValue();
            /* eslint-disable @typescript-eslint/no-duplicate-type-constituents */
            let switchingMode;
            /* eslint-enable @typescript-eslint/no-duplicate-type-constituents */
            /** Representations for which a `RepresentationStream` can be created. */
            let playableRepresentations;
            if (repSettings === null) {
                // unlocking
                playableRepresentations = trackInfo.adaptation.representations.filter((representation) => {
                    return (representation.isSupported === true && representation.decipherable !== false);
                });
                // No need to remove the previous content when unlocking
                switchingMode = "lazy";
            }
            else {
                const { representationIds } = repSettings;
                switchingMode = repSettings.switchingMode;
                const representations = trackInfo.adaptation.representations.filter((r) => arrayIncludes(representationIds, r.id));
                playableRepresentations = representations.filter((r) => r.isSupported === true && r.decipherable !== false);
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
            const oldRef = reference.getValue();
            const sortedReps = playableRepresentations
                .map((r) => r.id)
                .slice()
                .sort();
            if (sortedReps.length !== oldRef.representationIds.length) {
                reference.setValue({ representationIds: sortedReps, switchingMode });
                return;
            }
            for (let i = 0; i < sortedReps.length; i++) {
                if (oldRef.representationIds[i] !== sortedReps[i]) {
                    reference.setValue({ representationIds: sortedReps, switchingMode });
                    return;
                }
            }
        }
        function removeListeners() {
            self.refresh = noop;
        }
    }
    /**
     * Free the resources (e.g. `Manifest` event listeners) linked to this
     * `TrackDispatcher`.
     */
    dispose() {
        this.removeEventListener();
        this._canceller.cancel();
        this._adaptationRef.finish();
    }
}
