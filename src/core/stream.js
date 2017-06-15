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

import log from "../utils/log";
import assert from "../utils/assert";
import {
  seekingsSampler,
  getBufferLimits,
  getMaximumBufferPosition,
  fromWallClockTime,
} from "./timings";
import { retryableFuncWithBackoff } from "../utils/retry";
import { Observable } from "rxjs/Observable";
import { on, throttle } from "../utils/rx-utils";
import { merge } from "rxjs/observable/merge";
import { combineLatest } from "rxjs/observable/combineLatest";

import {
  MediaSource_,
  sourceOpen,
  canPlay,
  canSeek,
  clearVideoSrc,
  isPlaybackStuck,
} from "./compat";

import TextSourceBuffer from "./text-buffer";
import ImageSourceBuffer from "./image-buffer";
import { Buffer, EmptyBuffer } from "./buffer";
import { createEME, onEncrypted } from "./eme";

import {
  MediaError,
  OtherError,
  EncryptedMediaError,
  isKnownError,
} from "../errors";

import {
  normalizeManifest,
  updateManifest,
  getCodec,
} from "./manifest";

// Stop stream 0.5 second before the end of video
// It happens often that the video gets stuck 100 to 300 ms before the end, especially on IE11 and Edge
const END_OF_PLAY = 0.5;

const DISCONTINUITY_THRESHOLD = 1;
const DEFAULT_LIVE_GAP = 15;

/**
 * Returns true if the given buffeType is a native buffer, false otherwise.
 * "Native" source buffers are directly added to the MediaSource.
 * @param {string} bufferType
 * @returns {Boolean}
 */
function shouldHaveNativeSourceBuffer(bufferType) {
  return (
    bufferType == "audio" ||
    bufferType == "video"
  );
}

/**
 * Side effect that set the media duration in the mediaSource. This side
 * effect occurs when we receive the "sourceopen" from the
 * mediaSource.
 * @param {MediaSource} mediaSource
 * @param {Object} manifest
 */
function setDurationToMediaSource(mediaSource, duration) {
  let newDuration;
  if (duration === Infinity) {
    // TODO(pierre): hack for Chrome 42
    // is it "https://bugs.chromium.org/p/chromium/issues/detail?id=461733"?
    newDuration = Number.MAX_VALUE;
  } else {
    newDuration = duration;
  }

  if (mediaSource.duration !== newDuration) {
    mediaSource.duration = newDuration;
    log.info("set duration", mediaSource.duration);
  }
}

/**
 * - if a start time is defined by user, set it as start time
 * - if video is live, use the live edge
 * - else set the start time to 0
 *
 * @param {Object} manifest
 * @param {Object} startAt
 * @returns {Number}
 */
function calculateInitialTime(manifest, startAt, timeFragment) {
  // TODO @deprecated
  const duration = manifest.getDuration();
  let startTime = timeFragment.start;
  let endTime = timeFragment.end;
  const percentage = /^\d*(\.\d+)? ?%$/;

  if (startAt) {
    const [min, max] = getBufferLimits(manifest);
    if (startAt.position != null) {
      return Math.max(Math.min(startAt.position, max), min);
    }
    else if (startAt.wallClockTime != null) {
      const position = manifest.isLive ?
        startAt.wallClockTime - manifest.availabilityStartTime :
        startAt.wallClockTime;

      return Math.max(Math.min(position, max), min);
    }
    else if (startAt.fromFirstPosition != null) {
      const { fromFirstPosition } = startAt;
      return fromFirstPosition <= 0 ?
        min : Math.min(min + fromFirstPosition, max);
    }
    else if (startAt.fromLastPosition != null) {
      const { fromLastPosition } = startAt;
      return fromLastPosition >= 0 ?
        max : Math.max(min, max + fromLastPosition);
    }
  }

  else { // TODO @deprecated
    if (typeof startTime == "string" && percentage.test(startTime)) {
      startTime = (parseFloat(startTime) / 100) * duration;
    }

    if (typeof endTime == "string" && percentage.test(endTime)) {
      timeFragment.end = (parseFloat(endTime) / 100) * duration;
    }

    if (endTime === Infinity || endTime === "100%") {
      endTime = duration;
    }

    if (!manifest.isLive) {
      assert(startTime < duration && endTime <= duration, "stream: bad startTime and endTime");
      return startTime ;
    }
    else if (startTime) {
      return fromWallClockTime(startTime, manifest);
    }
    else {
      const sgp = manifest.suggestedPresentationDelay;
      return getMaximumBufferPosition(manifest) -
        (sgp == null ? DEFAULT_LIVE_GAP : sgp);
    }
  }

  return 0;
}

