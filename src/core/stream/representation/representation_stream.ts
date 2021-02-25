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
  BehaviorSubject,
  combineLatest as observableCombineLatest,
  concat as observableConcat,
  defer as observableDefer,
  EMPTY,
  merge as observableMerge,
  Observable,
  of as observableOf,
  ReplaySubject,
  Subject,
} from "rxjs";
import {
  ignoreElements,
  mergeMap,
  share,
  startWith,
  take,
  takeWhile,
  withLatestFrom,
} from "rxjs/operators";
import log from "../../../log";
import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../../manifest";
import { ISegmentProtection } from "../../../transports";
import areArraysOfNumbersEqual from "../../../utils/are_arrays_of_numbers_equal";
import assertUnreachable from "../../../utils/assert_unreachable";
import objectAssign from "../../../utils/object_assign";
import { IStalledStatus } from "../../api";
import { IContentProtection } from "../../eme";
import {
  IPrioritizedSegmentFetcher,
  ISegmentFetcherWarning,
} from "../../fetchers";
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
} from "../types";
import DownloadingQueue, {
  IDownloadingQueueEvent,
  IDownloadQueueItem,
} from "./downloading_queue";
import getBufferStatus from "./get_buffer_status";
import getSegmentPriority from "./get_segment_priority";
import pushInitSegment from "./push_init_segment";
import pushMediaSegment from "./push_media_segment";

