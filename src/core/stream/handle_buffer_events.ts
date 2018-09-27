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
  EMPTY,
  merge as observableMerge,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  filter,
  ignoreElements,
  mapTo,
  mergeMap,
  share,
  skip,
  skipWhile,
  take,
  takeUntil,
  tap,
} from "rxjs/operators";
import log from "../../log";
import Manifest from "../../manifest";
import arrayIncludes from "../../utils/array-includes";
import { isTimeInTimeRanges } from "../../utils/ranges";
import { IPeriodBufferManagerEvent } from "../buffer";
import {
  IEndOfStreamEvent,
  INeedsStreamReloadEvent,
  IResumeStreamEvent,
} from "../buffer/types";
import SourceBufferManager, {
  IBufferType
} from "../source_buffers";
import { maintainEndOfStream } from "./end_of_stream";
import EVENTS from "./events_generators";
import { IPauseRequestHandle } from "./speed_manager";
import {
  IManifestUpdateEvent,
  IReloadingStreamEvent,
  IStreamClockTick,
  IStreamReloadedEvent,
} from "./types";

type ILiveEventsHandlerEvent =
  IManifestUpdateEvent |
  IPeriodBufferManagerEvent;

export interface IBufferEventHandlerArguments {
  clock$ : Observable<IStreamClockTick>;
  mediaElement : HTMLMediaElement;
  mediaSource : MediaSource;
  requestPause : () => IPauseRequestHandle;
  manifest : Manifest;
  refreshManifest : (url : string) => Observable<Manifest>;
}

export default function handleBufferEvents(
  sharedPeriodBuffers$ : Observable<IPeriodBufferManagerEvent>,
  args : IBufferEventHandlerArguments
) : (needsStreamReloadEvt : IPeriodBufferManagerEvent) => Observable<
  ILiveEventsHandlerEvent |
  IPeriodBufferManagerEvent |
  IReloadingStreamEvent |
  IStreamReloadedEvent
