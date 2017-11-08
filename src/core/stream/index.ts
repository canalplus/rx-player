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

import objectAssign = require("object-assign");
import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { ReplaySubject } from "rxjs/ReplaySubject";
import config from "../../config";
import arrayIncludes from "../../utils/array-includes";
import log from "../../utils/log";
import { retryableFuncWithBackoff } from "../../utils/retry";
import throttle from "../../utils/rx-throttle";
import InitializationSegmentCache
  from "../../utils/initialization_segment_cache";
import {
  OtherError,
  isKnownError,
} from "../../errors";
import {
  canPlay,
  canSeek,
} from "../../compat";
import { onSourceOpen$ } from "../../compat/events";
import Manifest from  "../../manifest";
import Segment from  "../../manifest/segment";
import { ITransportPipelines } from "../../net";
import Adaptation from  "../../manifest/adaptation";
import Representation from  "../../manifest/representation";
import { SupportedBufferTypes } from "../types";
import {
  normalizeManifest,
  updateManifest,
  getCodec,
  ISupplementaryTextTrack,
  ISupplementaryImageTrack,
} from "../manifest";
import {
  Buffer,
  EmptyBuffer,
} from "../buffer";
import {
  IBufferClockTick,
  IBufferSegmentInfos,
} from "../buffer/types";
import Pipeline, { IPipelineOptions } from "../pipelines";
import ABRManager from "../abr";
import getInitialTime, {
  IInitialTimeOptions
} from "./initial_time";
import {
  shouldHaveNativeSourceBuffer,
  addNativeSourceBuffer,
  createSourceBuffer,
  disposeSourceBuffer,
  ISourceBufferMemory,
  SourceBufferOptions,
} from "./source_buffers";
import {
  createAndPlugMediaSource,
  setDurationToMediaSource,
} from "./media_source";
import createTimings, {
  ITimingsClockTick,
} from "./timings";
import createMediaErrorStream from "./error_stream";
import processPipeline from "./process_pipeline";
import SpeedManager from "./speed_manager";
import StallingManager from "./stalling_obs";
import EMEManager from "./eme";
import {
  IStreamClockTick,
  ILoadedEvent,
  StreamEvent,
  AdaptationsSubjects,
  IManifestUpdateEvent,
} from "./types";

const { END_OF_PLAY } = config;

const SUPPORTED_BUFFER_TYPES : SupportedBufferTypes[] =
  ["audio", "video", "text", "image"];

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

// XXX TODO DRY this with EME part?
interface ILicenseStorageData {
  sessionId : string;
  initData : number;
}

// XXX TODO DRY this with EME part?
interface ILicenseStorageOption {
  load() : ILicenseStorageData[];
  save(x : ILicenseStorageData[]) : void;
}

// XXX TODO
interface IKeySystemOption {
  type : string;
  getLicense : (message : Uint8Array, messageType : string)
    => Promise<BufferSource>|BufferSource;
  serverCertificate? : BufferSource;
  persistentLicense? : boolean;
  licenseStorage? : ILicenseStorageOption;
  persistentStateRequired? : boolean;
  distinctiveIdentifierRequired? : boolean;
  onKeyStatusesChange? : (evt : Event, session : MediaKeySession)
    => Promise<BufferSource>|BufferSource;
}

