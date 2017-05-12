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

const log = require("../utils/log");
const assert = require("../utils/assert");
const { getLiveGap, seekingsSampler, fromWallClockTime } = require("./timings");
const { retryableFuncWithBackoff } = require("../utils/retry");
const { Observable } = require("rxjs/Observable");
const { on } = require("../utils/rx-utils");
const empty = require("rxjs/observable/EmptyObservable").EmptyObservable.create;
const { merge } = require("rxjs/observable/merge");
const { combineLatest } = require("rxjs/observable/combineLatest");
const min = Math.min;

const {
  MediaSource_,
  sourceOpen,
  canPlay,
  canSeek,
  isPlaybackStuck,
} = require("./compat");

const TextSourceBuffer = require("./text-buffer");
const ImageSourceBuffer = require("./image-buffer");
const { getLiveEdge } = require("./index-handler");
const { Buffer, EmptyBuffer } = require("./buffer");
const { createEME, onEncrypted } = require("./eme");

const {
  MediaError,
  OtherError,
  EncryptedMediaError,
  isKnownError,
} = require("../errors");

const {
  normalizeManifest,
  mergeManifestsIndex,
  mutateManifestLiveGap,
  getAdaptations,
} = require("./manifest");

// Stop stream 0.5 second before the end of video
// It happens often that the video gets stuck 100 to 300 ms before the end, especially on IE11 and Edge
const END_OF_PLAY = 0.5;

const DISCONTINUITY_THRESHOLD = 1; // discontinuity threshold in seconds

function isNativeBuffer(bufferType) {
  return (
    bufferType == "audio" ||
    bufferType == "video"
  );
}

