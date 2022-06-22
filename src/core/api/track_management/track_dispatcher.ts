import { Subject } from "rxjs";
import { MediaError } from "../../../errors";
import Manifest, {
  Adaptation,
  Representation,
} from "../../../manifest";
import {
  IAudioRepresentationsSwitchingMode,
  IVideoRepresentationsSwitchingMode,
} from "../../../public_types";
import EventEmitter from "../../../utils/event_emitter";
import createSharedReference, {
  IReadOnlySharedReference,
} from "../../../utils/reference";
import TaskCanceller from "../../../utils/task_canceller";
import {
  IAdaptationChoice,
  IRepresentationsChoice,
  ITrackSwitchingMode,
} from "../../stream";

/**
 * Class handling track changes and quality locking for a single Period and
 * Adaptation type.
 * @class TrackDispatcher
 */
export default class TrackDispatcher extends EventEmitter<ITrackDispatcherEvent> {
  /**
   * `Manifest` object linked to the current content handled by the
   * `TrackDispatcher`.
   * Needed to subscribe to various events.
   */
  private readonly _manifest : Manifest;

  /**
   * Subject through which the wanted track will be emitted.
   * `null` is emitted if no track for that type is wanted.
   */
  private readonly _trackSubject : Subject<{
    /** Wanted track chosen by the user. */
    adaptation : Adaptation;
    /** "Switching mode" in which the track switch should happen. */
    switchingMode : ITrackSwitchingMode;
    /** Representations "locked" for this `Adaptation`. */
    representations : IReadOnlySharedReference<IRepresentationsChoice>;
  } |
  null>;

  /**
   * Last values emitted through `trackSubject`.
   * This value is mutated just before `trackSubject` is "nexted".
   *
   * Storing this information allows to detect if some potential
   * side-effects already led to the "nexting" of `trackSubject` with the wanted
   * settings, preventing the the `TrackDispatcher` from doing it again.
   */
  private _lastEmitted : { adaptation: Adaptation;
                           switchingMode: ITrackSwitchingMode;
                           lockedRepresentations: Representation[] | null; } |
                         null |
                         undefined;

  /** Interface allowing to clean-up resources when they are not needed anymore. */
  private _canceller : TaskCanceller;

  /**
   * Create a new `TrackDispatcher` by giving its Subject and an initial track
   * setting.
   * This constructor will next the subject with the right preferences
   * synchronously.
   * @param {Object} manifest
   * @param {Subject} trackSubject
   * @param {Object|null} initialTrackInfo
   */
  constructor(
    manifest : Manifest,
    trackSubject : Subject<IAdaptationChoice | null>,
    initialTrackInfo : ITrackSetting | null
  ) {
    super();
    this._canceller = new TaskCanceller();
    this._manifest = manifest;
    this._trackSubject = trackSubject;

    if (initialTrackInfo === null) {
      this._lastEmitted = initialTrackInfo;
      trackSubject.next(null);
      return;
    }
    const reference = this._constructLockedRepresentationsReference(initialTrackInfo);
    this._lastEmitted = { adaptation: initialTrackInfo.adaptation,
                          switchingMode: initialTrackInfo.switchingMode,
                          lockedRepresentations: null };
    trackSubject.next({ adaptation: initialTrackInfo.adaptation,
                        switchingMode: initialTrackInfo.switchingMode,
                        representations: reference });
  }

  /**
   * Update the wanted track on the Subject linked to this `TrackDispatcher`.
   * @param {Object|null} newTrackInfo
   */
  public updateTrack(newTrackInfo : ITrackSetting | null) : void {
    if (newTrackInfo === null) {
      if (this._lastEmitted === null) {
        return;
      }
      this._canceller.cancel();

      // has no point but let's still create one for simplicity sake
      this._canceller = new TaskCanceller();
      this._lastEmitted = null;
      this._trackSubject.next(null);
      return;
    }
    const { adaptation, switchingMode } = newTrackInfo;
    this._canceller.cancel();
    this._canceller = new TaskCanceller();
    const reference = this._constructLockedRepresentationsReference(newTrackInfo);
    this._lastEmitted = { adaptation, switchingMode, lockedRepresentations: null };
    this._trackSubject.next({ adaptation, switchingMode, representations: reference });
  }

