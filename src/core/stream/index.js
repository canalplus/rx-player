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

import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import objectAssign from "object-assign";

import config from "../../config.js";
import arrayIncludes from "../../utils/array-includes.js";

import getInitialTime from "./initial_time.js";
import {
  shouldHaveNativeSourceBuffer,
  addNativeSourceBuffer,
  createSourceBuffer,
  disposeSourceBuffer,
} from "./source_buffers";
import {
  createAndPlugMediaSource,
  setDurationToMediaSource,
} from "./media_source.js";
import createTimings from "./timings.js";
import createMediaErrorStream from "./error_stream.js";

import log from "../../utils/log";
import assert from "../../utils/assert";
import { retryableFuncWithBackoff } from "../../utils/retry";
import { throttle } from "../../utils/rx-utils";
import InitializationSegmentCache
  from "../../utils/initialization_segment_cache.js";
import { getNextRangeGap } from "../../utils/ranges.js";

import {
  isPlaybackStuck,
  canPlay,
  canSeek,
} from "../../compat";
import { sourceOpen } from "../../compat/events.js";
import { Buffer, EmptyBuffer } from "../buffer";
import { createEME, onEncrypted } from "../eme";
import {
  OtherError,
  EncryptedMediaError,
  isKnownError,
} from "../../errors";
import {
  normalizeManifest,
  updateManifest,
  getCodec,
} from "../manifest";
import Pipeline from "../pipelines/index.js";

import ABRManager from "../abr";
import processPipeline from "./process_pipeline.js";

const {
  END_OF_PLAY,
  DISCONTINUITY_THRESHOLD,
} = config;

/**
 * Returns the pipeline options depending on the type of pipeline concerned.
 */