/** Object emitted by the Stream's clock$ at each tick. */
export interface IRepresentationStreamClockTick {
  /** The position, in seconds, the media element was in at the time of the tick. */
  position : number;
 /**
  * Gap between the current position and the edge of a live content.
  * Not set for non-live contents.
  */
  liveGap? : number;
  /** If set, the player is currently stalled (blocked). */
  stalled : IStalledStatus|null;
  /**
   * Offset in seconds to add to the time to obtain the position we
   * actually want to download from.
   * This is mostly useful when starting to play a content, where `currentTime`
   * might still be equal to `0` but you actually want to download from a
   * starting position different from `0`.
   */
  wantedTimeOffset : number;
  /** Fetch the precize position currently in the HTMLMediaElement. */
  getCurrentTime() : number;
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
export interface IRepresentationStreamArguments<T> {
  /** Periodically emits the current playback conditions. */
  clock$ : Observable<IRepresentationStreamClockTick>;
  /** The context of the Representation you want to load. */
  content: { adaptation : Adaptation;
             manifest : Manifest;
             period : Period;
             representation : Representation; };
  /** The `SegmentBuffer` on which segments will be pushed. */
  segmentBuffer : SegmentBuffer<T>;
  /** Interface used to load new segments. */
  segmentFetcher : IPrioritizedSegmentFetcher<T>;
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
  /**
   * The buffer size we have to reach in seconds (compared to the current
   * position. When that size is reached, no segments will be loaded until it
   * goes below that size again.
   */
  bufferGoal$ : Observable<number>;
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
  options: IRepresentationStreamOptions;
}

/**
 * Various specific stream "options" which tweak the behavior of the
 * RepresentationStream.
 */
export interface IRepresentationStreamOptions {
  /**
   * To play encrypted contents we need to forward encryption "initialization
   * data" that is usually found in one of two places:
   *   1. The Manifest file
   *   2. The initialization segment
   *
   * Under normal circumstances, we wait until the initialization segment has
   * been fetched, to merge both information in case of differences between the
   * two.
   *
   * However, as an optimization, you can set this boolean to `true` so we don't
   * have to wait until initialization segments are fetched before starting, if
   * encryption data is already in the Manifest.
   */
  canRelyOnManifestEncryptionData : boolean;
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
  /** Initialization segment data, once loaded.  */
  segmentData$ : ReplaySubject<T | null>;
  /** `true` if the initialization segment has been loaded. */
  isLoaded : boolean;
  /** `true` if the initialization segment has been loaded and parsed. */
  isParsed : boolean;
}

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
export default function RepresentationStream<T>({
  bufferGoal$,
  clock$,
  content,
  fastSwitchThreshold$,
  segmentBuffer,
  segmentFetcher,
  terminate$,
  options,
} : IRepresentationStreamArguments<T>) : Observable<IRepresentationStreamEvent<T>> {
  const { period, adaptation, representation } = content;
  const { canRelyOnManifestEncryptionData } = options;
  const bufferType = adaptation.type;

  /**
   * Protection initialization data indicated for this Representation.
   * Empty array if no encryption initialization data is anounced for this
   * Representation.
   */
  const representationInitData = representation.contentProtections === undefined ?
    [] :
    representation.contentProtections.initData;

  /** Current initialization segment state for this representation. */
  const initSegmentState : IInitSegmentState<T> = {
    segment: representation.index.getInitSegment(),
    segmentData$: new ReplaySubject<T | null>(1),
    isLoaded: false,
    isParsed: false,
  };

  if (initSegmentState.segment === null) {
    // There's no init segment here, we can bypass loading it and parsing it
    initSegmentState.segmentData$.next(null);
    initSegmentState.isLoaded = true;
  }

  /** Allows to manually re-check which segments are needed. */
  const reCheckNeededSegments$ = new Subject<void>();

  /** Emit the last scheduled downloading queue for segments. */
  const downloadQueue$ = new BehaviorSubject<IDownloadQueueItem>({ initSegment: null,
                                                                   segmentQueue: [] });

  /** Will load every segments in `downloadQueue$` */
  const downloadingQueue = new DownloadingQueue(content, downloadQueue$, segmentFetcher);

  /** Observable loading and pushing segments scheduled through `downloadQueue$`. */
  const queue$ = downloadingQueue.start()
    .pipe(mergeMap(onQueueEvent));

  /** Observable emitting the stream "status" and filling `downloadQueue$`. */
  const status$ = observableCombineLatest([
    clock$,
    bufferGoal$,
    terminate$.pipe(take(1),
                    startWith(null)),
    reCheckNeededSegments$.pipe(startWith(undefined)),
  ]).pipe(
    withLatestFrom(fastSwitchThreshold$),
    mergeMap(function (
      [ [ tick, bufferGoal, terminate ],
        fastSwitchThreshold ]
    ) : Observable<IStreamStatusEvent |
                   IStreamNeedsManifestRefresh |
                   IStreamTerminatingEvent>
    {
      const status = getBufferStatus(content,
                                     tick,
                                     fastSwitchThreshold,
                                     bufferGoal,
                                     segmentBuffer);
      const { neededSegments } = status;
      let neededInitSegment : IQueuedSegment | null = null;

      // Add initialization segment if required
      if (!representation.index.isInitialized()) {
        if (initSegmentState.segment === null) {
          log.warn("Stream: Uninitialized index without an initialization segment");
        } else if (initSegmentState.isParsed) {
          log.warn("Stream: Uninitialized index with an already loaded " +
                   "initialization segment");
        } else {
          neededInitSegment = { segment: initSegmentState.segment,
                                priority: getSegmentPriority(period.start, tick) };
        }
      } else if (neededSegments.length > 0 &&
                 !initSegmentState.isLoaded &&
                 initSegmentState.segment !== null)
      {
        // prepend initialization segment
        const initSegmentPriority = neededSegments[0].priority;
        neededInitSegment = { segment: initSegmentState.segment,
                              priority: initSegmentPriority };
      }

      const mostNeededSegment = neededSegments[0];
      const initSegmentRequest = downloadingQueue.getRequestedInitSegment();
      const currentSegmentRequest = downloadingQueue.getRequestedMediaSegment();

      if (terminate === null) {
        downloadQueue$.next({ initSegment: neededInitSegment,
                              segmentQueue: neededSegments });
      } else {
        const { urgent } = terminate;
        if (urgent) {
          log.debug("Stream: Urgent switch, terminate now.", bufferType);
          downloadQueue$.next({ initSegment: null, segmentQueue: [] });
          downloadQueue$.complete();
          return observableOf(EVENTS.streamTerminating());
        } else {
          const nextQueue = currentSegmentRequest === null ||
                            mostNeededSegment === undefined ||
                            currentSegmentRequest.id !== mostNeededSegment.segment.id ?
            [] :
            [mostNeededSegment];

          const nextInit = initSegmentRequest === null ? null :
                                                         neededInitSegment;
          downloadQueue$.next({ initSegment: nextInit,
                                segmentQueue: nextQueue });
          if (nextQueue.length === 0 && nextInit === null) {
            log.debug("Stream: No request left, terminate", bufferType);
            downloadQueue$.complete();
            return observableOf(EVENTS.streamTerminating());
          }
        }
      }

      const bufferStatusEvt : Observable<IStreamStatusEvent> =
        observableOf({ type: "stream-status" as const,
                       value: { period,
                                position: tick.position,
                                bufferType,
                                imminentDiscontinuity: status.imminentDiscontinuity,
                                hasFinishedLoading: status.hasFinishedLoading,
                                neededSegments: status.neededSegments } });

      return status.shouldRefreshManifest ?
        observableConcat(observableOf(EVENTS.needsManifestRefresh()),
                         bufferStatusEvt) :
        bufferStatusEvt;
    }),
    takeWhile((e) => e.type !== "stream-terminating", true)
  );

  let encryptionEvent$ : Observable<IEncryptionDataEncounteredEvent> = EMPTY;
  if (canRelyOnManifestEncryptionData && representationInitData.length > 0) {
    encryptionEvent$ = observableOf(...representationInitData.map(d =>
      EVENTS.encryptionDataEncountered(d)));
  }

  return observableConcat(encryptionEvent$,
                          observableMerge(status$, queue$))
    .pipe(share());

  /**
   * React to event from the `DownloadingQueue`.
   * @param {Object} evt
   * @returns {Observable}
   */
  function onQueueEvent(
    evt : IDownloadingQueueEvent<T>
  ) : Observable<IStreamEventAddedSegment<T> |
                 ISegmentFetcherWarning |
                 IEncryptionDataEncounteredEvent |
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

      case "parsed-init-segment":
        nextTick(() => {
          reCheckNeededSegments$.next();
        });
        initSegmentState.segmentData$.next(evt.value.initializationData);
        initSegmentState.isParsed = true;
        const { segmentProtections } = evt.value;
        let initEncEvt$ : Observable<IEncryptionDataEncounteredEvent>;
        if (segmentProtections.length === 0) { // no protection anounced
          initEncEvt$ = canRelyOnManifestEncryptionData ||
                        representationInitData.length === 0 ?
            EMPTY : // already sent or nothing to send
            // send them now
            observableOf(...representationInitData
              .map(p => EVENTS.encryptionDataEncountered(p)));
        } else if (canRelyOnManifestEncryptionData &&
                   representationInitData.length > 0)
        {
          log.info("Stream: Ignoring init segment protection data. Such " +
                   "data was already found in the Manifest");
          initEncEvt$ = EMPTY;
        } else {
          initEncEvt$ = observableOf(
            ...mergeEncryptionData(representationInitData, segmentProtections)
              .map(p => EVENTS.encryptionDataEncountered(p)));
        }
        const pushEvent$ = pushInitSegment({ clock$,
                                             content,
                                             segment: evt.segment,
                                             segmentData: evt.value.initializationData,
                                             segmentBuffer });
        return observableMerge(initEncEvt$, pushEvent$);

      case "parsed-segment":
        return initSegmentState.segmentData$
          .pipe(mergeMap((initSegmentData) =>
            pushMediaSegment({ clock$,
                               content,
                               initSegmentData,
                               parsedSegment: evt.value,
                               segment: evt.segment,
                               segmentBuffer })));

      case "end-of-segment": {
        const { segment } = evt.value;
        if (segment.isInit) {
          initSegmentState.isLoaded = true;
        }
        return segmentBuffer.endOfSegment(objectAssign({ segment }, content))
          .pipe(ignoreElements());
      }

      case "end-of-queue":
        reCheckNeededSegments$.next();
        return EMPTY;

      default:
        assertUnreachable(evt);
    }
  }
}