function Stream({
  url,
  errorStream,
  keySystems,
  subtitles,
  hideNativeSubtitle,
  images,
  timings,
  timeFragment,
  adaptive,
  pipelines,
  videoElement,
  autoPlay,
}) {

  const fragStartTime = timeFragment.start;
  const fragEndTimeIsFinite = fragEndTime < Infinity;
  let fragEndTime = timeFragment.end;

  const manifestPipeline = pipelines.manifest;

  let nativeBuffers = {};
  let customBuffers = {};

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

  function addNativeSourceBuffer(mediaSource, type, codec) {
    if (!nativeBuffers[type]) {
      log.info("add sourcebuffer", codec);
      nativeBuffers[type] = mediaSource.addSourceBuffer(codec);
    }
    return nativeBuffers[type];
  }

  function createSourceBuffer(video, mediaSource, bufferInfos) {
    const { type, codec } = bufferInfos;

    let sourceBuffer;

    if (isNativeBuffer(type)) {
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

  function disposeSourceBuffer(video, mediaSource, bufferInfos) {
    const { type } = bufferInfos;

    let oldSourceBuffer;

    const isNative = isNativeBuffer(type);
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

        // Clear video src attribute.
        // On IE11,  video.src = "" is not sufficient as it
        // does not clear properly the current MediaKey Session.
        // Microsoft recommended to use video.removeAttr("src").
        video.src = "";
        video.removeAttribute("src");

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

  function createTimings(manifest) {
    const augmentedTimings = timings.map((timing) => {
      let clonedTiming;
      if (fragEndTimeIsFinite) {
        clonedTiming = timing.clone();
        clonedTiming.ts = min(timing.ts, fragEndTime);
        clonedTiming.duration = min(timing.duration, fragEndTime);
      } else {
        clonedTiming = timing;
      }
      clonedTiming.liveGap = getLiveGap(timing.ts, manifest);
      return clonedTiming;
    });

    const seekings = seekingsSampler(augmentedTimings);

    return {
      timings: augmentedTimings,
      seekings,
    };
  }

  /**
   * End-Of-Play stream popping a value when timings reaches the end of the
   * video
   */
  const endOfPlay = timings
    .filter(({ ts, duration }) => (
      duration > 0 &&
      min(duration, fragEndTime) - ts < END_OF_PLAY
    ));

  /**
   * Wait for manifest and media-source to open before initializing source
   * duration and creating buffers
   */
  const createAllStream = retryableFuncWithBackoff(({ url, mediaSource }) => {
    const sourceOpening = mediaSource
      ? sourceOpen(mediaSource)
      : Observable.of(null);

    return combineLatest(manifestPipeline({ url }), sourceOpening)
      .mergeMap(([{ parsed }]) => {
        const manifest = normalizeManifest(parsed.url,
                                           parsed.manifest,
                                           subtitles,
                                           images);

        if (mediaSource) {
          setDuration(mediaSource, manifest);
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
   */
  function createBuffer(mediaSource, bufferInfos, timings, seekings) {
    const { type: bufferType } = bufferInfos;
    const adaptations = adaptive.getAdaptationsChoice(bufferType, bufferInfos.adaptations);

    if (__DEV__) {
      assert(pipelines[bufferType], "stream: no pipeline found for type " + bufferType);
    }

    return adaptations.switchMap((adaptation) => {
      if (!adaptation) {
        disposeSourceBuffer(videoElement, mediaSource, bufferInfos);
        return EmptyBuffer(bufferType);
      }

      const adapters = adaptive.getBufferAdapters(adaptation);
      const buffer = Buffer({
        bufferType,
        sourceBuffer: createSourceBuffer(videoElement, mediaSource, bufferInfos),
        pipeline: pipelines[bufferType],
        adaptation,
        timings,
        seekings,
        adapters,
      });

      // non native buffer should not impact on the stability of the
      // player. ie: if a text buffer sends an error, we want to
      // continue streaming without any subtitles
      if (!isNativeBuffer(bufferType)) {
        return buffer.catch((error) => {
          log.error("buffer", bufferType, "has crashed", error);
          errorStream.next(error);
          return empty();
        });
      }

      return buffer;
    });
  }

  /**
   * Creates a stream waiting for the "loadedmetadata" and "canplay"
   * events.
   *
   * This stream also the side effect of setting the initial time as soon as
   * the loadedmetadata event pops up.
   */
  function createLoadedMetadata(manifest) {
    const canSeek$ = canSeek(videoElement)
      .do(() => setInitialTime(manifest));

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
   * stream has a side-effect of the <video> playbackRate property.
   *
   * It mutates its value to stop the video when buffer is too low, or
   * resume the video when the buffer has regained a decent size.
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

  function messageHandler(message, manifest) {
    switch(message.type) {
    case "index-discontinuity":
      log.warn("explicit discontinuity seek", message.value.ts);
      videoElement.currentTime = message.value.ts;
      break;

    // precondition-failed messages require a change of live-gap to
    // calibrate the live representation of the player
    // TODO(pierre): smarter converging algorithm
    case "precondition-failed":
      mutateManifestLiveGap(manifest, 1);
      log.warn("precondition failed", manifest.presentationLiveGap);
      break;

    case "out-of-index":
      // out-of-index messages require a complete reloading of the
      // manifest to refresh the current index
      log.info("out of index");
      return manifestPipeline({ url: manifest.locations[0] })
        .map(({ parsed }) => {
          const newManifest = mergeManifestsIndex(
            manifest,
            normalizeManifest(parsed.url, parsed.manifest, subtitles)
          );
          return { type: "manifest", value: newManifest };
        });
    }

    return Observable.of(message);
  }

  function isErrorMessage(message) {
    return (
      message.type == "out-of-index" ||
      message.type == "index-discontinuity"
    );
  }

  function createAdaptationsBuffers(mediaSource, manifest, timings, seekings) {
    const adaptations = getAdaptations(manifest);

    // Initialize all native source buffer at the same time. We cannot
    // lazily create native sourcebuffers since the spec does not
    // allow adding them during playback.
    //
    // From https://w3c.github.io/media-source/#methods
    //    For example, a user agent may throw a QuotaExceededError
    //    exception if the media element has reached the HAVE_METADATA
    //    readyState. This can occur if the user agent's media engine
    //    does not support adding more tracks during playback.
    adaptations.forEach(({ type, codec }) => {
      if (isNativeBuffer(type)) {
        addNativeSourceBuffer(mediaSource, type, codec);
      }
    });

    const adaptationsBuffers = adaptations.map(
      (adaptation) => createBuffer(mediaSource, adaptation, timings, seekings)
    );

    const buffers = merge.apply(null, adaptationsBuffers);

    if (!manifest.isLive) {
      return buffers;
    }

    // handle manifest reloading for live streamings using outofindex
    // errors thrown when a buffer asks for a segment out of its
    // current index
    return buffers
      // do not throw multiple times OutOfIndexErrors in order to have
      // only one manifest reload for each error.
      .distinctUntilChanged((a, b) =>
        isErrorMessage(b) &&
        isErrorMessage(a))
      .concatMap((message) => messageHandler(message, manifest));
  }

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

  /**
   * Side effect the set the media duration in mediaSource. This side
   * effect occurs when we receive the "sourceopen" from the
   * mediaSource.
   */
  function setDuration(mediaSource, manifest) {
    let duration;
    if (manifest.duration === Infinity) {
      // TODO(pierre): hack for Chrome 42
      duration = Number.MAX_VALUE;
    } else {
      duration = manifest.duration;
    }

    if (mediaSource.duration !== duration) {
      mediaSource.duration = duration;
      log.info("set duration", mediaSource.duration);
    }
  }

  /**
   * Side effect to set the initial time of the video:
   *   - if a start time is defined by user, set it as start time
   *   - if video is live, use the live edge
   *   - else set the start time to 0
   *
   * This side effect occurs when we receive the "loadedmetadata" event from
   * the <video>.
   *
   * see: createLoadedMetadata(manifest)
   */
  function setInitialTime(manifest) {
    const duration = manifest.duration;
    let startTime = fragStartTime;
    let endTime = fragEndTime;
    const percentage = /^\d*(\.\d+)? ?%$/;

    if (typeof startTime == "string" && percentage.test(startTime)) {
      startTime = (parseFloat(startTime) / 100) * duration;
    }

    if (typeof endTime == "string" && percentage.test(endTime)) {
      fragEndTime = (parseFloat(endTime) / 100) * duration;
    }

    if (endTime === Infinity || endTime === "100%") {
      endTime = duration;
    }

    if (!manifest.isLive) {
      assert(startTime < duration && endTime <= duration, "stream: bad startTime and endTime");
    }
    else if (startTime) {
      startTime = fromWallClockTime(startTime, manifest);
    }
    else {
      startTime = getLiveEdge(manifest);
    }

    log.info("set initial time", startTime);
    // reset playbackRate to 1 in case we were at 0 (from a stalled
    // retry for instance)
    videoElement.playbackRate = 1;
    videoElement.currentTime = startTime;
  }
}

module.exports = Stream;
