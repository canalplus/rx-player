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

var _ = require("canal-js-utils/misc");
var log = require("canal-js-utils/log");
var assert = require("canal-js-utils/assert");
var { Observable } = require("canal-js-utils/rx");
var { first, on } = require("canal-js-utils/rx-ext");
var { getLiveGap, seekingsSampler, fromWallClockTime } = require("./timings");
var { retryWithBackoff } = require("canal-js-utils/rx-ext");
var { empty, never, just, merge, zip } = Observable;
var min = Math.min;

var { MediaSource_, sourceOpen, loadedMetadataEvent } = require("./compat");
var TextSourceBuffer = require("./text-buffer");
var { getLiveEdge } = require("./index-handler");
var Buffer = require("./buffer");
var EME = require("./eme");

var {
  normalizeManifest,
  mergeManifestsIndex,
  mutateManifestLiveGap,
  getAdaptations
} = require("./manifest");

var END_OF_PLAY = 0.2;
var TOTAL_RETRY_COUNT = 3;

// discontinuity threshold in seconds
var DISCONTINUITY_THRESHOLD = 1;

function plugDirectFile(url, video) {
  return Observable.create((observer) => {
    video.src = url;
    observer.next({ url });
    return () => {
      video.src = "";
    };
  });
}

function isNativeBuffer(bufferType) {
  return (
    bufferType == "audio" ||
    bufferType == "video"
  );
}

