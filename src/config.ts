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
 * Configuration file for the whole player.
 * Feel free to tweak those values if you know what you're doing.
 *
 * Please not that you will need to re-build the whole project to take these
 * modifications into account.
 *
 * @type {Object}
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
   * Default time interval after which a request will timeout, in ms.
   * @type {Number}
   */
  DEFAULT_REQUEST_TIMEOUT: 30 * 1000,

  /**
   * Can be either:
   *   - "native": Subtitles are all displayed in a <track> element
   *   - "html": Subtitles are all displayed in a <div> separated from the video
   *     element. Can be useful to display richer TTML subtitles, for example.
   * @type {Object|null}
   */
  DEFAULT_TEXT_TRACK_MODE: "native" as "native" |
                                       "html",

  /**
   * Strategy to adopt when manually setting the current bitrate.
   * Can be either:
   *   - "seamless": transitions are very smooth but not immediate.
   *   - "direct": the quality switch happens immediately but to achieve that,
   *     the player will need to set a new MediaSource on the media element in
   *     some cases. This often leads to a black screen + unavailable APIs
   *     during a short moment.
   * @type {string}
   */
  DEFAULT_MANUAL_BITRATE_SWITCHING_MODE: "seamless" as "seamless" |
                                                       "direct",

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

  /**
   * If set to true, the player will by default stop immediately and unload the
   * content on reaching the end of the media.
   *
   * If set to false, it will not unload nor stop by default, leaving the user
   * free to seek in the already-loaded content.
   *
   * Set to `true` for legacy reasons.
   * @type {Boolean}
   */
  DEFAULT_STOP_AT_END: true,

  /**
   * Default buffer goal in seconds.
   * Once enough content has been downloaded to fill the buffer up to
   * ``current position + DEFAULT_WANTED_BUFFER_AHEAD", we will stop downloading
   * content.
   * @type {Number}
   */
  DEFAULT_WANTED_BUFFER_AHEAD: 30,

  /**
   * Default max buffer size ahead of the current position in seconds.
   * The buffer _after_ this limit will be garbage collected.
   * Set to Infinity for no limit.
   * @type {Number}
   */
  DEFAULT_MAX_BUFFER_AHEAD: Infinity,

  /**
   * Default max buffer size ahead of the current position in seconds.
   * The buffer _before_ this limit will be garbage collected.
   * Set to Infinity for no limit.
   * @type {Number}
   */
  DEFAULT_MAX_BUFFER_BEHIND: Infinity,

  /* tslint:disable no-object-literal-type-assertion */
  /**
   * Maximum possible buffer ahead for each type of buffer, to avoid too much
   * memory usage when playing for a long time.
   * Equal to Infinity if not defined here.
   * @type {Object}
   */
  MAXIMUM_MAX_BUFFER_AHEAD: {
    text: 5 * 60 * 60,
  } as Partial<Record<"audio"|"video"|"image"|"text", number>>,
  /* tslint:enable no-object-literal-type-assertion */

  /* tslint:disable no-object-literal-type-assertion */
  /**
   * Maximum possible buffer behind for each type of buffer, to avoid too much
   * memory usage when playing for a long time.
   * Equal to Infinity if not defined here.
   * @type {Object}
   */
  MAXIMUM_MAX_BUFFER_BEHIND: {
    text: 5 * 60 * 60,
  } as Partial<Record<"audio"|"video"|"image"|"text", number>>,
  /* tslint:enable no-object-literal-type-assertion */

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

  /* tslint:disable no-object-literal-type-assertion */
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
  } as Record<"audio"|"video"|"other", number>,
  /* tslint:enable no-object-literal-type-assertion */

  /**
   * Delay after which, if the page is hidden, the user is considered inactive
   * on the current video.
   *
   * Allow to enforce specific optimizations when the page is not shown.
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
   * If true, if the video is considered in a "hidden" state for a delay specified by
   * the INACTIVITY DELAY config property, we throttle automatically to the video
   * representation with the lowest bitrate.
   * @type {Boolean}
   */
  DEFAULT_THROTTLE_VIDEO_BITRATE_WHEN_HIDDEN: false,

  /**
   * If true, the video representations you can switch to in adaptive mode
   * are limited by the video element's width.
   *
   * Basically in that case, we won't switch to a video Representation with
   * a width higher than the current width of the video HTMLElement.
   * @type {Boolean}
   */
  DEFAULT_LIMIT_VIDEO_WIDTH: false,

  /**
   * Default initial live gap considered if no presentation delay has been
   * suggested, in seconds.
   * @type {Number}
   */
  DEFAULT_LIVE_GAP: {
    DEFAULT: 10,
    LOW_LATENCY: 3,
  },

  /**
   * Maximum time, in seconds, the player should automatically skip when stalled
   * because of a discontinuity in the downloaded range.
   * @type {Number}
   */
  BUFFER_DISCONTINUITY_THRESHOLD: 1,

  /**
   * Ratio used to know if an already loaded segment should be re-buffered.
   * We re-load the given segment if the current one times that ratio is
   * inferior to the new one.
   * @type {Number}
   */
  BITRATE_REBUFFERING_RATIO: 1.5,

  /**
   * Those are used when a "QuotaExceededError" error is received after
   * appending a new segment in the SourceBuffer.
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
   * The default number of times a manifest request will be re-performed
   * when loaded/refreshed if the request finishes on an error which
   * justify an retry.
   *
   * Note that some errors do not use this counter:
   *   - if the error is not due to the xhr, no retry will be peformed
   *   - if the error is an HTTP error code, but not a 500-smthg or a 404, no
   *     retry will be performed.
   *   - if it has a high chance of being due to the user being offline, a
   *     separate counter is used (see DEFAULT_MAX_PIPELINES_RETRY_ON_OFFLINE).
   * @type Number
   */
  DEFAULT_MAX_MANIFEST_REQUEST_RETRY: 4,

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
  INITIAL_BACKOFF_DELAY_BASE: {
    REGULAR: 200,
    LOW_LATENCY: 50,
  },

  /**
   * Maximum backoff delay when a segment / manifest download fails, in
   * milliseconds.
   *
   * Please note that this delay is not exact, as it will be fuzzed.
   * @type {Number}
   */
  MAX_BACKOFF_DELAY_BASE: {
    REGULAR: 3000,
    LOW_LATENCY: 1000,
  },

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
   * Same than SAMPLING_INTERVAL_MEDIASOURCE but for lowLatency mode.
   * @type {Number}
   */
  SAMPLING_INTERVAL_LOW_LATENCY: 250,

  /**
   * Same than SAMPLING_INTERVAL_MEDIASOURCE but for the directfile API.
   * @type {Number}
   */
  SAMPLING_INTERVAL_NO_MEDIASOURCE: 500,

  /**
   * Minimum number of bytes sampled before we trust the estimate.
   * If we have not sampled much data, our estimate may not be accurate
   * enough to trust.
   * If the total of bytes sampled is less than this value, we use a
   * default estimate.
   * This specific value is based on experimentations.
   * @type {Number}
   */
  ABR_MINIMUM_TOTAL_BYTES: 150e3,

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
   * @type {Object}
   */
  ABR_STARVATION_FACTOR: {
    DEFAULT: 0.72,
    LOW_LATENCY: 0.64,
  },

  /**
   * Factor with which is multiplied the bandwidth estimate when the ABR is not
   * in starvation mode.
   * @type {Object}
   */
  ABR_REGULAR_FACTOR: {
    DEFAULT: 0.9,
    LOW_LATENCY: 0.9,
  },

  /**
   * If a SourceBuffer has less than ABR_STARVATION_GAP in seconds ahead of the
   * current position in its buffer, the ABR manager will go into starvation
   * mode.
   *
   * It gets out of starvation mode when the OUT_OF_STARVATION_GAP value is
   * reached.
   *
   * Under this starvation mode:
   *
   *   - the bandwidth considered will be a little lower than the one estimated
   *
   *   - the time the next important request take will be checked
   *     multiple times to detect when/if it takes too much time.
   *     If the request is considered too long, the bitrate will be hastily
   *     re-calculated from this single request.
   *
   * @type {Object}
   */
  ABR_STARVATION_GAP: {
    DEFAULT: 5,
    LOW_LATENCY: 5,
  },
  OUT_OF_STARVATION_GAP: {
    DEFAULT: 7,
    LOW_LATENCY: 7,
  },

  /**
   * This is a security to avoid going into starvation mode when the content is
   * ending (@see ABR_STARVATION_GAP).
   * Basically, we subtract that value from the global duration of the content
   * and we never enter "starvation mode" if the currently available buffer
   * (which equals to the current position + the available buffer ahead of it)
   * is equal or higher than this value.
   * @type {Number}
   */
  ABR_STARVATION_DURATION_DELTA: 0.1,

  /**
   * Half-life, in seconds for a fastly-evolving exponential weighted moving
   * average.
   * The lower it is, the faster the ABR logic will react to the bandwidth
   * falling quickly.
   * Should be kept to a lower number than ABR_SLOW_EMA for coherency reasons.
   * @type {Number}
   */
  ABR_FAST_EMA: 2,

  /**
   * Half-life, in seconds for a slowly-evolving exponential weighted moving
   * average.
   * The lower it is, the faster the ABR logic is going to react to recent
   * bandwidth variation, on the higher and on the lower side.
   * Should be kept to a higher number than ABR_FAST_EMA for coherency reasons.
   * @type {Number}
   */
  ABR_SLOW_EMA: 10,

  /**
   * Number of seconds ahead in the buffer after which playback will resume when
   * seeking on an unbuffered part of the content.
   * @type {Number}
   */
  RESUME_GAP_AFTER_SEEKING: {
    DEFAULT: 1.5,
    LOW_LATENCY: 0.5,
  },

  /**
   * Number of seconds ahead in the buffer after which playback will resume when
   * the player was stalled due to a low readyState.
   * @type {Number}
   */
  RESUME_GAP_AFTER_NOT_ENOUGH_DATA: {
    DEFAULT: 0.5,
    LOW_LATENCY: 0.5,
  },

  /**
   * Number of seconds ahead in the buffer after which playback will resume
   * after the player went through a buffering step.
   * @type {Number}
   */
  RESUME_GAP_AFTER_BUFFERING: {
    DEFAULT: 5,
    LOW_LATENCY: 0.5,
  },

  /**
   * Maximum number of seconds in the buffer based on which a "stalling"
   * strategy will be considered:
   * The player will pause playback to get enough time building a sufficient
   * buffer. This mostly happen when seeking in an unbuffered part or when
   * buffering.
   * @type {Number}
   */
  STALL_GAP: {
    DEFAULT: 0.5,
    LOW_LATENCY: 0.2,
  },

  /**
   * Maximum authorized difference between what we calculated to be the
   * beginning or end of the segment in the SourceBuffer and what we
   * actually are noticing now.
   *
   * If the segment seems to have removed more than this size in seconds, we
   * will infer that the segment has been garbage collected and we might try to
   * re-download it.
   * @type {Number}
   */
  MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT: 0.15,

  /**
   * The maximum authorized difference, in seconds, between the real buffered
   * time of a given chunk and what the segment information of the Manifest
   * tells us.
   *
   * Setting a value too high can lead to parts of the SourceBuffer being
   * linked to the wrong segments and to segments wrongly believed to be still
   * complete (instead of garbage collected).
   *
   * Setting a value too low can lead to parts of the SourceBuffer not being
   * linked to the concerned segment and to segments wrongly believed to be
   * partly garbage collected (instead of complete segments).
   * @type {Number}
   */
  MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE: 0.4,

  /**
   * The maximum authorized difference, in seconds, between the duration a
   * segment should have according to the Manifest and the actual duration it
   * seems to have once pushed to the SourceBuffer.
   *
   * Setting a value too high can lead to parts of the SourceBuffer being
   * linked to the wrong segments and to segments wrongly believed to be still
   * complete (instead of garbage collected).
   *
   * Setting a value too low can lead to parts of the SourceBuffer not being
   * linked to the concerned segment and to segments wrongly believed to be
   * partly garbage collected (instead of complete segments). This last point
   * could lead to unnecessary segment re-downloading.
   * @type {Number}
   */
  MAX_MANIFEST_BUFFERED_DURATION_DIFFERENCE: 0.3,

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
  MINIMUM_SEGMENT_SIZE: 0.005,

  /**
   * Append windows allow to filter media data from segments if they are outside
   * a given limit.
   * Coded frames with presentation timestamp within this range are allowed to
   * be appended to the SourceBuffer while coded frames outside this range are
   * filtered out.
   *
   * Those are often set to be the start and end of the "Period" the segment is
   * in.
   * However, we noticed that some browsers were too aggressive when the exact
   * limits were set: more data than needed was removed, often leading to
   * discontinuities.
   *
   * Those securities are added to the set windows (substracted from the window
   * start and added to the window end) to avoid those problems.
   * @type {Object}
   */
  APPEND_WINDOW_SECURITIES: {
    START: 0.2,
    END: 0.1,
  },

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
  MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL: 50,

  /**
   * On browsers with no ResizeObserver API, this will be the interval in
   * milliseconds at which we should check if the text track element has
   * changed its size, and updates proportional text-track data accordingly
   * (like a proportional font-size).
   *
   * This is only used:
   *   - in an "html" textTrackMode
   *   - when some styling is proportional in the text track data
   *
   * Putting a value too low will render faster but might use to much proc time.
   * Putting a value too high might provoke a re-render too late after the user
   * changed the element's size (e.g. when going to fullscreen mode).
   *
   * @type {Number}
   */
  TEXT_TRACK_SIZE_CHECKS_INTERVAL: 250,

  /**
   * The Buffer padding is a time offset from the current time that affects
   * the buffer.
   *
   * Basically, from a given time, if the current buffer gap number (time
   * between the current time and the end of the downloaded buffer) is above
   * the padding described here (of the corresponding type), we won't
   * reschedule segments for that range.
   *
   * This is to avoid excessive re-buffering.
   *
   * Keeping the padding too low would increase the risk of re-bufferings.
   *
   * Keeping the padding too high would delay visible quality increase.
   *
   * @type {Object}
   */
  BUFFER_PADDING: {
    audio: 1, // only "audio" segments
    video: 3, // only "video" segments
    other: 1, // tracks which are not audio/video (text images).
  },

  /**
   * Segments of different types are downloaded by steps:
   *
   *   - first the audio/video/text Segments which are immediately needed
   *
   *   - then once every of those Segments have been downloaded, less-needed
   *     Segments
   *
   *   - then once every of those less-needed Segments have been downloaded,
   *     even less-needed Segments
   *
   *   - etc.
   *
   * This stepped download strategy allows to make a better use of network
   * ressources.
   *
   * For example, if more than sufficient audio buffer has been downloaded but
   * the immediately-needed video Segment is still pending its request, we might
   * be in a situation of rebuffering.
   * In that case, a better strategy would be to make sure every network
   * ressource is allocated for this video Segment before rebuffering happens.
   *
   * This is where those steps become useful.
   *
   * --
   *
   * The numbers defined in this Array describe what the steps are.
   *
   * Each number is linked to a distance from the current playing position, in
   * seconds.
   * Distances which will be used as limit points, from which a new step is
   * reached (see example).
   *
   * Note: You can set an empty array to deactivate the steps feature (every
   * Segments have the same priority).
   *
   * @example
   *
   * let's imagine the following SEGMENT_PRIORITIES_STEPS array:
   * [5, 11, 17, 25]
   *
   * To link each Segments to a corresponding priority (and thus to a specific
   * step), we have to consider the distance d between the current position and
   * the start time of the Segment.
   *
   * We have in our example 5 groups, which correspond to the following possible
   * d values:
   *   1. inferior to 5
   *   2. between 5 and 11
   *   3. between 11 and 17
   *   4. between 17 and 25
   *   5. superior to 25
   *
   * Segments corresponding to a lower-step will need to all be downloaded
   * before Segments of a newer step begin.
   *
   * @type {Array.<Number>}
   */
  SEGMENT_PRIORITIES_STEPS : [6, 14],

  /**
   * Robustnesses used in the {audio,video}Capabilities of the
   * MediaKeySystemConfiguration (EME).
   *
   * Only used for widevine keysystems.
   *
   * Defined in order of importance (first will be tested first etc.)
   * @type {Array.<string>}
   */
  EME_DEFAULT_WIDEVINE_ROBUSTNESSES: [ "HW_SECURE_ALL",
                                       "HW_SECURE_DECODE",
                                       "HW_SECURE_CRYPTO",
                                       "SW_SECURE_DECODE",
                                       "SW_SECURE_CRYPTO" ],

  /**
   * Link canonical key systems names to their respective reverse domain name,
   * used in the EME APIs.
   * This allows to have a simpler API, where users just need to set "widevine"
   * or "playready" as a keySystem.
   * @type {Object}
   */
  /* tslint:disable no-object-literal-type-assertion */
  EME_KEY_SYSTEMS: {
    clearkey:  [ "webkit-org.w3.clearkey",
                 "org.w3.clearkey" ],
    widevine:  [ "com.widevine.alpha" ],
    playready: [ "com.microsoft.playready",
                 "com.chromecast.playready",
                 "com.youtube.playready" ],
  } as Partial<Record<string, string[]>>,
  /* tslint:enable no-object-literal-type-assertion */

  /**
   * When we detect that the local Manifest might be out-of-sync with the
   * server's one, we schedule a Manifest refresh.
   * However, as this "unsynchronization" is only a theory and as we do not want
   * to send too many Manifest requests, we keep a delay between the last
   * Manifest refresh done and that one.
   * This value indicates which delay we want. Note that the Manifest could
   * still be refreshed before this delay for other reasons.
   * @type {Number}
   */
  OUT_OF_SYNC_MANIFEST_REFRESH_DELAY: 3000,

  /**
   * When a partial Manifest update (that is an update with a partial sub-set
   * of the Manifest) fails, we will perform an update with the whole Manifest
   * instead.
   * To not overload the client - as parsing a Manifest can be resource heavy -
   * we set a minimum delay to wait before doing the corresponding request.
   * @type {Number}
   */
  FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY: 3000,

  /**
   * DASH Manifest based on a SegmentTimeline should normally have an
   * MPD@minimumUpdatePeriod attribute which should be sufficient to
   * know when to refresh it.
   * However, there is a specific case, for when it is equal to 0.
   * As of DASH-IF IOP (valid in v4.3), when a DASH's MPD set a
   * MPD@minimumUpdatePeriod to `0`, a client should not refresh the MPD
   * unless told to do so through inband events, in the stream.
   * In reality however, we found it to not always be the case (even with
   * DASH-IF own streams) and moreover to not always be the best thing to do.
   * We prefer to refresh in average at a regular interval when we do not have
   * this information.
   * /!\ This value is expressed in seconds.
   */
  DASH_FALLBACK_LIFETIME_WHEN_MINIMUM_UPDATE_PERIOD_EQUAL_0: 3,

  /**
   * Max simultaneous MediaKeySessions that will be kept as a cache to avoid
   * doing superfluous license requests.
   * If this number is reached, any new session creation will close the oldest
   * one.
   * @type {Number}
   */
  EME_MAX_SIMULTANEOUS_MEDIA_KEY_SESSIONS: 50,

  /**
   * The player relies on browser events and properties to update its status to
   * "ENDED".
   *
   * Sadly in some cases, like in Chrome 54, this event is never triggered on
   * some contents probably due to a browser bug.
   *
   * This threshold resolves this issue by forcing the status to "ENDED" when:
   *   1. the player is stalling
   *   2. the absolute difference between current playback time and duration is
   *      under this value
   *
   * If set to null, this workaround is disabled and the player only relies on
   * browser events.
   *
   * @type {Number|null}
   */
  FORCED_ENDED_THRESHOLD: 0.001,

  /**
   * Maximum duration from the current position we will let in the buffer when
   * switching an Adaptation of a given type.
   *
   * For example, if we have ``text: { before: 1, after: 4 }``, it means that
   * when switching subtitles, we will let 1 second before and 4 second after
   * the current position in the previous language (until the new segments
   * overwrite it).
   * This is to allow smooth transitions and avoid de-synchronization that
   * can happen when removing the content being decoded.
   * @type {Object}
   */
  ADAPTATION_SWITCH_BUFFER_PADDINGS: {
    video: { before: 0.5, after: 1 },
    audio: { before: 0.5, after: 2 },
    text: { before: 0, after: 0 }, // not managed natively, so no problem here
    image: { before: 0, after: 0 }, // not managed natively, so no problem here
  },

  /**
   * Interval, in milliseconds, at which we should manually flush
   * SourceBuffers.
   * Some browsers (happened with firefox 66) sometimes "forget" to send us
   * `update` or `updateend` events.
   * In that case, we're completely unable to continue the queue here and
   * stay locked in a waiting state.
   * This interval is here to check at regular intervals if the underlying
   * SourceBuffer is currently updating.
   * @type {Number}
   */
  SOURCE_BUFFER_FLUSHING_INTERVAL: 2000,

  /**
   * Padding under which we should not buffer from the current time, on
   * Safari. To avoid some buffer appending issues on it, we decide not
   * to load a segment if it may be pushed during playback time.
   * @type {Number} - in seconds
   */
  CONTENT_REPLACEMENT_PADDING: 2,
};