> {
  const { mediaElement, mediaSource, manifest, refreshManifest } = args;
  const currentBuffersReloading : IBufferType[] = [];
  let activeReloadPauseRequest : IPauseRequestHandle|null = null;

  const defaultHandler = manifest.isLive ?
    liveEventsHandler(mediaElement, manifest, refreshManifest) :

    /* tslint:disable no-unnecessary-callback-wrapper */ // needed for TS :/
    (evt : IPeriodBufferManagerEvent) => observableOf(evt);
    /* tslint:enable no-unnecessary-callback-wrapper */

  return (evt : IPeriodBufferManagerEvent) => {
    switch (evt.type) {
        case "end-of-stream":
          return handleEndOfStreamEvent();

        case "needs-stream-reload":
          return handleNeedsStreamReloadEvent(evt);

        default:
          return defaultHandler(evt);
    }
  };

  /**
   * Call the right APIs when an "end-of-stream" event is received.
   * @returns {Observable}
   */
  function handleEndOfStreamEvent() : Observable<
    IEndOfStreamEvent |
    IResumeStreamEvent
  > {
    const streamResumed$ = sharedPeriodBuffers$
      .pipe(filter(({ type }) => type === "resume-stream"));

    return maintainEndOfStream(mediaSource)
      .pipe(ignoreElements(), takeUntil(streamResumed$));
  }

  /**
   * @param {Object} needsStreamReloadEvt
   * @returns {Observable}
   */
  function handleNeedsStreamReloadEvent(
    needsStreamReloadEvt : INeedsStreamReloadEvent
  ) : Observable<IReloadingStreamEvent|IStreamReloadedEvent> {
    const { requestPause, clock$ } = args;
    const { validateReload, bufferType } = needsStreamReloadEvt.value;

    const isAlreadyAnnounced = !!currentBuffersReloading.length;
    if (!arrayIncludes(currentBuffersReloading, bufferType)) {
      currentBuffersReloading.push(bufferType);
    }

    return observableConcat(
      // announce reload
      isAlreadyAnnounced ? EMPTY : observableOf(EVENTS.reloadingStream()),

      observableDefer(() => {
        if (activeReloadPauseRequest == null) {
          log.info("Stream: making pause request to reload content.");
          activeReloadPauseRequest = requestPause();
        }

        const bufferReloaded$ = sharedPeriodBuffers$
          .pipe(filter((evt) =>
            evt.type === "added-segment" && evt.value.bufferType === bufferType ||
            evt.type === "complete-buffer" && evt.value.type === bufferType
          ));

        const nudgeWhenReloaded$ = bufferReloaded$.pipe(
          mergeMap((evt) => {
            const indexOf = currentBuffersReloading.indexOf(bufferType);
            if (indexOf < 0) {
              log.error(`Stream: ${bufferType} buffer was not reloading`);
              return EMPTY;
            }

            const originalTime = mediaElement.currentTime;
            if (
              evt.type !== "complete-buffer" &&
              originalTime < 0.0001 ?
                !isTimeInTimeRanges(mediaElement.buffered, originalTime + 0.0001) :
                !isTimeInTimeRanges(mediaElement.buffered, originalTime - 0.0001)
            ) {
              return EMPTY;
            }

            currentBuffersReloading.splice(indexOf, 1);
            if (currentBuffersReloading.length) {
              return EMPTY;
            }

            // When buffer cleaned and reloaded, perform mini-seeks to flush the
            // previous decoder's buffer
            if (mediaElement.ended) {
              return observableOf({ seeked : false });
            }

            mediaElement.currentTime = originalTime < 0.0001 ?
              originalTime + 0.0001 : originalTime - 0.0001;
            mediaElement.currentTime = originalTime;

            return observableOf({ seeked: true });
          }),
          take(1),
          takeUntil(sharedPeriodBuffers$
            .pipe(filter((evt) : evt is INeedsStreamReloadEvent =>
              evt.type === "needs-stream-reload" && evt.value.bufferType === bufferType
            ))
          )
        );

        const emitReloadedEvent$ = nudgeWhenReloaded$.pipe(
          mergeMap(() => {
            return clock$.pipe(
              skip(1),
              skipWhile(({ state, ended }) => state !== "seeked" && !ended)
            );
          }),
          filter(({ stalled }) => stalled == null),
          take(1),
          mergeMap(() => {
            if (activeReloadPauseRequest != null) {
              log.info("Stream: freeing pause request to reload content.");
              activeReloadPauseRequest.free();
              activeReloadPauseRequest = null;
            }
            return observableOf(EVENTS.reloaded());
          }),
          takeUntil(sharedPeriodBuffers$
            .pipe(filter((evt) : evt is INeedsStreamReloadEvent =>
              evt.type === "needs-stream-reload"
            ))
          )
        );

        return observableMerge(emitReloadedEvent$, observableDefer(() => {
          validateReload.next(null);
          validateReload.complete();
          return EMPTY;
        }));
      })
    );
  }
}

/**
 * Create handler for Buffer events happening only in live contexts.
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} manifest
 * @param {Function} fetchManifest
 * @returns {Function}
 */
function liveEventsHandler(
  mediaElement : HTMLMediaElement,
  manifest : Manifest,
  fetchManifest : (url : string) => Observable<Manifest>
) : (message : IPeriodBufferManagerEvent) => Observable<ILiveEventsHandlerEvent> {

  /**
   * Re-fetch the manifest and merge it with the previous version.
   *
   * /!\ Mutates the given manifest
   * @param {Function} manifestPipeline - download the manifest
   * @param {Object} currentManifest
   * @returns {Observable}
   */
  function refreshManifest(
    manifestPipeline : (url : string) => Observable<Manifest>,
    currentManifest : Manifest
  ) : Observable<IManifestUpdateEvent> {
    const refreshURL = currentManifest.getUrl();
    if (!refreshURL) {
      log.warn("Cannot refresh the manifest: no url");
      return EMPTY;
    }

    return manifestPipeline(refreshURL).pipe(
      tap((parsed) => {
        currentManifest.update(parsed);
      }),
      share(), // share the previous side effect
      mapTo(EVENTS.manifestUpdate(currentManifest))
    );
  }

  return function handleLiveEvents(message) {
    switch (message.type) {
      case "discontinuity-encountered":
        if (SourceBufferManager.isNative(message.value.bufferType)) {
          log.warn("explicit discontinuity seek", message.value.nextTime);
          mediaElement.currentTime = message.value.nextTime;
        }
        break;

      case "needs-manifest-refresh":
        log.debug("needs manifest to be refreshed");

        // out-of-index messages require a complete reloading of the
        // manifest to refresh the current index
        return refreshManifest(fetchManifest, manifest);
    }
    return observableOf(message);
  };

}
