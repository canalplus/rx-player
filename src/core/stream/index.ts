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

import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { Observable } from "rxjs/Observable";
import { ReplaySubject } from "rxjs/ReplaySubject";
import { Subject } from "rxjs/Subject";
import config from "../../config";
import arrayIncludes from "../../utils/array-includes";
import InitializationSegmentCache from "../../utils/initialization_segment_cache";
import log from "../../utils/log";
import { retryableFuncWithBackoff } from "../../utils/retry";
import throttle from "../../utils/rx-throttle";

import { onSourceOpen$ } from "../../compat/events";
import {
  CustomError,
  isKnownError,
  MediaError,
  OtherError,
} from "../../errors";
import Manifest, {
  ISupplementaryImageTrack,
  ISupplementaryTextTrack,
} from "../../manifest";
import Adaptation from "../../manifest/adaptation";
import Period from "../../manifest/period";
import { ITransportPipelines } from "../../net";
import ABRManager, {
  IABRMetric,
  IABRRequest,
} from "../abr";
import AdaptationBufferFactory from "../buffer/adaptation_buffer";
import {
  IAdaptationBufferEvent,
  // IBufferFilledEvent,
  // IBufferFinishedEvent,
  IQueuedSegmentsEvent,
} from "../buffer/types";
import { IKeySystemOption } from "../eme";
import {
  createManifestPipeline,
  IPipelineOptions,
  SegmentPipelinesManager,
} from "../pipelines";
import {
  addNativeSourceBuffer,
  createSourceBuffer,
  disposeSourceBuffer,
  ISourceBufferMemory,
  shouldHaveNativeSourceBuffer,
  SourceBufferOptions,
} from "../source_buffers";
import GarbageCollectorMemory from "../source_buffers/garbage_collector_memory";
import SegmentBookkeeperMemory from "../source_buffers/segment_bookkeeper_memory";
import { SupportedBufferTypes } from "../types";
import createBufferClock, {
  IStreamClockTick,
} from "./clock";
import createMediaSource, {
  setDurationToMediaSource,
} from "./create_media_source";
import EMEManager from "./eme_manager";
import EVENTS, {
  IAdaptationsSubject,
  IManifestUpdateEvent,
  IStreamEvent,
} from "./events";
import getInitialTime, {
  IInitialTimeOptions,
} from "./get_initial_time";
import {
  liveEventsHandler,
  refreshManifest,
} from "./live_events_handler";
import createMediaErrorHandler from "./media_error_handler";
import SpeedManager from "./speed_manager";
import StallingManager from "./stalling_manager";
import handleVideoEvents from "./video_events";

const { END_OF_PLAY } = config;

export interface IStreamOptions {
  adaptiveOptions: {
    initialBitrates : Partial<Record<SupportedBufferTypes, number>>;
    manualBitrates : Partial<Record<SupportedBufferTypes, number>>;
    maxAutoBitrates : Partial<Record<SupportedBufferTypes, number>>;
    throttle : Partial<Record<SupportedBufferTypes, Observable<number>>>;
    limitWidth : Partial<Record<SupportedBufferTypes, Observable<number>>>;
  };
  autoPlay : boolean;
  bufferOptions : {
    wantedBufferAhead$ : Observable<number>;
    maxBufferAhead$ : Observable<number>;
    maxBufferBehind$ : Observable<number>;
  };
  errorStream : Subject<Error| CustomError>;
  speed$ : BehaviorSubject<number>;
  startAt? : IInitialTimeOptions;
  textTrackOptions : SourceBufferOptions;
  url : string;
  videoElement : HTMLMediaElement;
  withMediaSource : boolean;
  timings$ : Observable<IStreamClockTick>;
  supplementaryTextTracks : ISupplementaryTextTrack[];
  supplementaryImageTracks : ISupplementaryImageTrack[];
  keySystems : IKeySystemOption[];
  transport : ITransportPipelines<any, any, any, any, any>;
}

