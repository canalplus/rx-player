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

import { IReadOnlyPlaybackObserver } from "../api";
import createSharedReference, {
  IReadOnlySharedReference,
} from "../common/utils/reference";
import { CancellationSignal } from "../common/utils/task_canceller";
import { IStreamOrchestratorPlaybackObservation } from "./core/stream";
import { IWorkerPlaybackObservation } from "../main";
import Manifest from "./manifest";

/** Arguments needed to create the Stream's version of the PlaybackObserver. */
export interface IStreamPlaybackObserverArguments {
  /** The last speed requested by the user. */
  speed : IReadOnlySharedReference<number>;
}

/**
 * Create PlaybackObserver for the `Stream` part of the code.
 * @param {Object} manifest
 * @param {Object} playbackObserver
 * @param {Object} args
 * @returns {Object}
 */
export default function createStreamPlaybackObserver(
  manifest : Manifest,
  playbackObserver : IReadOnlyPlaybackObserver<IWorkerPlaybackObservation>,
  { speed } : IStreamPlaybackObserverArguments
) : IReadOnlyPlaybackObserver<IStreamOrchestratorPlaybackObservation> {
  return playbackObserver.deriveReadOnlyObserver(function transform(
    observationRef : IReadOnlySharedReference<IWorkerPlaybackObservation>,
    cancellationSignal : CancellationSignal
  ) : IReadOnlySharedReference<IStreamOrchestratorPlaybackObservation> {
    const newRef = createSharedReference(constructStreamPlaybackObservation());

    speed.onUpdate(emitStreamPlaybackObservation, {
      clearSignal: cancellationSignal,
      emitCurrentValue: false,
    });

    observationRef.onUpdate(emitStreamPlaybackObservation, {
      clearSignal: cancellationSignal,
      emitCurrentValue: false,
    });

    cancellationSignal.register(() => {
      newRef.finish();
    });

    return newRef;

    function constructStreamPlaybackObservation() {
      const observation = observationRef.getValue();
      const lastSpeed = speed.getValue();

      return {
        // TODO more exact according to the current Adaptation chosen?
        maximumPosition: manifest.getMaximumSafePosition(),
        position: { last: observation.position.last,
                    pending: observation.position.pending },
        duration: observation.duration,
        readyState: observation.readyState,
        paused: { last: observation.paused.last,
                  pending: observation.paused.pending },
        speed: lastSpeed,
      };
    }

    function emitStreamPlaybackObservation() {
      newRef.setValue(constructStreamPlaybackObservation());
    }
  });
}
