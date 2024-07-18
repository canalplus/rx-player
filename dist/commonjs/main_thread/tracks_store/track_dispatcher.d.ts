import type { IAdaptationChoice, IRepresentationsChoice, ITrackSwitchingMode } from "../../core/types";
import type { IAdaptationMetadata } from "../../manifest";
import EventEmitter from "../../utils/event_emitter";
import type { IReadOnlySharedReference } from "../../utils/reference";
import SharedReference from "../../utils/reference";
/**
 * Class handling track changes and quality locking for a single Period and
 * Adaptation type.
 * @class TrackDispatcher
 */
export default class TrackDispatcher extends EventEmitter<ITrackDispatcherEvent> {
    /**
     * Force the `TrackDispatcher` to re-consider the current track.
     * Should be called when any information on the track had a chance to change,
     * especially:
     *   - after a Manifest update
     *   - after one or several of its Representation were found to be either
     *     unsupported or undecipherable.
     */
    refresh: () => void;
    /**
     * Reference through which the wanted track will be emitted.
     * `null` is emitted if no track for that type is wanted.
     */
    private readonly _adaptationRef;
    /**
     * Last values emitted through `adaptationRef`.
     * This value is mutated just before `adaptationRef` is "nexted".
     *
     * Storing this information allows to detect if some potential
     * side-effects already led to the "nexting" of `adaptationRef` with the wanted
     * settings, preventing the the `TrackDispatcher` from doing it again.
     */
    private _lastEmitted;
    /** Interface allowing to clean-up resources when they are not needed anymore. */
    private _canceller;
    /**
     * Boolean set to `true` when a track-updating method is called and to `false`
     * just before it performs the actual track change to allow checking for
     * re-entrancy: if the token is already reset to `false` before the
     * track change is officialized, then another track update has already been
     * performed in the meantime.
     */
    private _updateToken;
    /**
     * Create a new `TrackDispatcher` by giving its Reference and an initial track
     * setting.
     * This constructor will update the Reference with the right preferences
     * synchronously.
     * @param {Object} adaptationRef
     */
    constructor(adaptationRef: SharedReference<IAdaptationChoice | null | undefined>);
    /**
     * @param {Object|null} initialTrackInfo
     */
    start(initialTrackInfo: ITrackSetting | null): void;
    /**
     * Update the wanted track on the Reference linked to this `TrackDispatcher`.
     * @param {Object|null} newTrackInfo
     */
    updateTrack(newTrackInfo: ITrackSetting | null): void;
    /**
     * Create a shared reference which will emit the wanted locked Representations
     * based on the current capabilities and the last user settings.
     *
     * @param {Object} trackInfo
     * @returns {Object}
     */
    private _constructLockedRepresentationsReference;
    /**
     * Free the resources (e.g. `Manifest` event listeners) linked to this
     * `TrackDispatcher`.
     */
    dispose(): void;
}
export interface ITrackDispatcherEvent {
    /**
     * Event sent when given locked Representations cannot be respected because
     * none of them are currently "playable".
     */
    noPlayableLockedRepresentation: null;
    noPlayableRepresentation: null;
}
/** Define a new Track preference given to the `TrackDispatcher`. */
export interface ITrackSetting {
    /** Contains the `Adaptation` wanted by the user. */
    adaptation: IAdaptationMetadata;
    /** "Switching mode" in which the track switch should happen. */
    switchingMode: ITrackSwitchingMode;
    /** Relative resuming position after a track change */
    relativeResumingPosition?: number | undefined;
    /**
     * Contains the last locked `Representation`s for this `Adaptation` wanted
     * by the user.
     * `null` if no Representation is locked.
     *
     * Can be updated continuously while the `TrackDispatcher` is in possession
     * of this shared reference.
     */
    lockedRepresentations: IReadOnlySharedReference<IRepresentationsChoice | null>;
}
//# sourceMappingURL=track_dispatcher.d.ts.map