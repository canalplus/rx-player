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

import nextTick from "next-tick";
import {
  combineLatest as observableCombineLatest,
  concat as observableConcat,
  defer as observableDefer,
  EMPTY,
  ignoreElements,
  merge as observableMerge,
  mergeMap,
  Observable,
  of as observableOf,
  share,
  startWith,
  Subject,
  take,
  takeWhile,
  withLatestFrom,
} from "rxjs";
import config from "../../../config";
import log from "../../../log";
import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../../manifest";
import assertUnreachable from "../../../utils/assert_unreachable";
import objectAssign from "../../../utils/object_assign";
import { createSharedReference } from "../../../utils/reference";
import { IReadOnlyPlaybackObserver } from "../../api";
import { IPrioritizedSegmentFetcher } from "../../fetchers";
import { SegmentBuffer } from "../../segment_buffers";
import EVENTS from "../events_generators";
import {
  IEncryptionDataEncounteredEvent,
  IQueuedSegment,
  IRepresentationStreamEvent,
  IStreamEventAddedSegment,
  IStreamManifestMightBeOutOfSync,
  IStreamNeedsManifestRefresh,
  IStreamStatusEvent,
  IStreamTerminatingEvent,
  IInbandEventsEvent,
  IStreamWarningEvent,
} from "../types";
import DownloadingQueue, {
  IDownloadingQueueEvent,
  IDownloadQueueItem,
  IParsedInitSegmentEvent,
  IParsedSegmentEvent,
} from "./downloading_queue";
import getBufferStatus from "./get_buffer_status";
import getSegmentPriority from "./get_segment_priority";
import pushInitSegment from "./push_init_segment";
import pushMediaSegment from "./push_media_segment";

/**
 * Build up buffer for a single Representation.
 *
 * Download and push segments linked to the given Representation according
 * to what is already in the SegmentBuffer and where the playback currently is.
 *
 * Multiple RepresentationStream observables can run on the same SegmentBuffer.
 * This allows for example smooth transitions between multiple periods.
 *
 * @param {Object} args
 * @returns {Observable}
 */
