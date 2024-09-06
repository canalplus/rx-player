import type {
  IAdaptationChoice,
  IRepresentationsChoice,
  ITrackSwitchingMode,
} from "../../core/types";
import type { IAdaptationMetadata, IRepresentationMetadata } from "../../manifest";
import { isRepresentationPlayable } from "../../manifest";
import type {
  IAudioRepresentationsSwitchingMode,
  IVideoRepresentationsSwitchingMode,
} from "../../public_types";
import arrayIncludes from "../../utils/array_includes";
import EventEmitter from "../../utils/event_emitter";
import noop from "../../utils/noop";
import type { IReadOnlySharedReference } from "../../utils/reference";
import SharedReference from "../../utils/reference";
import TaskCanceller from "../../utils/task_canceller";

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
  public refresh: () => void;

  /**
   * Reference through which the wanted track will be emitted.
   * `null` is emitted if no track for that type is wanted.
   */
  private readonly _adaptationRef: SharedReference<
    | {
        /** Wanted track chosen by the user. */
        adaptationId: string;
        /** "Switching mode" in which the track switch should happen. */
        switchingMode: ITrackSwitchingMode;
        /** Representations "locked" for this `Adaptation`. */
        representations: IReadOnlySharedReference<IRepresentationsChoice>;
        /** Relative resuming position after a track change */
        relativeResumingPosition: number | undefined;
      }
    | null
    | undefined
  >;

  /**
   * Last values emitted through `adaptationRef`.
   * This value is mutated just before `adaptationRef` is "nexted".
   *
   * Storing this information allows to detect if some potential
   * side-effects already led to the "nexting" of `adaptationRef` with the wanted
   * settings, preventing the the `TrackDispatcher` from doing it again.
   */
  private _lastEmitted:
    | {
        adaptation: IAdaptationMetadata;
        switchingMode: ITrackSwitchingMode;
        lockedRepresentations: IRepresentationMetadata[] | null;
      }
    | null
    | undefined;

  /** Interface allowing to clean-up resources when they are not needed anymore. */
  private _canceller: TaskCanceller;

  /**
   * Boolean set to `true` when a track-updating method is called and to `false`
   * just before it performs the actual track change to allow checking for
   * re-entrancy: if the token is already reset to `false` before the
   * track change is officialized, then another track update has already been
   * performed in the meantime.
   */
  private _updateToken: boolean;

  /**
   * Create a new `TrackDispatcher` by giving its Reference and an initial track
   * setting.
   * This constructor will update the Reference with the right preferences
   * synchronously.
   * @param {Object} adaptationRef
   */
  constructor(adaptationRef: SharedReference<IAdaptationChoice | null | undefined>) {
    super();
    this._canceller = new TaskCanceller();
    this._adaptationRef = adaptationRef;
    this._updateToken = false;
    this._lastEmitted = undefined;
    this.refresh = noop;
  }

  /**
   * Returns `true` if the initial track choice has been sent by this
   * `TrackDispatcher`.
   * Returns `false` if that's not the case yet.
   * @returns {boolean}
   */
  public hasSetTrack(): boolean {
    return this._adaptationRef.getValue() !== undefined;
  }

  /**
   * Update the wanted track on the Reference linked to this `TrackDispatcher`.
   * @param {Object|null} newTrackInfo
   */
  public updateTrack(newTrackInfo: ITrackSetting | null): void {
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
  private _constructLockedRepresentationsReference(
    trackInfo: ITrackSetting,
  ): SharedReference<IRepresentationsChoice> {
    /* Initialize it. Will be at its true value at the end of the function. */
    const reference = new SharedReference<IRepresentationsChoice>({
      representationIds: [],
      switchingMode: "lazy",
    });

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this.refresh = updateReferenceIfNeeded;
    this._canceller.signal.register(removeListeners);
    trackInfo.lockedRepresentations.onUpdate(updateReferenceIfNeeded, {
      clearSignal: this._canceller.signal,
      emitCurrentValue: false,
    });
    updateReferenceIfNeeded();

    return reference;

    function updateReferenceIfNeeded(): void {
      const repSettings = trackInfo.lockedRepresentations.getValue();
      /* eslint-disable @typescript-eslint/no-duplicate-type-constituents */
      let switchingMode:
        | IAudioRepresentationsSwitchingMode
        | IVideoRepresentationsSwitchingMode;
      /* eslint-enable @typescript-eslint/no-duplicate-type-constituents */

      /** Representations for which a `RepresentationStream` can be created. */
      let playableRepresentations;
      if (repSettings === null) {
        // unlocking
        playableRepresentations = trackInfo.adaptation.representations.filter(
          (representation) => isRepresentationPlayable(representation) === true,
        );

        // No need to remove the previous content when unlocking
        switchingMode = "lazy";
      } else {
        const { representationIds } = repSettings;
        switchingMode = repSettings.switchingMode;
        const representations = trackInfo.adaptation.representations.filter((r) =>
          arrayIncludes(representationIds, r.id),
        );
        playableRepresentations = representations.filter(
          (representation) => isRepresentationPlayable(representation) === true,
        );
        if (playableRepresentations.length === 0) {
          self.trigger("noPlayableLockedRepresentation", null);
          return;
        }
      }
      if (playableRepresentations.length <= 0) {
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
  public dispose(): void {
    this.removeEventListener();
    this._canceller.cancel();
    this._adaptationRef.finish();
  }
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
