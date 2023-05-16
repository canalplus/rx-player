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

/**
 * This file allows to create RepresentationStreams.
 *
 * A RepresentationStream downloads and push segment for a single
 * Representation (e.g. a single video stream of a given quality).
 * It chooses which segments should be downloaded according to the current
 * position and what is currently buffered.
 */

import config from "../../../config";
import log from "../../../log";
import { ISegment } from "../../../manifest";
import objectAssign from "../../../utils/object_assign";
import { createSharedReference } from "../../../utils/reference";
import TaskCanceller, {
  CancellationError,
  CancellationSignal,
} from "../../../utils/task_canceller";
import {
  IQueuedSegment,
  IRepresentationStreamArguments,
  IRepresentationStreamCallbacks,
} from "./types";
import DownloadingQueue, {
  IDownloadQueueItem,
  IParsedInitSegmentPayload,
  IParsedSegmentPayload,
} from "./utils/downloading_queue";
import getBufferStatus from "./utils/get_buffer_status";
import getSegmentPriority from "./utils/get_segment_priority";
import pushInitSegment from "./utils/push_init_segment";
import pushMediaSegment from "./utils/push_media_segment";

/**
 * Perform the logic to load the right segments for the given Representation and
 * push them to the given `SegmentBuffer`.
 *
 * In essence, this is the entry point of the core streaming logic of the
 * RxPlayer, the one actually responsible for finding which are the current
 * right segments to load, loading them, and pushing them so they can be decoded.
 *
 * Multiple RepresentationStream can run on the same SegmentBuffer.
 * This allows for example smooth transitions between multiple periods.
 *
 * @param {Object} args - Various arguments allowing to know which segments to
 * load, loading them and pushing them.
 * You can check the corresponding type for more information.
 * @param {Object} callbacks - The `RepresentationStream` relies on a system of
 * callbacks that it will call on various events.
 *
 * Depending on the event, the caller may be supposed to perform actions to
 * react upon some of them.
 *
 * This approach is taken instead of a more classical EventEmitter pattern to:
 *   - Allow callbacks to be called synchronously after the
 *     `RepresentationStream` is called.
 *   - Simplify bubbling events up, by just passing through callbacks
 *   - Force the caller to explicitely handle or not the different events.
 *
 * Callbacks may start being called immediately after the `RepresentationStream`
 * call and may be called until either the `parentCancelSignal` argument is
 * triggered, until the `terminating` callback has been triggered AND all loaded
 * segments have been pushed, or until the `error` callback is called, whichever
 * comes first.
 * @param {Object} parentCancelSignal - `CancellationSignal` allowing, when
 * triggered, to immediately stop all operations the `RepresentationStream` is
 * doing.
 */