function Stream({
  url,
  keySystems,
  subtitles,
  timings,
  timeFragment,
  adaptive,
  pipelines,
  videoElement,
  autoPlay,
  directFile
}) {

  assert(MediaSource_, "player: browser is required to support MediaSource");

  var fragStartTime = timeFragment.start;
  var fragEndTime = timeFragment.end;
  var fragEndTimeIsFinite = fragEndTime < Infinity;

  var manifestPipeline = pipelines.manifest;

  var nativeBuffers = {};
  var customBuffers = {};

  function createSourceBuffer(video, mediaSource, bufferInfos) {
    var { type, codec } = bufferInfos;

    var sourceBuffer;

    if (isNativeBuffer(type)) {

      if (nativeBuffers[type]) {
        sourceBuffer = nativeBuffers[type];
      } else {
        log.info("add sourcebuffer", codec);
        sourceBuffer = mediaSource.addSourceBuffer(codec);
        nativeBuffers[type] = sourceBuffer;
      }

    }
    else {

      var oldSourceBuffer = customBuffers[type];
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
        sourceBuffer = new TextSourceBuffer(video, codec);
      }
      // else if (type == "image") {
      //    ...
      // }
      else {
        var errMessage = "stream: unknown buffer type " + type;
        log.error(errMessage);
        throw new Error(errMessage);
      }

      customBuffers[type] = sourceBuffer;
    }

    return sourceBuffer;
  }

  function disposeSourceBuffer(video, mediaSource, bufferInfos) {
    var { type } = bufferInfos;

    var oldSourceBuffer;

    var isNative = isNativeBuffer(type);
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

        if (isNative)
          mediaSource.removeSourceBuffer(oldSourceBuffer);

      } catch(e) {
        log.warn(e);
      }
    }
  }

  function createAndPlugMediaSource(url, video) {
    return Observable.create((observer) => {
      var mediaSource = new MediaSource_();
      var objectURL = video.src = URL.createObjectURL(mediaSource);

      observer.next({ url, mediaSource });
      log.info("create mediasource object", objectURL);

      return () => {

        if (mediaSource && mediaSource.readyState != "closed") {
          var state = mediaSource.readyState;
          _.each(_.cloneArray(mediaSource.sourceBuffers), sourceBuffer => {
            try {
              if (state == "open")
                sourceBuffer.abort();

              mediaSource.removeSourceBuffer(sourceBuffer);
            }
            catch(e) {
              log.warn("error while disposing souceBuffer", e);
            }
          });
        }

        _.each(_.keys(customBuffers), sourceBufferType => {
          var sourceBuffer = customBuffers[sourceBufferType];
          try {
            sourceBuffer.abort();
          }
          catch(e) {
            log.warn("error while disposing souceBuffer", e);
          }
        });

        // clear video srcAttribute
        video.src = "";

        if (objectURL) {
          try {
            URL.revokeObjectURL(objectURL);
          } catch(e) {
            log.warn("error while revoking ObjectURL", e);
          }
        }

        nativeBuffers = null;
        customBuffers = null;

        mediaSource = null;
        objectURL = null;
      };
    });
  }

  function createTimings(manifest) {
    var augmentedTimings = timings.map((timing) => {
      var clonedTiming;
      if (fragEndTimeIsFinite) {
        clonedTiming = _.cloneObject(timing);
        clonedTiming.ts = min(timing.ts, fragEndTime);
        clonedTiming.duration = min(timing.duration, fragEndTime);
      } else {
        clonedTiming = timing;
      }
      clonedTiming.liveGap = getLiveGap(timing.ts, manifest);
      return clonedTiming;
    });

    var seekings = seekingsSampler(augmentedTimings);

    return {
      timings: augmentedTimings,
      seekings
    };
  }

  /**
   * End-Of-Play stream popping a value when timings reaches the end of the
   * video
   */
  var endOfPlay = timings
    .filter(({ ts, duration }) => (
      duration > 0 &&
      min(duration, fragEndTime) - ts < END_OF_PLAY
    ))
    .take(1)
    .share();

  if (directFile) {
    return plugDirectFile(url, videoElement)
      .flatMap(createDirectFileStream)
      .takeUntil(endOfPlay);
  }

  /**
   * Wait for manifest and media-source to open before initializing source
   * duration and creating buffers
   */
  var createAllStream = retryWithBackoff(({ url, mediaSource }) => {
    var sourceOpening = sourceOpen(mediaSource);

    return manifestPipeline({ url })
      .zip(sourceOpening, _.identity)
      .flatMap(({ parsed }) => {
        var manifest = normalizeManifest(parsed.url, parsed.manifest, subtitles);

        setDuration(mediaSource, manifest);

        return createStream(mediaSource, manifest);
      });
  }, {
    retryDelay: 500,
    totalRetry: TOTAL_RETRY_COUNT,
    resetDelay: 60 * 1000,
    shouldRetry: (err, tryCount) => {
      if (/MEDIA_ERR/.test(err.message)) {
        return false;
      } else {
        log.warn("stream retry", err, tryCount);
        return true;
      }
    },
  });

  return createAndPlugMediaSource(url, videoElement)
    .flatMap(createAllStream)
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
    var { type } = bufferInfos;
    var adaptations = adaptive.getAdaptationsChoice(type, bufferInfos.adaptations);

    if (__DEV__)
      assert(pipelines[type], "stream: no pipeline found for type " + type);

    return adaptations.flatMapLatest(adaptation => {
      if (!adaptation) {
        disposeSourceBuffer(videoElement, mediaSource, bufferInfos);
        return never();
      }

      var adapters = adaptive.getBufferAdapters(adaptation);
      var buffer = Buffer({
        sourceBuffer: createSourceBuffer(videoElement, mediaSource, bufferInfos),
        pipeline: pipelines[type],
        adaptation,
        timings,
        seekings,
        adapters,
      });

      // non native buffer should not impact on the stability of the
      // player. ie: if a text buffer sends an error, we want to
      // continue streaming without any subtitles
      if (!isNativeBuffer(type)) {
        return buffer.catch((err) => {
          log.error("buffer", type, "has crashed", err);
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
    var loadedMetadata = loadedMetadataEvent(videoElement)
      .tap(() => setInitialTime(manifest));

    var canPlay = on(videoElement, "canplay")
      .tap(() => {
        log.info("canplay event");
        if (autoPlay) videoElement.play();
        autoPlay = true;
      });

    return first(zip(loadedMetadata, canPlay, _.noop))
      .map({ type: "loaded", value: true })
      .startWith({ type: "loaded", value: false });
  }

  function createEME() {
    if (keySystems && keySystems.length) {
      return EME(videoElement, keySystems);
    } else {
      return EME.onEncrypted(videoElement).map(() => {
        var errMessage = "eme: ciphered media and no keySystem passed";
        log.error(errMessage);
        throw new Error(errMessage);
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
  function createStalled(timings, changePlaybackRate=true) {
    return timings
      .distinctUntilChanged((prevTiming, timing) => {
        var isStalled = timing.stalled;
        var wasStalled = prevTiming.stalled;

        var isEqual;
        if (!wasStalled && !isStalled)
          isEqual = true;
        else if (!wasStalled || !isStalled)
          isEqual = false;
        else
          isEqual = (wasStalled.name == isStalled.name);

        if (!isEqual && changePlaybackRate) {
          if (wasStalled) {
            log.warn("resume playback", timing.ts, timing.name);
            videoElement.playbackRate = wasStalled.playback;
          } else {
            log.warn("stop playback", timing.ts, timing.name);
            videoElement.playbackRate = 0;
          }
        }

        // Discontinuity check in case we are close a buffer but still
        // calculate a stalled state. This is useful for some
        // implementation that might drop an injected segment, or in
        // case of small discontinuity in the stream.
        if (isStalled) {
          var nextRangeGap = timing.buffered.getNextRangeGap(timing.ts);
          if (nextRangeGap < DISCONTINUITY_THRESHOLD) {
            var seekTo = (timing.ts + nextRangeGap + 1/60);
            videoElement.currentTime = seekTo;
            log.warn("discontinuity seek", timing.ts, nextRangeGap, seekTo);
          }
        }

        return isEqual;
      })
      .map(timing => {
        return { type: "stalled", value: timing.stalled };
      });
  }

  function isOutOfIndexError(err) {
    return err && err.type == "out-of-index";
  }

  function isPreconditionFailedError(err) {
    return err && err.type == "precondition-failed";
  }

  function manifestAdapter(manifest, message) {
    // out-of-index messages require a complete reloading of the
    // manifest to refresh the current index
    if (isOutOfIndexError(message)) {
      log.warn("out of index");
      return manifestPipeline({ url: manifest.locations[0] })
        .map(({ parsed }) => {
          var newManifest = mergeManifestsIndex(manifest, normalizeManifest(parsed.url, parsed.manifest, subtitles));
          return { type: "manifest", value: newManifest };
        });
    }

    // precondition-failed messages require a change of live-gap to
    // calibrate the live representation of the player
    // TODO(pierre): smarter converging algorithm
    if (isPreconditionFailedError(message)) {
      mutateManifestLiveGap(manifest, 1);
      log.warn("precondition failed", manifest.presentationLiveGap);
    }

    return just(message);
  }

  function createAdaptationsBuffers(mediaSource, manifest, timings, seekings) {
    var adaptationsBuffers = _.map(getAdaptations(manifest),
      adaptation => createBuffer(mediaSource, adaptation, timings, seekings));

    var buffers = merge.apply(null, adaptationsBuffers);

    if (!manifest.isLive)
      return buffers;

    // handle manifest reloading for live streamings using outofindex
    // errors thrown when a buffer asks for a segment out of its
    // current index
    return buffers
      // do not throw multiple times OutOfIndexErrors in order to have
      // only one manifest reload for each error.
      .distinctUntilChanged((a, b) =>
        isOutOfIndexError(b) &&
        isOutOfIndexError(a))
      .concatMap((message) => manifestAdapter(manifest, message));
  }

  /**
   * Creates a stream merging all observable that are required to make
   * the system cooperate.
   */
  function createStream(mediaSource, manifest) {
    var { timings, seekings } = createTimings(manifest);
    var justManifest = just({ type: "manifest", value: manifest });
    var canPlay = createLoadedMetadata(manifest);
    var buffers = createAdaptationsBuffers(mediaSource, manifest, timings, seekings);
    var emeHandler = createEME();
    var stalled = createStalled(timings, true);

    var mediaError = on(videoElement, "error").flatMap(() => {
      var errMessage = `stream: video element MEDIA_ERR code ${videoElement.error.code}`;
      log.error(errMessage);
      throw new Error(errMessage);
    });

    return merge(justManifest, canPlay, emeHandler, buffers, stalled, mediaError);
  }

  function createDirectFileStream() {
    var { timings } = createTimings(directFile, { timeInterval: 1000 });
    var justManifest = just({ type: "manifest", value: directFile });
    var canPlay = createLoadedMetadata(directFile);
    var stalled = createStalled(timings, false);

    return merge(justManifest, canPlay, stalled);
  }

  /**
   * Side effect the set the media duration in mediaSource. This side
   * effect occurs when we receive the "sourceopen" from the
   * mediaSource.
   */
  function setDuration(mediaSource, manifest) {
    if (manifest.duration === Infinity) {
      // TODO(pierre): hack for Chrome 42
      mediaSource.duration = Number.MAX_VALUE;
    }
    else {
      mediaSource.duration = manifest.duration;
    }
    log.info("set duration", mediaSource.duration);
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
    var duration = manifest.duration;
    var startTime = fragStartTime;
    var endTime = fragEndTime;
    var percentage = /^\d*(\.\d+)? ?%$/;

    if (_.isString(startTime) && percentage.test(startTime)) {
      startTime = (parseFloat(startTime) / 100) * duration;
    }

    if (_.isString(endTime) && percentage.test(endTime)) {
      fragEndTime = (parseFloat(endTime) / 100) * duration;
    }

    if (endTime === Infinity || endTime === "100%")
      endTime = duration;

    if (!manifest.isLive) {
      assert(startTime < duration && endTime <= duration, `stream: bad startTime and endTime`);
    }
    else if (startTime) {
      startTime = fromWallClockTime(startTime, manifest);
    }
    else {
      startTime = getLiveEdge(manifest);
    }

    log.info("set initial time", startTime);
    videoElement.currentTime = startTime;
  }
}

module.exports = Stream;
