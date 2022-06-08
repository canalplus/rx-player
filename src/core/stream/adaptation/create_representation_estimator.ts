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

import { ICustomError, MediaError } from "../../../errors";
import Manifest, {
  Adaptation,
  Period,
  Representation,
} from "../../../manifest";
import createSharedReference, {
  IReadOnlySharedReference,
} from "../../../utils/reference";
import { CancellationSignal } from "../../../utils/task_canceller";
import {
  IABREstimate,
  IRepresentationEstimatorPlaybackObservation,
  IRepresentationEstimator,
  IRepresentationEstimatorCallbacks,
} from "../../adaptive";
import { IReadOnlyPlaybackObserver } from "../../api";

/**
 * Produce estimates to know which Representation should be played.
 * @param {Object} content - The Manifest, Period and Adaptation wanted.
 * @param {Object} representationEstimator - `IRepresentationEstimator` which
 * will produce Representation estimates.
 * @param {Object} currentRepresentation - Reference emitting the
 * currently-loaded Representation.
 * @param {Object} playbackObserver - Allows to observe the current playback
 * conditions.
 * @param {Function} onFatalError - Callback called when a fatal error was
 * thrown. Once this callback is called, no estimate will be produced.
 * @param {Object} cancellationSignal - `CancellationSignal` allowing to abort
 * the production of estimates (and clean-up all linked resources).
 * @returns {Object} - Returns an object with the following properties:
 *   - `estimateRef`: Reference emitting the last estimate
 *   - `abrCallbacks`: Callbacks allowing to report back network and playback
 *     activities to improve the estimates given.
 */
export default function getRepresentationEstimate(
  content : { manifest : Manifest;
              period : Period;
              adaptation : Adaptation; },
  representationEstimator : IRepresentationEstimator,
  currentRepresentation : IReadOnlySharedReference<Representation | null>,
  playbackObserver : IReadOnlyPlaybackObserver<
    IRepresentationEstimatorPlaybackObservation
  >,
  onFatalError: (err : ICustomError) => void,
  cancellationSignal : CancellationSignal
) : { estimateRef : IReadOnlySharedReference<IABREstimate>;
      abrCallbacks : IRepresentationEstimatorCallbacks; }
{
  const { manifest, adaptation } = content;
  const representations = createSharedReference<Representation[]>([]);
  updateRepresentationsReference();
  manifest.addEventListener("decipherabilityUpdate", updateRepresentationsReference);
  const unregisterCleanUp = cancellationSignal.register(cleanUp);
  const [ estimateRef,
          abrCallbacks ] = representationEstimator(content,
                                                   currentRepresentation,
                                                   representations,
                                                   playbackObserver,
                                                   cancellationSignal);
  return { abrCallbacks, estimateRef };

  function updateRepresentationsReference() : void {
    /** Representations for which a `RepresentationStream` can be created. */
    const newRepr = adaptation.getPlayableRepresentations();
    if (newRepr.length === 0) {
      const noRepErr = new MediaError("NO_PLAYABLE_REPRESENTATION",
                                      "No Representation in the chosen " +
                                      adaptation.type + " Adaptation can be played");
      cleanUp();
      onFatalError(noRepErr);
      return;
    }

    const prevRepr = representations.getValue();
    if (prevRepr.length === newRepr.length) {
      if (prevRepr.every((r, idx) => r.id === newRepr[idx].id)) {
        return ;
      }
    }
    representations.setValue(newRepr);
  }

  /** Clean-up all resources taken here. */
  function cleanUp() : void {
    manifest.removeEventListener("decipherabilityUpdate", updateRepresentationsReference);
    representations.finish();

    // check to protect against the case where it is not yet defined.
    if (typeof unregisterCleanUp !== "undefined") {
      unregisterCleanUp();
    }
  }
}