  /**
   * Create a shared reference which will emit the wanted locked Representations
   * based on the current capabilities and the last user settings.
   *
   * @param {Object} trackInfo
   * @returns {Object}
   */
  private _constructLockedRepresentationsReference(
    trackInfo : ITrackSetting
  ) : IReadOnlySharedReference<IRepresentationsChoice> {
    const manifest = this._manifest;

    /* eslint-disable-next-line @typescript-eslint/no-this-alias */
    const self = this;
    manifest.addEventListener("decipherabilityUpdate", updateReferenceIfNeeded);
    manifest.addEventListener("manifestUpdate", updateReferenceIfNeeded);
    const sub = trackInfo.lockedRepresentations.asObservable(true)
      .subscribe(updateReferenceIfNeeded);
    this._canceller.signal.register(removeListeners);

    /* Initialize it. Will be at its true value at the end of the function. */
    const reference = createSharedReference<IRepresentationsChoice>({
      representations: [],
      switchingMode: "lazy",
    });
    updateReferenceIfNeeded();

    return reference;

    function updateReferenceIfNeeded() : void {
      const repSettings = trackInfo.lockedRepresentations.getValue();
      let switchingMode : IAudioRepresentationsSwitchingMode |
                          IVideoRepresentationsSwitchingMode;

      /** Representations for which a `RepresentationStream` can be created. */
      let playableRepresentations;
      if (repSettings === null) { // unlocking
        playableRepresentations = trackInfo.adaptation.getPlayableRepresentations();

        // No need to remove the previous content when unlocking
        switchingMode = "lazy";
      } else {
        const { representations } = repSettings;
        switchingMode = repSettings.switchingMode;
        playableRepresentations = representations.filter(r => r.isPlayable());
        if (playableRepresentations.length === 0) {
          self.trigger("noPlayableLockedRepresentation", null);
          return;
        }
      }
      if (playableRepresentations.length <= 0) {
        const adaptationType = trackInfo.adaptation.type;
        const noRepErr = new MediaError("NO_PLAYABLE_REPRESENTATION",
                                        "No Representation in the chosen " +
                                        adaptationType + " Adaptation can be played");
        throw noRepErr;
      }

      // Check if Locked Representations have changed
      const oldRef = reference.getValue();
      const sortedReps = playableRepresentations.slice().sort();
      if (sortedReps.length !== oldRef.representations.length) {
        reference.setValue({ representations: sortedReps, switchingMode });
        return;
      }
      for (let i = 0; i < sortedReps.length; i++) {
        if (oldRef.representations[i].id !== sortedReps[i].id) {
          reference.setValue({ representations: sortedReps, switchingMode });
          return ;
        }
      }
    }

    function removeListeners() {
      manifest.removeEventListener("decipherabilityUpdate", updateReferenceIfNeeded);
      manifest.removeEventListener("manifestUpdate", updateReferenceIfNeeded);
      sub.unsubscribe();
    }
  }

  /**
   * Free the resources (e.g. `Manifest` event listeners) linked to this
   * `TrackDispatcher`.
   */
  public dispose() : void {
    this.removeEventListener();
    this._canceller.cancel();
    this._trackSubject.complete();
  }
}

export interface ITrackDispatcherEvent {
  /**
   * Event sent when given locked Representations cannot be respected because
   * none of them are currently "playable".
   */
  noPlayableLockedRepresentation : null;
}

/** Define a new Track preference given to the `TrackDispatcher`. */
export interface ITrackSetting {
  /** Contains the `Adaptation` wanted by the user. */
  adaptation : Adaptation;
  /** "Switching mode" in which the track switch should happen. */
  switchingMode : ITrackSwitchingMode;
  /**
   * Contains the last locked `Representation`s for this `Adaptation` wanted
   * by the user.
   * `null` if no Representation is locked.
   *
   * Can be updated continuously while the `TrackDispatcher` is in possession
   * of this shared reference.
   */
  lockedRepresentations : IReadOnlySharedReference<IRepresentationsChoice | null>;
}