export default function RepresentationStream<TSegmentDataType>({
  content,
  options,
  playbackObserver,
  segmentBuffer,
  segmentFetcher,
  terminate$,
} : IRepresentationStreamArguments<TSegmentDataType>
) : Observable<IRepresentationStreamEvent> {
  const { period,
          adaptation,
          representation } = content;
  const { bufferGoal$,
          maxBufferSize$,
          drmSystemId,
          fastSwitchThreshold$ } = options;
  const bufferType = adaptation.type;

  /** Saved initialization segment state for this representation. */
  const initSegmentState : IInitSegmentState<TSegmentDataType> = {
    segment: representation.index.getInitSegment(),
    segmentData: null,
    isLoaded: false,
  };

  /** Allows to manually re-check which segments are needed. */
  const reCheckNeededSegments$ = new Subject<void>();

  /** Emit the last scheduled downloading queue for segments. */
  const lastSegmentQueue = createSharedReference<IDownloadQueueItem>({
    initSegment: null,
    segmentQueue: [],
  });
  const hasInitSegment = initSegmentState.segment !== null;

  /** Will load every segments in `lastSegmentQueue` */
  const downloadingQueue = new DownloadingQueue(content,
                                                lastSegmentQueue,
                                                segmentFetcher,
                                                hasInitSegment);

  if (!hasInitSegment) {
    initSegmentState.segmentData = null;
    initSegmentState.isLoaded = true;
  }

  /**
   * `true` if the event notifying about encryption data has already been
   * constructed.
   * Allows to avoid sending multiple times protection events.
   */
  let hasSentEncryptionData = false;
  let encryptionEvent$ : Observable<IEncryptionDataEncounteredEvent> = EMPTY;

  // If the DRM system id is already known, and if we already have encryption data
  // for it, we may not need to wait until the initialization segment is loaded to
  // signal required protection data, thus performing License negotiations sooner
  if (drmSystemId !== undefined) {
    const encryptionData = representation.getEncryptionData(drmSystemId);

    // If some key ids are not known yet, it may be safer to wait for this initialization
    // segment to be loaded first
    if (encryptionData.length > 0 && encryptionData.every(e => e.keyIds !== undefined)) {
      encryptionEvent$ = observableOf(...encryptionData.map(d =>
        EVENTS.encryptionDataEncountered(d, content)));
      hasSentEncryptionData = true;
    }
  }

  /** Observable loading and pushing segments scheduled through `lastSegmentQueue`. */
  const queue$ = downloadingQueue.start()
    .pipe(mergeMap(onQueueEvent));

  /** Observable emitting the stream "status" and filling `lastSegmentQueue`. */
  const status$ = observableCombineLatest([
    playbackObserver.getReference().asObservable(),
    bufferGoal$,
    maxBufferSize$,
    terminate$.pipe(take(1),
                    startWith(null)),
    reCheckNeededSegments$.pipe(startWith(undefined)),
  ]).pipe(
    withLatestFrom(fastSwitchThreshold$),
    mergeMap(function (
      [ [ observation, bufferGoal, maxBufferSize, terminate ],
        fastSwitchThreshold ]
    ) : Observable<IStreamStatusEvent |
                   IStreamNeedsManifestRefresh |
                   IStreamTerminatingEvent>
    {
      const initialWantedTime = observation.position.pending ??
                                observation.position.last;
      const status = getBufferStatus(content,
                                     initialWantedTime,
                                     playbackObserver,
                                     fastSwitchThreshold,
                                     bufferGoal,
                                     maxBufferSize,
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

      if (terminate === null) {
        lastSegmentQueue.setValue({ initSegment: neededInitSegment,
                                    segmentQueue: neededSegments });
      } else if (terminate.urgent) {
        log.debug("Stream: Urgent switch, terminate now.", bufferType);
        lastSegmentQueue.setValue({ initSegment: null, segmentQueue: [] });
        lastSegmentQueue.finish();
        return observableOf(EVENTS.streamTerminating());
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
          return observableOf(EVENTS.streamTerminating());
        }
      }

      const bufferStatusEvt : Observable<IStreamStatusEvent> =
        observableOf({ type: "stream-status" as const,
                       value: { period,
                                position: observation.position.last,
                                bufferType,
                                imminentDiscontinuity: status.imminentDiscontinuity,
                                hasFinishedLoading: status.hasFinishedLoading,
                                neededSegments: status.neededSegments } });
      let bufferRemoval = EMPTY;
      const { UPTO_CURRENT_POSITION_CLEANUP } = config.getCurrent();
      if (status.isBufferFull) {
        const gcedPosition = Math.max(
          0,
          initialWantedTime - UPTO_CURRENT_POSITION_CLEANUP);
        if (gcedPosition > 0) {
          bufferRemoval = segmentBuffer
            .removeBuffer(0, gcedPosition)
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            .pipe(ignoreElements());
        }
      }
      return status.shouldRefreshManifest ?
        observableConcat(observableOf(EVENTS.needsManifestRefresh()),
                         bufferStatusEvt, bufferRemoval) :
        observableConcat(bufferStatusEvt, bufferRemoval);
    }),
    takeWhile((e) => e.type !== "stream-terminating", true)
  );

  return observableMerge(status$, queue$, encryptionEvent$).pipe(share());

  /**
   * React to event from the `DownloadingQueue`.
   * @param {Object} evt
   * @returns {Observable}
   */
  function onQueueEvent(
    evt : IDownloadingQueueEvent<TSegmentDataType>
  ) : Observable<IStreamEventAddedSegment<TSegmentDataType> |
                 IStreamWarningEvent |
                 IEncryptionDataEncounteredEvent |
                 IInbandEventsEvent |
                 IStreamNeedsManifestRefresh |
                 IStreamManifestMightBeOutOfSync>
  {
    switch (evt.type) {
      case "retry":
        return observableConcat(
          observableOf({ type: "warning" as const, value: evt.value.error }),
          observableDefer(() => { // better if done after warning is emitted
            const retriedSegment = evt.value.segment;
            const { index } = representation;
            if (index.isSegmentStillAvailable(retriedSegment) === false) {
              reCheckNeededSegments$.next();
            } else if (index.canBeOutOfSyncError(evt.value.error, retriedSegment)) {
              return observableOf(EVENTS.manifestMightBeOufOfSync());
            }
            return EMPTY; // else, ignore.
          }));

      case "parsed-init":
      case "parsed-media":
        return onParsedChunk(evt);

      case "end-of-segment": {
        const { segment } = evt.value;
        return segmentBuffer.endOfSegment(objectAssign({ segment }, content))
          // NOTE As of now (RxJS 7.4.0), RxJS defines `ignoreElements` default
          // first type parameter as `any` instead of the perfectly fine `unknown`,
          // leading to linter issues, as it forbids the usage of `any`.
          // This is why we're disabling the eslint rule.
          /* eslint-disable-next-line @typescript-eslint/no-unsafe-argument */
          .pipe(ignoreElements());
      }

      case "end-of-queue":
        reCheckNeededSegments$.next();
        return EMPTY;

      default:
        assertUnreachable(evt);
    }
  }

  /**
   * Process a chunk that has just been parsed by pushing it to the
   * SegmentBuffer and emitting the right events.
   * @param {Object} evt
   * @returns {Observable}
   */
  function onParsedChunk(
    evt : IParsedInitSegmentEvent<TSegmentDataType> |
          IParsedSegmentEvent<TSegmentDataType>
  ) : Observable<IStreamEventAddedSegment<TSegmentDataType> |
                 IEncryptionDataEncounteredEvent |
                 IInbandEventsEvent |
                 IStreamNeedsManifestRefresh |
                 IStreamManifestMightBeOutOfSync>
  {
    // Supplementary encryption information might have been parsed.
    for (const protInfo of evt.protectionData) {
      // TODO better handle use cases like key rotation by not always grouping
      // every protection data together? To check.
      representation.addProtectionData(protInfo.initDataType,
                                       protInfo.keyId,
                                       protInfo.initData);
    }

    let segmentEncryptionEvent$ : Observable<IEncryptionDataEncounteredEvent> = EMPTY;
    if (!hasSentEncryptionData) {
      const protData = representation.getAllEncryptionData().map(p =>
        EVENTS.encryptionDataEncountered(p, content));
      if (protData.length > 0) {
        segmentEncryptionEvent$ = observableOf(...protData);
        hasSentEncryptionData = true;
      }
    }

    if (evt.segmentType === "init") {
      if (!representation.index.isInitialized() &&
          evt.segmentList !== undefined)
      {
        representation.index.initialize(evt.segmentList);
        nextTick(() => { reCheckNeededSegments$.next(); });
      }
      initSegmentState.segmentData = evt.initializationData;
      initSegmentState.isLoaded = true;
      const pushEvent$ = pushInitSegment({ playbackObserver,
                                           content,
                                           segment: evt.segment,
                                           segmentData: evt.initializationData,
                                           segmentBuffer });
      return observableMerge(segmentEncryptionEvent$, pushEvent$);
    } else {
      const { inbandEvents,
              predictedSegments,
              needsManifestRefresh } = evt;
      if (predictedSegments !== undefined) {
        representation.index.addPredictedSegments(predictedSegments, evt.segment);
      }

      const manifestRefresh$ =  needsManifestRefresh === true ?
        observableOf(EVENTS.needsManifestRefresh()) :
        EMPTY;
      const inbandEvents$ = inbandEvents !== undefined &&
                            inbandEvents.length > 0 ?
        observableOf({ type: "inband-events" as const,
                       value: inbandEvents }) :
        EMPTY;

      const initSegmentData = initSegmentState.segmentData;
      const pushMediaSegment$ = pushMediaSegment({ playbackObserver,
                                                   content,
                                                   initSegmentData,
                                                   parsedSegment: evt,
                                                   segment: evt.segment,
                                                   segmentBuffer });
      return observableConcat(segmentEncryptionEvent$,
                              manifestRefresh$,
                              inbandEvents$,
                              pushMediaSegment$);
    }
  }
}

