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

import {
  concat as observableConcat,
  defer as observableDefer,
  merge as observableMerge,
  Observable,
  of as observableOf,
  race as observableRace,
} from "rxjs";
import {
  concatMapTo,
  mergeMap,
  take,
  takeLast,
} from "rxjs/operators";
import {
  onRemoveSourceBuffers$,
  onSourceOpen$,
  onUpdate$,
} from "../../compat/events";
import log from "../../log";

/**
 * Get "updating" SourceBuffers from a SourceBufferList.
 * @param {SourceBufferList} sourceBuffers
 * @returns {Array.<SourceBuffer>}
 */
function getUpdatingSourceBuffers(
  sourceBuffers : SourceBufferList
) : SourceBuffer[] {
  const updatingSourceBuffers : SourceBuffer[] = [];
  for (let i = 0; i < sourceBuffers.length; i++) {
    const SourceBuffer = sourceBuffers[i];
    if (SourceBuffer.updating) {
        updatingSourceBuffers.push(SourceBuffer);
    }
  }

  return updatingSourceBuffers;
}

/**
 * Trigger the `endOfStream` method of a MediaSource.
 *
 * If the MediaSource is ended/closed, do not call this method.
 *
 * If SourceBuffers are updating, wait for them to be updated before closing
 * it.
 * @param {MediaSource} mediaSource
 * @returns {Observable}
 */
export default function triggerEndOfStream(
  mediaSource : MediaSource
) : Observable<null> {
  return observableDefer(() => {
    if (mediaSource.readyState !== "open") {
      // already done, exit
      return observableOf(null);
    }

    const { sourceBuffers } = mediaSource;
    const updatingSourceBuffers = getUpdatingSourceBuffers(sourceBuffers);

    if (!updatingSourceBuffers.length) {
      log.info("triggering end of stream");
      mediaSource.endOfStream();
      return observableOf(null);
    }

    const updatedSourceBuffers$ = updatingSourceBuffers
      .map(onUpdate$);

    return observableRace(
      observableMerge(...updatedSourceBuffers$)
        .pipe(takeLast(1)),

      onRemoveSourceBuffers$(sourceBuffers)
        .pipe(take(1))
    ).pipe(mergeMap(() => {
      return triggerEndOfStream(mediaSource);
    }));
  });
}

/**
 * Trigger the `endOfStream` method of a MediaSource each times it opens.
 * @see triggerEndOfStream
 * @param {MediaSource} mediaSource
 * @returns {Observable}
 */
export function maintainEndOfStream(mediaSource : MediaSource) : Observable<null> {
  return observableConcat(
    triggerEndOfStream(mediaSource),
    onSourceOpen$(mediaSource)
      .pipe(concatMapTo(triggerEndOfStream(mediaSource)))
  );
}
