import Manifest from "../../../../manifest";
import { IMediaSourceInterface } from "../../../../mse";
import SharedReference, {
  IReadOnlySharedReference,
} from "../../../../utils/reference";
import TaskCanceller, {
  CancellationSignal,
} from "../../../../utils/task_canceller";
import { IReadOnlyPlaybackObserver } from "../../../api";
import { IStreamOrchestratorPlaybackObservation } from "../../../stream";
import {
  getBufferedDataPerMediaBuffer,
} from "../../utils/create_stream_playback_observer";
import { ICorePlaybackObservation } from "./worker_playback_observer";

/** Arguments needed to create the Stream's version of the PlaybackObserver. */
export interface IStreamPlaybackObserverArguments {
  /** The last speed requested by the user. */
  speed : IReadOnlySharedReference<number>;
  /** Manifest of the content being played */
  manifest : Manifest;
  /** Used abstraction for MSE API. */
  mediaSource : IMediaSourceInterface;
}

/**
 * Create PlaybackObserver for the `Stream` part of the code.
 * @param {Object} playbackObserver
 * @param {Object} args
 * @returns {Object}
 */
export default function createStreamPlaybackObserver(
  playbackObserver : IReadOnlyPlaybackObserver<ICorePlaybackObservation>,
  { speed, mediaSource, manifest } : IStreamPlaybackObserverArguments,
  fnCancelSignal : CancellationSignal
) : IReadOnlyPlaybackObserver<IStreamOrchestratorPlaybackObservation> {
  return playbackObserver.deriveReadOnlyObserver(function transform(
    observationRef : IReadOnlySharedReference<ICorePlaybackObservation>,
    parentObserverCancelSignal : CancellationSignal
  ) : IReadOnlySharedReference<IStreamOrchestratorPlaybackObservation> {
    const canceller = new TaskCanceller();
    canceller.linkToSignal(parentObserverCancelSignal);
    canceller.linkToSignal(fnCancelSignal);
    const newRef = new SharedReference(constructStreamPlaybackObservation(),
                                       canceller.signal);

    // TODO there might be subtle unexpected behavior here as updating the
    // speed will send observation which may be outdated at the time it is sent
    speed.onUpdate(emitStreamPlaybackObservation, {
      clearSignal: canceller.signal,
      emitCurrentValue: false,
    });

    observationRef.onUpdate(emitStreamPlaybackObservation, {
      clearSignal: canceller.signal,
      emitCurrentValue: false,
    });
    return newRef;

    function constructStreamPlaybackObservation(
    ): IStreamOrchestratorPlaybackObservation {
      const observation = observationRef.getValue();
      const lastSpeed = speed.getValue();
      const { buffered } = observation;
      const newBuffered = getBufferedDataPerMediaBuffer(mediaSource, null);
      if (newBuffered.audio !== null) {
        buffered.audio = newBuffered.audio;
      }
      if (newBuffered.video !== null) {
        buffered.video = newBuffered.video;
      }
      return {
        // TODO more exact according to the current Adaptation chosen?
        maximumPosition: manifest.getMaximumSafePosition(),
        position: observation.position,
        buffered,
        duration: observation.duration,
        paused: observation.paused,
        readyState: observation.readyState,
        speed: lastSpeed,
      };
    }

    function emitStreamPlaybackObservation() {
      newRef.setValue(constructStreamPlaybackObservation());
    }
  });
}