/** Object that should be emitted by the given `IReadOnlyPlaybackObserver`. */
export interface IRepresentationStreamPlaybackObservation {
  /**
   * Information on the current media position in seconds at the time of a
   * Playback Observation.
   */
  position : IPositionPlaybackObservation;
}

/** Position-related information linked to an emitted Playback observation. */
export interface IPositionPlaybackObservation {
  /**
   * Known position at the time the Observation was emitted, in seconds.
   *
   * Note that it might have changed since. If you want truly precize
   * information, you should recuperate it from the HTMLMediaElement directly
   * through another mean.
   */
  last : number;
  /**
   * Actually wanted position in seconds that is not yet reached.
   *
   * This might for example be set to the initial position when the content is
   * loading (and thus potentially at a `0` position) but which will be seeked
   * to a given position once possible.
   */
  pending : number | undefined;
}

/** Item emitted by the `terminate$` Observable given to a RepresentationStream. */
export interface ITerminationOrder {
  /*
   * If `true`, the RepresentationStream should interrupt immediately every long
   * pending operations such as segment downloads.
   * If it is set to `false`, it can continue until those operations are
   * finished.
   */
  urgent : boolean;
}

/** Arguments to give to the RepresentationStream. */
export interface IRepresentationStreamArguments<TSegmentDataType> {
  /** The context of the Representation you want to load. */
  content: { adaptation : Adaptation;
             manifest : Manifest;
             period : Period;
             representation : Representation; };
  /** The `SegmentBuffer` on which segments will be pushed. */
  segmentBuffer : SegmentBuffer;
  /** Interface used to load new segments. */
  segmentFetcher : IPrioritizedSegmentFetcher<TSegmentDataType>;
  /**
   * Observable emitting when the RepresentationStream should "terminate".
   *
   * When this Observable emits, the RepresentationStream will begin a
   * "termination process": it will, depending on the type of termination
   * wanted, either stop immediately pending segment requests or wait until they
   * are finished before fully terminating (sending the
   * `IStreamTerminatingEvent` and then completing the `RepresentationStream`
   * Observable once the corresponding segments have been pushed).
   */
  terminate$ : Observable<ITerminationOrder>;
  /** Periodically emits the current playback conditions. */
  playbackObserver : IReadOnlyPlaybackObserver<IRepresentationStreamPlaybackObservation>;
  /** Supplementary arguments which configure the RepresentationStream's behavior. */
  options: IRepresentationStreamOptions;
}