/**
 * On subscription:
 *  - Creates the MediaSource and attached sourceBuffers instances.
 *  - download the content's manifest
 *  - Perform EME management if needed
 *  - create Buffer instances for each adaptation to manage buffers.
 *  - returns Observable emitting notifications about the stream lifecycle.
 * @param {Object} args
 * @returns {Observable}
 */
function Stream({
  url,
  errorStream, // subject through which minor errors are emitted
  keySystems,
  supplementaryTextTracks, // eventual manually added subtitles
  hideNativeSubtitle, // Whether TextTracks subtitles should be hidden or not
  supplementaryImageTracks, // eventual manually added images
  timings,
  timeFragment,
  adaptive,
  pipelines,
  videoElement,
  autoPlay,
  startAt,
}) {
  // TODO @deprecate?
  const fragEndTimeIsFinite = timeFragment.end < Infinity;

  // throttled to avoid doing multiple simultaneous requests because multiple
  // source buffers are out-of-index
  const fetchManifest = throttle(pipelines.manifest);

  let nativeBuffers = {}; // SourceBuffers added to the MediaSource
  let customBuffers = {}; // custom SourceBuffers

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
   * Adds a SourceBuffer to the MediaSource.
   * @param {MediaSource} mediaSource
   * @param {string} type - The "type" of SourceBuffer (audio/video...)
   * @param {string} codec
   * @returns {SourceBuffer}
   */
  function addNativeSourceBuffer(mediaSource, type, codec) {
    if (!nativeBuffers[type]) {
      log.info("add sourcebuffer", codec);
      nativeBuffers[type] = mediaSource.addSourceBuffer(codec);
    }
    return nativeBuffers[type];
  }

  /**
   * Creates a new SourceBuffer.
   * Can be a native one (audio/video) as well as a custom one (image/text).
   * @throws MediaError - The type of bugger given is unknown.
   * @param {HTMLMediaElement} video
   * @param {MediaSource} mediaSource
   * @param {Object} bufferInfos
   * @returns {SourceBuffer|AbstractSourceBuffer}
   */
  function createSourceBuffer(video, mediaSource, type, codec) {
    let sourceBuffer;

    if (shouldHaveNativeSourceBuffer(type)) {
      sourceBuffer = addNativeSourceBuffer(mediaSource, type, codec);
    }
    else {
      const oldSourceBuffer = customBuffers[type];
      if (oldSourceBuffer) {
        try {
          oldSourceBuffer.abort();
        } catch(e) {
          log.warn(e);
        } finally {
          delete customBuffers[type];
        }
      }

      if (type == "text") {
        log.info("add text sourcebuffer", codec);
        sourceBuffer = new TextSourceBuffer(video, codec, hideNativeSubtitle);
      }
      else if (type == "image") {
        log.info("add image sourcebuffer", codec);
        sourceBuffer = new ImageSourceBuffer(codec);
      }
      else {
        log.error("unknown buffer type " + type);
        throw new MediaError("BUFFER_TYPE_UNKNOWN", null, true);
      }

      customBuffers[type] = sourceBuffer;
    }

    return sourceBuffer;
  }

  /**
   * Abort and remove the SourceBuffer given.
   * @param {HTMLMediaElement} video
   * @param {MediaSource} mediaSource
   * @param {string} type
   */
  function disposeSourceBuffer(video, mediaSource, type) {
    let oldSourceBuffer;

    const isNative = shouldHaveNativeSourceBuffer(type);
    if (isNative) {
      oldSourceBuffer = nativeBuffers[type];
      delete nativeBuffers[type];
    }
    else {
      oldSourceBuffer = customBuffers[type];
      delete customBuffers[type];
    }

    if (oldSourceBuffer) {
      try {
        oldSourceBuffer.abort();

        if (isNative) {
          mediaSource.removeSourceBuffer(oldSourceBuffer);
        }

      } catch(e) {
        log.warn(e);
      }
    }
  }

  /**
   * Create, on subscription, a MediaSource instance and attach it to the given
   * video element's src attribute.
   *
   * Returns an Observable which emits one time when done an object with the
   * following properties:
   *
   *   - src {string} - the src given
   *
   *   - mediaSource {MediaSource|null} - the MediaSource instance. Can be null
   *     in the case no MediaSource is needed.
   *
   * This Observable never completes. It can throw if MediaSource is needed but
   * is not available in the current environment.
   *
   * On unsubscription, the video.src is cleaned, MediaSource sourcenuffers and
   * customBuffers are aborted and some minor cleaning is done.
   *
   * @param {string} url
   * @param {HTMLMediaElement} video
   * @returns {Observable}
   */
  function createAndPlugMediaSource(url, video) {
    return Observable.create((observer) => {
      let mediaSource, objectURL;

      function resetMediaElement() {
        if (mediaSource && mediaSource.readyState != "closed") {
          const { readyState, sourceBuffers } = mediaSource;
          for (let i = 0; i < sourceBuffers.length; i++) {
            const sourceBuffer = sourceBuffers[i];
            try {
              if (readyState == "open") {
                sourceBuffer.abort();
              }

              mediaSource.removeSourceBuffer(sourceBuffer);
            }
            catch(e) {
              log.warn("error while disposing souceBuffer", e);
            }
          }
        }

        Object.keys(customBuffers).forEach((sourceBufferType) => {
          const sourceBuffer = customBuffers[sourceBufferType];
          try {
            sourceBuffer.abort();
          }
          catch(e) {
            log.warn("error while disposing souceBuffer", e);
          }
        });

        clearVideoSrc(video);

        if (objectURL) {
          try {
            URL.revokeObjectURL(objectURL);
          } catch(e) {
            log.warn("error while revoking ObjectURL", e);
          }
        }

        nativeBuffers = {};
        customBuffers = {};

        mediaSource = null;
        objectURL = null;
      }

      // make sure the media has been correctly reset
      resetMediaElement();

      if (pipelines.requiresMediaSource()) {
        if (!MediaSource_) {
          throw new MediaError("MEDIA_SOURCE_NOT_SUPPORTED", null, true);
        }
        mediaSource = new MediaSource_();
        objectURL = URL.createObjectURL(mediaSource);
      } else {
        mediaSource = null;
        objectURL = url;
      }

      video.src = objectURL;

      observer.next({ url, mediaSource });
      log.info("create mediasource object", objectURL);

      return resetMediaElement;
    });
  }

  /**
   * Create timings and seekings Observables:
   *   - timings is the given timings observable with added informations.
   *   - seekings emits each time the player go in a seeking state.
   * @param {Object} manifest
   * @returns {Object}
   */
  function createTimings(manifest) {
    const augmentedTimings = timings.map((timing) => {
      let clonedTiming;
      if (fragEndTimeIsFinite) {
        clonedTiming = timing.clone();
        clonedTiming.ts = Math.min(timing.ts, timeFragment.end);
        clonedTiming.duration = Math.min(timing.duration, timeFragment.end);
      } else {
        clonedTiming = timing;
      }

      clonedTiming.liveGap = manifest.isLive ?
        getMaximumBufferPosition(manifest) - 10 - timing.ts :
        Infinity;
      return clonedTiming;
    });

    const seekings = seekingsSampler(augmentedTimings);

    return {
      timings: augmentedTimings,
      seekings,
    };
  }

  /**
   * End-Of-Play emit when the current timing is really close to the end.
   * @see END_OF_PLAY
   * @type {Observable}
   */
  const endOfPlay = timings
    .filter(({ ts, duration }) => (
      duration > 0 &&
      Math.min(duration, timeFragment.end) - ts < END_OF_PLAY
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
  const createAllStream = retryableFuncWithBackoff(({ url, mediaSource }) => {
    const sourceOpening = mediaSource
      ? sourceOpen(mediaSource)
      : Observable.of(null);

    return combineLatest(fetchManifest({ url }), sourceOpening)
      .mergeMap(([{ parsed }]) => {
        const manifest = normalizeManifest(parsed.url,
                                           parsed.manifest,
                                           supplementaryTextTracks,
                                           supplementaryImageTracks);

        if (mediaSource) {
          setDurationToMediaSource(mediaSource, manifest.getDuration());
        }

        return createStream(mediaSource, manifest);
      });
  }, retryOptions);

  return createAndPlugMediaSource(url, videoElement)
    .mergeMap(createAllStream)
    .takeUntil(endOfPlay);

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
    adaptations,
    timings,
    seekings,
    manifest,
  ) {
    const adaptation$ = adaptive.getAdaptationsChoice(bufferType, adaptations);

    if (__DEV__) {
      assert(pipelines[bufferType],
        "stream: no pipeline found for type " + bufferType);
    }

    return adaptation$.switchMap((adaptation) => {
      if (!adaptation) {
        disposeSourceBuffer(videoElement, mediaSource, bufferType);
        return EmptyBuffer(bufferType);
      }

      const sourceBuffer =
        createSourceBuffer(videoElement, mediaSource, bufferType, codec);

      const fetchSegment = ({ segment, representation }) => {
        return pipelines[bufferType]({
          segment,
          representation,
          adaptation,
          manifest,
        });
      };

      const adapters = adaptive.getBufferAdapters(adaptation);
      const buffer = Buffer({
        bufferType,
        sourceBuffer,
        adaptation,
        timings,
        seekings,
        adapters,
        pipeline: fetchSegment,
        isLive: manifest.isLive,
      });

      return buffer.catch(error => {
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
   * Creates a stream waiting for the "loadedmetadata" and "canplay"
   * events.
   *
   * This stream also the side effect of setting the initial time as soon as
   * the loadedmetadata event pops up.
   * @param {Object} manifest
   */
  function createLoadedMetadata(manifest) {
    const canSeek$ = canSeek(videoElement)
      .do(() => {
        const startTime = calculateInitialTime(manifest, startAt, timeFragment);
        log.info("set initial time", startTime);

        // reset playbackRate to 1 in case we were at 0 (from a stalled
        // retry for instance)
        videoElement.playbackRate = 1;
        videoElement.currentTime = startTime;
      });

    const canPlay$ = canPlay(videoElement)
      .do(() => {
        log.info("canplay event");
        if (autoPlay) {
          videoElement.play();
        }
        autoPlay = true;
      });

    return combineLatest(canSeek$, canPlay$)
      .take(1)
      .mapTo({ type: "loaded", value: true });
  }

  /**
   * Perform EME management.
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
  function createStalled(timings, { changePlaybackRate=true }) {
    return timings
      .distinctUntilChanged((prevTiming, timing) => {
        const isStalled = timing.stalled;
        const wasStalled = prevTiming.stalled;

        let isEqual;
        if (!wasStalled && !isStalled) {
          isEqual = true;
        } else if (!wasStalled || !isStalled) {
          isEqual = false;
        } else {
          isEqual = (wasStalled.name == isStalled.name);
        }

        if (!isEqual && changePlaybackRate) {
          if (wasStalled) {
            log.info("resume playback", timing.ts, timing.name);
            videoElement.playbackRate = wasStalled.playback;
          } else {
            log.info("stop playback", timing.ts, timing.name);
            videoElement.playbackRate = 0;
          }
        }

        // Discontinuity check in case we are close a buffer but still
        // calculate a stalled state. This is useful for some
        // implementation that might drop an injected segment, or in
        // case of small discontinuity in the stream.
        if (isStalled) {
          const nextRangeGap = timing.buffered.getNextRangeGap(timing.ts);

          if (isPlaybackStuck(timing)) {
            videoElement.currentTime = timing.ts;
            log.warn("after freeze seek", timing.ts, timing.range);
          } else if (nextRangeGap < DISCONTINUITY_THRESHOLD) {
            const seekTo = (timing.ts + nextRangeGap + 1/60);
            videoElement.currentTime = seekTo;
            log.warn("discontinuity seek", timing.ts, nextRangeGap, seekTo);
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
    return fetchManifest({ url: manifest.getUrl()})
      .map(({ parsed }) => {
        const newManifest = updateManifest(
          manifest,
          // TODO
          normalizeManifest(
            parsed.url,
            parsed.manifest,
            supplementaryTextTracks,
            supplementaryImageTracks
          )
        );

        return { type: "manifest", value: newManifest };
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
   * Creates, for every managed adaptations defined in the manifest, a
   * SourceBuffer and Buffer instance.
   * @see Buffer class
   * @param {MediaSource} mediaSource
   * @param {Object} manifest
   * @param {Observable} timings
   * @param {Observable} seekings
   * @returns {Observable}
   */
  function createAdaptationsBuffers(mediaSource, manifest, timings, seekings) {
    const adaptationsBuffers = Object.keys(manifest.adaptations)
      .map((type) => {
        const adaptations = manifest.adaptations[type];

        // TODO re-check that
        const codec = getCodec(adaptations[0].representations[0]);

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
          addNativeSourceBuffer(mediaSource, type, codec);
        }

        return createBuffer(
          mediaSource,
          type,
          codec,
          adaptations,
          timings,
          seekings,
          manifest,
        );
      });

    const buffers = merge(...adaptationsBuffers);

    if (!manifest.isLive) {
      return buffers;
    }

    // handle manifest reloading for live streamings using outofindex
    // errors thrown when a buffer asks for a segment out of its
    // current index
    return buffers
      .concatMap((message) => liveMessageHandler(message, manifest));
  }

  /**
   * Returns an observable which throws the right MediaError as soon an "error"
   * event is received through the videoElement
   * @see MediaError
   * @returns {Observable}
   */
  function createMediaErrorStream() {
    return on(videoElement, "error").mergeMap(() => {
      const errorCode = videoElement.error.code;
      let errorDetail;
      switch(errorCode) {
      case 1: errorDetail = "MEDIA_ERR_ABORTED"; break;
      case 2: errorDetail = "MEDIA_ERR_NETWORK"; break;
      case 3: errorDetail = "MEDIA_ERR_DECODE"; break;
      case 4: errorDetail = "MEDIA_ERR_SRC_NOT_SUPPORTED"; break;
      }
      log.error(`stream: video element MEDIA_ERR(${errorDetail})`);
      throw new MediaError(errorDetail, null, true);
    });
  }

  /**
   * Creates a stream merging all observable that are required to make
   * the system cooperate.
   * @param {MediaSource} mediaSource
   * @param {Object} manifest
   * @returns {Observable}
   */
  function createStream(mediaSource, manifest) {
    const { timings, seekings } = createTimings(manifest);
    const justManifest = Observable.of({ type: "manifest", value: manifest });
    const emeHandler = createEMEIfKeySystems();
    const stalled = createStalled(timings, {
      changePlaybackRate: pipelines.requiresMediaSource(),
    });
    const canPlay = createLoadedMetadata(manifest);
    const buffers = createAdaptationsBuffers(mediaSource,
                                             manifest,
                                             timings,
                                             seekings);
    const mediaError = createMediaErrorStream();

    return merge(justManifest,
                       canPlay,
                       stalled,
                       emeHandler,
                       buffers,
                       mediaError);
  }
}

export default Stream;