export default function RepresentationStream<TSegmentDataType>(
  { content,
    options,
    playbackObserver,
    segmentBuffer,
    segmentFetcher,
    terminate } : IRepresentationStreamArguments<TSegmentDataType>,
  callbacks : IRepresentationStreamCallbacks<TSegmentDataType>,
  parentCancelSignal : CancellationSignal
) : void {
  const { period, adaptation, representation } = content;
  const { bufferGoal, maxBufferSize, drmSystemId, fastSwitchThreshold } = options;
  const bufferType = adaptation.type;

  /** `TaskCanceller` stopping ALL operations performed by the `RepresentationStream` */
  const globalCanceller = new TaskCanceller();
  globalCanceller.linkToSignal(parentCancelSignal);

  /**
   * `TaskCanceller` allowing to only stop segment loading and checking operations.
   * This allows to stop only tasks linked to network resource usage, which is
   * often a limited resource, while still letting buffer operations to finish.
   */
  const segmentsLoadingCanceller = new TaskCanceller();
  segmentsLoadingCanceller.linkToSignal(globalCanceller.signal);

  /** Saved initialization segment state for this representation. */
  const initSegmentState : IInitSegmentState = {
    segment: representation.index.getInitSegment(),
    uniqueId: null,
    isLoaded: false,
  };
  globalCanceller.signal.register(() => {
    // Free initialization segment if one has been declared
    if (initSegmentState.uniqueId !== null) {
      segmentBuffer.freeInitSegment(initSegmentState.uniqueId);
    }
  });

  /** Emit the last scheduled downloading queue for segments. */
  const lastSegmentQueue = createSharedReference<IDownloadQueueItem>({
    initSegment: null,
    segmentQueue: [],
  }, segmentsLoadingCanceller.signal);

  /** If `true`, the current Representation has a linked initialization segment. */
  const hasInitSegment = initSegmentState.segment !== null;

  if (!hasInitSegment) {
    initSegmentState.isLoaded = true;
  }

  /**
   * `true` if the event notifying about encryption data has already been
   * constructed.
   * Allows to avoid sending multiple times protection events.
   */
  let hasSentEncryptionData = false;

  // If the DRM system id is already known, and if we already have encryption data
  // for it, we may not need to wait until the initialization segment is loaded to
  // signal required protection data, thus performing License negotiations sooner
  if (drmSystemId !== undefined) {
    const encryptionData = representation.getEncryptionData(drmSystemId);

    // If some key ids are not known yet, it may be safer to wait for this initialization
    // segment to be loaded first
    if (encryptionData.length > 0 && encryptionData.every(e => e.keyIds !== undefined)) {
      hasSentEncryptionData = true;
      callbacks.encryptionDataEncountered(
        encryptionData.map(d => objectAssign({ content }, d))
      );
      if (globalCanceller.isUsed()) {
        return ; // previous callback has stopped everything by side-effect
      }
    }
  }

  /** Will load every segments in `lastSegmentQueue` */
  const downloadingQueue = new DownloadingQueue(content,
                                                lastSegmentQueue,
                                                segmentFetcher,
                                                hasInitSegment);
  downloadingQueue.addEventListener("error", (err) => {
    if (segmentsLoadingCanceller.signal.isCancelled()) {
      return; // ignore post requests-cancellation loading-related errors,
    }
    globalCanceller.cancel(); // Stop every operations
    callbacks.error(err);
  });
  downloadingQueue.addEventListener("parsedInitSegment", onParsedChunk);
  downloadingQueue.addEventListener("parsedMediaSegment", onParsedChunk);
  downloadingQueue.addEventListener("emptyQueue", checkStatus);
  downloadingQueue.addEventListener("requestRetry", (payload) => {
    callbacks.warning(payload.error);
    if (segmentsLoadingCanceller.signal.isCancelled()) {
      return; // If the previous callback led to loading operations being stopped, skip
    }
    const retriedSegment = payload.segment;
    const { index } = representation;
    if (index.isSegmentStillAvailable(retriedSegment) === false) {
      checkStatus();
    } else if (index.canBeOutOfSyncError(payload.error, retriedSegment)) {
      callbacks.manifestMightBeOufOfSync();
    }
  });
  downloadingQueue.addEventListener("fullyLoadedSegment", (segment) => {
    segmentBuffer.endOfSegment(objectAssign({ segment }, content), globalCanceller.signal)
      .catch(onFatalBufferError);
  });
  downloadingQueue.start();
  segmentsLoadingCanceller.signal.register(() => {
    downloadingQueue.removeEventListener();
    downloadingQueue.stop();
  });

  playbackObserver.listen(checkStatus, {
    includeLastObservation: false,
    clearSignal: segmentsLoadingCanceller.signal,
  });
  bufferGoal.onUpdate(checkStatus, {
    emitCurrentValue: false,
    clearSignal: segmentsLoadingCanceller.signal ,
  });
  maxBufferSize.onUpdate(checkStatus, {
    emitCurrentValue: false,
    clearSignal: segmentsLoadingCanceller.signal,
  });
  terminate.onUpdate(checkStatus, {
    emitCurrentValue: false,
    clearSignal: segmentsLoadingCanceller.signal,
  });
  checkStatus();
  return ;

  /**
   * Produce a buffer status update synchronously on call, update the list
   * of current segments to update and check various buffer and manifest related
   * issues at the current time, calling the right callbacks if necessary.
   */
  function checkStatus() : void {
    if (segmentsLoadingCanceller.isUsed()) {
      return ; // Stop all buffer status checking if load operations are stopped
    }
    const observation = playbackObserver.getReference().getValue();
    const initialWantedTime = observation.position.pending ??
                              observation.position.last;
    const status = getBufferStatus(content,
                                   initialWantedTime,
                                   playbackObserver,
                                   fastSwitchThreshold.getValue(),
                                   bufferGoal.getValue(),
                                   maxBufferSize.getValue(),
                                   segmentBuffer);
    const { neededSegments } = status;

    let neededInitSegment : IQueuedSegment | null = null;

    // Add initialization segment if required
    if (!representation.index.isInitialized()) {
      if (initSegmentState.segment === null) {
        log.warn("Stream: Uninitialized index without an initialization segment");
      } else if (initSegmentState.isLoaded) {
        log.warn("Stream: Uninitialized index with an already loaded " +
                 "initialization segment");
      } else {
        const wantedStart = observation.position.pending ??
                            observation.position.last;
        neededInitSegment = { segment: initSegmentState.segment,
                              priority: getSegmentPriority(period.start,
                                                           wantedStart) };
      }
    } else if (neededSegments.length > 0 &&
               !initSegmentState.isLoaded &&
               initSegmentState.segment !== null)
    {
      const initSegmentPriority = neededSegments[0].priority;
      neededInitSegment = { segment: initSegmentState.segment,
                            priority: initSegmentPriority };
    }

    const terminateVal = terminate.getValue();
    if (terminateVal === null) {
      lastSegmentQueue.setValue({ initSegment: neededInitSegment,
                                  segmentQueue: neededSegments });
    } else if (terminateVal.urgent) {
      log.debug("Stream: Urgent switch, terminate now.", bufferType);
      lastSegmentQueue.setValue({ initSegment: null, segmentQueue: [] });
      lastSegmentQueue.finish();
      segmentsLoadingCanceller.cancel();
      callbacks.terminating();
      return;
    } else {
      // Non-urgent termination wanted:
      // End the download of the current media segment if pending and
      // terminate once either that request is finished or another segment
      // is wanted instead, whichever comes first.

      const mostNeededSegment = neededSegments[0];
      const initSegmentRequest = downloadingQueue.getRequestedInitSegment();
      const currentSegmentRequest = downloadingQueue.getRequestedMediaSegment();

      const nextQueue = currentSegmentRequest === null ||
                        mostNeededSegment === undefined ||
                        currentSegmentRequest.id !== mostNeededSegment.segment.id ?
        [] :
        [mostNeededSegment];

      const nextInit = initSegmentRequest === null ? null :
                                                     neededInitSegment;
      lastSegmentQueue.setValue({ initSegment: nextInit,
                                  segmentQueue: nextQueue });
      if (nextQueue.length === 0 && nextInit === null) {
        log.debug("Stream: No request left, terminate", bufferType);
        lastSegmentQueue.finish();
        segmentsLoadingCanceller.cancel();
        callbacks.terminating();
        return;
      }
    }

    callbacks.streamStatusUpdate({ period,
                                   position: observation.position.last,
                                   bufferType,
                                   imminentDiscontinuity: status.imminentDiscontinuity,
                                   isEmptyStream: false,
                                   hasFinishedLoading: status.hasFinishedLoading,
                                   neededSegments: status.neededSegments });
    if (segmentsLoadingCanceller.signal.isCancelled()) {
      return ; // previous callback has stopped loading operations by side-effect
    }
    const { UPTO_CURRENT_POSITION_CLEANUP } = config.getCurrent();
    if (status.isBufferFull) {
      const gcedPosition = Math.max(
        0,
        initialWantedTime - UPTO_CURRENT_POSITION_CLEANUP);
      if (gcedPosition > 0) {
        segmentBuffer.removeBuffer(0, gcedPosition, globalCanceller.signal)
          .catch(onFatalBufferError);
      }
    }
    if (status.shouldRefreshManifest) {
      callbacks.needsManifestRefresh();
    }
  }

  /**
   * Process a chunk that has just been parsed by pushing it to the
   * SegmentBuffer and emitting the right events.
   * @param {Object} evt
   */
  function onParsedChunk(
    evt : IParsedInitSegmentPayload<TSegmentDataType> |
          IParsedSegmentPayload<TSegmentDataType>
  ) : void {
    if (globalCanceller.isUsed()) {
      // We should not do anything with segments if the `RepresentationStream`
      // is not running anymore.
      return ;
    }
    if (evt.segmentType === "init") {
      initSegmentState.isLoaded = true;

      // Now that the initialization segment has been parsed - which may have
      // included encryption information - take care of the encryption event
      // if not already done.
      if (!hasSentEncryptionData) {
        const allEncryptionData = representation.getAllEncryptionData();
        if (allEncryptionData.length > 0) {
          callbacks.encryptionDataEncountered(
            allEncryptionData.map(p => objectAssign({ content }, p))
          );
          if (globalCanceller.isUsed()) {
            return ; // previous callback has stopped everything by side-effect
          }
        }
      }

      if (evt.initializationData !== null) {
        const initSegmentUniqueId = representation.uniqueId;
        initSegmentState.uniqueId = initSegmentUniqueId;
        segmentBuffer.declareInitSegment(initSegmentUniqueId,
                                         evt.initializationData);
        pushInitSegment({ playbackObserver,
                          content,
                          initSegmentUniqueId,
                          segment: evt.segment,
                          segmentData: evt.initializationData,
                          segmentBuffer },
                        globalCanceller.signal)
          .then((result) => {
            if (result !== null) {
              callbacks.addedSegment(result);
            }
          })
          .catch(onFatalBufferError);
      }

      // Sometimes the segment list is only known once the initialization segment
      // is parsed. Thus we immediately re-check if there's new segments to load.
      checkStatus();
    } else {
      const { inbandEvents,
              needsManifestRefresh,
              protectionDataUpdate } = evt;

      // TODO better handle use cases like key rotation by not always grouping
      // every protection data together? To check.
      if (!hasSentEncryptionData && protectionDataUpdate) {
        const allEncryptionData = representation.getAllEncryptionData();
        if (allEncryptionData.length > 0) {
          callbacks.encryptionDataEncountered(
            allEncryptionData.map(p => objectAssign({ content }, p))
          );
          if (globalCanceller.isUsed()) {
            return ; // previous callback has stopped everything by side-effect
          }
        }
      }

      if (needsManifestRefresh === true) {
        callbacks.needsManifestRefresh();
        if (globalCanceller.isUsed()) {
          return ; // previous callback has stopped everything by side-effect
        }
      }
      if (inbandEvents !== undefined && inbandEvents.length > 0) {
        callbacks.inbandEvent(inbandEvents);
        if (globalCanceller.isUsed()) {
          return ; // previous callback has stopped everything by side-effect
        }
      }

      const initSegmentUniqueId = initSegmentState.uniqueId;
      pushMediaSegment({ playbackObserver,
                         content,
                         initSegmentUniqueId,
                         parsedSegment: evt,
                         segment: evt.segment,
                         segmentBuffer },
                       globalCanceller.signal)
        .then((result) => {
          if (result !== null) {
            callbacks.addedSegment(result);
          }
        })
        .catch(onFatalBufferError);
    }
  }

  /**
   * Handle Buffer-related fatal errors by cancelling everything the
   * `RepresentationStream` is doing and calling the error callback with the
   * corresponding error.
   * @param {*} err
   */
  function onFatalBufferError(err : unknown) : void {
    if (globalCanceller.isUsed() && err instanceof CancellationError) {
      // The error is linked to cancellation AND we explicitely cancelled buffer
      // operations.
      // We can thus ignore it, it is very unlikely to lead to true buffer issues.
      return;
    }
    globalCanceller.cancel();
    callbacks.error(err);
  }
}

/**
 * Information about the initialization segment linked to the Representation
 * which the RepresentationStream try to download segments for.
 */
interface IInitSegmentState {
  /**
   * Segment Object describing that initialization segment.
   * `null` if there's no initialization segment for that Representation.
   */
  segment : ISegment | null;
  /**
   * Unique identifier used to identify the initialization segment data, used by
   * the `SegmentBuffer`.
   * `null` either when it doesn't exist or when it has not been declared yet.
   */
  uniqueId : string | null;
  /** `true` if the initialization segment has been loaded and parsed. */
  isLoaded : boolean;
}
