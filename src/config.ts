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

export default {
  /**
   * Volume set on unMute if the volume is set to 0 and either:
   *   - mute has never been called before
   *   - mute has last been called while the volume was already set to 0 (either
   *     via setVolume, or a previous mute call)
   * @type {Number}
   */
  DEFAULT_UNMUTED_VOLUME: 0.1,

  /**
   * Can be either:
   *   - "native": Subtitles are all displayed in a <track> element
   *   - "html": Subtitles are all displayed in a <div> separated from the video
   *     element. Can be useful to display richer TTML subtitles, for example.
   * @type {Object|null}
   */
  // TODO ugly TypeScript workaround. Find better way
  DEFAULT_TEXT_TRACK_MODE: "native" as "native"|"html",

  /**
   * If set to true, video through loadVideo will auto play by default
   * @type {Boolean}
   */
  DEFAULT_AUTO_PLAY: false,

  /**
   * If set to false, "native" subtitles (in a <track> element) will be hidden
   * by default.
   * @type {Boolean}
   */
  DEFAULT_SHOW_NATIVE_SUBTITLE: true,

  /*
   * Default buffer goal in seconds. Once this amount of time reached ahead in
   * the buffer, the player won't automatically download segments.
   * @type {Number}
   */
  DEFAULT_WANTED_BUFFER_AHEAD: 30,

  /*
   * Default max buffer size ahead of the current position in seconds.
   * The buffer _after_ this limit will be garbage collected.
   * Set to Infinity for no limit.
   * @type {Number}
   */
  DEFAULT_MAX_BUFFER_AHEAD: Infinity,

  /*
   * Default max buffer size ahead of the current position in seconds.
   * The buffer _before_ this limit will be garbage collected.
   * Set to Infinity for no limit.
   * @type {Number}
   */
  DEFAULT_MAX_BUFFER_BEHIND: Infinity,

  /**
   * Default bitrate ceils initially set as the first content begins.
   *
   * If no track is found with a bitrate inferior or equal to the
   * bitrate there, the one with the lowest bitrate will be taken instead.
   *
   * Set to 0 for the lowest bitrate, Infinity for the highest.
   *
   * These values are only useful for the first content played, as consecutive
   * play will always take the last set one.
   * @type {Object}
   */
  DEFAULT_INITIAL_BITRATES: {
    audio: 0, // only "audio" segments
    video: 0, // only "video" segments
    other: 0, // tracks which are not audio/video (text images).
              // Though those are generally at a single bitrate, so no adaptive
              // mechanism is triggered for them.
  },

  /**
   * Default bitrate ceil initially set to dictate the maximum bitrate the
   * ABR manager can automatically switch to.
   *
   * If no track is found with a quality inferior or equal to the
   * bitrate there, the lowest bitrate will be taken instead.
   *
   * Set to Infinity to discard any limit in the ABR strategy.
   * @type {Object}
   */
  DEFAULT_MAX_BITRATES: {
    audio: Infinity, // only "audio" segments
    video: Infinity, // only "video" segments
    other: Infinity, // tracks which are not audio/video
                     // Though those are generally at a single bitrate, so no
                     // adaptive mechanism is triggered for them.
  } as IDictionary<number>,

  /**
   * Buffer threshold ratio used as a lower bound margin to find the suitable
   * representation.
   * @param {Number}
   */
  DEFAULT_ADAPTIVE_BUFFER_THRESHOLD: 0.3,

  /**
   * Delay after which, if the page is hidden, the user is considered inactive
   * on the current video. Allow to enforce specific optimizations when the
   * page is not shown.
   * @see DEFAULT_THROTTLE_WHEN_HIDDEN
   * @type {Number}
   */
  INACTIVITY_DELAY: 60 * 1000,

  /**
   * If true, if the player is in a "hidden" state for a delay specified by the
   * INACTIVITY DELAY config property, we throttle automatically to the video
   * representation with the lowest bitrate.
   * @type {Boolean}
   */
  DEFAULT_THROTTLE_WHEN_HIDDEN: false,

  /**
   * If true, the video representations you can switch to in adaptive mode
   * are limited by the video element's width.
   * @type {Boolean}
   */
  DEFAULT_LIMIT_VIDEO_WIDTH: false,

  /**
   * Default initial live gap considered if no presentation delay has been
   * suggested, in seconds.
   * @type {Number}
   */
  DEFAULT_LIVE_GAP: 10,

  /**
   * Default value for a manifest's suggested presentation delay if not
   * specified in the manifest.
   * @type {Object}
   */
  DEFAULT_SUGGESTED_PRESENTATION_DELAY: {
    SMOOTH: 10,
    DASH: 10,
  },

  /**
   * Maximum time, in seconds, the player should automatically skip when stalled
   * because of a discontinuity in the downloaded range.
   * @type {Number}
   */
  DISCONTINUITY_THRESHOLD: 1,

  /**
   * Time before the end of a video (in seconds) at which the player should
   * automatically stop.
   * It happens often that the video gets stuck 100 to 300 ms before the end,
   * especially on IE11 and Edge
   * @type {Number}
   */
  END_OF_PLAY: 0.5,

  /**
   * Ratio used to know if an already loaded segment should be re-buffered.
   * We re-load the given segment if the current one times that ratio is
   * inferior to the new one.
   * @type {Number}
   */
  BITRATE_REBUFFERING_RATIO: 1.5,

  /**
   * Those are used when a "QuotaExceededError" error is received after
   * appending a new segment in the source buffer.
   *
   * This error can arise when the browser's buffer is considered full.
   * In this case, the player goes into manual garbage collection (GC) mode.
   * @type {Object}
   */
  BUFFER_GC_GAPS: {
    /**
     * _Low_ gap (from current position) from which the buffer will be _garbage
     * collected_ (read removed from the buffer) when a QuotaExceededError is
     * received.
     * In seconds.
     * @type {Number}
     */
    CALM: 240,

    /**
     * _High_ gap (from current position) from which the buffer will be _garbage
     * collected_ (read removed from the buffer) when a QuotaExceededError is
     * received, if the low one does not clean up any buffer.
     * In seconds.
     * @type {Number}
     */
    BEEFY: 30,
  },

  /**
   * The default number of times a pipeline request will be re-performed when
   * on error which justify a retry.
   *
   * Note that some errors do not use this counter:
   *   - if the error is not due to the xhr, no retry will be peformed
   *   - if the error is an HTTP error code, but not a 500-smthg or a 404, no
   *     retry will be performed.
   *   - if it has a high chance of being due to the user being offline, a
   *     separate counter is used (see DEFAULT_MAX_PIPELINES_RETRY_ON_OFFLINE).
   * @type Number
   */
  DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR: 4,

  /**
   * Under some circonstances, we're able to tell that the user is offline (see
   * the compat files).
   * When this happens, and xhr requests fails due to an error event (you might
   * still be able to perform xhr offline, e.g. on localhost), you might want to
   * retry indefinitely or with a higher number of retry than if the error is
   * due to a CDN problem.
   *
   * A capped exponential backoff will still be used (like for an error code).
   * @type {Number}
   */
  DEFAULT_MAX_PIPELINES_RETRY_ON_OFFLINE: Infinity,

  /**
   * Initial backoff delay when a segment / manifest download fails, in
   * milliseconds.
   *
   * This delay will then grow exponentally by power of twos (200, 400, 800
   * etc.)
   *
   * Please note that this delay is not exact, as it will be fuzzed.
   * @type {Number}
   */
  INITIAL_BACKOFF_DELAY_BASE: 200,

  /**
   * Maximum backoff delay when a segment / manifest download fails, in
   * milliseconds.
   *
   * Please note that this delay is not exact, as it will be fuzzed.
   * @type {Number}
   */
  MAX_BACKOFF_DELAY_BASE: 3000,

  /**
   * Minimum interval at which timeupdate events will be "constructed". This
   * variable is for the "regular" mediasource strategy (that is, not for the
   * directfile API.
   *
   * Those events are the base of various important mechanisms in the player:
   *   - set the clock for the buffer.
   *   - set the clock for the ABR strategy.
   *   - used to trigger positionUpdate events.
   *
   * This common logic is for performance reasons, as we call multiple browser's
   * APIs which are useful for most of these.
   *
   * Keep in mind this is the minimum interval. This logic will also be
   * triggered when various events of the media element are received.
   * @type {Number}
   */
  SAMPLING_INTERVAL_MEDIASOURCE: 1000,

  /**
   * Same than SAMPLING_INTERVAL_MEDIASOURCE but for the directfile API.
   * @type {Number}
   */
  SAMPLING_INTERVAL_NO_MEDIASOURCE: 500,

  /**
   * Minimum number of bytes sampled before we trust the estimate.
   * If we have not sampled much data, our estimate may not be accurate
   * enough to trust.
   * If bytesSampled_ is less than minTotalBytes_, we use defaultEstimate_.
   * This specific value is based on experimentation.
   * @type {Number}
   */
  ABR_MINIMUM_TOTAL_BYTES: 200e3,

  /**
   * Minimum number of bytes, under which samples are discarded.
   * Our models do not include latency information, so connection startup time
   * (time to first byte) is considered part of the download time.
   * Because of this, we should ignore very small downloads which would cause
   * our estimate to be too low.
   * This specific value is based on experimentation.
   * @type {Number}
   */
  ABR_MINIMUM_CHUNK_SIZE: 16e3,

  /**
   * Factor with which is multiplied the bandwidth estimate when the ABR is in
   * starvation mode.
   * @type {Number}
   */
  ABR_STARVATION_FACTOR: 0.85,

  /**
   * Factor with which is multiplied the bandwidth estimate when the ABR is not
   * in starvation mode.
   * @type {Number}
   */
  ABR_REGULAR_FACTOR: 0.98,

  /**
   * If a SourceBuffer has less than this amount of seconds ahead of the current
   * position in its buffer, the ABR manager will go into starvation mode.
   *
   * It gets out of starvation mode when the OUT_OF_STARVATION_GAP value is
   * reached.
   *
   * Under this mode:
   *   - the bandwidth considered will be a little lower than the one estimated
   *   - the time the next important request take will be checked
   *     multiple times to detect when/if it takes too much time.
   *     If the request is considered too long, the bitrate will be hastily
   *     re-calculated from this single request.
   * @type {Number}
   */
  ABR_STARVATION_GAP: 5,

  OUT_OF_STARVATION_GAP: 7,

  /**
   * Number of seconds ahead in the buffer after which playback will resume when
   * seeking on an unbuffered part of the stream.
   * @type {Number}
   */
  RESUME_AFTER_SEEKING_GAP: 0.5,

  /**
   * Number of seconds ahead in the buffer after which playback will resume
   * after the player went through a buffering step.
   * @type {Number}
   */
  RESUME_AFTER_BUFFERING_GAP: 5,

  /**
   * Maximum number of seconds in the buffer based on which a "stalling"
   * strategy will be considered:
   * The player will pause playback to get enough time building a sufficient
   * buffer. This mostly happen when seeking in an unbuffered part or when
   * buffering.
   * @type {Number}
   */
  STALL_GAP: 0.5,

  /**
   * Maximum difference allowed between a segment _announced_ start (what the
   * rx-player infers to be the starting time) and its _real_  current starting
   * time in the source buffer, in seconds, until the segment is considered
   * "incomplete".
   * Same for the ending time announced and its effective end time in the source
   * buffer.
   *
   * If the difference is bigger than this value, the segment will be considered
   * incomplete (e.g. considered as partially garbage-collected) and as such
   * might be re-downloaded.
   *
   * Keeping a too high value might lead to incomplete segments being wrongly
   * considered as complete (and thus not be re-downloaded, this could lead the
   * player to stall).
   * Note that in a worst-case scenario this can happen for the end of a segment
   * and the start of the contiguous segment, leading to a discontinuity two
   * times this value.
   *
   * Keeping a too low value might lead to re-downloading the same segment
   * multiple times (when the start and end times are badly estimated) as they
   * will wrongly believed to be partially garbage-collected.
   *
   * If a segment has a perfect continuity with a previous/following one in the
   * source buffer the start/end of it will not be checked. This allows to limit
   * the number of time this error-prone logic is applied.
   *
   * Note that in most cases, the rx-player's start and end times estimations
   * are __really__ close to what they really are in the sourcebuffer (we
   * usually have a difference in the order of 10^-7), as time information is
   * most of the time directly parsed from the media container.
   *
   * @type {Number}
   */
  MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT: 0.12,

  /**
   * The maximum time, in seconds, the real buffered time in the sourcebuffer
   * can be superior to the time inferred by the rx-player (the "real" buffered
   * start inferior to the inferred start and the "real" buffered end superior
   * to the inferred end).
   * This limit allows to avoid resizing too much downloaded segments because
   * no other segment is linked to a buffered part.
   *
   * Setting a value too high can lead to parts of the source buffer being
   * linked to the wrong segments.
   * Setting a value too low can lead to parts of the source buffer not being
   * linked to the concerned segment.
   * @type {Number}
   */
  MAX_BUFFERED_DISTANCE: 0.1,

  /**
   * Minimum duration in seconds a segment should be into a buffered range to be
   * considered as part of that range.
   * Segments which have less than this amount of time "linked" to a buffered
   * range will be deleted.
   *
   * Setting a value too low can lead in worst-case scenarios to segments being
   * wrongly linked to the next or previous range it is truly linked too (if
   * those ranges are too close).
   *
   * Setting a value too high can lead to part of the buffer not being assigned
   * any segment. It also limits the minimum duration a segment can be.
   *
   * TODO As of now, this limits the minimum size a complete segment can be. A
   * better logic would be to also consider the duration of a segment. Though
   * this logic could lead to bugs with the current code.
   * @type {Number}
   */
  MINIMUM_SEGMENT_SIZE: 0.3,

  /**
   * Maximum interval at which text tracks are refreshed in an "html"
   * textTrackMode.
   *
   * The text tracks are also refreshed on various video events, this interval
   * will only trigger a refresh if none of those events was received during
   * that timespan.
   *
   * Note that if the TextTrack cue did not change between two intervals or
   * events, the DOM won't be refreshed.
   * The TextTrack cues structure is also optimized for fast retrieval.
   * We should thus not have much of a performance impact here if we set a low
   * interval.
   *
   * @type {Number}
   */
  MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL: 100,

  /**
   * Robustnesses used in the {audio,video}Capabilities of the
   * MediaKeySystemConfiguration (EME).
   *
   * Only used for widevine keysystems.
   *
   * Defined in order of importance (first will be tested first etc.)
   * @type {Array.<string>}
   */
  EME_DEFAULT_WIDEVINE_ROBUSTNESSES: [
    "HW_SECURE_ALL",
    "HW_SECURE_DECODE",
    "HW_SECURE_CRYPTO",
    "SW_SECURE_DECODE",
    "SW_SECURE_CRYPTO",
  ],

  /**
   * Link canonical key systems names to their respective reverse domain name,
   * used in the EME APIs.
   * This allows to have a simpler API, where users just need to set "widevine"
   * or "playready" as a keySystem.
   * @type {Object}
   */
  EME_KEY_SYSTEMS: {
    clearkey:  [
      "webkit-org.w3.clearkey",
      "org.w3.clearkey",
    ],
    widevine:  [
      "com.widevine.alpha",
    ],
    playready: [
      "com.microsoft.playready",
      "com.chromecast.playready",
      "com.youtube.playready",
    ],
  } as IDictionary<string[]>,
};