const getPipelineOptions = bufferType => {
  const downloaderOptions = {};
  if (arrayIncludes(["audio", "video"], bufferType)) {
    downloaderOptions.cache = new InitializationSegmentCache();
  } else if (bufferType === "image") {
    downloaderOptions.maxRetry = 0; // Deactivate BIF fetching if it fails
  }
  return;
};

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
  wantedBufferAhead$,
  maxBufferAhead$,
  maxBufferBehind$,
  keySystems,
  startAt,
  url,
  videoElement,

  supplementaryTextTracks, // eventual manually added subtitles
  supplementaryImageTracks, // eventual manually added images

  timings$,
  hideNativeSubtitle, // Whether TextTracks subtitles should be hidden or not
  errorStream, // subject through which minor errors are emitted
  timeFragment, // @deprecated

  withMediaSource = true,

  transport,
}) {
  /**
   * Subject through which network metrics will be sent to the ABR manager.
   */
  const network$ = new Subject();

  /**
   * Subject through which each request progression will be reported to the ABR
   * manager.
   */
  const requestsInfos$ = new Subject();

  /**
   * Pipeline used to download the manifest file.
   * @see ../pipelines
   * @type {Function} - take in argument the pipeline data, returns a pipeline
   * observable.
   */
  const manifestPipeline = Pipeline(transport.manifest);

  /*
   * ...Fetch the manifest file given.
   * Throttled to avoid doing multiple simultaneous requests because multiple
   * source buffers are out-of-index
   * TODO check if that throttle works as expected
   * @param {string} url - the manifest url
   * @returns {Observable} - the parsed manifest
   */
  const fetchManifest = throttle(url => {
    const manifest$ = manifestPipeline({ url });
    const fakeSubject = new Subject();
    return processPipeline(
      "manifest",
      manifest$,
      fakeSubject, // we don't care about metrics here
      fakeSubject, // and we don't care about the request progress
      errorStream
    ).map(({ parsed }) =>
      normalizeManifest(
        parsed.url,
        parsed.manifest,
        supplementaryTextTracks,
        supplementaryImageTracks
      )
    );
  });

  // TODO @deprecate?
  const fragEndTimeIsFinite = timeFragment.end < Infinity;

  const nativeBuffers = {}; // SourceBuffers added to the MediaSource
  const customBuffers = {}; // custom SourceBuffers

  /**
   * Backoff options used given to the backoff retry done with the manifest
   * pipeline.
   * @see retryWithBackoff
   */
  const retryOptions = {
    totalRetry: 3,
    retryDelay: 250,
    resetDelay: 60 * 1000,
    shouldRetry: (error) => error.fatal !== true,
    errorSelector: (error) => {
      if (!isKnownError(error)) {
        error = new OtherError("NONE", error, true);
      }
      error.fatal = true;
      return error;
    },
    onRetry: (error, tryCount) => {
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
      duration > 0 &&
      Math.min(duration, timeFragment.end) - currentTime < END_OF_PLAY
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
  const startStream = retryableFuncWithBackoff(({ url, mediaSource }) => {
    const sourceOpening = mediaSource
      ? sourceOpen(mediaSource)
      : Observable.of(null);

    return Observable.combineLatest(fetchManifest(url), sourceOpening)
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
    mediaSource,
    bufferType,
    codec,
    timings,
    seekings,
    manifest,
    adaptation$,
    abrManager,
  ) {
    if (__DEV__) {
      assert(transport[bufferType],
        "stream: no management found for type " + bufferType);
    }
    const pipelineOptions = getPipelineOptions(bufferType);
    return adaptation$.switchMap((adaptation) => {
      if (!adaptation) {
        disposeSourceBuffer(
          videoElement,
          mediaSource,
          bufferType,
          nativeBuffers,
          customBuffers
        );
        return EmptyBuffer({ bufferType })
          .startWith({
            type: "adaptationChange",
            value: {
              type: bufferType,
              adaptation,
            },
          });
      }

      /**
       * Keep the current representation to add informations to the ABR clock.
       * TODO isn't that a little bit ugly?
       * @type {Object|null}
       */
      let currentRepresentation = null;

      const abrClock$ = timings$
        .map(timing => {
          let bitrate, lastIndexPosition;

          if (currentRepresentation) {
            bitrate = currentRepresentation.bitrate;

            if (currentRepresentation.index) {
              lastIndexPosition =
                currentRepresentation.index.getLastPosition();
            }
          }

          return {
            position: timing.currentTime,
            bufferGap: timing.bufferGap,
            bitrate,
            lastIndexPosition,
            isLive: manifest.isLive,
            duration: timing.duration,
          };
        });

      const { representations } = adaptation;
      const representation$ =
        abrManager.get$(bufferType, abrClock$, representations)
          .do(representation => currentRepresentation = representation);

      const sourceBuffer = createSourceBuffer(
        videoElement,
        mediaSource,
        bufferType,
        codec,
        nativeBuffers,
        customBuffers,
        { hideNativeSubtitle }
      );

      const downloader = ({ segment, representation, init }) => {
        const pipeline$ = Pipeline(transport[bufferType], pipelineOptions)({
          segment,
          representation,
          adaptation,
          manifest,
          init,
        });
        return processPipeline(
          bufferType, pipeline$, network$, requestsInfos$, errorStream);
      };

      const switchRepresentation$ = Observable.combineLatest(
        representation$,
        seekings,
      ).map(([representation]) => representation);

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

      return buffer
        .startWith({
          type: "adaptationChange",
          value: {
            type: bufferType,
            adaptation,
          },
        })
        .catch(error => {
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
  function createVideoEventsObservables(manifest, timings) {
    const startTime = getInitialTime(manifest, startAt, timeFragment);

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
        .mapTo({ type: "loaded", value: true }),
    };
  }

  /**
   * Perform EME management if needed.
   * @returns {Observable}
   */
  function createEMEIfKeySystems() {
    if (keySystems && keySystems.length) {
      return createEME(videoElement, keySystems, errorStream);
    } else {
      return onEncrypted(videoElement).map(() => {
        log.error("eme: ciphered media and no keySystem passed");
        throw new EncryptedMediaError("MEDIA_IS_ENCRYPTED_ERROR", null, true);
      });
    }
  }

  /**
   * Extracted stalled info changing over-time from timings. This
   * stream has a side-effect of the <video> playbackRate and
   * currentTime properties.
   *
   * It mutates the playbackRate value to stop the video when buffer is too
   * low, or resume the video when the buffer has regained a decent size.
   *
   * It mutates the currentTime in case of a discontinuity in the stream.
   * @param {Observable} timings
   * @param {Object} options
   * @param {Boolean} [options.changePlaybackRate=true]
   * @returns {Observable}
   */
  function createStalledObservable(manifest, timings, { changePlaybackRate=true }) {
    return timings
      .distinctUntilChanged((prevTiming, timing) => {
        const isStalled = timing.stalled;
        const wasStalled = prevTiming.stalled;

        let isEqual;
        if (!wasStalled && !isStalled) {
          isEqual = true;
        } else if (!wasStalled || !isStalled) {
          isEqual = false;
        } else { // both are stalled
          isEqual = (wasStalled.state == isStalled.state);
        }

        if (!isEqual && changePlaybackRate) {
          if (wasStalled) { // is not stalled anymore
            log.info("resume playback", timing.currentTime, timing.state);
            videoElement.playbackRate = wasStalled.playbackRate;
          } else { // is stalled
            log.info("stop playback", timing.currentTime, timing.state);
            videoElement.playbackRate = 0;
          }
        }

        // Perform various checks to try to get out of the stalled state:
        //   1. is it a browser bug? -> force seek at the same current time
        //   2. is it a short discontinuity? -> Seek at the beginning of the
        //                                      next range
        //   3. are we before the buffer depth? -> Seek a little after it
        if (isStalled) {
          const { buffered, currentTime } = timing;
          const nextRangeGap = getNextRangeGap(buffered, currentTime);

          // Discontinuity check in case we are close a buffer but still
          // calculate a stalled state. This is useful for some
          // implementation that might drop an injected segment, or in
          // case of small discontinuity in the stream.
          if (isPlaybackStuck(timing)) {
            videoElement.currentTime = currentTime;
            log.warn("after freeze seek", currentTime, timing.range);
          } else if (nextRangeGap < DISCONTINUITY_THRESHOLD) {
            const seekTo = (currentTime + nextRangeGap + 1/60);
            videoElement.currentTime = seekTo;
            log.warn("discontinuity seek", currentTime, nextRangeGap, seekTo);
          } else {
            const [
              minBufferPosition,
              maxBufferPosition,
            ] = getBufferLimits(manifest);
            const bufferDepth = maxBufferPosition - minBufferPosition;

            if (bufferDepth && bufferDepth > 5) {
              const minimumPosition = Math.min(
                minBufferPosition + 3,
                minBufferPosition + (bufferDepth / 10),
                maxBufferPosition - 5
              );

              if (currentTime < minimumPosition) {
                const newPosition = minimumPosition + 5;
                const diff = newPosition - currentTime;
                videoElement.currentTime = newPosition;
                log.warn("buffer depth seek", currentTime, diff, newPosition);
              }
            } else if (bufferDepth && currentTime < minBufferPosition) {
              const diff = maxBufferPosition - currentTime;
              videoElement.currentTime = maxBufferPosition;
              log.warn("buffer depth seek", currentTime, diff, maxBufferPosition);
            }
          }
        }

        return isEqual;
      })
      .map((timing) => {
        return { type: "stalled", value: timing.stalled };
      });
  }

  /**
   * Re-fetch the manifest and merge it with the previous version.
   * @param {Object} manifest
   * @returns {Observable}
   */
  function refreshManifest(manifest) {
    return fetchManifest(manifest.getUrl())
      .map((parsed) => {
        const newManifest = updateManifest(manifest, parsed);
        return {
          type: "manifestUpdate",
          value: {
            manifest: newManifest,
          },
        };
      });
  }

  /**
   * @param {Object} message
   * @param {Object} manifest
   * @returns {Observable}
   */
  function liveMessageHandler(message, manifest) {
    switch(message.type) {
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
  function createStream(mediaSource, manifest) {
    if (mediaSource) {
      setDurationToMediaSource(mediaSource, manifest.getDuration());
    }

    const { timings: _timings, seekings } = createTimings(
      manifest, timings$, fragEndTimeIsFinite, timeFragment
    );

    const { loaded$, clock$ } =
      createVideoEventsObservables(manifest, _timings);

    const abrManager = new ABRManager(
      requestsInfos$,
      network$, // emit network metrics such as the observed bandwidth
      adaptiveOptions
    );

    const adaptations$ = {};
    const _buffersArray = Object.keys(manifest.adaptations).map(type => {
      adaptations$[type] = new BehaviorSubject();

      // TODO re-check that
      const codec = getCodec(manifest.adaptations[type][0]
        .representations[0]);

      // Initialize all native source buffer at the same time. We cannot
      // lazily create native sourcebuffers since the spec does not
      // allow adding them during playback.
      //
      // From https://w3c.github.io/media-source/#methods
      //    For example, a user agent may throw a QuotaExceededError
      //    exception if the media element has reached the HAVE_METADATA
      //    readyState. This can occur if the user agent's media engine
      //    does not support adding more tracks during playback.
      if (shouldHaveNativeSourceBuffer(type)) {
        addNativeSourceBuffer(mediaSource, type, codec, nativeBuffers);
      }

      return createBuffer(
        mediaSource, type, codec, clock$, seekings,
        manifest, adaptations$[type], abrManager,
      );
    });

    const buffers$ = manifest.isLive ?
      Observable.merge(..._buffersArray)
        .concatMap(message => liveMessageHandler(message, manifest)) :
      Observable.merge(..._buffersArray);

    const manifest$ = Observable.of({
      type: "manifestChange",
      value: {
        manifest,
        adaptations$,
        abrManager,
      },
    });

    const emeHandler = createEMEIfKeySystems();
    const stalled = createStalledObservable(manifest, _timings, {
      changePlaybackRate: withMediaSource,
    });
    const mediaError = createMediaErrorStream(videoElement);

    return Observable.merge(
      manifest$, loaded$, stalled, emeHandler, buffers$, mediaError
    ).finally(() => abrManager.dispose());
  }

  return createAndPlugMediaSource(
    url,
    videoElement,
    withMediaSource,
    customBuffers,
    nativeBuffers
  )
    .mergeMap(startStream)
    .takeUntil(endOfPlay);
}