interface IStreamOptions {
  adaptiveOptions: {
    initialBitrates : Partial<Record<SupportedBufferTypes, number>>,
    manualBitrates : Partial<Record<SupportedBufferTypes, number>>,
    maxAutoBitrates : Partial<Record<SupportedBufferTypes, number>>,
    throttle : Partial<Record<SupportedBufferTypes, Observable<number>>>
    limitWidth : Partial<Record<SupportedBufferTypes, Observable<number>>>
  };
  autoPlay : boolean;
  bufferOptions : {
    wantedBufferAhead$ : Observable<number>,
    maxBufferAhead$ : Observable<number>,
    maxBufferBehind$ : Observable<number>,
  };
  errorStream : Subject<Error>;
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
 *  - create Buffer instances for each adaptation to manage buffers.
 *  - give adaptation control to the caller (e.g. to choose a language)
 *  - perform ABR Management
 *  - returns Observable emitting notifications about the stream lifecycle.
 *
 * TODO TOO MANY PARAMETERS something is wrong here.
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
} : IStreamOptions) : Observable<StreamEvent> {

  const {
    wantedBufferAhead$,
    maxBufferAhead$,
    maxBufferBehind$,
  } = bufferOptions;

  /**
   * Subject through which network metrics will be sent to the ABR manager.
   */
  // XXX TODO specify Subject<ABRThingy>
  const network$ = new Subject();

  /**
   * Subject through which each request progression will be reported to the ABR
   * manager.
   */
  // XXX TODO specify Subject<ABRThingy>
  const requestsInfos$ = new Subject();

  /**
   * Pipeline used to download the manifest file.
   * @see ../pipelines
   * @type {Function} - take in argument the pipeline data, returns a pipeline
   * observable.
   */
  const manifestPipeline = Pipeline(transport.manifest);

  /**
   * ...Fetch the manifest file given.
   * Throttled to avoid doing multiple simultaneous requests because multiple
   * source buffers are out-of-index
   * @param {string} url - the manifest url
   * @returns {Observable} - the parsed manifest
   */
  const fetchManifest = throttle(_url => {
    const manifest$ = manifestPipeline({ url: _url });
    const fakeSubject = new Subject();
    return processPipeline(
      "manifest",
      manifest$,
      fakeSubject, // we don't care about metrics here
      fakeSubject, // and we don't care about the request progress
      errorStream
    ).map(({ parsed } : {
      parsed : {
        url : string,
        manifest : any,
      }
    }) : Manifest =>
      normalizeManifest(
        parsed.url,
        parsed.manifest,
        supplementaryTextTracks,
        supplementaryImageTracks
      )
    );
  });

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
  const sourceBufferMemory : ISourceBufferMemory = {
    native: {}, // SourceBuffers added to the MediaSource
    custom: {}, // custom SourceBuffers managed entirely in the Rx-PLayer
  };

  /**
   * Backoff options used given to the backoff retry done with the manifest
   * pipeline.
   * @see retryWithBackoff
   */
  const retryOptions = {
    totalRetry: 3,
    retryDelay: 250,
    resetDelay: 60 * 1000,

    shouldRetry: (error : Error) => {
      if (isKnownError(error)) {
        return error.fatal === false;
      }
      return true;
    },

    errorSelector: (error : Error) => {
      if (!isKnownError(error)) {
        return new OtherError("NONE", error, true);
      }
      error.fatal = true;
      return error;
    },

    onRetry: (error : Error, tryCount : number) => {
      log.warn("stream retry", error, tryCount);
      errorStream.next(error);
    },
  };

  /**
   * End-Of-Play emit when the current timing is really close to the end.
   * @see END_OF_PLAY
   * @type {Observable}
   */
  const endOfPlay = timings$
    .filter(({ currentTime, duration }) => (
      duration > 0 && duration - currentTime < END_OF_PLAY
    ));

  /**
   * On subscription:
   *   - load the manifest (through its pipeline)
   *   - wiat for the given mediasource to be open
   * Once those are done, initialize the source duration and creates every
   * SourceBuffers and Buffers instances.
   *
   * This Observable can be retried on the basis of the retryOptions defined
   * here.
   * @param {Object} params
   * @param {string} params.url
   * @param {MediaSource|null} params.mediaSource
   * @returns {Observable}
   */
  const startStream = retryableFuncWithBackoff<any, StreamEvent>(({
    url: _url,
    mediaSource,
  } : { url : string|null, mediaSource : MediaSource|null }) => {
    const sourceOpening$ = mediaSource
      ? onSourceOpen$(mediaSource)
      : Observable.of(null);

    return Observable.combineLatest(fetchManifest(url), sourceOpening$)
      .mergeMap(([manifest]) => createStream(mediaSource, manifest));
  }, retryOptions);

  /**
   * Creates a stream of audio/video/text buffers given a set of
   * adaptations and a codec information.
   *
   * For each buffer stream, a unique "sourceBuffer" observable is
   * created that will be reused for each created buffer.
   *
   * An "adaptations choice" observable is also created and
   * responsible for changing the video or audio adaptation choice in
   * reaction to user choices (ie. changing the language).
   *
   * @param {MediaSource} mediaSource
   * @param {Object} bufferInfos - Per-type object containing the adaptions,
   * the codec and the type
   * @param {Observable} timings
   * @param {Observable} seekings
   * @returns {Observable}
   */
  function createBuffer(
    mediaSource : MediaSource,
    bufferType : SupportedBufferTypes,
    timings : Observable<IBufferClockTick>,
    seekings : Observable<null>,
    manifest : Manifest,
    adaptation$ : Observable<Adaptation|null>,
    abrManager : ABRManager
  ) : Observable<StreamEvent> {
    const pipelineOptions = getPipelineOptions(bufferType);
    return adaptation$.switchMap((adaptation) => {
      if (!adaptation) {
        disposeSourceBuffer(
          videoElement,
          mediaSource,
          bufferType,
          sourceBufferMemory
        );
        return Observable.of({
            type: "adaptationChange",
            value: {
              type: bufferType,
              adaptation: null,
            },
        }).concat(EmptyBuffer({ bufferType }));
      }

      /**
       * Keep the current representation to add informations to the ABR clock.
       * TODO isn't that a little bit ugly?
       * @type {Object|null}
       */
      let currentRepresentation : Representation|null = null;

      const abrClock$ = timings$
        .map(timing => {
          let bitrate;
          let lastIndexPosition;

          if (currentRepresentation) {
            bitrate = currentRepresentation.bitrate;

            if (currentRepresentation.index) {
              lastIndexPosition =
                currentRepresentation.index.getLastPosition();
            }
          }

          return {
            bitrate,
            bufferGap: timing.bufferGap,
            duration: timing.duration,
            isLive: manifest.isLive,
            lastIndexPosition,
            position: timing.currentTime,
            speed: speed$.getValue(),
          };
        });

      const { representations } = adaptation;

      const abr$ = abrManager.get$(bufferType, abrClock$, representations);
      const representation$ = abr$
        .map(
          ({ representation } : { representation : Representation }
        ) => representation)
        .distinctUntilChanged((a : Representation, b : Representation) =>
          (a && a.bitrate) === (b && b.bitrate) &&
          (a && a.id) === (b && b.id)
        )
        .do((representation : Representation) => {
          currentRepresentation = representation;
        });

      // XXX TODO Move
      const codec = getCodec(adaptation.representations[0] || {});
      const sourceBuffer = createSourceBuffer(
        videoElement,
        mediaSource,
        bufferType,
        codec,
        sourceBufferMemory,
        bufferType === "text" ? textTrackOptions : {}
      );

      function downloader(
        { segment, representation, init } :
        {
          segment : Segment,
          representation : Representation,
          init : IBufferSegmentInfos|null,
        }
      ) {
        const pipeline$ = Pipeline(transport[bufferType], pipelineOptions)({
          segment,
          representation,
          adaptation,
          manifest,
          init,
        });
        return processPipeline(
          bufferType, pipeline$, network$, requestsInfos$, errorStream);
      }

      const switchRepresentation$ : Observable<Representation> =
        Observable.combineLatest(representation$, seekings)
          .map(([representation]) => representation) as
            Observable<Representation>;

      const buffer = Buffer({
        sourceBuffer,
        downloader,
        switch$: switchRepresentation$,
        clock$: timings,
        wantedBufferAhead: wantedBufferAhead$,
        maxBufferBehind: maxBufferBehind$,
        maxBufferAhead: maxBufferAhead$,
        bufferType,
        isLive: manifest.isLive,
      });

      const buffer$ = Observable.of({
        type: "adaptationChange" as "adaptationChange",
        value: {
          type: bufferType,
          adaptation,
        },
      })
        .concat(buffer)
        .catch<StreamEvent, never>(error => {
          log.error("buffer", bufferType, "has crashed", error);

          // non native buffer should not impact the stability of the
          // player. ie: if a text buffer sends an error, we want to
          // continue streaming without any subtitles
          if (!shouldHaveNativeSourceBuffer(bufferType)) {
            errorStream.next(error);
            return Observable.empty();
          }
          throw error; // else, throw
        });

      const bitrateEstimate$ = abr$
        .filter(({ bitrate } : { bitrate? : number }) => bitrate != null)
        .map(({ bitrate } : { bitrate? : number }) => {
          return {
            type: "bitrateEstimationChange",
            value: {
              type: bufferType,
              bitrate,
            },
          };
        });

      return Observable.merge(buffer$, bitrateEstimate$);
    });
  }

  /**
   * Creates an observable waiting for the "loadedmetadata" and "canplay"
   * events, and emitting a "loaded" event as both are received.
   *
   * /!\ This has also the side effect of setting the initial time as soon as
   * the loadedmetadata event pops up.
   * @param {Object} manifest
   * @returns {Observable}
   */
  function createVideoEventsObservables(
    manifest : Manifest,
    timings : Observable<ITimingsClockTick>
  ) : {
    clock$ : Observable<IBufferClockTick>,
    loaded$ : Observable<ILoadedEvent>,
  } {
    const startTime = getInitialTime(manifest, startAt);

    /**
     * Time offset is an offset to add to the timing's current time to have
     * the "real" position.
     * For now, this is seen when the video has not yet seeked to its initial
     * position, the currentTime will most probably be 0 where the effective
     * starting position will be _startTime_.
     * Thus we initially set a timeOffset equal to startTime.
     * TODO That look ugly, find better solution?
     * @type {Number}
     */
    let timeOffset = startTime;

    const canSeek$ = canSeek(videoElement)
      .do(() => {
        log.info("set initial time", startTime);

        // reset playbackRate to 1 in case we were at 0 (from a stalled
        // retry for instance)
        videoElement.playbackRate = 1;
        videoElement.currentTime = startTime;
        timeOffset = 0;
      });

    const canPlay$ = canPlay(videoElement)
      .do(() => {
        log.info("canplay event");
        if (autoPlay) {
          videoElement.play();
        }
        autoPlay = true;
      });

    return {
      clock$: timings
        .map(timing =>
          objectAssign({ timeOffset }, timing)
        ),

      loaded$: Observable.combineLatest(canSeek$, canPlay$)
        .take(1)

        // XXX TODO open issue on typescript side
        .mapTo({
          type: "loaded" as "loaded",
          value: true as true,
        }),
    };
  }

  /**
   * Re-fetch the manifest and merge it with the previous version.
   * @param {Object} manifest
   * @returns {Observable}
   */
  function refreshManifest(
    manifest : Manifest
  ) : Observable<IManifestUpdateEvent> {
    return fetchManifest(manifest.getUrl())
      .map((parsed) => {
        const newManifest = updateManifest(manifest, parsed);
        return {
          type: "manifestUpdate" as "manifestUpdate",
          value: {
            manifest: newManifest,
          },
        };
      });
  }

  /**
   * Handle events happening only in live contexts.
   * @param {Object} message
   * @param {Object} manifest
   * @returns {Observable}
   */
  function liveMessageHandler(
    message : StreamEvent,
    manifest : Manifest
  ) : Observable<StreamEvent> {
    switch (message.type) {
      case "index-discontinuity":
        log.warn("explicit discontinuity seek", message.value.ts);
        videoElement.currentTime = message.value.ts;
        break;

      // precondition-failed messages require a change of live-gap to
      // calibrate the live representation of the player
      // TODO(pierre): smarter converging algorithm
      case "precondition-failed":
        manifest.updateLiveGap(1); // go back 1s for now
        log.warn("precondition failed", manifest.presentationLiveGap);
        break;

      case "out-of-index":
        // out-of-index messages require a complete reloading of the
        // manifest to refresh the current index
        log.info("out of index");
        return refreshManifest(manifest);
    }

    return Observable.of(message);
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
  ) {
    // XXX TODO Find what to do with no media source.
    if (!mediaSource) {
      throw new Error("No media source.");
    }

    if (mediaSource) {
      setDurationToMediaSource(mediaSource, manifest.getDuration());

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

          const adaptations = manifest.getAdaptationsForType(bufferType);
          const representations = adaptations ?
            adaptations[0].representations : [];
          if (representations.length) {
            const codec = getCodec(representations[0]);
            addNativeSourceBuffer(mediaSource, bufferType, codec, sourceBufferMemory);
          }
        }
      });
    }

    const {
      timings: _timings,
      seekings,
    } = createTimings(manifest, timings$);
    const {
      loaded$,
      clock$,
    } = createVideoEventsObservables(manifest, _timings);

    const abrManager = new ABRManager(
      requestsInfos$,
      network$, // emit network metrics such as the observed bandwidth
      adaptiveOptions
    );

    const _adaptations$ : Partial<AdaptationsSubjects> = {};
    const _buffersArray = SUPPORTED_BUFFER_TYPES.map(type => {
      const adaptation$ = new ReplaySubject<Adaptation|null>(1);

      _adaptations$[type] = adaptation$;
      return createBuffer(
        mediaSource, type, clock$, seekings,
        manifest, adaptation$, abrManager
      );
    });

    const adaptations$ = _adaptations$ as AdaptationsSubjects;

    const buffers$ = manifest.isLive ?
      Observable.merge(..._buffersArray)
        .mergeMap(message => liveMessageHandler(message, manifest)) :
      Observable.merge(..._buffersArray);

    const manifest$ = Observable.of({
      type: "manifestChange",
      value: {
        manifest,
        adaptations$,
        abrManager,
      },
    });

    const emeManager$ = EMEManager(videoElement, keySystems, errorStream);

    const speedManager$ = SpeedManager(videoElement, speed$, timings$, {
      pauseWhenStalled: withMediaSource,
    }).map(newSpeed => ({ type: "speed", value: newSpeed }));

    const stallingManager$ = StallingManager(videoElement, manifest, timings$)
      .map(stalledStatus => ({ type: "stalled", value: stalledStatus }));

    const mediaErrorManager$ = createMediaErrorStream(videoElement);

    return Observable.merge(
      buffers$,
      emeManager$,
      loaded$,
      manifest$,
      mediaErrorManager$,
      speedManager$,
      stallingManager$
    );
  }

  return createAndPlugMediaSource(
    url,
    videoElement,
    withMediaSource,
    sourceBufferMemory
  )
    .mergeMap(startStream)
    .takeUntil(endOfPlay);
}