// /**
//  * Returns every protection initialization data concatenated.
//  * This data can then be used through the usual EME APIs.
//  * `null` if this Representation has no detected protection initialization
//  * data.
//  * @returns {Array.<Object>|null}
//  */
// function formatRepresentationInitData(
//   representationInitData : IContentProtectionInitData[]
// ) : IContentProtection[] {
//   const perType : Partial<Record<string, IContentProtection>> = {};
//   return representationInitData
//     .reduce<IContentProtection[]>((acc, initData) => {
//       const oldValue = perType[initData.type];
//       if (oldValue !== undefined) {
//         oldValue.values.push({ systemId: initData.systemId,
//                                data: initData.data });
//       } else {
//         const values = [{ systemId: initData.systemId, data: initData.data }];
//         const newEl = { type: initData.type, values };
//         acc.push(newEl);
//         perType[initData.type] = newEl;
//       }
//       return acc;
//     }, []);
// }

/**
 * Add protection data to the Representation to be able to properly blacklist
 * it if that data is.
 * /!\ Mutates the current Representation
 * @param {string} initDataArr
 * @param {string} systemId
 * @param {Uint8Array} data
 */
function mergeEncryptionData(
  representationInitData : IContentProtection[],
  initSegmentEncryptionData : ISegmentProtection[]
) : IContentProtection[] {
  const result = representationInitData.slice();

  for (let i = 0; i < initSegmentEncryptionData.length; i++) {
    const segInitdata = initSegmentEncryptionData[i];
    let added = false;
    for (let j = 0; j < result.length; j++) {
      if (result[j].type === segInitdata.type) {
        for (let k = 0; k < result[j].values.length; k++) {
          const formattedVal = result[j].values[k];
          if (formattedVal.systemId === segInitdata.systemId) {
            if (!areArraysOfNumbersEqual(formattedVal.data, segInitdata.data)) {
              log.warn("Stream: Two different init data for same systemId.");
              result[j].values.push({ systemId: segInitdata.systemId,
                                      data: segInitdata.data });
              added = true;
            } else {
              added = true;
            }
            // exit both loops
            k = result[j].values.length;
            j = result.length;
          }
        }
        if (!added) {
          result[j].values.push({ systemId: segInitdata.systemId,
                                  data: segInitdata.data });
        }
        j = result.length; // exit loop
      }
    }
    if (!added) {
      result.push({ type: segInitdata.type,
                    values: [ { systemId: segInitdata.systemId,
                                data: segInitdata.data } ] });
    }
  }
  return result;
}

// Re-export RepresentationStream events used by the AdaptationStream
export { IStreamEventAddedSegment };