/**
 * Various specific stream "options" which tweak the behavior of the
 * RepresentationStream.
 */
export interface IRepresentationStreamOptions {
  /**
   * The buffer size we have to reach in seconds (compared to the current
   * position. When that size is reached, no segments will be loaded until it
   * goes below that size again.
   */
  bufferGoal$ : Observable<number>;

  /**
   *  The buffer size limit in memory that we can reach.
   *  Once reached, no segments will be loaded until it
   *  goes below that size again
   */
  maxBufferSize$ : Observable<number>;

  /**
   * Hex-encoded DRM "system ID" as found in:
   * https://dashif.org/identifiers/content_protection/
   *
   * Allows to identify which DRM system is currently used, to allow potential
   * optimizations.
   *
   * Set to `undefined` in two cases:
   *   - no DRM system is used (e.g. the content is unencrypted).
   *   - We don't know which DRM system is currently used.
   */
  drmSystemId : string | undefined;
  /**
   * Bitrate threshold from which no "fast-switching" should occur on a segment.
   *
   * Fast-switching is an optimization allowing to replace segments from a
   * low-bitrate Representation by segments from a higher-bitrate
   * Representation. This allows the user to see/hear an improvement in quality
   * faster, hence "fast-switching".
   *
   * This Observable allows to limit this behavior to only allow the replacement
   * of segments with a bitrate lower than a specific value - the number emitted
   * by that Observable.
   *
   * If set to `undefined`, no threshold is active and any segment can be
   * replaced by higher quality segment(s).
   *
   * `0` can be emitted to disable any kind of fast-switching.
   */
  fastSwitchThreshold$: Observable< undefined | number>;
}

/**
 * Information about the initialization segment linked to the Representation
 * which the RepresentationStream try to download segments for.
 */
interface IInitSegmentState<T> {
  /**
   * Segment Object describing that initialization segment.
   * `null` if there's no initialization segment for that Representation.
   */
  segment : ISegment | null;
  /**
   * Initialization segment data.
   * `null` either when it doesn't exist or when it has not been loaded yet.
   */
  segmentData : T | null;
  /** `true` if the initialization segment has been loaded and parsed. */
  isLoaded : boolean;
}
