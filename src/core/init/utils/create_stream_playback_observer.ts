/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Manifest from "../../../manifest";
import SharedReference, {
  IReadOnlySharedReference,
} from "../../../utils/reference";
import TaskCanceller, {
  CancellationSignal,
} from "../../../utils/task_canceller";
import {
  IPlaybackObservation,
  IReadOnlyPlaybackObserver,
  PlaybackObserver,
} from "../../api";
import { IStreamOrchestratorPlaybackObservation } from "../../stream";

/** Arguments needed to create the Stream's version of the PlaybackObserver. */
export interface IStreamPlaybackObserverArguments {
  /** If true, the player will auto-play when `initialPlayPerformed` becomes `true`. */
  autoPlay : boolean;
  /** Manifest of the content being played */
  manifest : Manifest;
  /** Becomes `true` after the initial play has been taken care of. */
  initialPlayPerformed : IReadOnlySharedReference<boolean>;
  /** The last speed requested by the user. */
  speed : IReadOnlySharedReference<number>;
}

/**
 * Create PlaybackObserver for the `Stream` part of the code.
 * @param {Object} srcPlaybackObserver - Base `PlaybackObserver` from which we
 * will derive information.
 * @param {Object} context - Various information linked to the current content
 * being played.
 * @param {Object} fnCancelSignal - Abort the created PlaybackObserver.
 * @returns {Object}
 */
export default function createStreamPlaybackObserver(
  srcPlaybackObserver : PlaybackObserver,
  { autoPlay,
    initialPlayPerformed,
    manifest,
    speed } : IStreamPlaybackObserverArguments,
  fnCancelSignal : CancellationSignal
) : IReadOnlyPlaybackObserver<IStreamOrchestratorPlaybackObservation> {
  return srcPlaybackObserver.deriveReadOnlyObserver(function transform(
    observationRef : IReadOnlySharedReference<IPlaybackObservation>,
    parentObserverCancelSignal : CancellationSignal
  ) : IReadOnlySharedReference<IStreamOrchestratorPlaybackObservation> {
    const canceller = new TaskCanceller();
    canceller.linkToSignal(parentObserverCancelSignal);
    canceller.linkToSignal(fnCancelSignal);
    const newRef = new SharedReference(constructStreamPlaybackObservation(),
                                       canceller.signal);

    speed.onUpdate(emitStreamPlaybackObservation, {
      clearSignal: canceller.signal,
      emitCurrentValue: false,
    });

    observationRef.onUpdate(emitStreamPlaybackObservation, {
      clearSignal: canceller.signal,
      emitCurrentValue: false,
    });
    return newRef;

    function constructStreamPlaybackObservation() {
      const observation = observationRef.getValue();
      const lastSpeed = speed.getValue();

      if (!manifest.isDynamic || manifest.isLastPeriodKnown) {
        // HACK: When the position is actually further than the maximum
        // position for a finished content, we actually want to be loading
        // the last segment before ending.
        // For now, this behavior is implicitely forced by making as if we
        // want to seek one second before the period's end (despite never
        // doing it).
        const lastPeriod = manifest.periods[manifest.periods.length - 1];
        if (lastPeriod !== undefined && lastPeriod.end !== undefined) {
          const wantedPosition = observation.position.getWanted();
          if (wantedPosition >= lastPeriod.start &&
              wantedPosition >= lastPeriod.end - 1)
          {
            // We're after the end of the last Period, check if `buffered`
            // indicates that the last segment is probably not loaded, in which
            // case act as if we want to load one second before the end.
            const buffered = observation.buffered;
            if (buffered.length === 0 ||
                buffered.end(buffered.length - 1) < observation.duration - 1)
            {
              observation.position.forceWantedPosition(lastPeriod.end - 1);
            }
          }
        }
      }

      return {
        // TODO more exact according to the current Adaptation chosen?
        maximumPosition: manifest.getMaximumSafePosition(),
        position: observation.position,
        duration: observation.duration,
        paused: {
          last: observation.paused,
          pending: initialPlayPerformed.getValue()  ? undefined :
                   !autoPlay === observation.paused ? undefined :
                                                      !autoPlay,
        },
        readyState: observation.readyState,
        speed: lastSpeed,
      };
    }

    function emitStreamPlaybackObservation() {
      newRef.setValue(constructStreamPlaybackObservation());
    }
  });
}