/**
 * Central part of the player. Play a given stream described by the given
 * manifest with given options.
 *
 * On subscription:
 *  - Creates the MediaSource and attached sourceBuffers instances.
 *  - download the content's manifest
 *  - Perform EME management if needed
 *  - create Buffers for each active adaptations.
 *  - give choice of the adaptation to the caller (e.g. to choose a language)
 *  - returns Observable emitting notifications about the stream lifecycle.
 *
 * @param {Object} args
 * @returns {Observable}
 */
export default function Stream({
  adaptiveOptions,
  autoPlay,
  bufferOptions,
  keySystems,
  speed$,
  startAt,
  url,
  videoElement,
  supplementaryImageTracks, // eventual manually added images
  supplementaryTextTracks, // eventual manually added subtitles
  errorStream, // subject through which minor errors are emitted TODO Remove?
  textTrackOptions,
  timings$,
  withMediaSource = true,
  transport,
} : IStreamOptions) : Observable<IStreamEvent> {

  const {
    wantedBufferAhead$,
    maxBufferAhead$,
    maxBufferBehind$,
  } = bufferOptions;

  /**
   * Fetch and parse the manifest from the URL given.
   * Throttled to avoid doing multiple simultaneous requests.
   * @param {string} url - the manifest url
   * @returns {Observable} - the parsed manifest
   */
  const fetchManifest = throttle(createManifestPipeline(
    transport,
    errorStream,
    supplementaryTextTracks,
    supplementaryImageTracks
  ));

  /**
   * Map the "type" of a sourceBuffer (example "audio" or "video") to a
   * SourceBuffer.
   *
   * Allow to avoid creating multiple sourceBuffers for the same type.
   * TODO Is this compatible with codec switching?
   *
   * There is 2 "native" SourceBuffers: "audio" and "video" as they are the
   * only one added to the MediaSource.
   *
   * All other SourceBuffers are "custom"
   * @type Object
   */
  const sourceBuffers : ISourceBufferMemory = {
    native: {}, // SourceBuffers added to the MediaSource
    custom: {}, // custom SourceBuffers managed entirely in the Rx-PLayer
  };
  const garbageCollectors = new GarbageCollectorMemory(
    timings$.map(timing => timing.currentTime),
    maxBufferBehind$,
    maxBufferAhead$
  );
  const segmentBookkeepers = new SegmentBookkeeperMemory();

  /**
   * @see retryWithBackoff
   */
  const streamRetryOptions = {
    totalRetry: 3,
    retryDelay: 250,
    resetDelay: 60 * 1000,

    shouldRetry: (error : Error) => {
      if (isKnownError(error)) {
        return !error.fatal;
      }
      return true;
    },

    errorSelector: (error : Error|CustomError) => {
      if (!isKnownError(error)) {
        return new OtherError("NONE", error, true);
      }
      error.fatal = true;
      return error;
    },

    onRetry: (error : Error|CustomError, tryCount : number) => {
      log.warn("stream retry", error, tryCount);
      errorStream.next(error);
    },
  };

  /**
   * End-Of-Play emit when the current timing is really close to the end.
   * TODO Remove END_OF_PLAY
   * @see END_OF_PLAY
   * @type {Observable}
   */
  const endOfPlay = timings$
    .filter(({ currentTime, duration }) =>
      duration > 0 && duration - currentTime < END_OF_PLAY
    );

  /**
   * On subscription:
   *   - load the manifest (through its pipeline)
   *   - wiat for the given mediasource to be open
   * Once those are done, initialize the source duration and creates every
   * SourceBuffers and Buffers instances.
   *
   * This Observable can be retried on the basis of the streamRetryOptions
   * defined here.
   * @param {Object} params
   * @param {string} params.url
   * @param {MediaSource|null} params.mediaSource
   * @returns {Observable}
   */
  const startStream =
    retryableFuncWithBackoff<any, IStreamEvent>(openStream, streamRetryOptions);

  return createMediaSource(
    url,
    videoElement,
    withMediaSource,
    sourceBuffers
  )
    .mergeMap(startStream)
    .takeUntil(endOfPlay);

  /**
   * @param {string|null} url
   * @param {MediaSource|null} mediaSource
   * @returns {Observable}
   */
  function openStream({
    // TODO tslint bug? Document.
    /* tslint:disable no-use-before-declare */
    url: _url,
    /* tslint:enable no-use-before-declare */
    mediaSource,
  } : {
    url : string|null;
    mediaSource : MediaSource|null;
  }) {
    const sourceOpening$ = mediaSource ?
      onSourceOpen$(mediaSource) : Observable.of(null);

    return Observable.combineLatest(fetchManifest(url), sourceOpening$)
      .mergeMap(([manifest]) => createStream(mediaSource, manifest));
  }

  /**
   * Creates a stream merging all observable that are required to make
   * the system cooperate.
   * @param {MediaSource} mediaSource
   * @param {Object} manifest
   * @returns {Observable}
   */
  function createStream(
    mediaSource : MediaSource|null,
    manifest : Manifest
  ): Observable<IStreamEvent> {
    // TODO Find what to do with no media source.
    if (!mediaSource) {
      throw new MediaError("UNAVAILABLE_MEDIA_SOURCE", null, true);
    }

    setDurationToMediaSource(mediaSource, manifest.getDuration());

    // XXX TODO later with firstPeriod
    // Initialize all native source buffer at the same time. We cannot
    // lazily create native sourcebuffers since the spec does not
    // allow adding them during playback.
    //
    // From https://w3c.github.io/media-source/#methods
    //    For example, a user agent may throw a QuotaExceededError
    //    exception if the media element has reached the HAVE_METADATA
    //    readyState. This can occur if the user agent's media engine
    //    does not support adding more tracks during playback.
    Object.keys(manifest.adaptations).map(bufferType => {
      if (shouldHaveNativeSourceBuffer(bufferType)) {
        const firstPeriod : Period|undefined = manifest.periods[0];
        const adaptations = (firstPeriod && firstPeriod.adaptations[bufferType]) || [];
        const representations = adaptations ?
          adaptations[0].representations : [];
        if (representations.length) {
          const codec = representations[0].getMimeTypeString();
          addNativeSourceBuffer(mediaSource, bufferType, codec, sourceBuffers);
        }
      }
    });

    log.debug("calculating initial time");
    const startTime = getInitialTime(manifest, startAt);
    log.debug("initial time calculated:", startTime);

    const firstPlayedPeriod = manifest.getPeriodForTime(startTime);
    if (firstPlayedPeriod == null) {
      throw new MediaError("MEDIA_STARTING_TIME_NOT_FOUND", null, true);
    }

    const {
      hasDoneInitialSeek$,
      isLoaded$,
    } = handleVideoEvents(videoElement, startTime, autoPlay);

    const {
      clock$,
      seekings$,
    } = createBufferClock(manifest, timings$, hasDoneInitialSeek$, startTime);

    const loadedEvent$ = isLoaded$.mapTo(EVENTS.loaded());

    /**
     * Subject through which network metrics will be sent to the ABR manager.
     * @type {Subject}
     */
    const network$ = new Subject<IABRMetric>();

    /**
     * Subject through which each request progression will be reported to the ABR
     * manager.
     * @type {Subject}
     */
    const requestsInfos$ = new Subject<Subject<IABRRequest>>();

    /**
     * Creates Pipelines for downloading segments.
     * @type {SegmentPipelinesManager}
     */
    const segmentPipelinesManager = new SegmentPipelinesManager(
      transport,
      requestsInfos$,
      network$,
      errorStream
    );

    const abrManager = new ABRManager(requestsInfos$, network$, adaptiveOptions);
    const createNewBuffer = AdaptationBufferFactory(
      abrManager,
      timings$,
      speed$,
      seekings$,
      wantedBufferAhead$
    );

    const _adaptations$ : Partial<IAdaptationsSubject> = {};

    const _buffersArray = Object.keys(firstPlayedPeriod.adaptations)
      .map((adaptationType) => {
        // :/
        const bufferType = adaptationType as SupportedBufferTypes;
        const adaptation$ = new ReplaySubject<Adaptation|null>(1);

        // XXX TODO still makes sense?
        _adaptations$[bufferType] = adaptation$;

        return startBuffer(firstPlayedPeriod, adaptation$);

        function startBuffer(
          period : Period,
          _adaptation$ : Observable<Adaptation|null>
        ) : Observable<IStreamEvent> {

          const currentBuffer$ = _adaptation$.switchMap((adaptation) => {
            if (mediaSource == null) {
              // should NEVER EVER happen
              throw new MediaError("UNAVAILABLE_MEDIA_SOURCE", null, true);
            }

            if (adaptation == null) {
              log.info(`disposing ${bufferType} adaptation`);
              disposeSourceBuffer(
                videoElement, mediaSource, bufferType, sourceBuffers);

              return Observable
                .of(EVENTS.adaptationChange(bufferType, null))
                .concat(Observable.of(EVENTS.nullRepresentation(bufferType)));
            }

            log.info(`updating ${bufferType} adaptation`, adaptation);
            const { representations } = adaptation;
            const codec = (
              representations[0] && representations[0].getMimeTypeString()
            ) || "";
            const queuedSourceBuffer = createSourceBuffer(
              videoElement,
              mediaSource,
              bufferType,
              codec,
              sourceBuffers,
              bufferType === "text" ? textTrackOptions : {}
            );
            const bufferGarbageCollector$ = garbageCollectors.get(queuedSourceBuffer);
            const segmentBookkeeper = segmentBookkeepers.get(queuedSourceBuffer);

            const pipelineOptions = getPipelineOptions(bufferType);
            const pipeline =
              segmentPipelinesManager.createPipeline(bufferType, pipelineOptions);

            const adaptationBuffer$ = createNewBuffer(
              clock$,
              queuedSourceBuffer,
              segmentBookkeeper,
              pipeline,
              { manifest, period, adaptation }
            ).catch<IAdaptationBufferEvent, never>((error : Error) => {
              // non native buffer should not impact the stability of the
              // player. ie: if a text buffer sends an error, we want to
              // continue streaming without any subtitles
              if (!shouldHaveNativeSourceBuffer(bufferType)) {
                log.error("custom buffer: ", bufferType,
                  "has crashed. Aborting it.", error);
                errorStream.next(error);
                return Observable.empty();
              }
              log.error(
                "native buffer: ", bufferType, "has crashed. Stopping playback.", error);
              throw error; // else, throw
            });

            return Observable
              .of(EVENTS.adaptationChange(bufferType, adaptation))
              .concat(Observable.merge(adaptationBuffer$, bufferGarbageCollector$));
          }).share();

          // const bufferFilled$ : Observable<IBufferFilledEvent> = currentBuffer$
          //   .filter((message) : message is IBufferFilledEvent =>
          //     message.type === "filled"
          //   );

          // const bufferFinished$ : Observable<IBufferFinishedEvent> = currentBuffer$
          //   .filter((message) : message is IBufferFinishedEvent =>
          //     message.type === "finished"
          //   );

          const bufferActive$ : Observable<IQueuedSegmentsEvent> = currentBuffer$
            .filter((message) : message is IQueuedSegmentsEvent =>
              message.type === "segments-queued"
            );

          const onFullBuffer$ = currentBuffer$
            .filter((message) : message is IQueuedSegmentsEvent =>
              message.type === "filled" || message.type === "finished"
            )
            .take(1);

          function prepareSwitchToNextPeriod() : Observable<IStreamEvent> {
            return onFullBuffer$
              .mergeMap(() => {
                // XXX TODO
                const newPeriodIndex = manifest.periods.indexOf(period) + 1;
                const newPeriod = manifest.periods[newPeriodIndex];
                if (!newPeriod) {
                  // finished
                  return Observable.empty();
                }

                const adaptationsArr = newPeriod.adaptations[bufferType];

                // XXX TODO
                const __adaptation$ = new BehaviorSubject<Adaptation|null>(
                  adaptationsArr ? adaptationsArr[0] : null);

                log.info("creating new Buffer for", bufferType, newPeriod);
                return startBuffer(newPeriod, __adaptation$)
                  .takeUntil(
                    bufferActive$
                      .take(1)
                      .concat(prepareSwitchToNextPeriod())
                  );
              });
          }
          return Observable.merge(prepareSwitchToNextPeriod(), currentBuffer$);
        }
      });

    const adaptations$ = _adaptations$ as IAdaptationsSubject;

    /**
     * In the case where minimumUpdatePeriod is specified, and above 0,
     * manifest may be updated when update period has elapsed from the download
     * time of previous manifest.
     * @param {number} minimumUpdatePeriod
     * @param {number} updateGap
     */
    function refreshExpiredManifest(
      updateGap: number,
      minimumUpdatePeriod?: number
    ): Observable<IManifestUpdateEvent> {
      return minimumUpdatePeriod ?
        Observable.timer((minimumUpdatePeriod - updateGap) * 1000)
          .mergeMap(() => {
            return refreshManifest(fetchManifest, manifest)
              .concatMap(() =>
                refreshExpiredManifest(
                  (Date.now() / 1000 - manifest.loadedAt),
                  manifest.minimumUpdatePeriod
                )
              );
            }
          ) :
        Observable.never();
    }

    const initialUpdateGap = Date.now() / 1000 - manifest.loadedAt;
    const expiredManifestUpdate$ =
      refreshExpiredManifest(initialUpdateGap, manifest.minimumUpdatePeriod);

    const buffers$ = manifest.isLive ?
      Observable
        .merge(..._buffersArray)
        .mergeMap(liveEventsHandler(videoElement, manifest, fetchManifest)) :
      Observable.merge(..._buffersArray);

    const manifestEvent$ = Observable
      .of(EVENTS.manifestChange(
        abrManager, manifest, firstPlayedPeriod, adaptations$));

    const emeManager$ = EMEManager(videoElement, keySystems, errorStream);

    const speedManager$ = SpeedManager(videoElement, speed$, timings$, {
      pauseWhenStalled: withMediaSource,
    }).map(EVENTS.speedChanged);

    const stallingManager$ = StallingManager(videoElement, manifest, timings$)
      .map(EVENTS.stalled);

    const mediaErrorHandler$ = createMediaErrorHandler(videoElement);

    return Observable.merge(
      buffers$,
      emeManager$,
      expiredManifestUpdate$,
      loadedEvent$,
      manifestEvent$,
      mediaErrorHandler$,
      speedManager$,
      stallingManager$
    );
  }
}

/**
 * Returns the pipeline options depending on the type of pipeline concerned.
 * @param {string} bufferType - e.g. "audio"|"text"...
 * @returns {Object} - Options to give to the Pipeline
 */
function getPipelineOptions(bufferType : string) : IPipelineOptions<any, any> {
  const downloaderOptions : IPipelineOptions<any, any> = {};

  if (arrayIncludes(["audio", "video"], bufferType)) {
    downloaderOptions.cache = new InitializationSegmentCache();
  } else if (bufferType === "image") {
    downloaderOptions.maxRetry = 0; // Deactivate BIF fetching if it fails
  }
  return downloaderOptions;
}

export {
  IStreamEvent,
};
