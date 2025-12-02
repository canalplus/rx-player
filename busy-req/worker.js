"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

  // <define:__ENVIRONMENT__>
  var define_ENVIRONMENT_default = { PRODUCTION: 0, DEV: 1, CURRENT_ENV: 0 };

  // src/default_config.ts
  var DEFAULT_CONFIG = {
    /**
     * Default time interval after which a request will timeout, in ms.
     * @type {Number}
     */
    DEFAULT_REQUEST_TIMEOUT: 30 * 1e3,
    /**
     * Default connection time after which a request will timeout, in ms.
     * @type {Number}
     */
    DEFAULT_CONNECTION_TIMEOUT: 15 * 1e3,
    /**
     * Can be either:
     *   - "native": Subtitles are all displayed in a <track> element
     *   - "html": Subtitles are all displayed in a <div> separated from the video
     *     element. Can be useful to display richer TTML subtitles, for example.
     * @type {Object|null}
     */
    DEFAULT_TEXT_TRACK_MODE: "native",
    /**
     * Default behavior for the `enableFastSwitching` loadVideo options.
     *
     * Fast-switching allows to provide quicker transitions from lower quality
     * segments to higher quality segments but might be badly supported on some
     * devices.
     * When enabled, the RxPlayer might replace segments of a lower-quality
     * (with a lower bitrate) with segments of a higher quality (with a higher
     * bitrate). This allows to have a fast transition when network conditions
     * improve.
     * When disabled, segments of a lower-quality will not be replaced.
     */
    DEFAULT_ENABLE_FAST_SWITCHING: true,
    /**
     * In some cases after switching the current track or bitrate, the RxPlayer
     * could be led to go into the `"RELOADING"` state, which corresponds to
     * visually a black screen (with nothing audible) before restarting playback.
     *
     * We could want to seek back some milliseconds when doing that.
     * For example, when switching the current audio track, it might make sense
     * to restart some time before, so the beginning of the sentence can be heard
     * again in the new language.
     *
     * This config property allows to set the relative position the RxPlayer will
     * seek to after reloading, in seconds.
     *
     * For example: a value of `-0.7` means that will seek back 700 milliseconds
     * when reloading due to a track or bitrate switch with necessitated a
     * reloading.
     */
    DELTA_POSITION_AFTER_RELOAD: {
      /** Relative position when switching the bitrate */
      bitrateSwitch: -0.1,
      /**
       * Relative position when switching the track.
       *
       * From tests, I noticed that seeking back was only really "pleasant" when
       * switching the audio track.
       *
       * E.g. switching the video track often means changing the camera angle or
       * even totally changing what is being seen and rely much less on temporal
       * context than when an audio track is switched.
       * As such, I decided to only set a sensible seek-back behavior when
       * switching the audio track, and only a minimal one (to still ensure
       * nothing was missed) for video.
       *
       * "Other" mainly concern text track, where seeking back could even be
       * annoying, so that behavior has been disabled in that case.
       */
      trackSwitch: { audio: 0, video: 0, other: 0 }
    },
    /**
     * Behavior of the RxPlayer when encountering a whole other codec on a already
     * existing audio or video SourceBuffer.
     *
     * Can be either:
     *
     *    - "continue": Segments linked to the new codec will continue to be
     *      pushed to that same SourceBuffer. The RxPlayer will still try to call
     *      the `changeType` API on the SourceBuffer before pushing those
     *      segments but continue even if this call failed.
     *
     *    - "reload": Every time a new incompatible codec is encountered on a
     *      given SourceBuffer, we will reload the MediaSource.
     */
    DEFAULT_CODEC_SWITCHING_BEHAVIOR: "continue",
    /**
     * Specifies the behavior when all audio tracks are not playable.
     *
     * - If set to `"continue"`, the player will proceed to play the content without audio.
     * - If set to `"error"`, an error will be thrown to indicate that the audio tracks could not be played.
     *
     * Note: If neither the audio nor the video tracks are playable, an error will be thrown regardless of this setting.
     */
    DEFAULT_AUDIO_TRACKS_NOT_PLAYABLE_BEHAVIOR: "error",
    /**
     * Specifies the behavior when all video tracks are not playable.
     *
     * - If set to `"continue"`, the player will proceed to play the content without video.
     * - If set to `"error"`, an error will be thrown to indicate that the video tracks could not be played.
     *
     * Note: If neither the audio nor the video tracks are playable, an error will be thrown regardless of this setting.
     */
    DEFAULT_VIDEO_TRACKS_NOT_PLAYABLE_BEHAVIOR: "error",
    /**
     * If set to true, video through loadVideo will auto play by default
     * @type {Boolean}
     */
    DEFAULT_AUTO_PLAY: false,
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
    /**
     * Default video buffer memory limit in kilobytes.
     * Once enough video content has been downloaded to fill the buffer up to
     * DEFAULT_MAX_VIDEO_BUFFER_SIZE , we will stop downloading
     * content.
     * @type {Number}
     */
    DEFAULT_MAX_VIDEO_BUFFER_SIZE: Infinity,
    /**
     * Maximum possible buffer ahead for each type of buffer, to avoid too much
     * memory usage when playing for a long time.
     * Equal to Infinity if not defined here.
     * @type {Object}
     */
    MAXIMUM_MAX_BUFFER_AHEAD: {
      text: 5 * 60 * 60
    },
    /**
     * Minimum possible buffer ahead for each type of buffer, to avoid Garbage
     * Collecting too much data when it would have adverse effects.
     * Equal to `0` if not defined here.
     * @type {Object}
     */
    MINIMUM_MAX_BUFFER_AHEAD: {
      // Text segments are both much lighter on resources and might
      // actually be much larger than other types of segments in terms
      // of duration. Let's make an exception here by authorizing a
      // larger text buffer ahead, to avoid unnecesarily reloading the
      // same text track.
      text: 2 * 60
    },
    /**
     * Maximum possible buffer behind for each type of buffer, to avoid too much
     * memory usage when playing for a long time.
     * Equal to Infinity if not defined here.
     * @type {Object}
     */
    MAXIMUM_MAX_BUFFER_BEHIND: {
      text: 5 * 60 * 60
    },
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
    DEFAULT_BASE_BANDWIDTH: 0,
    /**
     * Delay after which, if the page is hidden, the user is considered inactive
     * on the current video.
     *
     * Allow to enforce specific optimizations when the page is not shown.
     * @see DEFAULT_THROTTLE_WHEN_HIDDEN
     * @type {Number}
     */
    INACTIVITY_DELAY: 60 * 1e3,
    /**
     * If true, if the video is considered in a "hidden" state for a delay specified by
     * the INACTIVITY DELAY config property, we throttle automatically to the video
     * representation with the lowest bitrate.
     * @type {Boolean}
     */
    DEFAULT_THROTTLE_VIDEO_BITRATE_WHEN_HIDDEN: false,
    /**
     * Default video resolution limit behavior.
     *
     * This option allows for example to throttle the video resolution so it
     * does not exceed the screen resolution.
     *
     * Here set to "none" by default to disable throttling.
     * @type {Boolean}
     */
    DEFAULT_VIDEO_RESOLUTION_LIMIT: "none",
    /**
     * Default initial live gap considered if no presentation delay has been
     * suggested, in seconds.
     * @type {Number}
     */
    DEFAULT_LIVE_GAP: {
      DEFAULT: 10,
      LOW_LATENCY: 3.5
    },
    /**
     * Maximum time, in seconds, the player should automatically skip when stalled
     * because of a current hole in the buffer.
     * Bear in mind that this might seek over not-yet-downloaded/pushed segments.
     * @type {Number}
     */
    BUFFER_DISCONTINUITY_THRESHOLD: 0.2,
    /**
     * Ratio used to know if an already loaded segment should be re-buffered.
     * We re-load the given segment if the current one times that ratio is
     * inferior to the new one.
     * @type {Number}
     */
    BITRATE_REBUFFERING_RATIO: 1.5,
    /**
     * The default number of times a manifest request will be re-performed
     * when loaded/refreshed if the request finishes on an error which
     * justify an retry.
     *
     * Note that some errors do not use this counter:
     *   - if the error is not due to the xhr, no retry will be peformed
     *   - if the error is an HTTP error code, but not a 500-smthg or a 404, no
     *     retry will be performed.
     * @type Number
     */
    DEFAULT_MAX_MANIFEST_REQUEST_RETRY: 4,
    /**
     * Default delay, in seconds, during which a CDN will be "downgraded".
     *
     * For example in case of media content being available on multiple CDNs, the
     * RxPlayer may decide that a CDN is less reliable (for example, it returned a
     * server error) and should thus be avoided, at least for some time
     *
     * This value is the amount of time this CDN will be "less considered" than the
     * alternatives.
     */
    DEFAULT_CDN_DOWNGRADE_TIME: 60,
    /**
     * The default number of times a segment request will be re-performed when
     * on error which justify a retry.
     *
     * Note that some errors do not use this counter:
     *   - if the error is not due to the xhr, no retry will be peformed
     *   - if the error is an HTTP error code, but not a 500-smthg or a 404, no
     *     retry will be performed.
     * @type Number
     */
    DEFAULT_MAX_REQUESTS_RETRY_ON_ERROR: 4,
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
      LOW_LATENCY: 50
    },
    /**
     * Maximum backoff delay when a segment / manifest download fails, in
     * milliseconds.
     *
     * Please note that this delay is not exact, as it will be fuzzed.
     * @type {Number}
     */
    MAX_BACKOFF_DELAY_BASE: {
      REGULAR: 3e3,
      LOW_LATENCY: 1e3
    },
    /**
     * Minimum interval at which playback information samples will be taken. This
     * variable is for the "regular" mediasource strategy (that is, not for the
     * directfile API.
     *
     * At each of these interval, various different modules in the RxPlayer will
     * run based on the information communicated.
     *
     * Keep in mind this is the minimum interval. This logic will also be
     * triggered when various events of the media element are received.
     * @type {Number}
     */
    SAMPLING_INTERVAL_MEDIASOURCE: 1e3,
    /**
     * Same than SAMPLING_INTERVAL_MEDIASOURCE but for lowLatency mode.
     * @type {Number}
     */
    SAMPLING_INTERVAL_LOW_LATENCY: 500,
    /**
     * Same than SAMPLING_INTERVAL_MEDIASOURCE but for the directfile API.
     * @type {Number}
     */
    SAMPLING_INTERVAL_NO_MEDIASOURCE: 500,
    /**
     * Amount of buffer to have ahead of the current position before we may
     * consider buffer-based adaptive estimates, in seconds.
     *
     * For example setting it to `10` means that we need to have ten seconds of
     * buffer ahead of the current position before relying on buffer-based
     * adaptive estimates.
     *
     * To avoid getting in-and-out of the buffer-based logic all the time, it
     * should be set higher than `ABR_EXIT_BUFFER_BASED_ALGO`.
     */
    ABR_ENTER_BUFFER_BASED_ALGO: 10,
    /**
     * Below this amount of buffer ahead of the current position, in seconds, we
     * will stop using buffer-based estimate in our adaptive logic to select a
     * quality.
     *
     * For example setting it to `5` means that if we have less than 5 seconds of
     * buffer ahead of the current position, we should stop relying on
     * buffer-based estimates to choose a quality.
     *
     * To avoid getting in-and-out of the buffer-based logic all the time, it
     * should be set lower than `ABR_ENTER_BUFFER_BASED_ALGO`.
     */
    ABR_EXIT_BUFFER_BASED_ALGO: 5,
    /**
     * Minimum number of bytes sampled before we trust the estimate.
     * If we have not sampled much data, our estimate may not be accurate
     * enough to trust.
     * If the total of bytes sampled is less than this value, we use a
     * default estimate.
     * This specific value is based on experimentations.
     * @type {Number}
     */
    ABR_MINIMUM_TOTAL_BYTES: 15e4,
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
      LOW_LATENCY: 0.72
    },
    /**
     * Factor with which is multiplied the bandwidth estimate when the ABR is not
     * in starvation mode.
     * @type {Object}
     */
    ABR_REGULAR_FACTOR: {
      DEFAULT: 0.72,
      LOW_LATENCY: 0.72
    },
    /**
     * If a media buffer has less than ABR_STARVATION_GAP in seconds ahead of the
     * current position in its buffer, the adaptive logic will go into starvation
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
      LOW_LATENCY: 5
    },
    OUT_OF_STARVATION_GAP: {
      DEFAULT: 7,
      LOW_LATENCY: 7
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
      LOW_LATENCY: 0.5
    },
    /**
     * Number of seconds ahead in the buffer after which playback will resume when
     * the player was rebuffering due to a low readyState.
     * @type {Number}
     */
    RESUME_GAP_AFTER_NOT_ENOUGH_DATA: {
      DEFAULT: 0.5,
      LOW_LATENCY: 0.5
    },
    /**
     * Number of seconds ahead in the buffer after which playback will resume
     * after the player went through a buffering step.
     * @type {Number}
     */
    RESUME_GAP_AFTER_BUFFERING: {
      DEFAULT: 5,
      LOW_LATENCY: 0.5
    },
    /**
     * Maximum number of seconds in the buffer based on which a "rebuffering"
     * strategy will be considered:
     * The player will pause playback to get enough time building a sufficient
     * buffer. This mostly happen when seeking in an unbuffered part or when not
     * enough buffer is ahead of the current position.
     * @type {Number}
     */
    REBUFFERING_GAP: {
      DEFAULT: 0.5,
      LOW_LATENCY: 0.2
    },
    /**
     * Amount of time (in seconds) with data ahead of the current position, at
     * which we always consider the browser to be able to play.
     *
     * If the media element has this amount of data in advance or more but
     * playback cannot begin, the player will consider it "freezing".
     */
    MINIMUM_BUFFER_AMOUNT_BEFORE_FREEZING: 2,
    /**
     * A media whose position inexplicably does not increment despite playing is
     * called as "freezing" in the RxPlayer.
     *
     * If the media is still "freezing" after waiting for `UNFREEZING_SEEK_DELAY`
     * milliseconds, the RxPlayer will try to un-freeze the situation by interacting
     * with the media element.
     *
     * Those interactions can be costly in time before playback continue, so it
     * should be set at a sufficiently high value to avoid false positives.
     */
    UNFREEZING_SEEK_DELAY: 6e3,
    /**
     * A media whose position inexplicably does not increment despite playing is
     * called as "freezing" in the RxPlayer.
     *
     * A small freezing interval may be normal as the browser may take time before
     * playing, e.g. after a seek.
     *
     * If the media is still "freezing" after waiting for `FREEZING_STALLED_DELAY`
     * milliseconds, the RxPlayer will emit a BUFFERING state through its API to
     * notify that the player cannot currently advance.
     */
    FREEZING_STALLED_DELAY: 600,
    /**
     * A media whose position inexplicably does not increment despite playing is
     * called as "freezing" in the RxPlayer.
     *
     * If the media is frozen for a sufficiently large time
     * (@see UNFREEZING_SEEK_DELAY), the RxPlayer will perform a seek corresponding
     * to its current position plus `UNFREEZING_DELTA_POSITION` seconds.
     *
     * This should be kept short enough as the goal is just to un-freeze lower-level
     * buffers.
     */
    UNFREEZING_DELTA_POSITION: 1e-3,
    /**
     * `FREEZING` is a situation where the playback does not seem to advance despite
     * all web indicators telling us we can.
     * Those may be linked to device issues, but sometimes are just linked to
     * performance or it may be just decryption negotiations taking more time than
     * expected.
     *
     * Anyway we might in the RxPlayer "flush" the buffer in that situation to
     * un-stuck playback (this is usually done by seeking close to the current
     * position),
     *
     * Yet that "flush" attempt may not in the end be succesful.
     *
     * If a flush was performed more than `FREEZING_FLUSH_FAILURE_DELAY.MINIMUM`
     * milliseconds ago and less than `FREEZING_FLUSH_FAILURE_DELAY.MAXIMUM`
     * milliseconds ago, yet a `FREEZING` situation at roughly the same playback
     * position (deviating from less than
     * `FREEZING_FLUSH_FAILURE_DELAY.POSITION_DELTA` seconds from it) is
     * encountered again, we will consider that the flushing attempt was unsuccesful
     * and try more agressive solutions (such as reloading the content).
     */
    FREEZING_FLUSH_FAILURE_DELAY: {
      MAXIMUM: 2e4,
      MINIMUM: 4e3,
      POSITION_DELTA: 1
    },
    /**
     * The RxPlayer has a recurring logic which will synchronize the browser's
     * buffers' buffered time ranges with its internal representation in the
     * RxPlayer to then rely on that internal representation to determine where
     * segments are technically present in the browser's buffer.
     *
     * We found out that when inserting a new segment to the buffer, the browser
     * may actually take time before actually considering the full segment in its
     * advertised buffered time ranges.
     *
     * This value thus set an amount of milliseconds we might want to wait before
     * being sure that the buffered time ranges should have considered a segment
     * that has been pushed.
     */
    SEGMENT_SYNCHRONIZATION_DELAY: 1500,
    /**
     * The `SEGMENT_SYNCHRONIZATION_DELAY` defined in this same configuration
     * object only needs to be used if it appears that the current buffered
     * time ranges do not reflect the full data of a pushed segment yet.
     *
     * The `MISSING_DATA_TRIGGER_SYNC_DELAY` value thus allows to define a
     * minimum time difference in seconds between what's buffered and what the
     * segment's ranges should have been, from which we might consider that we may
     * want to wait the `SEGMENT_SYNCHRONIZATION_DELAY` before trusting the buffered
     * time ranges for that segment.
     * If what's missing from that segment is however less than that value in
     * seconds, we can begin to trust the reported buffered time ranges.
     *
     * Should generally be inferior to `MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT`.
     */
    MISSING_DATA_TRIGGER_SYNC_DELAY: 0.1,
    /**
     * Maximum authorized difference between what we calculated to be the
     * beginning or end of the segment in a media buffer and what we
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
     * Setting a value too high can lead to parts of the media buffer being
     * linked to the wrong segments and to segments wrongly believed to be still
     * complete (instead of garbage collected).
     *
     * Setting a value too low can lead to parts of the media buffer not being
     * linked to the concerned segment and to segments wrongly believed to be
     * partly garbage collected (instead of complete segments).
     * @type {Number}
     */
    MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE: 0.4,
    /**
     * The maximum authorized difference, in seconds, between the duration a
     * segment should have according to the Manifest and the actual duration it
     * seems to have once pushed to the media buffer.
     *
     * Setting a value too high can lead to parts of the media buffer being
     * linked to the wrong segments and to segments wrongly believed to be still
     * complete (instead of garbage collected).
     *
     * Setting a value too low can lead to parts of the media buffer not being
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
    MINIMUM_SEGMENT_SIZE: 1e-3,
    /**
     * Append windows allow to filter media data from segments if they are outside
     * a given limit.
     * Coded frames with presentation timestamp within this range are allowed to
     * be appended to the media buffer while coded frames outside this range are
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
      END: 0.1
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
      audio: 1,
      // only "audio" segments
      video: 3,
      // only "video" segments
      other: 1
      // tracks which are not audio/video (like text).
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
     * In the RxPlayer's code, each step is then translated in to a priority
     * number.
     * The lower is that number, the lower is the step and the lower is the step,
     * the higher is the priority.
     *
     * Note: You can set an empty array to deactivate the steps feature (every
     * Segments have the same priority).
     *
     * @example
     *
     * let's imagine the following SEGMENT_PRIORITIES_STEPS array:
     * [5, 11, 17, 25]
     *
     * To link each Segments to a corresponding priority number (and thus to a
     * specific step), we have to consider the distance between the current
     * position and the start time of the Segment.
     *
     * We have in our example 5 groups, which correspond to the following possible
     * distances:
     *   1. inferior to 5 => first step (priority number = 0)
     *   2. between 5 and 11 => second step (priority number = 1)
     *   3. between 11 and 17 => third step (priority number = 2)
     *   4. between 17 and 25 => fourth step (priority number = 3)
     *   5. superior to 25 => fifth step (priority number = 4)
     *
     * Segments corresponding to a lower-step will need to all be downloaded
     * before Segments of a newer step begin.
     *
     * @type {Array.<Number>}
     */
    SEGMENT_PRIORITIES_STEPS: [
      2,
      // 1st Step (priority number = 0):  < 2
      4,
      // 2nd Step (priority number = 1):  2-4
      8,
      // 3rd Step (priority number = 2):  4-8
      12,
      // 4th Step (priority number = 3):  8-12
      18,
      // 5th Step (priority number = 4):  12-18
      25
    ],
    // 6th Step (priority number = 5):  18-25
    // 7th Step (priority number = 6):  >= 25
    /**
     * Some segment requests are said to be "high priority".
     *
     * Requests in that category once done will cancel any segment request that
     * has a low priority number (see `SEGMENT_PRIORITIES_STEPS`) - meaning a
     * priority number equal to `MIN_CANCELABLE_PRIORITY` or more.
     *
     * Enter here the last priority number that is considered high priority
     * (beginning by the first step, which has the priority number `0`).
     * @type {number}
     */
    MAX_HIGH_PRIORITY_LEVEL: 1,
    // priority number 1 and lower is high priority
    /**
     * Enter here the first priority step (see `SEGMENT_PRIORITIES_STEPS`) that
     * will be considered as low priority.
     *
     * Segment requests with a low priority will be cancelled if a high priority
     * segment request (see MAX_HIGH_PRIORITY_LEVEL) is scheduled while they are
     * pending.
     *
     * This number should be strictly superior to the value indicated in
     * `MAX_HIGH_PRIORITY_LEVEL`.
     * @type {number}
     */
    MIN_CANCELABLE_PRIORITY: 3,
    // priority number 3 onward can be cancelled
    /**
     * Codecs used in the videoCapabilities of the MediaKeySystemConfiguration
     * (DRM).
     *
     * Defined in order of importance (first will be tested first etc.)
     * @type {Array.<string>}
     */
    EME_DEFAULT_VIDEO_CODECS: [
      'video/mp4;codecs="avc1.4d401e"',
      'video/mp4;codecs="avc1.42e01e"',
      'video/mp4;codecs="hvc1.1.6.L93.B0"',
      'video/webm;codecs="vp8"'
    ],
    /**
     * Codecs used in the audioCapabilities of the MediaKeySystemConfiguration
     * (DRM).
     *
     * Defined in order of importance (first will be tested first etc.)
     * @type {Array.<string>}
     */
    EME_DEFAULT_AUDIO_CODECS: [
      'audio/mp4;codecs="mp4a.40.2"',
      'audio/webm;codecs="opus"',
      'audio/mp4;codecs="ec-3"'
    ],
    /**
     * Robustnesses used in the {audio,video}Capabilities of the
     * MediaKeySystemConfiguration (DRM).
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
      "SW_SECURE_CRYPTO"
    ],
    /**
     * Robustnesses used in the {audio,video}Capabilities of the
     * MediaKeySystemConfiguration (DRM).
     *
     * Only used for "com.microsoft.playready.recommendation" keysystems.
     *
     * Defined in order of importance (first will be tested first etc.)
     * @type {Array.<string>}
     */
    EME_DEFAULT_PLAYREADY_RECOMMENDATION_ROBUSTNESSES: ["3000", "2000"],
    /**
     * Link canonical key systems names to their respective reverse domain name,
     * used in the EME APIs.
     * This allows to have a simpler API, where users just need to set "widevine"
     * or "playready" as a keySystem.
     * @type {Object}
     */
    EME_KEY_SYSTEMS: {
      clearkey: ["webkit-org.w3.clearkey", "org.w3.clearkey"],
      widevine: ["com.widevine.alpha"],
      playready: [
        "com.microsoft.playready.recommendation",
        "com.microsoft.playready",
        "com.chromecast.playready",
        "com.youtube.playready"
      ],
      fairplay: ["com.apple.fps.1_0"]
    },
    /**
     * The Manifest parsing logic has a notion of "unsafeMode" which allows to
     * speed-up this process a lot with a small risk of de-synchronization with
     * what actually is on the server.
     * Because using that mode is risky, and can lead to all sort of problems, we
     * regularly should fall back to a regular "safe" parsing every once in a
     * while.
     * This value defines how many consecutive time maximum the "unsafeMode"
     * parsing can be done.
     */
    MAX_CONSECUTIVE_MANIFEST_PARSING_IN_UNSAFE_MODE: 10,
    /**
     * Minimum time spent parsing the Manifest before we can authorize parsing
     * it in an "unsafeMode", to speed-up the process with a little risk.
     * Please note that this parsing time also sometimes includes idle time such
     * as when the parser is waiting for a request to finish.
     */
    MIN_MANIFEST_PARSING_TIME_TO_ENTER_UNSAFE_MODE: 200,
    /**
     * Minimum amount of <S> elements in a DASH MPD's <SegmentTimeline> element
     * necessary to begin parsing the current SegmentTimeline element in an
     * unsafe manner (meaning: with risks of de-synchronization).
     * This is only done when the "unsafeMode" parsing mode is enabled.
     */
    MIN_DASH_S_ELEMENTS_TO_PARSE_UNSAFELY: 300,
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
    OUT_OF_SYNC_MANIFEST_REFRESH_DELAY: 3e3,
    /**
     * When a partial Manifest update (that is an update with a partial sub-set
     * of the Manifest) fails, we will perform an update with the whole Manifest
     * instead.
     * To not overload the client - as parsing a Manifest can be resource heavy -
     * we set a minimum delay to wait before doing the corresponding request.
     * @type {Number}
     */
    FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY: 3e3,
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
     * Default value for the maximum number of simultaneous MediaKeySessions that
     * will be kept in a cache (linked to the MediaKeys instance) to avoid doing
     * superfluous license requests.
     *
     * If this number is reached, any new session creation will close the oldest
     * one.
     * Another value can be configured through the API, in which case this default
     * will be overwritten.
     * @type {Number}
     */
    EME_DEFAULT_MAX_SIMULTANEOUS_MEDIA_KEY_SESSIONS: 15,
    /**
     * When playing contents with a persistent license, we will usually store some
     * information related to that MediaKeySession, to be able to play it at a
     * later time.
     *
     * Those information are removed once a MediaKeySession is not considered
     * as "usable" anymore. But to know that, the RxPlayer has to load it.
     *
     * But the RxPlayer does not re-load every persisted MediaKeySession every
     * time to check each one of them one by one, as this would not be a
     * performant thing to do.
     *
     * So this is only done when and if the corresponding content is encountered
     * again and only if it contains the same initialization data.
     *
     * We have to consider that those "information" contain binary data which can
     * be of arbitrary length. Size taken by an array of them can relatively
     * rapidly take a lot of space in JS memory.
     *
     * So to avoid this storage to take too much space (would it be in the chosen
     * browser's storage or in JS memory), we now set a higher bound for the
     * amount of MediaKeySession information that can be stored at the same time.
     *
     * I set the value of 1000 here, as it seems big enough to not be considered a
     * problem (though it can become one, when contents have a lot of keys per
     * content), and still low enough so it should not cause much problem (my
     * method to choose that number was to work with power of 10s and choosing the
     * amount which seemed the most sensible one).
     *
     * This wasn't battle-tested however.
     */
    EME_MAX_STORED_PERSISTENT_SESSION_INFORMATION: 1e3,
    /**
     * After loading a persistent MediaKeySession, the RxPlayer needs to ensure
     * that its keys still allow to decrypt a content.
     *
     * However on some browsers, the `keyStatuses` property that we used to check
     * the keys' satuses linked to that session can be empty for some time after
     * the loading operation is done.
     *
     * This value allows to configure a delay in milliseconds that will be the
     * maximum time we will wait after a persistent session is loaded.
     * If after that time, the `keyStatuses` property is still empty, we will
     * consider that session as not usable.
     */
    EME_WAITING_DELAY_LOADED_SESSION_EMPTY_KEYSTATUSES: 100,
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
    FORCED_ENDED_THRESHOLD: 8e-4,
    /**
     * Maximum duration from the current position we will let in the buffer when
     * switching an Adaptation/Representations of a given type.
     *
     * For example, if we have ``text: { before: 1, after: 4 }``, it means that
     * when switching subtitles, we will let 1 second before and 4 second after
     * the current position in the previous language (until the new segments
     * overwrite it).
     * This is to allow smooth transitions and avoid de-synchronization that
     * can happen when removing the content being decoded.
     * @type {Object}
     */
    ADAP_REP_SWITCH_BUFFER_PADDINGS: {
      video: { before: 5, after: 5 },
      audio: { before: 2, after: 2.5 },
      text: { before: 0, after: 0 }
      // not managed natively, so no problem here
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
    SOURCE_BUFFER_FLUSHING_INTERVAL: 500,
    /**
     * Any already-pushed segment starting before or at the current position +
     * CONTENT_REPLACEMENT_PADDING won't be replaced by new segments.
     *
     * This allows to avoid overwriting segments that are currently being decoded
     * as we encountered many decoding issues when doing so.
     * @type {Number} - in seconds
     */
    CONTENT_REPLACEMENT_PADDING: 1.2,
    /**
     * For video and audio segments, determines two thresholds below which :
     * - The segment is considered as loaded from cache
     * - The segment may be loaded from cache depending on the previous request
     */
    CACHE_LOAD_DURATION_THRESHOLDS: {
      video: 50,
      audio: 10
    },
    /** Interval we will use to poll for checking if an event shall be emitted */
    STREAM_EVENT_EMITTER_POLL_INTERVAL: 250,
    /**
     * In Javascript, numbers are encoded in a way that a floating number may be
     * represented internally with a rounding error. When multiplying times in
     * seconds by the timescale, we've encoutered cases were the rounding error
     * was amplified by a factor which is about the timescale.
     * Example :
     * (192797480.641122).toFixed(20) = 192797480.64112201333045959473
     * (error is 0.0000000133...)
     * 192797480.641122 * 10000000 = 1927974806411220.2 (error is 0.2)
     * 192797480.641122 * 10000000 * 4 = 7711899225644881 (error is 1)
     * The error is much more significant here, once the timescale has been
     * applied.
     * Thus, we consider that our max tolerable rounding error is 1ms.
     * It is much more than max rounding errors when seen into practice,
     * and not significant from the media loss perspective.
     */
    DEFAULT_MAXIMUM_TIME_ROUNDING_ERROR: 1 / 1e3,
    /**
     * RxPlayer's media buffers have a linked history registering recent events
     * that happened on those.
     * The reason is to implement various heuristics in case of weird browser
     * behavior.
     *
     * The `BUFFERED_HISTORY_RETENTION_TIME` is the minimum age an entry of
     * that history can have before being removed from the history.
     */
    BUFFERED_HISTORY_RETENTION_TIME: 6e4,
    /**
     * RxPlayer's media buffers have a linked history registering recent events
     * that happened on those.
     * The reason is to implement various heuristics in case of weird browser
     * behavior.
     *
     * The `BUFFERED_HISTORY_RETENTION_TIME` is the maximum number of entries
     * there can be in that history.
     */
    BUFFERED_HISTORY_MAXIMUM_ENTRIES: 200,
    /**
     * Minimum buffer in seconds ahead relative to current time
     * we should be able to download, even in cases of saturated memory.
     */
    MIN_BUFFER_AHEAD: 5,
    /**
     * Distance in seconds behind the current position
     * the player will free up to in the case we agressively free up memory
     * It is set to avoid playback issues
     */
    UPTO_CURRENT_POSITION_CLEANUP: 5,
    /**
     * Default "switching mode" used when locking video Representations.
     * That is, which behavior the RxPlayer should have by default when
     * explicitely and manually switching from a previous set of video
     * Representations to a new one.
     */
    DEFAULT_VIDEO_REPRESENTATIONS_SWITCHING_MODE: "seamless",
    /**
     * Default "switching mode" used when locking audio Representations.
     * That is, which behavior the RxPlayer should have by default when
     * explicitely and manually switching from a previous set of audio
     * Representations to a new one.
     */
    DEFAULT_AUDIO_REPRESENTATIONS_SWITCHING_MODE: "seamless",
    /**
     * Default "switching mode" used when switching between video tracks.
     * That is, which behavior the RxPlayer should have by default when
     * explicitely and manually switching from a previous video track to a new
     * one.
     */
    DEFAULT_VIDEO_TRACK_SWITCHING_MODE: "reload",
    /**
     * Default "switching mode" used when switching between audio tracks.
     * That is, which behavior the RxPlayer should have by default when
     * explicitely and manually switching from a previous audio track to a new
     * one.
     */
    DEFAULT_AUDIO_TRACK_SWITCHING_MODE: "seamless",
    /**
     * The default number of times a thumbnail request will be re-performed when
     * on error which justify a retry.
     *
     * Note that some errors do not use this counter:
     *   - if the error is not due to the xhr, no retry will be peformed
     *   - if the error is an HTTP error code, but not a 500-smthg or a 404, no
     *     retry will be performed.
     * @type Number
     */
    DEFAULT_MAX_THUMBNAIL_REQUESTS_RETRY_ON_ERROR: 1,
    /**
     * Default time interval after which a thumbnail request will timeout, in ms.
     * @type {Number}
     */
    DEFAULT_THUMBNAIL_REQUEST_TIMEOUT: 10 * 1e3,
    /**
     * Default connection time after which a thumbnail request conncection will
     * timeout, in ms.
     * @type {Number}
     */
    DEFAULT_THUMBNAIL_CONNECTION_TIMEOUT: 7 * 1e3,
    // Compatibility toggles:
    /**
     * If set to `true`, we'll always try to check thoroughly that a
     * `MediaKeySystemAccess` can be relied on.
     */
    FORCE_CANNOT_RELY_ON_REQUEST_MEDIA_KEY_SYSTEM_ACCESS: false,
    /**
     * If set to `true`, we'll always re-create a `MediaKeys` instance for each
     * encrypted content where we need one.
     */
    FORCE_CANNOT_REUSE_MEDIA_KEYS: false,
    /**
     * If set to `true`, force work-around for devices which have issues with
     * `MediaSource` objects with a high `duration` property.
     */
    FORCE_HAS_ISSUES_WITH_HIGH_MEDIA_SOURCE_DURATION: false,
    /**
     * If set to `true`, the device might seek before what we actually tell it to,
     * breaking other RxPlayer behaviors in the process.
     * Setting it to `true` allows to enable work-arounds.
     */
    FORCE_IS_SEEKING_APPROXIMATE: false,
    /**
     * If set to `true`, the device might fail directly after uncountering
     * decipherable data.
     */
    FORCE_MEDIA_ELEMENT_FAIL_ON_UNDECIPHERABLE_DATA: false,
    /**
     * If set to `true` we'll await a `MediaKeys` attachment on a given
     * `HTMLMediaElement` before trying to set a new one.
     */
    FORCE_SHOULD_AWAIT_SET_MEDIA_KEYS: false,
    /** If set to `true` we'll rely on Safari's Webkit flavor of the EME API. */
    FORCE_SHOULD_FAVOUR_CUSTOM_SAFARI_EME: false,
    /**
     * If `true`, we'll reload if unencrypted data is encountered close to
     * the current position.
     */
    FORCE_SHOULD_RELOAD_MEDIA_SOURCE_ON_DECIPHERABILITY_UPDATE: false,
    /** If `true`, we'll for each content re-create a `MediaKeySystemAccess`. */
    FORCE_SHOULD_RENEW_MEDIA_KEY_SYSTEM_ACCESS: false,
    /** If `true`, we'll unset the `MediaKeys` at each stop. */
    FORCE_SHOULD_UNSET_MEDIA_KEYS: false,
    /**
     * If `true`, we cannot trust that a `loadedmetadata` event from the
     * `HTMLMediaElement` is sent after the browser has parsed key metadata such
     * as the content's duration.
     */
    FORCE_SHOULD_VALIDATE_METADATA: false,
    /**
     * If `true`, we have to announce the content as loaded even if no data is
     * actually loaded, because that target do not preload, meaning a `play` call
     * is required.
     */
    FORCE_DONT_WAIT_FOR_DATA_BEFORE_LOADED: false,
    /**
     * If `true`, we have to wait for the `HAVE_ENOUGH_DATA` `readyState` before
     * announcing the content as loaded.
     */
    FORCE_WAIT_FOR_HAVE_ENOUGH_DATA: false
  };
  var default_config_default = DEFAULT_CONFIG;
  function checkIsSerializable(_conf) {
  }
  checkIsSerializable(DEFAULT_CONFIG);

  // src/utils/object_assign.ts
  function objectAssign(target, ...sources) {
    if (target === null || target === void 0) {
      throw new TypeError("Cannot convert undefined or null to object");
    }
    const to = Object(target);
    for (const source of sources) {
      for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          to[key] = source[key];
        }
      }
    }
    return to;
  }
  var object_assign_default = typeof Object.assign === "function" ? (
    // eslint-disable-next-line no-restricted-properties
    Object.assign
  ) : objectAssign;

  // src/utils/deep_merge.ts
  function isObject(item) {
    return item !== null && item !== void 0 && !Array.isArray(item) && typeof item === "object";
  }
  function deepMerge(target, ...sources) {
    if (sources.length === 0) {
      return target;
    }
    const source = sources.shift();
    if (isObject(target) && isObject(source)) {
      for (const key in source) {
        if (isObject(source[key])) {
          let newTarget = target[key];
          if (newTarget === void 0) {
            newTarget = {};
            target[key] = newTarget;
          }
          deepMerge(newTarget, source[key]);
        } else {
          object_assign_default(target, { [key]: source[key] });
        }
      }
    }
    return deepMerge(target, ...sources);
  }

  // src/utils/is_null_or_undefined.ts
  function isNullOrUndefined(x) {
    return x === null || x === void 0;
  }

  // src/utils/event_emitter.ts
  var EventEmitter = class {
    constructor() {
      this._listeners = {};
    }
    /**
     * Register a new callback for an event.
     *
     * @param {string} evt - The event to register a callback to
     * @param {Function} fn - The callback to call as that event is triggered.
     * The callback will take as argument the eventual payload of the event
     * (single argument).
     * @param {Object | undefined} cancellationSignal - When that signal emits,
     * the event listener is automatically removed.
     */
    addEventListener(evt, fn, cancellationSignal) {
      const listeners = this._listeners[evt];
      if (!Array.isArray(listeners)) {
        this._listeners[evt] = [fn];
      } else {
        listeners.push(fn);
      }
      if (cancellationSignal !== void 0) {
        cancellationSignal.register(() => {
          this.removeEventListener(evt, fn);
        });
      }
    }
    /**
     * Unregister callbacks linked to events.
     * @param {string} [evt] - The event for which the callback[s] should be
     * unregistered. Set it to null or undefined to remove all callbacks
     * currently registered (for any event).
     * @param {Function} [fn] - The callback to unregister. If set to null
     * or undefined while the evt argument is set, all callbacks linked to that
     * event will be unregistered.
     */
    removeEventListener(evt, fn) {
      if (isNullOrUndefined(evt)) {
        this._listeners = {};
        return;
      }
      const listeners = this._listeners[evt];
      if (!Array.isArray(listeners)) {
        return;
      }
      if (isNullOrUndefined(fn)) {
        delete this._listeners[evt];
        return;
      }
      const index = listeners.indexOf(fn);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
      if (listeners.length === 0) {
        delete this._listeners[evt];
      }
    }
    /**
     * Trigger every registered callbacks for a given event
     * @param {string} evt - The event to trigger
     * @param {*} arg - The eventual payload for that event. All triggered
     * callbacks will recieve this payload as argument.
     */
    trigger(evt, arg) {
      const listeners = this._listeners[evt];
      if (!Array.isArray(listeners)) {
        return;
      }
      listeners.slice().forEach((listener) => {
        try {
          listener(arg);
        } catch (e) {
          if (define_ENVIRONMENT_default.CURRENT_ENV === define_ENVIRONMENT_default.DEV) {
            throw e instanceof Error ? e : new Error("EventEmitter: listener error");
          }
          console.error("RxPlayer: EventEmitter error", e instanceof Error ? e : null);
        }
      });
    }
  };

  // src/config.ts
  var ConfigHandler = class extends EventEmitter {
    constructor() {
      super(...arguments);
      this.updated = false;
      this._config = default_config_default;
    }
    update(config) {
      const newConfig = deepMerge(this._config, config);
      this._config = newConfig;
      this.updated = true;
      this.trigger("update", config);
    }
    getCurrent() {
      return this._config;
    }
  };
  var configHandler = new ConfigHandler();
  var config_default = configHandler;

  // src/errors/custom_loader_error.ts
  var CustomLoaderError = class _CustomLoaderError extends Error {
    /**
     * @param {string} message
     * @param {boolean} canRetry
     * @param {XMLHttpRequest} xhr
     */
    constructor(message, canRetry, xhr) {
      super(message);
      Object.setPrototypeOf(this, _CustomLoaderError.prototype);
      this.name = "CustomLoaderError";
      this.canRetry = canRetry;
      this.xhr = xhr;
    }
  };

  // src/utils/array_find_index.ts
  function arrayFindIndex(arr, predicate, thisArg) {
    if (typeof Array.prototype.findIndex === "function") {
      return arr.findIndex(predicate, thisArg);
    }
    const len = arr.length >>> 0;
    for (let i = 0; i < len; i++) {
      if (predicate.call(thisArg, arr[i], i, arr)) {
        return i;
      }
    }
    return -1;
  }

  // src/utils/noop.ts
  function noop_default() {
  }

  // src/utils/reference.ts
  var SharedReference = class {
    /**
     * Create a `SharedReference` object encapsulating the mutable `initialValue`
     * value of type T.
     * @param {*} initialValue
     * @param {Object|undefined} [cancelSignal] - If set, the created shared
     * reference will be automatically "finished" once that signal emits.
     * Finished references won't be able to update their value anymore, and will
     * also automatically have their listeners (callbacks linked to value change)
     * removed - as they cannot be triggered anymore, thus providing a security
     * against memory leaks.
     */
    constructor(initialValue, cancelSignal) {
      this._value = initialValue;
      this._listeners = [];
      this._isFinished = false;
      this._onFinishCbs = [];
      if (cancelSignal !== void 0) {
        this._deregisterCancellation = cancelSignal.register(() => this.finish());
      }
    }
    /**
     * Returns the current value of this shared reference.
     * @returns {*}
     */
    getValue() {
      return this._value;
    }
    /**
     * Update the value of this shared reference.
     * @param {*} newVal
     */
    setValue(newVal) {
      if (this._isFinished) {
        if (define_ENVIRONMENT_default.CURRENT_ENV === define_ENVIRONMENT_default.DEV) {
          console.error("Finished shared references cannot be updated");
        }
        return;
      }
      this._value = newVal;
      if (this._listeners.length === 0) {
        return;
      }
      const clonedCbs = this._listeners.slice();
      for (const cbObj of clonedCbs) {
        try {
          if (!cbObj.hasBeenCleared) {
            cbObj.trigger(newVal, cbObj.complete);
          }
        } catch (_) {
        }
      }
    }
    /**
     * Update the value of this shared reference only if the value changed.
     *
     * Note that this function only performs a strict equality reference through
     * the "===" operator. Different objects that are structurally the same will
     * thus be considered different.
     * @param {*} newVal
     */
    setValueIfChanged(newVal) {
      if (newVal !== this._value) {
        this.setValue(newVal);
      }
    }
    /**
     * Allows to register a callback to be called each time the value inside the
     * reference is updated.
     * @param {Function} cb - Callback to be called each time the reference is
     * updated. Takes as first argument its new value and in second argument a
     * callback allowing to unregister the callback.
     * @param {Object} params
     * @param {Object} params.clearSignal - Allows to provide a CancellationSignal
     * which will unregister the callback when it emits.
     * @param {boolean|undefined} [params.emitCurrentValue] - If `true`, the
     * callback will also be immediately called with the current value.
     */
    onUpdate(cb, params) {
      const unlisten = () => {
        if (params.clearSignal !== void 0) {
          params.clearSignal.deregister(unlisten);
        }
        if (cbObj.hasBeenCleared) {
          return;
        }
        cbObj.hasBeenCleared = true;
        const indexOf = this._listeners.indexOf(cbObj);
        if (indexOf >= 0) {
          this._listeners.splice(indexOf, 1);
        }
      };
      const cbObj = { trigger: cb, complete: unlisten, hasBeenCleared: false };
      this._listeners.push(cbObj);
      if (params.emitCurrentValue === true) {
        cb(this._value, unlisten);
      }
      if (this._isFinished || cbObj.hasBeenCleared) {
        unlisten();
        return;
      }
      params.clearSignal.register(unlisten);
    }
    /**
     * Variant of `onUpdate` which will only call the callback once, once the
     * value inside the reference is different from `undefined`.
     * The callback is called synchronously if the value already isn't set to
     * `undefined`.
     *
     * This method can be used as a lighter weight alternative to `onUpdate` when
     * just waiting that the stored value becomes defined.
     * As such, it is an explicit equivalent to something like:
     * ```js
     * myReference.onUpdate((newVal, stopListening) => {
     *  if (newVal !== undefined) {
     *    stopListening();
     *
     *    // ... do the logic
     *  }
     * }, { emitCurrentValue: true });
     * ```
     * @param {Function} cb - Callback to be called each time the reference is
     * updated. Takes the new value in argument.
     * @param {Object} params
     * @param {Object} params.clearSignal - Allows to provide a
     * CancellationSignal which will unregister the callback when it emits.
     */
    waitUntilDefined(cb, params) {
      this.onUpdate(
        (val, stopListening) => {
          if (val !== void 0) {
            stopListening();
            cb(this._value);
          }
        },
        { clearSignal: params.clearSignal, emitCurrentValue: true }
      );
    }
    /**
     * Allows to register a callback for when the Shared Reference is "finished".
     *
     * This function is mostly there for implementing operators on the shared
     * reference and isn't meant to be used by regular code, hence it being
     * prefixed by `_`.
     * @param {Function} cb - Callback to be called once the reference is
     * finished.
     * @param {Object} onFinishCancelSignal - Allows to provide a
     * CancellationSignal which will unregister the callback when it emits.
     */
    _onFinished(cb, onFinishCancelSignal) {
      if (onFinishCancelSignal.isCancelled()) {
        return noop_default;
      }
      const cleanUp = () => {
        const indexOf = arrayFindIndex(this._onFinishCbs, (x) => x.trigger === trigger);
        if (indexOf >= 0) {
          this._onFinishCbs[indexOf].hasBeenCleared = true;
          this._onFinishCbs.splice(indexOf, 1);
        }
      };
      const trigger = () => {
        cleanUp();
        cb();
      };
      const deregisterCancellation = onFinishCancelSignal.register(cleanUp);
      this._onFinishCbs.push({ trigger, hasBeenCleared: false });
      return deregisterCancellation;
    }
    /**
     * Indicate that no new values will be emitted.
     * Allows to automatically free all listeners linked to this reference.
     */
    finish() {
      if (this._deregisterCancellation !== void 0) {
        this._deregisterCancellation();
      }
      this._isFinished = true;
      const clonedCbs = this._listeners.slice();
      for (const cbObj of clonedCbs) {
        try {
          if (!cbObj.hasBeenCleared) {
            cbObj.complete();
            cbObj.hasBeenCleared = true;
          }
        } catch (_) {
        }
      }
      this._listeners.length = 0;
      if (this._onFinishCbs.length > 0) {
        const clonedFinishedCbs = this._onFinishCbs.slice();
        for (const cbObj of clonedFinishedCbs) {
          try {
            if (!cbObj.hasBeenCleared) {
              cbObj.trigger();
              cbObj.hasBeenCleared = true;
            }
          } catch (_) {
          }
        }
        this._onFinishCbs.length = 0;
      }
    }
  };
  function createMappedReference(originalRef, mappingFn, cancellationSignal) {
    const newRef = new SharedReference(
      mappingFn(originalRef.getValue()),
      cancellationSignal
    );
    originalRef.onUpdate(
      function mapOriginalReference(x) {
        newRef.setValue(mappingFn(x));
      },
      { clearSignal: cancellationSignal }
    );
    originalRef._onFinished(() => {
      newRef.finish();
    }, cancellationSignal);
    return newRef;
  }
  var reference_default = SharedReference;

  // src/utils/monotonic_timestamp.ts
  var mainThreadTimestampDiff = new reference_default(0);
  function scaleTimestamp({ date, timestamp }) {
    const delta = date - timestamp;
    const diffCurrentEnv = typeof performance !== "undefined" ? (
      // eslint-disable-next-line no-restricted-properties
      Date.now() - performance.now()
    ) : 0;
    mainThreadTimestampDiff.setValueIfChanged(diffCurrentEnv - delta);
  }
  var getMonotonicTimeStamp = typeof performance !== "undefined" ? (
    // eslint-disable-next-line no-restricted-properties
    () => performance.now() + mainThreadTimestampDiff.getValue()
  ) : () => Date.now() + mainThreadTimestampDiff.getValue();
  var monotonic_timestamp_default = getMonotonicTimeStamp;

  // src/utils/logger.ts
  var DEFAULT_LOG_LEVEL = "NONE";
  var Logger = class extends EventEmitter {
    constructor() {
      super();
      this.error = noop_default;
      this.warn = noop_default;
      this.info = noop_default;
      this.debug = noop_default;
      this._levels = { NONE: 0, ERROR: 1, WARNING: 2, INFO: 3, DEBUG: 4 };
      this._currentFormat = "standard";
      this._currentLevel = DEFAULT_LOG_LEVEL;
    }
    /**
     * Update the logger's level to increase or decrease its verbosity, to change
     * its format with a newly set one, or to update its logging function.
     * @param {string} levelStr - One of the [upper-case] logger level. If the
     * given level is not valid, it will default to `"NONE"`.
     * @param {function|undefined} [logFn] - Optional logger function which will
     * be called with logs (with the corresponding upper-case logger level as
     * first argument).
     * Can be omited to just rely on regular logging functions.
     */
    setLevel(levelStr, format, logFn) {
      let level;
      const foundLevel = this._levels[levelStr];
      if (typeof foundLevel === "number") {
        level = foundLevel;
        this._currentLevel = levelStr;
      } else {
        level = 0;
        this._currentLevel = "NONE";
      }
      let actualFormat;
      if (format === "standard" || format === "full") {
        actualFormat = format;
      } else {
        actualFormat = "standard";
      }
      if (actualFormat === "full" && actualFormat !== this._currentFormat) {
        const now = monotonic_timestamp_default();
        console.log(String(now.toFixed(2)), "[Init]", `Local-Date: ${Date.now()}`);
      }
      this._currentFormat = actualFormat;
      const generateLogFn = this._currentFormat === "full" ? (logMethod, consoleFn) => {
        return (namespace, ...args) => {
          const now = monotonic_timestamp_default();
          return consoleFn(
            String(now.toFixed(2)),
            `[${logMethod}]`,
            namespace + ":",
            ...args.map(
              (a) => typeof a === "object" && a !== null && !(a instanceof Error) ? formatContextObject(a) : a
            )
          );
        };
      } : (_logMethod, consoleFn) => {
        return (namespace, ...args) => {
          return consoleFn(
            namespace + ":",
            ...args.map(
              (a) => typeof a === "object" && a !== null && !(a instanceof Error) ? formatContextObject(a) : a
            )
          );
        };
      };
      if (logFn === void 0) {
        this.error = level >= this._levels.ERROR ? generateLogFn("error", console.error.bind(console)) : noop_default;
        this.warn = level >= this._levels.WARNING ? generateLogFn("warn", console.warn.bind(console)) : noop_default;
        this.info = level >= this._levels.INFO ? generateLogFn("info", console.info.bind(console)) : noop_default;
        this.debug = level >= this._levels.DEBUG ? generateLogFn("log", console.log.bind(console)) : noop_default;
      } else {
        const produceLogFn = (logLevel) => {
          return level >= this._levels[logLevel] ? (namespace, ...args) => {
            return logFn(logLevel, namespace, args);
          } : noop_default;
        };
        this.error = produceLogFn("ERROR");
        this.warn = produceLogFn("WARNING");
        this.info = produceLogFn("INFO");
        this.debug = produceLogFn("DEBUG");
      }
      this.trigger("onLogLevelChange", {
        level: this._currentLevel,
        format: this._currentFormat
      });
    }
    /**
     * Get the last set logger level, as an upper-case string value.
     * @returns {string}
     */
    getLevel() {
      return this._currentLevel;
    }
    /**
     * Get the last set logger's log format.
     * @returns {string}
     */
    getFormat() {
      return this._currentFormat;
    }
    /**
     * Returns `true` if the currently set level includes logs of the level given
     * in argument.
     * @param {string} logLevel
     * @returns {boolean}
     */
    hasLevel(logLevel) {
      return this._levels[logLevel] >= this._levels[this._currentLevel];
    }
  };
  function formatContextObject(obj) {
    let ret = "";
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (ret.length > 0) {
          ret += " ";
        }
        const val = obj[key];
        if (val instanceof Error) {
          ret += `${key}="${JSON.stringify(val == null ? void 0 : val.toString())}"`;
        } else {
          ret += `${key}=${typeof val === "string" ? `${JSON.stringify(val)}` : String(val)}`;
        }
      }
    }
    return ret;
  }

  // src/log.ts
  var logger = new Logger();
  var log_default = logger;

  // src/utils/is_worker.ts
  var is_worker_default = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;

  // src/utils/is_node.ts
  var isNode = typeof window === "undefined" && !is_worker_default;
  var is_node_default = isNode;

  // src/utils/global_scope.ts
  var globalScope;
  if (is_worker_default) {
    globalScope = self;
  } else if (is_node_default) {
    globalScope = global;
  } else {
    globalScope = window;
  }
  var global_scope_default = globalScope;

  // src/utils/request/request_error.ts
  var RequestError = class _RequestError extends Error {
    /**
     * @param {string} url
     * @param {number} status
     * @param {string} type
     */
    constructor(url, status, type) {
      let message;
      switch (type) {
        case "TIMEOUT":
          message = "The request timed out";
          break;
        case "ERROR_EVENT":
          message = "An error prevented the request to be performed successfully";
          break;
        case "PARSE_ERROR":
          message = "An error happened while formatting the response data";
          break;
        case "ERROR_HTTP_CODE":
          message = "An HTTP status code indicating failure was received: " + String(status);
          break;
      }
      super(message);
      Object.setPrototypeOf(this, _RequestError.prototype);
      this.name = "RequestError";
      this.url = url;
      this.status = status;
      this.type = type;
    }
    serialize() {
      return { url: this.url, status: this.status, type: this.type };
    }
  };
  var RequestErrorTypes = {
    TIMEOUT: "TIMEOUT",
    ERROR_EVENT: "ERROR_EVENT",
    ERROR_HTTP_CODE: "ERROR_HTTP_CODE",
    PARSE_ERROR: "PARSE_ERROR"
  };

  // src/utils/request/fetch.ts
  var _Headers = typeof Headers === "function" ? Headers : null;
  var _AbortController = typeof AbortController === "function" ? AbortController : null;
  function fetchRequest(options) {
    var _a2, _b2;
    let headers;
    if (!isNullOrUndefined(options.headers)) {
      if (isNullOrUndefined(_Headers)) {
        headers = options.headers;
      } else {
        headers = new _Headers();
        const headerNames = Object.keys(options.headers);
        for (let i = 0; i < headerNames.length; i++) {
          const headerName = headerNames[i];
          headers.append(headerName, options.headers[headerName]);
        }
      }
    }
    log_default.debug("utils", "Fetch", { url: options.url });
    let cancellation = null;
    let isTimedOut = false;
    let isConnectionTimedOut = false;
    const sendingTime = monotonic_timestamp_default();
    const abortController = !isNullOrUndefined(_AbortController) ? new _AbortController() : null;
    function abortFetch() {
      if (isNullOrUndefined(abortController)) {
        log_default.warn("utils", "Fetch: AbortController API not available.");
        return;
      }
      abortController.abort();
    }
    let timeoutId;
    if (options.timeout !== void 0) {
      timeoutId = setTimeout(() => {
        isTimedOut = true;
        if (connectionTimeoutId !== void 0) {
          clearTimeout(connectionTimeoutId);
        }
        abortFetch();
      }, options.timeout);
    }
    let connectionTimeoutId;
    if (options.connectionTimeout !== void 0) {
      connectionTimeoutId = setTimeout(() => {
        isConnectionTimedOut = true;
        if (timeoutId !== void 0) {
          clearTimeout(timeoutId);
        }
        abortFetch();
      }, options.connectionTimeout);
    }
    const deregisterCancelLstnr = options.cancelSignal.register(function abortRequest(err) {
      cancellation = err;
      abortFetch();
    });
    const fetchOpts = { method: "GET" };
    if (headers !== void 0) {
      fetchOpts.headers = headers;
    }
    fetchOpts.signal = !isNullOrUndefined(abortController) ? abortController.signal : null;
    if (log_default.hasLevel("DEBUG")) {
      let logLine = "fetch GET " + options.url;
      if (options.timeout !== void 0) {
        logLine += " to=" + String(options.timeout / 1e3);
      }
      if (options.connectionTimeout !== void 0) {
        logLine += " cto=" + String(options.connectionTimeout / 1e3);
      }
      if (((_a2 = options.headers) == null ? void 0 : _a2.Range) !== void 0) {
        logLine += " Range=" + ((_b2 = options.headers) == null ? void 0 : _b2.Range);
      }
      log_default.debug("utils", logLine);
    }
    return fetch(options.url, fetchOpts).then((response) => {
      if (connectionTimeoutId !== void 0) {
        clearTimeout(connectionTimeoutId);
      }
      if (response.status >= 300) {
        log_default.warn("utils", "Fetch: Request HTTP Error", {
          status: response.status,
          responseUrl: response.url
        });
        throw new RequestError(
          response.url,
          response.status,
          RequestErrorTypes.ERROR_HTTP_CODE
        );
      }
      if (isNullOrUndefined(response.body)) {
        throw new RequestError(
          response.url,
          response.status,
          RequestErrorTypes.PARSE_ERROR
        );
      }
      const contentLengthHeader = response.headers.get("Content-Length");
      const contentLength = !isNullOrUndefined(contentLengthHeader) && !isNaN(+contentLengthHeader) ? +contentLengthHeader : void 0;
      const reader = response.body.getReader();
      let size = 0;
      return readBufferAndSendEvents();
      async function readBufferAndSendEvents() {
        const data = await reader.read();
        if (!data.done && !isNullOrUndefined(data.value)) {
          size += data.value.byteLength;
          const currentTime = monotonic_timestamp_default();
          const dataInfo = {
            url: response.url,
            currentTime,
            duration: currentTime - sendingTime,
            sendingTime,
            chunkSize: data.value.byteLength,
            chunk: data.value.buffer,
            size,
            totalSize: contentLength
          };
          options.onData(dataInfo);
          return readBufferAndSendEvents();
        } else if (data.done) {
          if (timeoutId !== void 0) {
            clearTimeout(timeoutId);
          }
          deregisterCancelLstnr();
          const receivedTime = monotonic_timestamp_default();
          const requestDuration = receivedTime - sendingTime;
          return {
            requestDuration,
            receivedTime,
            sendingTime,
            size,
            status: response.status,
            url: response.url
          };
        }
        return readBufferAndSendEvents();
      }
    }).catch((err) => {
      if (cancellation !== null) {
        throw cancellation;
      }
      deregisterCancelLstnr();
      if (isTimedOut) {
        log_default.warn("utils", "Fetch: Request timed out.", {
          url: options.url,
          timeout: options.timeout
        });
        throw new RequestError(options.url, 0, RequestErrorTypes.TIMEOUT);
      } else if (isConnectionTimedOut) {
        log_default.warn("utils", "Fetch: Request connection timed out.", {
          url: options.url,
          connectionTimeout: options.connectionTimeout
        });
        throw new RequestError(options.url, 0, RequestErrorTypes.TIMEOUT);
      } else if (err instanceof RequestError) {
        throw err;
      }
      log_default.warn("utils", "Fetch: Request Error", {
        error: err instanceof Error ? err.toString() : "Unkwown Error"
      });
      throw new RequestError(options.url, 0, RequestErrorTypes.ERROR_EVENT);
    });
  }
  function fetchIsSupported() {
    const nativeCodeRegex = /\[\s*native\s+code\s*\]/;
    return typeof global_scope_default.fetch === "function" && /**
     * Detect if AbortController function has been rewritten.
     * Polyfills can rewrite those function without a proper implementation
     * leading to issues.
     * In this case it's preferable to use XHR over fetch, because fetch uses
     * AbortSignal to cancel requests.
     * @see https://github.com/TanStack/query/discussions/9049
     */
    !isNullOrUndefined(_AbortController) && nativeCodeRegex.test(_AbortController.toString()) && !isNullOrUndefined(_Headers);
  }

  // src/utils/is_non_empty_string.ts
  function isNonEmptyString(x) {
    return typeof x === "string" && x.length > 0;
  }

  // src/utils/request/xhr.ts
  var DEFAULT_RESPONSE_TYPE = "json";
  function request(options) {
    const requestOptions = {
      url: options.url,
      headers: options.headers,
      responseType: isNullOrUndefined(options.responseType) ? DEFAULT_RESPONSE_TYPE : options.responseType,
      timeout: options.timeout,
      connectionTimeout: options.connectionTimeout
    };
    return new Promise((resolve, reject) => {
      const { onProgress, cancelSignal } = options;
      const { url, headers, responseType, timeout, connectionTimeout } = requestOptions;
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      let timeoutId;
      if (timeout !== void 0) {
        xhr.timeout = timeout;
        timeoutId = setTimeout(() => {
          clearCancellingProcess();
          reject(new RequestError(url, xhr.status, RequestErrorTypes.TIMEOUT));
        }, timeout + 3e3);
      }
      let connectionTimeoutId;
      if (connectionTimeout !== void 0) {
        connectionTimeoutId = setTimeout(() => {
          clearCancellingProcess();
          if (xhr.readyState !== XMLHttpRequest.DONE) {
            xhr.abort();
          }
          reject(new RequestError(url, xhr.status, RequestErrorTypes.TIMEOUT));
        }, connectionTimeout);
      }
      xhr.responseType = responseType;
      if (xhr.responseType === "document") {
        xhr.overrideMimeType("text/xml");
      }
      if (!isNullOrUndefined(headers)) {
        const _headers = headers;
        for (const key in _headers) {
          if (Object.prototype.hasOwnProperty.call(_headers, key)) {
            xhr.setRequestHeader(key, _headers[key]);
          }
        }
      }
      const sendingTime = monotonic_timestamp_default();
      let deregisterCancellationListener = null;
      if (cancelSignal !== void 0) {
        deregisterCancellationListener = cancelSignal.register(function abortRequest(err) {
          clearCancellingProcess();
          if (xhr.readyState !== XMLHttpRequest.DONE) {
            xhr.abort();
          }
          reject(err);
        });
        if (cancelSignal.isCancelled()) {
          return;
        }
      }
      xhr.onerror = function onXHRError() {
        clearCancellingProcess();
        reject(new RequestError(url, xhr.status, RequestErrorTypes.ERROR_EVENT));
      };
      xhr.ontimeout = function onXHRTimeout() {
        clearCancellingProcess();
        reject(new RequestError(url, xhr.status, RequestErrorTypes.TIMEOUT));
      };
      if (connectionTimeout !== void 0) {
        xhr.onreadystatechange = function clearConnectionTimeout() {
          if (xhr.readyState >= XMLHttpRequest.HEADERS_RECEIVED) {
            clearTimeout(connectionTimeoutId);
          }
        };
      }
      if (onProgress !== void 0) {
        xhr.onprogress = function onXHRProgress(event) {
          const currentTime = monotonic_timestamp_default();
          onProgress({
            url,
            duration: currentTime - sendingTime,
            sendingTime,
            currentTime,
            size: event.loaded,
            totalSize: event.total
          });
        };
      }
      xhr.onload = function onXHRLoad(event) {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          clearCancellingProcess();
          if (xhr.status >= 200 && xhr.status < 300) {
            const receivedTime = monotonic_timestamp_default();
            const totalSize = xhr.response instanceof ArrayBuffer ? xhr.response.byteLength : event.total;
            const status = xhr.status;
            const loadedResponseType = xhr.responseType;
            const _url = isNonEmptyString(xhr.responseURL) ? xhr.responseURL : url;
            let responseData;
            if (loadedResponseType === "json") {
              responseData = typeof xhr.response === "object" ? xhr.response : toJSONForIE(xhr.responseText);
            } else {
              responseData = xhr.response;
            }
            if (isNullOrUndefined(responseData)) {
              reject(new RequestError(url, xhr.status, RequestErrorTypes.PARSE_ERROR));
              return;
            }
            resolve({
              status,
              url: _url,
              responseType: loadedResponseType,
              sendingTime,
              receivedTime,
              requestDuration: receivedTime - sendingTime,
              size: totalSize,
              responseData
            });
          } else {
            reject(new RequestError(url, xhr.status, RequestErrorTypes.ERROR_HTTP_CODE));
          }
        }
      };
      if (log_default.hasLevel("DEBUG")) {
        let logLine = "XHR GET " + url;
        if (options.responseType !== void 0) {
          logLine += " type=" + options.responseType;
        }
        if (timeout !== void 0) {
          logLine += " to=" + String(timeout / 1e3);
        }
        if (connectionTimeout !== void 0) {
          logLine += " cto=" + String(connectionTimeout / 1e3);
        }
        if ((headers == null ? void 0 : headers.Range) !== void 0) {
          logLine += " Range=" + (headers == null ? void 0 : headers.Range);
        }
        log_default.debug("utils", logLine);
      }
      xhr.send();
      function clearCancellingProcess() {
        if (timeoutId !== void 0) {
          clearTimeout(timeoutId);
        }
        if (connectionTimeoutId !== void 0) {
          clearTimeout(connectionTimeoutId);
        }
        if (deregisterCancellationListener !== null) {
          deregisterCancellationListener();
        }
      }
    });
  }
  function toJSONForIE(data) {
    try {
      return JSON.parse(data);
    } catch (_e2) {
      return null;
    }
  }

  // src/utils/request/index.ts
  var request_default = request;

  // src/errors/error_codes.ts
  var NetworkErrorTypes = RequestErrorTypes;
  var ErrorTypes = {
    NETWORK_ERROR: "NETWORK_ERROR",
    MEDIA_ERROR: "MEDIA_ERROR",
    ENCRYPTED_MEDIA_ERROR: "ENCRYPTED_MEDIA_ERROR",
    OTHER_ERROR: "OTHER_ERROR"
  };

  // src/errors/error_message.ts
  function errorMessage(code, reason) {
    return `${code}: ${reason}`;
  }

  // src/errors/encrypted_media_error.ts
  var EncryptedMediaError = class _EncryptedMediaError extends Error {
    constructor(code, reason, supplementaryInfos) {
      super(errorMessage(code, reason));
      Object.setPrototypeOf(this, _EncryptedMediaError.prototype);
      this.name = "EncryptedMediaError";
      this.type = ErrorTypes.ENCRYPTED_MEDIA_ERROR;
      this.code = code;
      this._originalMessage = reason;
      this.fatal = false;
      this.keyStatuses = supplementaryInfos.keyStatuses;
      this.keySystemConfiguration = supplementaryInfos.keySystemConfiguration;
      this.keySystem = supplementaryInfos.keySystem;
    }
    /**
     * If that error has to be communicated through another thread, this method
     * allows to obtain its main defining properties in an Object so the Error can
     * be reconstructed in the other thread.
     * @returns {Object}
     */
    serialize() {
      return {
        isSerializedError: true,
        name: this.name,
        code: this.code,
        reason: this._originalMessage,
        keyStatuses: this.keyStatuses,
        keySystemConfiguration: this.keySystemConfiguration,
        keySystem: this.keySystem
      };
    }
  };

  // src/errors/media_error.ts
  var MediaError = class _MediaError extends Error {
    constructor(code, reason, context) {
      super(errorMessage(code, reason));
      Object.setPrototypeOf(this, _MediaError.prototype);
      this.name = "MediaError";
      this.type = ErrorTypes.MEDIA_ERROR;
      this._originalMessage = reason;
      this.code = code;
      this.fatal = false;
      if ((context == null ? void 0 : context.tracks) !== void 0 && (context == null ? void 0 : context.tracks.length) > 0) {
        this.tracksInfo = context.tracks;
      }
    }
    /**
     * If that error has to be communicated through another thread, this method
     * allows to obtain its main defining properties in an Object so the Error can
     * be reconstructed in the other thread.
     * @returns {Object}
     */
    serialize() {
      return {
        isSerializedError: true,
        name: this.name,
        code: this.code,
        reason: this._originalMessage,
        tracks: this.tracksInfo
      };
    }
  };

  // src/errors/network_error.ts
  var NetworkError = class _NetworkError extends Error {
    /**
     * @param {string} code
     * @param {Error} baseError
     */
    constructor(code, baseError) {
      super(errorMessage(code, baseError.message));
      Object.setPrototypeOf(this, _NetworkError.prototype);
      this.name = "NetworkError";
      this.type = ErrorTypes.NETWORK_ERROR;
      this.url = baseError.url;
      this.status = baseError.status;
      this.errorType = baseError.type;
      this._baseError = baseError;
      this.code = code;
      this.fatal = false;
    }
    /**
     * Returns true if the NetworkError is due to the given http error code
     * @param {number} httpErrorCode
     * @returns {Boolean}
     */
    isHttpError(httpErrorCode) {
      return this.errorType === NetworkErrorTypes.ERROR_HTTP_CODE && this.status === httpErrorCode;
    }
    /**
     * If that error has to be communicated through another thread, this method
     * allows to obtain its main defining properties in an Object so the Error can
     * be reconstructed in the other thread.
     * @returns {Object}
     */
    serialize() {
      return {
        isSerializedError: true,
        name: this.name,
        code: this.code,
        baseError: this._baseError.serialize()
      };
    }
  };

  // src/errors/other_error.ts
  var OtherError = class _OtherError extends Error {
    /**
     * @param {string} code
     * @param {string} reason
     */
    constructor(code, reason) {
      super(errorMessage(code, reason));
      Object.setPrototypeOf(this, _OtherError.prototype);
      this.name = "OtherError";
      this.type = ErrorTypes.OTHER_ERROR;
      this.code = code;
      this.fatal = false;
      this._originalMessage = reason;
    }
    /**
     * If that error has to be communicated through another thread, this method
     * allows to obtain its main defining properties in an Object so the Error can
     * be reconstructed in the other thread.
     * @returns {Object}
     */
    serialize() {
      return {
        isSerializedError: true,
        name: this.name,
        code: this.code,
        reason: this._originalMessage
      };
    }
  };

  // src/errors/is_known_error.ts
  function isKnownError(error) {
    return (error instanceof EncryptedMediaError || error instanceof MediaError || error instanceof OtherError || error instanceof NetworkError) && Object.keys(ErrorTypes).indexOf(error.type) >= 0;
  }

  // src/errors/format_error.ts
  function formatError(error, {
    defaultCode,
    defaultReason
  }) {
    if (isKnownError(error)) {
      return error;
    }
    const reason = error instanceof Error ? error.toString() : defaultReason;
    return new OtherError(defaultCode, reason);
  }

  // src/errors/source_buffer_error.ts
  var SourceBufferError = class _SourceBufferError extends Error {
    /**
     * @param {string} errorName - The original Error's name.
     * @param {string} message - The original Error's message.
     * @param {boolean} isBufferFull - If `true`, the Error is due to the fact
     * that the `SourceBuffer` was full.
     */
    constructor(errorName, message, isBufferFull) {
      super(message);
      Object.setPrototypeOf(this, _SourceBufferError.prototype);
      this.name = "SourceBufferError";
      this.errorName = errorName;
      this.isBufferFull = isBufferFull;
    }
    /**
     * If that error has to be communicated through another thread, this method
     * allows to obtain its main defining properties in an Object so the Error can
     * be reconstructed in the other thread.
     * @returns {Object}
     */
    serialize() {
      return {
        errorName: this.name,
        message: this.message,
        isBufferFull: this.isBufferFull
      };
    }
    /**
     * When stringified, just try to replicate the original error as it may be
     * more informative.
     * @returns {string}
     */
    toString() {
      return `${this.errorName}: ${this.message}`;
    }
  };

  // src/features/features_object.ts
  var features = {
    dashParsers: { wasm: null, js: null },
    createDebugElement: null,
    directfile: null,
    decrypt: null,
    htmlTextDisplayer: null,
    htmlTextTracksParsers: {},
    monothread: null,
    multithread: null,
    nativeTextDisplayer: null,
    nativeTextTracksParsers: {},
    transports: {}
  };
  var features_object_default = features;

  // src/features/index.ts
  var features_default = features_object_default;

  // src/utils/array_find.ts
  function arrayFind(arr, predicate, thisArg) {
    if (typeof Array.prototype.find === "function") {
      return arr.find(predicate, thisArg);
    }
    const len = arr.length >>> 0;
    for (let i = 0; i < len; i++) {
      const val = arr[i];
      if (predicate.call(thisArg, val, i, arr)) {
        return val;
      }
    }
    return void 0;
  }

  // src/utils/languages/ISO_639-1_to_ISO_639-3.ts
  var ISO_MAP_1_TO_3 = {
    aa: "aar",
    // Afar
    ab: "abk",
    // Abkhazian
    ae: "ave",
    // Avestan
    af: "afr",
    // Afrikaans
    ak: "aka",
    // Akan
    am: "amh",
    // Amharic
    an: "arg",
    // Aragonese
    ar: "ara",
    // Arabic
    as: "asm",
    // Assamese
    av: "ava",
    // Avaric
    ay: "aym",
    // Aymara
    az: "aze",
    // Azerbaijani
    ba: "bak",
    // Bashkir
    be: "bel",
    // Belarusian
    bg: "bul",
    // Bulgarian
    bi: "bis",
    // Bislama
    bm: "bam",
    // Bambara
    bn: "ben",
    // Bengali
    bo: "bod",
    // Tibetan
    br: "bre",
    // Breton
    bs: "bos",
    // Bosnian
    ca: "cat",
    // Catalan, Valencian
    ce: "che",
    // Chechen
    ch: "cha",
    // Chamorro
    co: "cos",
    // Corsican
    cr: "cre",
    // Cree
    cs: "ces",
    // Czech
    cu: "chu",
    // Church Slavic, Church Slavonic, Old Church Slavonic,
    // Old Slavonic, Old Bulgarian
    cv: "chv",
    // Chuvash
    cy: "cym",
    // Welsh
    da: "dan",
    // Danish
    de: "deu",
    // German
    dv: "div",
    // Divehi, Dhivehi, Maldivian
    dz: "dzo",
    // Dzongkha
    ee: "ewe",
    // Ewe
    el: "ell",
    // Greek (modern)
    en: "eng",
    // English
    eo: "epo",
    // Esperanto
    es: "spa",
    // Spanish, Castilian
    et: "est",
    // Estonian
    eu: "eus",
    // Basque
    fa: "fas",
    // Persian
    ff: "ful",
    // Fulah
    fi: "fin",
    // Finnish
    fj: "fij",
    // Fijian
    fo: "fao",
    // Faroese
    fr: "fra",
    // French
    fy: "fry",
    // Western Frisian
    ga: "gle",
    // Irish
    gd: "gla",
    // Gaelic, Scottish Gaelic
    gl: "glg",
    // Galician
    gn: "grn",
    // Guaraní
    gu: "guj",
    // Gujarati
    gv: "glv",
    // Manx
    ha: "hau",
    // Hausa
    he: "heb",
    // Hebrew (modern)
    hi: "hin",
    // Hindi
    ho: "hmo",
    // Hiri Motu
    hr: "hrv",
    // Croatian
    ht: "hat",
    // Haitian, Haitian Creole
    hu: "hun",
    // Hungarian
    hy: "hye",
    // Armenian
    hz: "her",
    // Herero
    ia: "ina",
    // Interlingua
    id: "ind",
    // Indonesian
    ie: "ile",
    // Interlingue
    ig: "ibo",
    // Igbo
    ii: "iii",
    // Sichuan Yi, Nuosu
    ik: "ipk",
    // Inupiaq
    io: "ido",
    // Ido
    is: "isl",
    // Icelandic
    it: "ita",
    // Italian
    iu: "iku",
    // Inuktitut
    ja: "jpn",
    // Japanese
    jv: "jav",
    // Javanese
    ka: "kat",
    // Georgian
    kg: "kon",
    // Kongo
    ki: "kik",
    // Kikuyu, Gikuyu
    kj: "kua",
    // Kuanyama, Kwanyama
    kk: "kaz",
    // Kazakh
    kl: "kal",
    // Kalaallisut, Greenlandic
    km: "khm",
    // Central Khmer
    kn: "kan",
    // Kannada
    ko: "kor",
    // Korean
    kr: "kau",
    // Kanuri
    ks: "kas",
    // Kashmiri
    ku: "kur",
    // Kurdish
    kv: "kom",
    // Komi
    kw: "cor",
    // Cornish
    ky: "kir",
    // Kirghiz, Kyrgyz
    la: "lat",
    // Latin
    lb: "ltz",
    // Luxembourgish, Letzeburgesch
    lg: "lug",
    // Ganda
    li: "lim",
    // Limburgan, Limburger, Limburgish
    ln: "lin",
    // Lingala
    lo: "lao",
    // Lao
    lt: "lit",
    // Lithuanian
    lu: "lub",
    // Luba-Katanga
    lv: "lav",
    // Latvian
    mg: "mlg",
    // Malagasy
    mh: "mah",
    // Marshallese
    mi: "mri",
    // Maori
    mk: "mkd",
    // Macedonian
    ml: "mal",
    // Malayalam
    mn: "mon",
    // Mongolian
    mr: "mar",
    // Marathi
    ms: "msa",
    // Malay
    mt: "mlt",
    // Maltese
    my: "mya",
    // Burmese
    na: "nau",
    // Nauru
    nb: "nob",
    // Norwegian Bokmål
    nd: "nde",
    // North Ndebele
    ne: "nep",
    // Nepali
    ng: "ndo",
    // Ndonga
    nl: "nld",
    // Dutch, Flemish
    nn: "nno",
    // Norwegian Nynorsk
    no: "nor",
    // Norwegian
    nr: "nbl",
    // South Ndebele
    nv: "nav",
    // Navajo, Navaho
    ny: "nya",
    // Chichewa, Chewa, Nyanja
    oc: "oci",
    // Occitan
    oj: "oji",
    // Ojibwa
    om: "orm",
    // Oromo
    or: "ori",
    // Oriya
    os: "oss",
    // Ossetian, Ossetic
    pa: "pan",
    // Panjabi, Punjabi
    pi: "pli",
    // Pali
    pl: "pol",
    // Polish
    ps: "pus",
    // Pashto, Pushto
    pt: "por",
    // Portuguese
    qu: "que",
    // Quechua
    rm: "roh",
    // Romansh
    rn: "run",
    // Rundi
    ro: "ron",
    // Romanian, Moldavian, Moldovan
    ru: "rus",
    // Russian
    rw: "kin",
    // Kinyarwanda
    sa: "san",
    // Sanskrit
    sc: "srd",
    // Sardinian
    sd: "snd",
    // Sindhi
    se: "sme",
    // Northern Sami
    sg: "sag",
    // Sango
    si: "sin",
    // Sinhala, Sinhalese
    sk: "slk",
    // Slovak
    sl: "slv",
    // Slovenian
    sm: "smo",
    // Samoan
    sn: "sna",
    // Shona
    so: "som",
    // Somali
    sq: "sqi",
    // Albanian
    sr: "srp",
    // Serbian
    ss: "ssw",
    // Swati
    st: "sot",
    // Southern Sotho
    su: "sun",
    // Sundanese
    sv: "swe",
    // Swedish
    sw: "swa",
    // Swahili
    ta: "tam",
    // Tamil
    te: "tel",
    // Telugu
    tg: "tgk",
    // Tajik
    th: "tha",
    // Thai
    ti: "tir",
    // Tigrinya
    tk: "tuk",
    // Turkmen
    tl: "tgl",
    // Tagalog
    tn: "tsn",
    // Tswana
    to: "ton",
    // Tonga (Tonga Islands)
    tr: "tur",
    // Turkish
    ts: "tso",
    // Tsonga
    tt: "tat",
    // Tatar
    tw: "twi",
    // Twi
    ty: "tah",
    // Tahitian
    ug: "uig",
    // Uighur, Uyghur
    uk: "ukr",
    // Ukrainian
    ur: "urd",
    // Urdu
    uz: "uzb",
    // Uzbek
    ve: "ven",
    // Venda
    vi: "vie",
    // Vietnamese
    vo: "vol",
    // Volapük
    wa: "wln",
    // Walloon
    wo: "wol",
    // Wolof
    xh: "xho",
    // Xhosa
    yi: "yid",
    // Yiddish
    yo: "yor",
    // Yoruba
    za: "zha",
    // Zhuang, Chuang
    zh: "zho",
    // Chinese
    zu: "zul"
    // Zulu
  };
  var ISO_639_1_to_ISO_639_3_default = ISO_MAP_1_TO_3;

  // src/utils/languages/ISO_639-2_to_ISO_639-3.ts
  var ISO_MAP_2_TO_3 = {
    alb: "sqi",
    // Albanian
    arm: "hye",
    // Armenian
    baq: "eus",
    // Basque
    bur: "mya",
    // Burmese
    chi: "zho",
    // Chinese
    cze: "ces",
    // Czech
    dut: "nld",
    // Dutch; Flemish
    fre: "fra",
    // French
    geo: "kat",
    // Georgian
    ger: "deu",
    // German
    gre: "ell",
    // Modern Greek (1453–)
    ice: "isl",
    // Icelandic
    mac: "mkd",
    // Macedonian
    mao: "mri",
    // Maori
    may: "msa",
    // Malay
    per: "fas",
    // Persian
    slo: "slk",
    // Slovak
    rum: "ron",
    // Moldovan
    tib: "bod",
    // Tibetan
    wel: "cym"
    // Welsh
  };
  var ISO_639_2_to_ISO_639_3_default = ISO_MAP_2_TO_3;

  // src/utils/languages/normalize.ts
  function normalizeLanguage(_language) {
    if (isNullOrUndefined(_language) || _language === "") {
      return "und";
    }
    const fields = ("" + _language).toLowerCase().split("-");
    const base = fields[0];
    const normalizedBase = normalizeBase(base);
    if (isNonEmptyString(normalizedBase)) {
      return normalizedBase;
    }
    return _language;
  }
  function normalizeBase(base) {
    let result;
    switch (base.length) {
      case 2:
        result = ISO_639_1_to_ISO_639_3_default[base];
        break;
      case 3:
        result = ISO_639_2_to_ISO_639_3_default[base];
        break;
    }
    return result;
  }
  var normalize_default = normalizeLanguage;

  // src/utils/languages/index.ts
  var languages_default = normalize_default;

  // src/utils/are_arrays_of_numbers_equal.ts
  function areArraysOfNumbersEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) {
      return false;
    }
    if (arr1 === arr2) {
      return true;
    }
    for (let i = arr1.length - 1; i >= 0; i--) {
      if (arr1[i] !== arr2[i]) {
        return false;
      }
    }
    return true;
  }

  // src/utils/object_values.ts
  function objectValues(o) {
    return Object.keys(o).map((k) => o[k]);
  }
  var object_values_default = typeof Object.values === "function" ? Object.values : objectValues;

  // src/manifest/utils.ts
  var SUPPORTED_ADAPTATIONS_TYPE = ["audio", "video", "text"];
  function getMinimumSafePosition(manifest) {
    var _a2, _b2;
    const windowData = manifest.timeBounds;
    if (windowData.timeshiftDepth === null) {
      return (_a2 = windowData.minimumSafePosition) != null ? _a2 : 0;
    }
    const { maximumTimeData } = windowData;
    let maximumTime;
    if (!windowData.maximumTimeData.isLinear) {
      maximumTime = maximumTimeData.maximumSafePosition;
    } else {
      const timeDiff = monotonic_timestamp_default() - maximumTimeData.time;
      maximumTime = maximumTimeData.maximumSafePosition + timeDiff / 1e3;
    }
    const theoricalMinimum = maximumTime - windowData.timeshiftDepth;
    return Math.max((_b2 = windowData.minimumSafePosition) != null ? _b2 : 0, theoricalMinimum);
  }
  function getLivePosition(manifest) {
    const { maximumTimeData } = manifest.timeBounds;
    if (!manifest.isLive || maximumTimeData.livePosition === void 0) {
      return void 0;
    }
    if (!maximumTimeData.isLinear) {
      return maximumTimeData.livePosition;
    }
    const timeDiff = monotonic_timestamp_default() - maximumTimeData.time;
    return maximumTimeData.livePosition + timeDiff / 1e3;
  }
  function getMaximumSafePosition(manifest) {
    const { maximumTimeData } = manifest.timeBounds;
    if (!maximumTimeData.isLinear) {
      return maximumTimeData.maximumSafePosition;
    }
    const timeDiff = monotonic_timestamp_default() - maximumTimeData.time;
    return maximumTimeData.maximumSafePosition + timeDiff / 1e3;
  }
  function getSupportedAdaptations(period, type) {
    if (type === void 0) {
      return getAdaptations(period).filter((ada) => {
        return ada.supportStatus.hasSupportedCodec !== false && ada.supportStatus.isDecipherable !== false;
      });
    }
    const adaptationsForType = period.adaptations[type];
    if (adaptationsForType === void 0) {
      return [];
    }
    return adaptationsForType.filter((ada) => {
      return ada.supportStatus.hasSupportedCodec !== false && ada.supportStatus.isDecipherable !== false;
    });
  }
  function getPeriodForTime(manifest, time) {
    let nextPeriod = null;
    for (let i = manifest.periods.length - 1; i >= 0; i--) {
      const period = manifest.periods[i];
      if (periodContainsTime(period, time, nextPeriod)) {
        return period;
      }
      nextPeriod = period;
    }
  }
  function getPeriodAfter(manifest, period) {
    const endOfPeriod = period.end;
    if (endOfPeriod === void 0) {
      return null;
    }
    const nextPeriod = arrayFind(manifest.periods, (_period) => {
      return _period.end === void 0 || endOfPeriod < _period.end;
    });
    return nextPeriod === void 0 ? null : nextPeriod;
  }
  function periodContainsTime(period, time, nextPeriod) {
    if (time >= period.start && (period.end === void 0 || time < period.end)) {
      return true;
    } else if (time === period.end && (nextPeriod === null || nextPeriod.start > period.end)) {
      return true;
    }
    return false;
  }
  function getAdaptations(period) {
    const adaptationsByType = period.adaptations;
    return objectValues(adaptationsByType).reduce(
      // Note: the second case cannot happen. TS is just being dumb here
      (acc, adaptations) => !isNullOrUndefined(adaptations) ? acc.concat(adaptations) : acc,
      []
    );
  }
  function toAudioTrack(adaptation, filterPlayable) {
    var _a2, _b2;
    const formatted = {
      language: (_a2 = adaptation.language) != null ? _a2 : "",
      normalized: (_b2 = adaptation.normalizedLanguage) != null ? _b2 : "",
      audioDescription: adaptation.isAudioDescription === true,
      id: adaptation.id,
      representations: (filterPlayable ? adaptation.representations.filter((r) => isRepresentationPlayable(r) === true) : adaptation.representations).map(toAudioRepresentation),
      label: adaptation.label
    };
    if (adaptation.isDub === true) {
      formatted.dub = true;
    }
    return formatted;
  }
  function toTextTrack(adaptation) {
    var _a2, _b2;
    return {
      language: (_a2 = adaptation.language) != null ? _a2 : "",
      normalized: (_b2 = adaptation.normalizedLanguage) != null ? _b2 : "",
      closedCaption: adaptation.isClosedCaption === true,
      id: adaptation.id,
      label: adaptation.label,
      forced: adaptation.isForcedSubtitles
    };
  }
  function toVideoTrack(adaptation, filterPlayable) {
    const trickModeTracks = adaptation.trickModeTracks !== void 0 ? adaptation.trickModeTracks.map((trickModeAdaptation) => {
      const representations = (filterPlayable ? trickModeAdaptation.representations.filter(
        (r) => isRepresentationPlayable(r) === true
      ) : trickModeAdaptation.representations).map(toVideoRepresentation);
      const trickMode = {
        id: trickModeAdaptation.id,
        representations,
        isTrickModeTrack: true
      };
      if (trickModeAdaptation.isSignInterpreted === true) {
        trickMode.signInterpreted = true;
      }
      return trickMode;
    }) : void 0;
    const videoTrack = {
      id: adaptation.id,
      representations: (filterPlayable ? adaptation.representations.filter((r) => isRepresentationPlayable(r) === true) : adaptation.representations).map(toVideoRepresentation),
      label: adaptation.label
    };
    if (adaptation.isSignInterpreted === true) {
      videoTrack.signInterpreted = true;
    }
    if (adaptation.isTrickModeTrack === true) {
      videoTrack.isTrickModeTrack = true;
    }
    if (trickModeTracks !== void 0) {
      videoTrack.trickModeTracks = trickModeTracks;
    }
    return videoTrack;
  }
  function toAudioRepresentation(representation) {
    const { id, bitrate, codecs, isSpatialAudio, isSupported, decipherable } = representation;
    return {
      id,
      bitrate,
      codec: codecs == null ? void 0 : codecs[0],
      isSpatialAudio,
      isCodecSupported: isSupported,
      decipherable
    };
  }
  function toVideoRepresentation(representation) {
    const {
      id,
      bitrate,
      frameRate,
      width,
      height,
      codecs,
      hdrInfo,
      isSupported,
      decipherable,
      contentProtections
    } = representation;
    return {
      id,
      bitrate,
      frameRate,
      width,
      height,
      codec: codecs == null ? void 0 : codecs[0],
      hdrInfo,
      isCodecSupported: isSupported,
      decipherable,
      contentProtections: contentProtections !== void 0 ? {
        keyIds: contentProtections.keyIds
      } : void 0
    };
  }
  function toTaggedTrack(adaptation) {
    switch (adaptation.type) {
      case "audio":
        return { type: "audio", track: toAudioTrack(adaptation, false) };
      case "video":
        return { type: "video", track: toVideoTrack(adaptation, false) };
      case "text":
        return { type: "text", track: toTextTrack(adaptation) };
    }
  }
  function isRepresentationPlayable(representation) {
    if (representation.decipherable === false) {
      return false;
    }
    return representation.isSupported;
  }
  function createRepresentationFilterFromFnString(fnString) {
    return new Function(
      `return (${fnString}(arguments[0], arguments[1]))`
    );
  }

  // src/utils/id_generator.ts
  function idGenerator() {
    let prefix = "";
    let currId = -1;
    return function generateNewId() {
      currId++;
      if (currId >= Number.MAX_SAFE_INTEGER) {
        prefix += "0";
        currId = 0;
      }
      return prefix + String(currId);
    };
  }

  // src/utils/assert.ts
  var AssertionError = class _AssertionError extends Error {
    /**
     * @param {string} message
     */
    constructor(message) {
      super(message);
      Object.setPrototypeOf(this, _AssertionError.prototype);
      this.name = "AssertionError";
    }
  };
  function assert(assertion, message) {
    if (define_ENVIRONMENT_default.DEV === define_ENVIRONMENT_default.CURRENT_ENV && !assertion) {
      throw new AssertionError(message === void 0 ? "invalid assertion" : message);
    }
  }
  function assertUnreachable(_) {
    throw new AssertionError("Unreachable path taken");
  }

  // src/utils/string_parsing.ts
  var hasTextDecoder = typeof global_scope_default === "object" && typeof global_scope_default.TextDecoder === "function";
  var hasTextEncoder = typeof global_scope_default === "object" && typeof global_scope_default.TextEncoder === "function";
  function strToUtf8(str) {
    if (hasTextEncoder) {
      try {
        const encoder = new TextEncoder();
        return encoder.encode(str);
      } catch (e) {
        const err = e instanceof Error ? e : "Unknown Error";
        log_default.warn(
          "utils",
          "Could not use TextEncoder to encode string into UTF-8, fallbacking to another implementation",
          err
        );
      }
    }
    let utf8Str;
    const pcStr = encodeURIComponent(str);
    if (typeof unescape === "function") {
      utf8Str = unescape(pcStr);
    } else {
      const isHexChar = /[0-9a-fA-F]/;
      const pcStrLen = pcStr.length;
      utf8Str = "";
      for (let i = 0; i < pcStr.length; i++) {
        let wasPercentEncoded = false;
        if (pcStr[i] === "%") {
          if (i <= pcStrLen - 6 && pcStr[i + 1] === "u" && isHexChar.test(pcStr[i + 2]) && isHexChar.test(pcStr[i + 3]) && isHexChar.test(pcStr[i + 4]) && isHexChar.test(pcStr[i + 5])) {
            const charCode = parseInt(pcStr.substring(i + 1, i + 6), 16);
            utf8Str += String.fromCharCode(charCode);
            wasPercentEncoded = true;
            i += 5;
          } else if (i <= pcStrLen - 3 && isHexChar.test(pcStr[i + 1]) && isHexChar.test(pcStr[i + 2])) {
            const charCode = parseInt(pcStr.substring(i + 1, i + 3), 16);
            utf8Str += String.fromCharCode(charCode);
            wasPercentEncoded = true;
            i += 2;
          }
        }
        if (!wasPercentEncoded) {
          utf8Str += pcStr[i];
        }
      }
    }
    const res = new Uint8Array(utf8Str.length);
    for (let i = 0; i < utf8Str.length; i++) {
      res[i] = utf8Str.charCodeAt(i) & 255;
    }
    return res;
  }
  function stringFromCharCodes(args) {
    const max = 16e3;
    let ret = "";
    for (let i = 0; i < args.length; i += max) {
      const subArray = args.subarray(i, i + max);
      ret += String.fromCharCode.apply(null, subArray);
    }
    return ret;
  }
  function intToHex(num, size) {
    const toStr = num.toString(16);
    return toStr.length >= size ? toStr : new Array(size - toStr.length + 1).join("0") + toStr;
  }
  function utf8ToStr(data) {
    if (hasTextDecoder) {
      try {
        const decoder = new TextDecoder();
        return decoder.decode(data);
      } catch (e) {
        const err = e instanceof Error ? e : "Unknown Error";
        log_default.warn(
          "utils",
          "could not use TextDecoder to parse UTF-8, fallbacking to another implementation",
          err
        );
      }
    }
    let uint8 = data;
    if (uint8[0] === 239 && uint8[1] === 187 && uint8[2] === 191) {
      uint8 = uint8.subarray(3);
    }
    const utf8Str = stringFromCharCodes(uint8);
    let escaped;
    if (typeof escape === "function") {
      escaped = escape(utf8Str);
    } else {
      const nonEscapedChar = /[A-Za-z0-9*_+-./]/;
      escaped = "";
      for (let i = 0; i < utf8Str.length; i++) {
        if (nonEscapedChar.test(utf8Str[i])) {
          escaped += utf8Str[i];
        } else {
          const charCode = utf8Str.charCodeAt(i);
          escaped += charCode >= 256 ? "%u" + intToHex(charCode, 4) : "%" + intToHex(charCode, 2);
        }
      }
    }
    return decodeURIComponent(escaped);
  }
  function hexToBytes(str) {
    const len = str.length;
    const arr = new Uint8Array(len / 2);
    for (let i = 0, j = 0; i < len; i += 2, j++) {
      arr[j] = parseInt(str.substring(i, i + 2), 16) & 255;
    }
    return arr;
  }
  function bytesToHex(bytes, sep = "") {
    let hex = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      hex += (bytes[i] >>> 4).toString(16);
      hex += (bytes[i] & 15).toString(16);
      if (sep.length > 0 && i < bytes.byteLength - 1) {
        hex += sep;
      }
    }
    return hex;
  }
  function readNullTerminatedString(buffer, offset) {
    let position = offset;
    while (position < buffer.length) {
      const value = buffer[position];
      if (value === 0) {
        break;
      }
      position += 1;
    }
    const bytes = buffer.subarray(offset, position);
    return { end: position + 1, string: utf8ToStr(bytes) };
  }

  // src/manifest/classes/representation.ts
  var generateRepresentationUniqueId = idGenerator();
  var Representation = class {
    /**
     * @param {Object} args
     * @param {string} trackType
     */
    constructor(args, trackType, cachedCodecSupport) {
      var _a2, _b2, _c2, _d2, _e2;
      this.id = args.id;
      this.uniqueId = generateRepresentationUniqueId();
      this.shouldBeAvoided = false;
      this.bitrate = args.bitrate;
      this.codecs = [];
      this.trackType = trackType;
      if (args.isSpatialAudio !== void 0) {
        this.isSpatialAudio = args.isSpatialAudio;
      }
      if (args.height !== void 0) {
        this.height = args.height;
      }
      if (args.width !== void 0) {
        this.width = args.width;
      }
      if (args.mimeType !== void 0) {
        this.mimeType = args.mimeType;
      }
      if (args.contentProtections !== void 0) {
        this.contentProtections = args.contentProtections;
      }
      if (args.frameRate !== void 0) {
        this.frameRate = args.frameRate;
      }
      if (args.hdrInfo !== void 0) {
        this.hdrInfo = args.hdrInfo;
      }
      this.cdnMetadata = args.cdnMetadata;
      this.index = args.index;
      const isEncrypted = this.contentProtections !== void 0;
      if (trackType === "audio" || trackType === "video") {
        if (args.supplementalCodecs !== void 0) {
          const isSupplementaryCodecSupported = cachedCodecSupport.isSupported(
            (_a2 = this.mimeType) != null ? _a2 : "",
            (_b2 = args.supplementalCodecs) != null ? _b2 : "",
            isEncrypted
          );
          if (isSupplementaryCodecSupported !== false) {
            this.codecs = [args.supplementalCodecs];
            this.isSupported = isSupplementaryCodecSupported;
          }
        }
        if (this.isSupported !== true) {
          if (this.codecs.length > 0) {
            this.codecs.push((_c2 = args.codecs) != null ? _c2 : "");
          } else {
            this.codecs = args.codecs === void 0 ? [] : [args.codecs];
            this.isSupported = cachedCodecSupport.isSupported(
              (_d2 = this.mimeType) != null ? _d2 : "",
              (_e2 = args.codecs) != null ? _e2 : "",
              isEncrypted
            );
          }
        }
      } else {
        if (args.codecs !== void 0) {
          this.codecs.push(args.codecs);
        }
        this.isSupported = true;
      }
    }
    /**
     * Some environments (e.g. in a WebWorker) may not have the capability to know
     * if a mimetype+codec combination is supported on the current platform.
     *
     * Calling `refreshCodecSupport` manually once the codecs supported are known
     * by the current environnement allows to work-around this issue.
     *
     * If the right mimetype+codec combination is found in the provided object,
     * this `Representation`'s `isSupported` property will be updated accordingly.
     *
     * @param {Array.<Object>} cachedCodecSupport;
     */
    refreshCodecSupport(cachedCodecSupport) {
      var _a2, _b2;
      if (this.isSupported !== void 0) {
        return;
      }
      const isEncrypted = this.contentProtections !== void 0;
      let isSupported = false;
      const mimeType = (_a2 = this.mimeType) != null ? _a2 : "";
      let codecs = (_b2 = this.codecs) != null ? _b2 : [];
      if (codecs.length === 0) {
        codecs = [""];
      }
      let representationHasUnknownCodecs = false;
      for (const codec of codecs) {
        isSupported = cachedCodecSupport.isSupported(mimeType, codec, isEncrypted);
        if (isSupported === true) {
          this.codecs = [codec];
          break;
        }
        if (isSupported === void 0) {
          representationHasUnknownCodecs = true;
        }
      }
      if (isSupported === true) {
        this.isSupported = true;
      } else {
        if (representationHasUnknownCodecs) {
          this.isSupported = void 0;
        } else {
          this.isSupported = false;
        }
      }
    }
    /**
     * Returns "mime-type string" which includes both the mime-type and the codec,
     * which is often needed when interacting with the browser's APIs.
     * @returns {string}
     */
    getMimeTypeString() {
      var _a2, _b2, _c2;
      return `${(_a2 = this.mimeType) != null ? _a2 : ""};codecs="${(_c2 = (_b2 = this.codecs) == null ? void 0 : _b2[0]) != null ? _c2 : ""}"`;
    }
    /**
     * Returns encryption initialization data linked to the given DRM's system ID.
     * This data may be useful to decrypt encrypted media segments.
     *
     * Returns an empty array if there is no data found for that system ID at the
     * moment.
     *
     * When you know that all encryption data has been added to this
     * Representation, you can also call the `getAllEncryptionData` method.
     * This second function will return all encryption initialization data
     * regardless of the DRM system, and might thus be used in all cases.
     *
     * /!\ Note that encryption initialization data may be progressively added to
     * this Representation after `_addProtectionData` calls or Manifest updates.
     * Because of this, the return value of this function might change after those
     * events.
     *
     * @param {string} drmSystemId - The hexa-encoded DRM system ID
     * @returns {Array.<Object>}
     */
    getEncryptionData(drmSystemId) {
      var _a2;
      const allInitData = this.getAllEncryptionData();
      const filtered = [];
      for (let i = 0; i < allInitData.length; i++) {
        let createdObjForType = false;
        const initData = allInitData[i];
        for (let j = 0; j < initData.values.length; j++) {
          if (initData.values[j].systemId.toLowerCase() === drmSystemId.toLowerCase()) {
            if (!createdObjForType) {
              const keyIds = (_a2 = this.contentProtections) == null ? void 0 : _a2.keyIds;
              filtered.push({
                type: initData.type,
                keyIds,
                values: [initData.values[j]]
              });
              createdObjForType = true;
            } else {
              filtered[filtered.length - 1].values.push(initData.values[j]);
            }
          }
        }
      }
      return filtered;
    }
    /**
     * Returns all currently-known encryption initialization data linked to this
     * Representation.
     * Encryption initialization data is generally required to be able to decrypt
     * those Representation's media segments.
     *
     * Unlike `getEncryptionData`, this method will return all available
     * encryption data.
     * It might as such might be used when either the current drm's system id is
     * not known or when no encryption data specific to it was found. In that
     * case, providing every encryption data linked to this Representation might
     * still allow decryption.
     *
     * Returns an empty array in two cases:
     *   - the content is not encrypted.
     *   - We don't have any decryption data yet.
     *
     * /!\ Note that new encryption initialization data can be added progressively
     * through the `_addProtectionData` method or through Manifest updates.
     * It is thus highly advised to only rely on this method once every protection
     * data related to this Representation has been known to be added.
     *
     * The main situation where new encryption initialization data is added is
     * after parsing this Representation's initialization segment, if one exists.
     * @returns {Array.<Object>}
     */
    getAllEncryptionData() {
      var _a2;
      if (this.contentProtections === void 0 || this.contentProtections.initData.length === 0) {
        return [];
      }
      const keyIds = (_a2 = this.contentProtections) == null ? void 0 : _a2.keyIds;
      return this.contentProtections.initData.map((x) => {
        return { type: x.type, keyIds, values: x.values };
      });
    }
    /**
     * Add new encryption initialization data to this Representation if it was not
     * already included.
     *
     * Returns `true` if new encryption initialization data has been added.
     * Returns `false` if none has been added (e.g. because it was already known).
     *
     * /!\ Mutates the current Representation
     *
     * TODO better handle use cases like key rotation by not always grouping
     * every protection data together? To check.
     * @param {string} initDataType
     * @param {Uint8Array|undefined} keyId
     * @param {Uint8Array} data
     * @returns {boolean}
     */
    addProtectionData(initDataType, keyId, data) {
      let hasUpdatedProtectionData = false;
      if (this.contentProtections === void 0) {
        this.contentProtections = {
          keyIds: keyId !== void 0 ? [keyId] : [],
          initData: [{ type: initDataType, values: data }]
        };
        return true;
      }
      if (keyId !== void 0) {
        const keyIds = this.contentProtections.keyIds;
        if (keyIds === void 0) {
          this.contentProtections.keyIds = [keyId];
        } else {
          let foundKeyId = false;
          for (const knownKeyId of keyIds) {
            if (areArraysOfNumbersEqual(knownKeyId, keyId)) {
              foundKeyId = true;
            }
          }
          if (!foundKeyId) {
            log_default.warn("manifest", "found unanounced key id.", {
              keyId: bytesToHex(keyId)
            });
            keyIds.push(keyId);
          }
        }
      }
      const cInitData = this.contentProtections.initData;
      for (let i = 0; i < cInitData.length; i++) {
        if (cInitData[i].type === initDataType) {
          const cValues = cInitData[i].values;
          for (let dataI = 0; dataI < data.length; dataI++) {
            const dataToAdd = data[dataI];
            let cValuesIdx;
            for (cValuesIdx = 0; cValuesIdx < cValues.length; cValuesIdx++) {
              if (dataToAdd.systemId === cValues[cValuesIdx].systemId) {
                if (areArraysOfNumbersEqual(dataToAdd.data, cValues[cValuesIdx].data)) {
                  break;
                } else {
                  log_default.warn("manifest", "different init data for the same system ID", {
                    systemId: dataToAdd.systemId
                  });
                }
              }
            }
            if (cValuesIdx === cValues.length) {
              cValues.push(dataToAdd);
              hasUpdatedProtectionData = true;
            }
          }
          return hasUpdatedProtectionData;
        }
      }
      this.contentProtections.initData.push({ type: initDataType, values: data });
      return true;
    }
    /**
     * Returns `true` if the `Representation` has a high chance of being playable on
     * the current device (its codec seems supported and we don't consider it to be
     * un-decipherable).
     *
     * Returns `false` if the `Representation` has a high chance of being unplayable
     * on the current device (its codec seems unsupported and/or we consider it to
     * be un-decipherable).
     *
     * Returns `undefined` if we don't know as the codec has not been checked yet.
     *
     * @returns {boolean|undefined}
     */
    isPlayable() {
      return isRepresentationPlayable(this);
    }
    /**
     * Format the current `Representation`'s properties into a
     * `IRepresentationMetadata` format which can better be communicated through
     * another thread.
     *
     * Please bear in mind however that the returned object will not be updated
     * when the current `Representation` instance is updated, it is only a
     * snapshot at the current time.
     *
     * If you want to keep that data up-to-date with the current `Representation`
     * instance, you will have to do it yourself.
     *
     * @returns {Object}
     */
    getMetadataSnapshot() {
      return {
        id: this.id,
        uniqueId: this.uniqueId,
        bitrate: this.bitrate,
        codecs: this.codecs,
        mimeType: this.mimeType,
        width: this.width,
        height: this.height,
        frameRate: this.frameRate,
        isSupported: this.isSupported,
        hdrInfo: this.hdrInfo,
        contentProtections: this.contentProtections,
        decipherable: this.decipherable,
        isCodecSupportedInWebWorker: this.isCodecSupportedInWebWorker
      };
    }
  };
  var representation_default = Representation;

  // src/manifest/classes/adaptation.ts
  var Adaptation = class _Adaptation {
    /**
     * @constructor
     * @param {Object} parsedAdaptation
     * @param {Object|undefined} [options]
     */
    constructor(parsedAdaptation, cachedCodecSupport, options = {}) {
      const { trickModeTracks } = parsedAdaptation;
      const { representationFilter, isManuallyAdded } = options;
      this.id = parsedAdaptation.id;
      this.type = parsedAdaptation.type;
      if (parsedAdaptation.isTrickModeTrack !== void 0) {
        this.isTrickModeTrack = parsedAdaptation.isTrickModeTrack;
      }
      if (parsedAdaptation.language !== void 0) {
        this.language = parsedAdaptation.language;
        this.normalizedLanguage = languages_default(parsedAdaptation.language);
      }
      if (parsedAdaptation.closedCaption !== void 0) {
        this.isClosedCaption = parsedAdaptation.closedCaption;
      }
      if (parsedAdaptation.audioDescription !== void 0) {
        this.isAudioDescription = parsedAdaptation.audioDescription;
      }
      if (parsedAdaptation.isDub !== void 0) {
        this.isDub = parsedAdaptation.isDub;
      }
      if (parsedAdaptation.forcedSubtitles !== void 0) {
        this.isForcedSubtitles = parsedAdaptation.forcedSubtitles;
      }
      if (parsedAdaptation.isSignInterpreted !== void 0) {
        this.isSignInterpreted = parsedAdaptation.isSignInterpreted;
      }
      if (parsedAdaptation.label !== void 0) {
        this.label = parsedAdaptation.label;
      }
      if (trickModeTracks !== void 0 && trickModeTracks.length > 0) {
        this.trickModeTracks = trickModeTracks.map(
          (track) => new _Adaptation(track, cachedCodecSupport)
        );
      }
      const argsRepresentations = parsedAdaptation.representations;
      const representations = [];
      this.supportStatus = {
        hasSupportedCodec: false,
        hasCodecWithUndefinedSupport: false,
        isDecipherable: false
      };
      for (let i = 0; i < argsRepresentations.length; i++) {
        const representation = new representation_default(
          argsRepresentations[i],
          this.type,
          cachedCodecSupport
        );
        let shouldAdd = true;
        if (!isNullOrUndefined(representationFilter)) {
          const reprObject = {
            id: representation.id,
            bitrate: representation.bitrate,
            codecs: representation.codecs,
            height: representation.height,
            width: representation.width,
            frameRate: representation.frameRate,
            hdrInfo: representation.hdrInfo
          };
          if (representation.contentProtections !== void 0) {
            reprObject.contentProtections = {};
            if (representation.contentProtections.keyIds !== void 0) {
              const keyIds = representation.contentProtections.keyIds;
              reprObject.contentProtections.keyIds = keyIds;
            }
          }
          shouldAdd = representationFilter(reprObject, {
            trackType: this.type,
            language: this.language,
            normalizedLanguage: this.normalizedLanguage,
            isClosedCaption: this.isClosedCaption,
            isDub: this.isDub,
            isAudioDescription: this.isAudioDescription,
            isSignInterpreted: this.isSignInterpreted
          });
        }
        if (shouldAdd) {
          representations.push(representation);
          if (representation.isSupported === void 0) {
            this.supportStatus.hasCodecWithUndefinedSupport = true;
            if (this.supportStatus.hasSupportedCodec === false) {
              this.supportStatus.hasSupportedCodec = void 0;
            }
          } else if (representation.isSupported) {
            this.supportStatus.hasSupportedCodec = true;
          }
          if (representation.decipherable === void 0) {
            if (this.supportStatus.isDecipherable === false) {
              this.supportStatus.isDecipherable = void 0;
            }
          } else if (representation.decipherable) {
            this.supportStatus.isDecipherable = true;
          }
        } else {
          log_default.debug(
            "manifest",
            "Filtering Representation due to representationFilter",
            this.type,
            `Adaptation: ${this.id}`,
            `Representation: ${representation.id}`,
            `(${representation.bitrate})`
          );
        }
      }
      representations.sort((a, b) => a.bitrate - b.bitrate);
      this.representations = representations;
      this.manuallyAdded = isManuallyAdded === true;
    }
    /**
     * Some environments (e.g. in a WebWorker) may not have the capability to know
     * if a mimetype+codec combination is supported on the current platform.
     *
     * Calling `refreshCodecSupport` manually once the codecs supported are known
     * by the current environnement allows to work-around this issue.
     *
     *
     * If the right mimetype+codec combination is found in the provided object,
     * this `Adaptation`'s `isSupported` property will be updated accordingly as
     * well as all of its inner `Representation`'s `isSupported` attributes.
     *
     * @param {Array.<Object>} cachedCodecSupport
     */
    refreshCodecSupport(cachedCodecSupport) {
      let hasCodecWithUndefinedSupport = false;
      let hasSupportedRepresentation = false;
      for (const representation of this.representations) {
        representation.refreshCodecSupport(cachedCodecSupport);
        if (representation.isSupported === void 0) {
          hasCodecWithUndefinedSupport = true;
        } else if (representation.isSupported) {
          hasSupportedRepresentation = true;
        }
      }
      if (hasSupportedRepresentation) {
        this.supportStatus.hasSupportedCodec = true;
      } else if (hasCodecWithUndefinedSupport) {
        this.supportStatus.hasSupportedCodec = void 0;
      } else {
        this.supportStatus.hasSupportedCodec = false;
      }
      this.supportStatus.hasCodecWithUndefinedSupport = hasCodecWithUndefinedSupport;
    }
    /**
     * Returns the Representation linked to the given ID.
     * @param {number|string} wantedId
     * @returns {Object|undefined}
     */
    getRepresentation(wantedId) {
      return arrayFind(this.representations, ({ id }) => wantedId === id);
    }
    /**
     * Format the current `Adaptation`'s properties into a
     * `IAdaptationMetadata` format which can better be communicated through
     * another thread.
     *
     * Please bear in mind however that the returned object will not be updated
     * when the current `Adaptation` instance is updated, it is only a
     * snapshot at the current time.
     *
     * If you want to keep that data up-to-date with the current `Adaptation`
     * instance, you will have to do it yourself.
     *
     * @returns {Object}
     */
    getMetadataSnapshot() {
      const representations = [];
      const baseRepresentations = this.representations;
      for (const representation of baseRepresentations) {
        representations.push(representation.getMetadataSnapshot());
      }
      return {
        id: this.id,
        type: this.type,
        supportStatus: this.supportStatus,
        language: this.language,
        isForcedSubtitles: this.isForcedSubtitles,
        isClosedCaption: this.isClosedCaption,
        isAudioDescription: this.isAudioDescription,
        isSignInterpreted: this.isSignInterpreted,
        normalizedLanguage: this.normalizedLanguage,
        representations,
        label: this.label,
        isDub: this.isDub
      };
    }
  };

  // src/compat/browser_compatibility_types.ts
  function assertTypeCompatibility() {
  }
  assertTypeCompatibility();
  assertTypeCompatibility();
  assertTypeCompatibility();
  assertTypeCompatibility();
  assertTypeCompatibility();
  assertTypeCompatibility();
  assertTypeCompatibility();
  var gs = global_scope_default;
  var _a, _b, _c, _d, _e;
  var MediaSource_ = (_e = (_d = (_c = (_b = (_a = gs == null ? void 0 : gs.MediaSource) != null ? _a : gs == null ? void 0 : gs.MozMediaSource) != null ? _b : gs == null ? void 0 : gs.WebKitMediaSource) != null ? _c : gs == null ? void 0 : gs.MSMediaSource) != null ? _d : gs == null ? void 0 : gs.ManagedMediaSource) != null ? _e : void 0;
  var isManagedMediaSource = MediaSource_ !== void 0 && MediaSource_ === (gs == null ? void 0 : gs.ManagedMediaSource);

  // src/compat/env_detector.ts
  var BROWSERS = {
    /** Edge since it has been ported to chromium's engine. */
    EdgeChromium: 0,
    /** Firefox Gecko-based browser, any engine. */
    Firefox: 1,
    /** Internet Explorer 11 specifically. */
    Ie11: 2,
    /**
     * Either Internet Explorer pre-11 or Microsoft Edge before Edge was ported on
     * chromium's engines.
     */
    OtherIeOrEdgePreEdgeChromium: 3,
    /** Safari on Desktop devices (not mobile, tablets etc.). */
    SafariDesktop: 4,
    /** Safari on mobile devices (not desktop). */
    SafariMobile: 5,
    /** Another browser that does not match with the others defined here. */
    Other: 6
  };
  var DEVICES = {
    // NOTE: We're beginning the first devices at `100` so we're sure ther's no
    // overlap with BROWSERS: we can then rely on TypeScript to ensure that
    // developers are not mistakenly comparing BROWSERS to DEVICES.
    /** Specific A1 STB: KSTB 40xx from Kaon Media. */
    A1KStb40xx: 100,
    /** Panasonic smart TVs */
    Panasonic: 101,
    /** Philips's NetTv browser. */
    PhilipsNetTv: 102,
    /** The PlayStation 4 game console. */
    PlayStation4: 103,
    /** The PlayStation 5 game console. */
    PlayStation5: 104,
    /** Devices where Tizen is the OS (e.g. Samsung TVs). */
    Tizen: 105,
    /** WebOS (mostly LG smart TVs) 2021 version. */
    WebOs2021: 106,
    /** WebOS (mostly LG smart TVs) 2022 version. */
    WebOs2022: 107,
    /** Other WebOS (mostly LG smart TVs) versions. */
    WebOsOther: 108,
    /** The Xbox(es) game console(s). */
    Xbox: 109,
    /** Another device that does not match with the others defined here. */
    Other: 110
  };
  var EnvDetector = {
    DEVICES,
    BROWSERS,
    browser: BROWSERS.Other,
    device: DEVICES.Other,
    isSamsungBrowser: false
  };
  resetEnvironment();
  function resetEnvironment() {
    var _a2, _b2, _c2;
    if (is_node_default) {
      return;
    }
    if (typeof global_scope_default.MSInputMethodContext !== "undefined" && typeof document.documentMode !== "undefined") {
      EnvDetector.browser = BROWSERS.Ie11;
    } else if (navigator.appName === "Microsoft Internet Explorer" || navigator.appName === "Netscape" && /(Trident|Edge)\//.test(navigator.userAgent)) {
      EnvDetector.browser = BROWSERS.OtherIeOrEdgePreEdgeChromium;
    } else if (navigator.userAgent.toLowerCase().indexOf("edg/") !== -1) {
      EnvDetector.browser = BROWSERS.EdgeChromium;
    } else if (navigator.userAgent.toLowerCase().indexOf("firefox") !== -1) {
      EnvDetector.browser = BROWSERS.Firefox;
    } else if (typeof navigator.platform === "string" && /iPad|iPhone|iPod/.test(navigator.platform)) {
      EnvDetector.browser = BROWSERS.SafariMobile;
    } else if (
      // the following statement check if the window.safari contains the method
      // "pushNotification", this condition is not met when using web app from the dock
      // on macOS, this is why we also check userAgent.
      Object.prototype.toString.call(global_scope_default.HTMLElement).indexOf("Constructor") >= 0 || ((_b2 = (_a2 = global_scope_default.safari) == null ? void 0 : _a2.pushNotification) == null ? void 0 : _b2.toString()) === "[object SafariRemoteNotification]" || // browsers are lying: Chrome reports both as Chrome and Safari in user
      // agent string, So to detect Safari we have to check for the Safari string
      // and the absence of the Chrome string
      // @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent#which_part_of_the_user_agent_contains_the_information_you_are_looking_for
      /Safari\/(\d+)/.test(navigator.userAgent) && // Safari should contain Version/ in userAgent
      /Version\/(\d+)/.test(navigator.userAgent) && ((_c2 = navigator.vendor) == null ? void 0 : _c2.indexOf("Apple")) !== -1 && !/Chrome\/(\d+)/.test(navigator.userAgent) && !/Chromium\/(\d+)/.test(navigator.userAgent)
    ) {
      EnvDetector.browser = BROWSERS.SafariDesktop;
    }
    if (/SamsungBrowser/.test(navigator.userAgent)) {
      EnvDetector.isSamsungBrowser = true;
    }
    if (navigator.userAgent.indexOf("PlayStation 4") !== -1) {
      EnvDetector.device = DEVICES.PlayStation4;
    } else if (navigator.userAgent.indexOf("PlayStation 5") !== -1) {
      EnvDetector.device = DEVICES.PlayStation5;
    } else if (/Tizen/.test(navigator.userAgent)) {
      EnvDetector.device = DEVICES.Tizen;
    } else if (/[Ww]eb[O0]S/.test(navigator.userAgent)) {
      if (/[Ww]eb[O0]S.TV-2022/.test(navigator.userAgent) || /[Cc]hr[o0]me\/87/.test(navigator.userAgent)) {
        EnvDetector.device = DEVICES.WebOs2022;
      } else if (/[Ww]eb[O0]S.TV-2021/.test(navigator.userAgent) || /[Cc]hr[o0]me\/79/.test(navigator.userAgent)) {
        EnvDetector.device = DEVICES.WebOs2021;
      } else {
        EnvDetector.device = DEVICES.WebOsOther;
      }
    } else if (navigator.userAgent.indexOf("NETTV") !== -1 && navigator.userAgent.indexOf("Philips") !== -1) {
      EnvDetector.device = DEVICES.PhilipsNetTv;
    } else if (/[Pp]anasonic/.test(navigator.userAgent)) {
      EnvDetector.device = DEVICES.Panasonic;
    } else if (navigator.userAgent.indexOf("Xbox") !== -1) {
      EnvDetector.device = DEVICES.Xbox;
    } else if (navigator.userAgent.indexOf("Model/a1-kstb40xx") !== -1) {
      EnvDetector.device = DEVICES.A1KStb40xx;
    }
  }
  var env_detector_default = EnvDetector;

  // src/utils/sleep.ts
  function sleep(timeInMs) {
    return new Promise((res) => {
      setTimeout(res, timeInMs);
    });
  }

  // src/utils/create_cancellable_promise.ts
  function createCancellablePromise(cancellationSignal, cb) {
    let abortingLogic;
    return new Promise((res, rej) => {
      if (cancellationSignal.cancellationError !== null) {
        return rej(cancellationSignal.cancellationError);
      }
      let hasUnregistered = false;
      abortingLogic = cb(
        function onCancellablePromiseSuccess(val) {
          cancellationSignal.deregister(onCancellablePromiseCancellation);
          hasUnregistered = true;
          res(val);
        },
        function onCancellablePromiseFailure(err) {
          cancellationSignal.deregister(onCancellablePromiseCancellation);
          hasUnregistered = true;
          rej(err);
        }
      );
      if (!hasUnregistered) {
        cancellationSignal.register(onCancellablePromiseCancellation);
      }
      function onCancellablePromiseCancellation(error) {
        if (abortingLogic !== void 0) {
          abortingLogic();
        }
        rej(error);
      }
    });
  }

  // src/utils/cancellable_sleep.ts
  function cancellableSleep(delay, cancellationSignal) {
    return createCancellablePromise(cancellationSignal, (res) => {
      const timeout = setTimeout(() => res(), delay);
      return () => clearTimeout(timeout);
    });
  }

  // src/utils/task_canceller.ts
  var TaskCanceller = class {
    /**
     * Creates a new `TaskCanceller`, with its own `CancellationSignal` created
     * as its `signal` property.
     * You can then pass this `signal` property to async task you wish to be
     * cancellable.
     * @param {string|undefined} taskName - Descriptive "name" for the task you
     * want to make cancellable. This is used for debugging purposes: this string
     * will be linked to the thrown `CancellationError` (and will be logged) if
     * the task is ever cancelled, making cancellation-related issues much easier
     * to trace.
     * By setting it to `undefined`, you indicate that this task does not need
     * those supplementary debug information and does not need to be logged.
     */
    constructor(taskName) {
      const [trigger, register] = createCancellationFunctions();
      this._isUsed = false;
      this._trigger = trigger;
      this._taskName = taskName;
      this.signal = new CancellationSignal(register);
    }
    /**
     * Returns `true` if this `TaskCanceller` has already been triggered.
     * `false` otherwise.
     */
    isUsed() {
      return this._isUsed;
    }
    /**
     * Bind this `TaskCanceller` to a `CancellationSignal`, so the former
     * is automatically cancelled when the latter is triggered.
     *
     * Note that this call registers a callback on the given signal, until either
     * the current `TaskCanceller` is cancelled or until this given
     * `CancellationSignal` is triggered.
     * To avoid leaking memory, the returned callback allow to undo this link.
     * It should be called if/when that link is not needed anymore, such as when
     * there is no need for this `TaskCanceller` anymore.
     *
     * @param {Object} signal
     * @returns {Function}
     */
    linkToSignal(signal) {
      const unregister = signal.register((error) => {
        this.cancel(error.reason);
      });
      this.signal.register(unregister);
      return unregister;
    }
    /**
     * "Trigger" the `TaskCanceller`, notify through its associated
     * `CancellationSignal` (its `signal` property) that a task should be aborted.
     *
     * Once called the `TaskCanceller` is permanently triggered.
     * @param {string | undefined} reason - Human-readable reason that led to the
     * cancellation of this task. This is used for debugging matters: the reason
     * will be linked to the corresponding `CancellationError` instance.
     * `undefined` if you don't want to give a reason.
     */
    cancel(reason) {
      if (this._isUsed) {
        return;
      }
      this._isUsed = true;
      const cancellationError = new CancellationError(this._taskName, reason);
      this._trigger(cancellationError);
    }
    /**
     * Check that the `error` in argument is a `CancellationError`, most likely
     * meaning that the linked error is due to a task aborted via a
     * `CancellationSignal`.
     * @param {*} error
     * @returns {boolean}
     */
    static isCancellationError(error) {
      return error instanceof CancellationError;
    }
  };
  var CancellationSignal = class {
    /**
     * Creates a new CancellationSignal.
     * /!\ Note: Only a `TaskCanceller` is supposed to be able to create one.
     * @param {Function} registerToSource - Function called when the task is
     * cancelled.
     */
    constructor(registerToSource) {
      this._isCancelled = false;
      this.cancellationError = null;
      this._listeners = [];
      registerToSource((cancellationError) => {
        this.cancellationError = cancellationError;
        this._isCancelled = true;
        while (this._listeners.length > 0) {
          try {
            const listener = this._listeners.pop();
            listener == null ? void 0 : listener(cancellationError);
          } catch (err) {
            log_default.error(
              "utils",
              "Error while calling clean up listener",
              err instanceof Error ? err : "Unknown Error"
            );
          }
        }
      });
    }
    /**
     * Returns `true` when the cancellation order was already triggered, meaning
     * that the linked task needs to be aborted.
     * @returns boolean
     */
    isCancelled() {
      return this._isCancelled;
    }
    /**
     * Registers a function that will be called when/if the current task is
     * cancelled.
     *
     * Multiple calls to `register` can be performed to register multiple
     * callbacks on cancellation associated to the same `CancellationSignal`.
     *
     * @param {Function} fn - This function should perform all logic allowing to
     * abort everything the task is doing.
     *
     * It takes in argument the `CancellationError` which was created when the
     * task was aborted.
     * You can use this error to notify callers that the task has been aborted,
     * for example through a rejected Promise.
     *
     * @return {Function} - Removes that cancellation listener. You can call this
     * once you don't want the callback to be triggered anymore (e.g. after the
     * task succeeded or failed).
     * You don't need to call that function when cancellation has already been
     * performed.
     */
    register(fn) {
      if (this._isCancelled) {
        assert(this.cancellationError !== null);
        fn(this.cancellationError);
        return noop_default;
      }
      this._listeners.push(fn);
      return () => this.deregister(fn);
    }
    /**
     * De-register a function registered through the `register` function.
     * Do nothing if that function wasn't registered.
     *
     * You can call this method when using the return value of `register` is not
     * practical.
     * @param {Function} fn
     */
    deregister(fn) {
      for (let i = this._listeners.length - 1; i >= 0; i--) {
        if (this._listeners[i] === fn) {
          this._listeners.splice(i, 1);
        }
      }
    }
  };
  var CancellationError = class _CancellationError extends Error {
    /**
     * Create a `CancellationError`
     * @param {string|undefined} taskName - Descriptive "name" for the task you
     * just cancelled. This is used for debugging purposes: this string
     *  will both be logged and be inserted in this `CancellationError`'s
     *  `message` property.
     * By setting it to `undefined`, you indicate that this task does not need
     * those supplementary debug information and does not need to be logged.
     * @param {string|undefined} reason - Human-readable reason for the
     * cancellation.
     */
    constructor(taskName, reason) {
      let message = taskName !== void 0 ? `"${taskName}" task cancelled.` : "This task was cancelled.";
      if (reason !== void 0) {
        message += " Reason: " + reason;
      }
      super(message);
      Object.setPrototypeOf(this, _CancellationError.prototype);
      this.name = "CancellationError";
      this.reason = reason;
      if (taskName !== void 0) {
        log_default.debug(
          "utils",
          `task cancellation: "${taskName}"` + (reason === void 0 ? "" : ` - Reason: "${reason}"`)
        );
      }
    }
  };
  function createCancellationFunctions() {
    let listener = noop_default;
    return [
      function trigger(error) {
        listener(error);
      },
      function register(newListener) {
        listener = newListener;
      }
    ];
  }

  // src/compat/event_listeners.ts
  var BROWSER_PREFIXES = ["", "webkit", "moz", "ms"];
  function isEventSupported(element, eventNameSuffix) {
    const clone = document.createElement(element.tagName);
    const eventName = "on" + eventNameSuffix;
    if (eventName in clone) {
      return true;
    } else {
      clone.setAttribute(eventName, "return;");
      return typeof clone[eventName] === "function";
    }
  }
  function findSupportedEvent(element, eventNames) {
    return eventNames.filter((name) => isEventSupported(element, name))[0];
  }
  function eventPrefixed(eventNames, prefixes) {
    return eventNames.reduce(
      (parent, name) => parent.concat(
        (prefixes === void 0 ? BROWSER_PREFIXES : prefixes).map((p) => p + name)
      ),
      []
    );
  }
  function createCompatibleEventListener(eventNames, prefixes) {
    let mem;
    const prefixedEvents = eventPrefixed(eventNames, prefixes);
    return (element, listener, cancelSignal) => {
      if (cancelSignal.isCancelled()) {
        return;
      }
      if (typeof HTMLElement !== "undefined" && element instanceof HTMLElement) {
        if (typeof mem === "undefined") {
          mem = findSupportedEvent(element, prefixedEvents);
        }
        if (isNonEmptyString(mem)) {
          element.addEventListener(mem, listener);
          cancelSignal.register(() => {
            if (mem !== void 0) {
              element.removeEventListener(mem, listener);
            }
          });
        } else {
          log_default.warn(
            "utils",
            `element ${element.tagName} does not support any of these events: ` + prefixedEvents.join(", ")
          );
          return;
        }
      }
      prefixedEvents.forEach((eventName) => {
        let hasSetOnFn = false;
        if (typeof element.addEventListener === "function") {
          element.addEventListener(eventName, listener);
        } else {
          hasSetOnFn = true;
          element["on" + eventName] = listener;
        }
        cancelSignal.register(() => {
          if (typeof element.removeEventListener === "function") {
            element.removeEventListener(eventName, listener);
          }
          if (hasSetOnFn) {
            delete element["on" + eventName];
          }
        });
      });
    };
  }
  var onLoadedMetadata = createCompatibleEventListener(["loadedmetadata"]);
  var onTimeUpdate = createCompatibleEventListener(["timeupdate"]);
  var onTextTrackAdded = createCompatibleEventListener(["addtrack"]);
  var onTextTrackRemoved = createCompatibleEventListener(["removetrack"]);
  var onSourceOpen = createCompatibleEventListener(["sourceopen", "webkitsourceopen"]);
  var onSourceClose = createCompatibleEventListener(["sourceclose", "webkitsourceclose"]);
  var onSourceEnded = createCompatibleEventListener(["sourceended", "webkitsourceended"]);
  var onSourceBufferUpdate = createCompatibleEventListener(["update"]);
  var onRemoveSourceBuffers = createCompatibleEventListener(["removesourcebuffer"]);
  var onKeyMessage = createCompatibleEventListener(["keymessage", "message"]);
  var onKeyAdded = createCompatibleEventListener(["keyadded", "ready"]);
  var onKeyError = createCompatibleEventListener(["keyerror", "error"]);
  var onKeyStatusesChange = createCompatibleEventListener(["keystatuseschange"]);
  var onSeeking = createCompatibleEventListener(["seeking"]);
  var onSeeked = createCompatibleEventListener(["seeked"]);
  var onEnded = createCompatibleEventListener(["ended"]);

  // src/utils/base64.ts
  var base64codes = [
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    62,
    255,
    255,
    255,
    63,
    52,
    53,
    54,
    55,
    56,
    57,
    58,
    59,
    60,
    61,
    255,
    255,
    255,
    0,
    255,
    255,
    255,
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    21,
    22,
    23,
    24,
    25,
    255,
    255,
    255,
    255,
    255,
    255,
    26,
    27,
    28,
    29,
    30,
    31,
    32,
    33,
    34,
    35,
    36,
    37,
    38,
    39,
    40,
    41,
    42,
    43,
    44,
    45,
    46,
    47,
    48,
    49,
    50,
    51
  ];
  function getBase64Code(charCode) {
    if (charCode >= base64codes.length) {
      throw new Error("Unable to parse base64 string.");
    }
    const code = base64codes[charCode];
    if (code === 255) {
      throw new Error("Unable to parse base64 string.");
    }
    return code;
  }
  function base64ToBytes(str) {
    const paddingNeeded = str.length % 4;
    let paddedStr = str;
    if (paddingNeeded !== 0) {
      log_default.warn("utils", "base64ToBytes: base64 given miss padding", {
        padding: paddingNeeded
      });
      paddedStr += paddingNeeded === 3 ? "=" : paddingNeeded === 2 ? "==" : "===";
    }
    const index = paddedStr.indexOf("=");
    if (index !== -1 && index < paddedStr.length - 2) {
      throw new Error("Unable to parse base64 string.");
    }
    const missingOctets = paddedStr.endsWith("==") ? 2 : paddedStr.endsWith("=") ? 1 : 0;
    const n = paddedStr.length;
    const result = new Uint8Array(n / 4 * 3);
    let buffer;
    for (let i = 0, j = 0; i < n; i += 4, j += 3) {
      buffer = getBase64Code(paddedStr.charCodeAt(i)) << 18 | getBase64Code(paddedStr.charCodeAt(i + 1)) << 12 | getBase64Code(paddedStr.charCodeAt(i + 2)) << 6 | getBase64Code(paddedStr.charCodeAt(i + 3));
      result[j] = buffer >> 16;
      result[j + 1] = buffer >> 8 & 255;
      result[j + 2] = buffer & 255;
    }
    return result.subarray(0, result.length - missingOctets);
  }

  // src/utils/byte_parsing.ts
  function concat(...args) {
    const l = args.length;
    let i = -1;
    let len = 0;
    let arg;
    while (++i < l) {
      arg = args[i];
      len += typeof arg === "number" ? arg : arg.length;
    }
    const arr = new Uint8Array(len);
    let offset = 0;
    i = -1;
    while (++i < l) {
      arg = args[i];
      if (typeof arg === "number") {
        offset += arg;
      } else if (arg.length > 0) {
        arr.set(arg, offset);
        offset += arg.length;
      }
    }
    return arr;
  }
  function be2toi(bytes, offset) {
    return (bytes[offset + 0] << 8) + (bytes[offset + 1] << 0);
  }
  function be3toi(bytes, offset) {
    return bytes[offset + 0] * 65536 + bytes[offset + 1] * 256 + bytes[offset + 2];
  }
  function be4toi(bytes, offset) {
    return bytes[offset + 0] * 16777216 + bytes[offset + 1] * 65536 + bytes[offset + 2] * 256 + bytes[offset + 3];
  }
  function be8toi(bytes, offset) {
    return (bytes[offset + 0] * 16777216 + bytes[offset + 1] * 65536 + bytes[offset + 2] * 256 + bytes[offset + 3]) * 4294967296 + bytes[offset + 4] * 16777216 + bytes[offset + 5] * 65536 + bytes[offset + 6] * 256 + bytes[offset + 7];
  }
  function toUint8Array(input) {
    if (input instanceof Uint8Array) {
      return input;
    } else if (input instanceof ArrayBuffer) {
      return new Uint8Array(input);
    } else {
      return new Uint8Array(input.buffer);
    }
  }

  // src/utils/starts_with.ts
  function startsWith(completeString, searchString, position) {
    if (typeof String.prototype.startsWith === "function") {
      return completeString.startsWith(searchString, position);
    }
    const initialPosition = typeof position === "number" ? Math.max(position, 0) : 0;
    return completeString.substring(initialPosition, initialPosition + searchString.length) === searchString;
  }

  // src/parsers/containers/isobmff/find_complete_box.ts
  function findCompleteBox(buf, wantedName) {
    const len = buf.length;
    let i = 0;
    while (i + 8 <= len) {
      let size = be4toi(buf, i);
      if (size === 0) {
        size = len - i;
      } else if (size === 1) {
        if (i + 16 > len) {
          return -1;
        }
        size = be8toi(buf, i + 8);
      }
      if (isNaN(size) || size <= 0) {
        return -1;
      }
      const name = be4toi(buf, i + 4);
      if (name === wantedName) {
        if (i + size <= len) {
          return i;
        }
        return -1;
      }
      i += size;
    }
    return -1;
  }

  // src/parsers/containers/isobmff/extract_complete_chunks.ts
  function extractCompleteChunks(buffer) {
    let _position = 0;
    const chunks = [];
    let currentBuffer = null;
    while (_position <= buffer.length) {
      if (_position === buffer.length) {
        currentBuffer = null;
        break;
      }
      currentBuffer = buffer.subarray(_position, Infinity);
      const moofIndex = findCompleteBox(
        currentBuffer,
        1836019558
        /* moof */
      );
      if (moofIndex < 0) {
        break;
      }
      const moofLen = be4toi(buffer, moofIndex + _position);
      const moofEnd = _position + moofIndex + moofLen;
      if (moofEnd > buffer.length) {
        break;
      }
      const mdatIndex = findCompleteBox(
        currentBuffer,
        1835295092
        /* mdat */
      );
      if (mdatIndex < 0) {
        break;
      }
      const mdatLen = be4toi(buffer, mdatIndex + _position);
      const mdatEnd = _position + mdatIndex + mdatLen;
      if (mdatEnd > buffer.length) {
        break;
      }
      const maxEnd = Math.max(moofEnd, mdatEnd);
      const chunk = buffer.subarray(_position, maxEnd);
      chunks.push(chunk);
      _position = maxEnd;
    }
    if (chunks.length === 0) {
      return [null, currentBuffer];
    }
    return [chunks, currentBuffer];
  }

  // src/utils/slice_uint8array.ts
  function arraySlice(arr, start, end) {
    return new Uint8Array(Array.prototype.slice.call(arr, start, end));
  }
  function uint8ArraySlice(arr, start, end) {
    return arr.slice(start, end);
  }
  var slice_uint8array_default = typeof Uint8Array.prototype.slice === "function" ? uint8ArraySlice : arraySlice;

  // src/parsers/containers/isobmff/get_box.ts
  function getChildBox(buf, childNames) {
    let currBox = buf;
    for (const childName of childNames) {
      const box = getBoxContent(currBox, childName);
      if (box === null) {
        return null;
      }
      currBox = box;
    }
    return currBox;
  }
  function getBoxContent(buf, boxName) {
    const offsets = getBoxOffsets(buf, boxName);
    return offsets !== null ? buf.subarray(offsets[1], offsets[2]) : null;
  }
  function getBoxesContent(buf, boxName) {
    const ret = [];
    let currentBuf = buf;
    while (true) {
      const offsets = getBoxOffsets(currentBuf, boxName);
      if (offsets === null) {
        return ret;
      }
      assert(offsets[2] !== 0 && currentBuf.length !== 0);
      ret.push(currentBuf.subarray(offsets[1], offsets[2]));
      currentBuf = currentBuf.subarray(offsets[2]);
    }
  }
  function getBoxOffsets(buf, boxName) {
    const len = buf.length;
    let boxBaseOffset = 0;
    let name;
    let lastBoxSize = 0;
    let lastOffset;
    while (boxBaseOffset + 8 <= len) {
      lastOffset = boxBaseOffset;
      lastBoxSize = be4toi(buf, lastOffset);
      lastOffset += 4;
      name = be4toi(buf, lastOffset);
      lastOffset += 4;
      if (lastBoxSize === 0) {
        lastBoxSize = len - boxBaseOffset;
      } else if (lastBoxSize === 1) {
        if (lastOffset + 8 > len) {
          return null;
        }
        lastBoxSize = be8toi(buf, lastOffset);
        lastOffset += 8;
      }
      if (lastBoxSize < 0) {
        throw new Error("ISOBMFF: Size out of range");
      }
      if (name === boxName) {
        if (boxName === 1970628964) {
          lastOffset += 16;
        }
        return [boxBaseOffset, lastOffset, boxBaseOffset + lastBoxSize];
      } else {
        boxBaseOffset += lastBoxSize;
      }
    }
    return null;
  }

  // src/parsers/containers/isobmff/take_pssh_out.ts
  function takePSSHOut(data) {
    let i = 0;
    const moov = getBoxContent(
      data,
      1836019574
      /* moov */
    );
    if (moov === null) {
      return [];
    }
    const psshBoxes = [];
    while (i < moov.length) {
      let psshOffsets;
      try {
        psshOffsets = getBoxOffsets(
          moov,
          1886614376
          /* pssh */
        );
      } catch (e) {
        const err = e instanceof Error ? e : "";
        log_default.warn("isobmff", "Error while removing PSSH from ISOBMFF", err);
        return psshBoxes;
      }
      if (psshOffsets === null) {
        return psshBoxes;
      }
      const pssh = slice_uint8array_default(moov, psshOffsets[0], psshOffsets[2]);
      const systemId = getPsshSystemID(pssh, psshOffsets[1] - psshOffsets[0]);
      if (systemId !== void 0) {
        psshBoxes.push({ systemId, data: pssh });
      }
      moov[psshOffsets[0] + 4] = 102;
      moov[psshOffsets[0] + 5] = 114;
      moov[psshOffsets[0] + 6] = 101;
      moov[psshOffsets[0] + 7] = 101;
      i = psshOffsets[2];
    }
    return psshBoxes;
  }
  function getPsshSystemID(buff, initialDataOffset) {
    if (buff[initialDataOffset] > 1) {
      log_default.warn("isobmff", "un-handled PSSH version");
      return void 0;
    }
    const offset = initialDataOffset + 4;
    if (offset + 16 > buff.length) {
      return void 0;
    }
    const systemIDBytes = slice_uint8array_default(buff, offset, offset + 16);
    return bytesToHex(systemIDBytes);
  }

  // src/parsers/containers/isobmff/read.ts
  function getTRAF(buffer) {
    const moof = getBoxContent(
      buffer,
      1836019558
      /* moof */
    );
    if (moof === null) {
      return null;
    }
    return getBoxContent(
      moof,
      1953653094
      /* traf */
    );
  }
  function getTRAFs(buffer) {
    const moofs = getBoxesContent(
      buffer,
      1836019558
      /* moof */
    );
    return moofs.reduce((acc, moof) => {
      const traf = getBoxContent(
        moof,
        1953653094
        /* traf */
      );
      if (traf !== null) {
        acc.push(traf);
      }
      return acc;
    }, []);
  }
  function getMDAT(buf) {
    return getBoxContent(
      buf,
      1835295092
      /* "mdat" */
    );
  }
  function getMDIA(buf) {
    const moov = getBoxContent(
      buf,
      1836019574
      /* moov */
    );
    if (moov === null) {
      return null;
    }
    const trak = getBoxContent(
      moov,
      1953653099
      /* "trak" */
    );
    if (trak === null) {
      return null;
    }
    return getBoxContent(
      trak,
      1835297121
      /* "mdia" */
    );
  }
  function getEMSG(buffer, offset = 0) {
    return getBoxContent(
      buffer.subarray(offset),
      1701671783
      /* emsg */
    );
  }

  // src/parsers/containers/isobmff/utils.ts
  function getSegmentsFromSidx(buf, sidxOffsetInWholeSegment) {
    const sidxOffsets = getBoxOffsets(
      buf,
      1936286840
      /* "sidx" */
    );
    if (sidxOffsets === null) {
      return null;
    }
    let offset = sidxOffsetInWholeSegment;
    const boxSize = sidxOffsets[2] - sidxOffsets[0];
    let cursor = sidxOffsets[1];
    const version = buf[cursor];
    cursor += 4 + 4;
    const timescale = be4toi(buf, cursor);
    cursor += 4;
    let time;
    if (version === 0) {
      time = be4toi(buf, cursor);
      cursor += 4;
      offset += be4toi(buf, cursor) + boxSize;
      cursor += 4;
    } else if (version === 1) {
      time = be8toi(buf, cursor);
      cursor += 8;
      offset += be8toi(buf, cursor) + boxSize;
      cursor += 8;
    } else {
      return null;
    }
    const segments = [];
    cursor += 2;
    let count = be2toi(buf, cursor);
    cursor += 2;
    while (--count >= 0) {
      const refChunk = be4toi(buf, cursor);
      cursor += 4;
      const refType = (refChunk & 2147483648) >>> 31;
      const refSize = refChunk & 2147483647;
      if (refType === 1) {
        throw new Error("sidx with reference_type `1` not yet implemented");
      }
      const duration = be4toi(buf, cursor);
      cursor += 4;
      cursor += 4;
      segments.push({
        time,
        duration,
        timescale,
        range: [offset, offset + refSize - 1]
      });
      time += duration;
      offset += refSize;
    }
    return segments;
  }
  function getTrackFragmentDecodeTime(buffer) {
    const traf = getTRAF(buffer);
    if (traf === null) {
      return void 0;
    }
    const tfdt = getBoxContent(
      traf,
      1952867444
      /* tfdt */
    );
    if (tfdt === null) {
      return void 0;
    }
    const version = tfdt[0];
    if (version === 1) {
      return be8toi(tfdt, 4);
    }
    if (version === 0) {
      return be4toi(tfdt, 4);
    }
    return void 0;
  }
  function getDefaultDurationFromTFHDInTRAF(traf) {
    const tfhd = getBoxContent(
      traf,
      1952868452
      /* tfhd */
    );
    if (tfhd === null) {
      return void 0;
    }
    let cursor = (
      /* version */
      1
    );
    const flags = be3toi(tfhd, cursor);
    cursor += 3;
    const hasBaseDataOffset = (flags & 1) > 0;
    const hasSampleDescriptionIndex = (flags & 2) > 0;
    const hasDefaultSampleDuration = (flags & 8) > 0;
    if (!hasDefaultSampleDuration) {
      return void 0;
    }
    cursor += 4;
    if (hasBaseDataOffset) {
      cursor += 8;
    }
    if (hasSampleDescriptionIndex) {
      cursor += 4;
    }
    const defaultDuration = be4toi(tfhd, cursor);
    return defaultDuration;
  }
  function getDurationFromTrun(buffer) {
    const trafs = getTRAFs(buffer);
    if (trafs.length === 0) {
      return void 0;
    }
    let completeDuration = 0;
    for (const traf of trafs) {
      const trun = getBoxContent(
        traf,
        1953658222
        /* trun */
      );
      if (trun === null) {
        return void 0;
      }
      let cursor = 0;
      const version = trun[cursor];
      cursor += 1;
      if (version > 1) {
        return void 0;
      }
      const flags = be3toi(trun, cursor);
      cursor += 3;
      const hasSampleDuration = (flags & 256) > 0;
      let defaultDuration = 0;
      if (!hasSampleDuration) {
        defaultDuration = getDefaultDurationFromTFHDInTRAF(traf);
        if (defaultDuration === void 0) {
          return void 0;
        }
      }
      const hasDataOffset = (flags & 1) > 0;
      const hasFirstSampleFlags = (flags & 4) > 0;
      const hasSampleSize = (flags & 512) > 0;
      const hasSampleFlags = (flags & 1024) > 0;
      const hasSampleCompositionOffset = (flags & 2048) > 0;
      const sampleCounts = be4toi(trun, cursor);
      cursor += 4;
      if (hasDataOffset) {
        cursor += 4;
      }
      if (hasFirstSampleFlags) {
        cursor += 4;
      }
      let i = sampleCounts;
      let duration = 0;
      while (i-- > 0) {
        if (hasSampleDuration) {
          duration += be4toi(trun, cursor);
          cursor += 4;
        } else {
          duration += defaultDuration;
        }
        if (hasSampleSize) {
          cursor += 4;
        }
        if (hasSampleFlags) {
          cursor += 4;
        }
        if (hasSampleCompositionOffset) {
          cursor += 4;
        }
      }
      completeDuration += duration;
    }
    return completeDuration;
  }
  function getMDHDTimescale(buffer) {
    const mdia = getMDIA(buffer);
    if (mdia === null) {
      return void 0;
    }
    const mdhd = getBoxContent(
      mdia,
      1835296868
      /* "mdhd" */
    );
    if (mdhd === null) {
      return void 0;
    }
    let cursor = 0;
    const version = mdhd[cursor];
    cursor += 4;
    if (version === 1) {
      return be4toi(mdhd, cursor + 16);
    } else if (version === 0) {
      return be4toi(mdhd, cursor + 8);
    }
    return void 0;
  }
  function parseEmsgBoxes(buffer) {
    const emsgs = [];
    let offset = 0;
    while (offset < buffer.length) {
      const emsg = getEMSG(buffer, offset);
      if (emsg === null) {
        break;
      }
      const length = emsg.length;
      offset += length;
      const version = emsg[0];
      if (version !== 0) {
        log_default.warn("isobmff", "EMSG version " + version.toString() + " not supported.");
      } else {
        let position = 4;
        const { end: schemeIdEnd, string: schemeIdUri } = readNullTerminatedString(
          emsg,
          position
        );
        position = schemeIdEnd;
        const { end: valueEnd, string: value } = readNullTerminatedString(emsg, position);
        position = valueEnd;
        const timescale = be4toi(emsg, position);
        position += 4;
        const presentationTimeDelta = be4toi(emsg, position);
        position += 4;
        const eventDuration = be4toi(emsg, position);
        position += 4;
        const id = be4toi(emsg, position);
        position += 4;
        const messageData = emsg.subarray(position, length);
        const emsgData = {
          schemeIdUri,
          value,
          timescale,
          presentationTimeDelta,
          eventDuration,
          id,
          messageData
        };
        emsgs.push(emsgData);
      }
    }
    if (emsgs.length === 0) {
      return void 0;
    }
    return emsgs;
  }
  function getKeyIdFromInitSegment(segment) {
    const stsd = getChildBox(
      segment,
      [
        1836019574,
        1953653099,
        1835297121,
        1835626086,
        1937007212,
        1937011556
      ]
    );
    if (stsd === null) {
      return null;
    }
    const stsdSubBoxes = stsd.subarray(8);
    let encBox = getBoxContent(
      stsdSubBoxes,
      1701733238
      /* encv */
    );
    let encContentOffset = 0;
    if (encBox === null) {
      encContentOffset = 8 + // sample entry header
      8 + // reserved
      2 + // channelcount
      2 + // samplesize
      2 + // predefined
      2 + // reserved
      4;
      encBox = getBoxContent(
        stsdSubBoxes,
        1701733217
        /* enca */
      );
    } else {
      encContentOffset = 8 + // sample entry header
      2 + 2 + 12 + // predefined + reserved + predefined
      2 + 2 + // width + height
      4 + 4 + // horizresolution + vertresolution
      4 + // reserved
      2 + // frame_count
      32 + 2 + // depth
      2;
    }
    if (encBox === null) {
      return null;
    }
    const tenc = getChildBox(
      encBox.subarray(encContentOffset),
      [
        1936289382,
        1935894633,
        1952804451
        /* tenc */
      ]
    );
    if (tenc === null || tenc.byteLength < 24) {
      return null;
    }
    const keyId = tenc.subarray(8, 24);
    return keyId.every((b) => b === 0) ? null : keyId;
  }

  // src/utils/array_includes.ts
  function arrayIncludes(arr, searchElement, fromIndex) {
    if (typeof Array.prototype.includes === "function") {
      return arr.includes(searchElement, fromIndex);
    }
    const len = arr.length >>> 0;
    if (len === 0) {
      return false;
    }
    const n = fromIndex | 0;
    let k = n >= 0 ? Math.min(n, len - 1) : Math.max(len + n, 0);
    const areTheSame = (x, y) => x === y || // Viva las JavaScriptas!
    typeof x === "number" && typeof y === "number" && isNaN(x) && isNaN(y);
    while (k < len) {
      if (areTheSame(arr[k], searchElement)) {
        return true;
      }
      k++;
    }
    return false;
  }

  // src/utils/are_codecs_compatible.ts
  function areCodecsCompatible(a, b) {
    const { mimeType: mimeTypeA, codecs: codecsA } = parseCodec(a);
    const { mimeType: mimeTypeB, codecs: codecsB } = parseCodec(b);
    if (mimeTypeA !== mimeTypeB) {
      return false;
    }
    if (codecsA === "" || codecsB === "") {
      return false;
    }
    let initialPartA = codecsA.split(".")[0];
    initialPartA = initialPartA === "hev1" ? "hvc1" : initialPartA;
    let initialPartB = codecsB.split(".")[0];
    initialPartB = initialPartB === "hev1" ? "hvc1" : initialPartB;
    if (initialPartA !== initialPartB) {
      return false;
    }
    return true;
  }
  var LENGTH_OF_CODEC_PREFIX = "codecs=".length;
  function parseCodec(unparsedCodec) {
    var _a2;
    const [mimeType, ...props] = unparsedCodec.split(";");
    let codecs = (_a2 = arrayFind(props, (prop) => startsWith(prop, "codecs="))) != null ? _a2 : "";
    codecs = codecs.substring(LENGTH_OF_CODEC_PREFIX);
    if (codecs[0] === '"') {
      codecs = codecs.substring(1, codecs.length - 1);
    }
    return { mimeType, codecs };
  }
  var are_codecs_compatible_default = areCodecsCompatible;

  // src/utils/flat_map.ts
  function flatMap(originalArray, fn) {
    if (typeof Array.prototype.flatMap === "function") {
      return originalArray.flatMap(fn);
    }
    return originalArray.reduce((acc, arg) => {
      const r = fn(arg);
      if (Array.isArray(r)) {
        acc.push(...r);
        return acc;
      }
      acc.push(r);
      return acc;
    }, []);
  }

  // src/utils/get_fuzzed_delay.ts
  var FUZZ_FACTOR = 0.3;
  function getFuzzedDelay(retryDelay) {
    const fuzzingFactor = (Math.random() * 2 - 1) * FUZZ_FACTOR;
    return retryDelay * (fuzzingFactor + 1);
  }

  // src/main_thread/init/utils/update_manifest_codec_support.ts
  function getCodecsWithUnknownSupport(manifest) {
    var _a2, _b2, _c2, _d2, _e2;
    const codecsWithUnknownSupport = [];
    for (const period of manifest.periods) {
      const checkedAdaptations = [
        ...(_a2 = period.adaptations.video) != null ? _a2 : [],
        ...(_b2 = period.adaptations.audio) != null ? _b2 : []
      ];
      for (const adaptation of checkedAdaptations) {
        if (!adaptation.supportStatus.hasCodecWithUndefinedSupport) {
          continue;
        }
        for (const representation of adaptation.representations) {
          if (representation.isSupported === void 0) {
            codecsWithUnknownSupport.push({
              mimeType: (_c2 = representation.mimeType) != null ? _c2 : "",
              codec: (_e2 = (_d2 = representation.codecs) == null ? void 0 : _d2[0]) != null ? _e2 : ""
            });
          }
        }
      }
    }
    return codecsWithUnknownSupport;
  }

  // src/utils/warn_once.ts
  var WARNED_MESSAGES = [];
  function warnOnce(message) {
    if (!arrayIncludes(WARNED_MESSAGES, message)) {
      console.warn(message);
      WARNED_MESSAGES.push(message);
    }
  }

  // src/manifest/classes/codec_support_cache.ts
  var CodecSupportCache = class {
    /**
     * Constructs an CodecSupportCache instance.
     * @param {Array} codecList - List of codec support information.
     */
    constructor(codecList) {
      this.supportMap = /* @__PURE__ */ new Map();
      this.addCodecs(codecList);
    }
    /**
     * Adds codec support information to this `CodecSupportCache`.
     * @param {Array} codecList - List of codec support information.
     */
    addCodecs(codecList) {
      for (const codec of codecList) {
        let mimeTypeMap = this.supportMap.get(codec.mimeType);
        if (mimeTypeMap === void 0) {
          mimeTypeMap = /* @__PURE__ */ new Map();
          this.supportMap.set(codec.mimeType, mimeTypeMap);
        }
        mimeTypeMap.set(codec.codec, {
          supported: codec.supported,
          supportedIfEncrypted: codec.supportedIfEncrypted
        });
      }
    }
    /**
     * Checks if a codec is supported for a given MIME type.
     * @param {string} mimeType - The MIME type to check.
     * @param {string} codec - The codec to check.
     * @param {boolean} isEncrypted - Whether the content is encrypted.
     * @returns {boolean | undefined} - `true` if the codec is supported, `false`
     * if not, or `undefined` if no support information is found.
     */
    isSupported(mimeType, codec, isEncrypted) {
      const mimeTypeMap = this.supportMap.get(mimeType);
      if (mimeTypeMap === void 0) {
        return void 0;
      }
      const result = mimeTypeMap.get(codec);
      if (result === void 0) {
        return void 0;
      }
      if (isEncrypted) {
        return result.supportedIfEncrypted;
      } else {
        return result.supported;
      }
    }
  };

  // src/manifest/classes/period.ts
  var Period = class {
    /**
     * @constructor
     * @param {Object} args
     * @param {function|undefined} [representationFilter]
     */
    constructor(args, cachedCodecSupport, representationFilter) {
      this.id = args.id;
      this.adaptations = createAdaptationsObject(
        args.adaptations,
        cachedCodecSupport,
        representationFilter
      );
      if (isArrayEmpty(this.adaptations.video) && isArrayEmpty(this.adaptations.audio)) {
        throw new MediaError(
          "MANIFEST_PARSE_ERROR",
          "The manifest has no video nor audio tracks."
        );
      }
      this.thumbnailTracks = args.thumbnailTracks.map((thumbnailTrack) => ({
        id: thumbnailTrack.id,
        mimeType: thumbnailTrack.mimeType,
        index: thumbnailTrack.index,
        cdnMetadata: thumbnailTrack.cdnMetadata,
        height: thumbnailTrack.height,
        width: thumbnailTrack.width,
        horizontalTiles: thumbnailTrack.horizontalTiles,
        verticalTiles: thumbnailTrack.verticalTiles,
        start: thumbnailTrack.start,
        end: thumbnailTrack.end,
        tileDuration: thumbnailTrack.tileDuration
      }));
      this.duration = args.duration;
      this.start = args.start;
      if (!isNullOrUndefined(this.duration) && !isNullOrUndefined(this.start)) {
        this.end = this.start + this.duration;
      }
      this.streamEvents = args.streamEvents === void 0 ? [] : args.streamEvents;
    }
    /**
     * Some environments (e.g. in a WebWorker) may not have the capability to know
     * if a mimetype+codec combination is supported on the current platform.
     *
     * Calling `refreshCodecSupport` manually once the codecs supported are known
     * by the current environnement allows to work-around this issue.
     *
     * @param {Array.<Object>} unsupportedAdaptations - Array on which
     * `Adaptation`s objects which are now known to have no supported
     * `Representation` will be pushed.
     * This array might be useful for minor error reporting.
     * @param {Array.<Object>} cachedCodecSupport
     */
    refreshCodecSupport(unsupportedAdaptations, cachedCodecSupport) {
      Object.keys(this.adaptations).forEach((ttype) => {
        const adaptationsForType = this.adaptations[ttype];
        if (adaptationsForType === void 0) {
          return;
        }
        for (const adaptation of adaptationsForType) {
          if (!adaptation.supportStatus.hasCodecWithUndefinedSupport) {
            continue;
          }
          const wasSupported = adaptation.supportStatus.hasSupportedCodec;
          adaptation.refreshCodecSupport(cachedCodecSupport);
          if (wasSupported !== false && adaptation.supportStatus.hasSupportedCodec === false) {
            unsupportedAdaptations.push(adaptation);
          }
        }
      }, {});
    }
    /**
     * Returns every `Adaptations` (or `tracks`) linked to that Period, in an
     * Array.
     * @returns {Array.<Object>}
     */
    getAdaptations() {
      return getAdaptations(this);
    }
    /**
     * Returns every `Adaptations` (or `tracks`) linked to that Period for a
     * given type.
     * @param {string} adaptationType
     * @returns {Array.<Object>}
     */
    getAdaptationsForType(adaptationType) {
      const adaptationsForType = this.adaptations[adaptationType];
      return adaptationsForType != null ? adaptationsForType : [];
    }
    /**
     * Returns the Adaptation linked to the given ID.
     * @param {number|string} wantedId
     * @returns {Object|undefined}
     */
    getAdaptation(wantedId) {
      return arrayFind(this.getAdaptations(), ({ id }) => wantedId === id);
    }
    /**
     * Returns Adaptations that contain Representations in supported codecs.
     * @param {string|undefined} type - If set filter on a specific Adaptation's
     * type. Will return for all types if `undefined`.
     * @returns {Array.<Adaptation>}
     */
    getSupportedAdaptations(type) {
      return getSupportedAdaptations(this, type);
    }
    /**
     * Returns true if the give time is in the time boundaries of this `Period`.
     * @param {number} time
     * @param {object|null} nextPeriod - Period coming chronologically just
     * after in the same Manifest. `null` if this instance is the last `Period`.
     * @returns {boolean}
     */
    containsTime(time, nextPeriod) {
      return periodContainsTime(this, time, nextPeriod);
    }
    /**
     * Format the current `Period`'s properties into a
     * `IPeriodMetadata` format which can better be communicated through
     * another thread.
     *
     * Please bear in mind however that the returned object will not be updated
     * when the current `Period` instance is updated, it is only a
     * snapshot at the current time.
     *
     * If you want to keep that data up-to-date with the current `Period`
     * instance, you will have to do it yourself.
     *
     * @returns {Object}
     */
    getMetadataSnapshot() {
      const adaptations = {};
      const baseAdaptations = this.getAdaptations();
      for (const adaptation of baseAdaptations) {
        let currentAdaps = adaptations[adaptation.type];
        if (currentAdaps === void 0) {
          currentAdaps = [];
          adaptations[adaptation.type] = currentAdaps;
        }
        currentAdaps.push(adaptation.getMetadataSnapshot());
      }
      return {
        start: this.start,
        end: this.end,
        id: this.id,
        streamEvents: this.streamEvents,
        adaptations,
        thumbnailTracks: this.thumbnailTracks.map((thumbnailTrack) => ({
          id: thumbnailTrack.id,
          mimeType: thumbnailTrack.mimeType,
          height: thumbnailTrack.height,
          width: thumbnailTrack.width,
          horizontalTiles: thumbnailTrack.horizontalTiles,
          verticalTiles: thumbnailTrack.verticalTiles,
          start: thumbnailTrack.start,
          end: thumbnailTrack.end,
          tileDuration: thumbnailTrack.tileDuration
        }))
      };
    }
  };
  function isArrayEmpty(array) {
    if (!Array.isArray(array)) {
      return true;
    } else {
      return array.length === 0;
    }
  }
  function createAdaptationsObject(adaptations, cachedCodecSupport, representationFilter) {
    const manifestAdaptations = {};
    for (const [type, adaptationsForType] of Object.entries(adaptations)) {
      if (isNullOrUndefined(adaptationsForType)) {
        continue;
      }
      manifestAdaptations[type] = adaptationsForType.map((adaptation) => {
        const newAdaptation = new Adaptation(adaptation, cachedCodecSupport, {
          representationFilter
        });
        return newAdaptation;
      }).filter(
        (adaptation) => adaptation.representations.length > 0
      );
    }
    return manifestAdaptations;
  }

  // src/manifest/classes/update_period_in_place.ts
  function updatePeriodInPlace(oldPeriod, newPeriod, updateType) {
    const res = {
      updatedAdaptations: [],
      removedAdaptations: [],
      addedAdaptations: [],
      updatedThumbnailTracks: [],
      removedThumbnailTracks: [],
      addedThumbnailTracks: []
    };
    oldPeriod.start = newPeriod.start;
    oldPeriod.end = newPeriod.end;
    oldPeriod.duration = newPeriod.duration;
    oldPeriod.streamEvents = newPeriod.streamEvents;
    const oldThumbnailTracks = oldPeriod.thumbnailTracks;
    const newThumbnailTracks = newPeriod.thumbnailTracks;
    for (let j = 0; j < oldThumbnailTracks.length; j++) {
      const oldThumbnailTrack = oldThumbnailTracks[j];
      const newThumbnailTrackIdx = arrayFindIndex(
        newThumbnailTracks,
        (a) => a.id === oldThumbnailTrack.id
      );
      if (newThumbnailTrackIdx === -1) {
        log_default.warn(
          "manifest",
          'ThumbnailTrack "' + oldThumbnailTracks[j].id + '" not found when merging.'
        );
        const [removed] = oldThumbnailTracks.splice(j, 1);
        j--;
        res.removedThumbnailTracks.push({
          id: removed.id
        });
      } else {
        const [newThumbnailTrack] = newThumbnailTracks.splice(newThumbnailTrackIdx, 1);
        oldThumbnailTrack.mimeType = newThumbnailTrack.mimeType;
        oldThumbnailTrack.height = newThumbnailTrack.height;
        oldThumbnailTrack.width = newThumbnailTrack.width;
        oldThumbnailTrack.horizontalTiles = newThumbnailTrack.horizontalTiles;
        oldThumbnailTrack.verticalTiles = newThumbnailTrack.verticalTiles;
        oldThumbnailTrack.start = newThumbnailTrack.start;
        oldThumbnailTrack.end = newThumbnailTrack.end;
        oldThumbnailTrack.tileDuration = newThumbnailTrack.tileDuration;
        oldThumbnailTrack.cdnMetadata = newThumbnailTrack.cdnMetadata;
        if (updateType === 0 /* Full */) {
          oldThumbnailTrack.index._replace(newThumbnailTrack.index);
        } else {
          oldThumbnailTrack.index._update(newThumbnailTrack.index);
        }
        res.updatedThumbnailTracks.push({
          id: oldThumbnailTrack.id,
          mimeType: oldThumbnailTrack.mimeType,
          height: oldThumbnailTrack.height,
          width: oldThumbnailTrack.width,
          horizontalTiles: oldThumbnailTrack.horizontalTiles,
          verticalTiles: oldThumbnailTrack.verticalTiles,
          start: oldThumbnailTrack.start,
          end: oldThumbnailTrack.end,
          tileDuration: oldThumbnailTrack.tileDuration
        });
      }
    }
    if (newThumbnailTracks.length > 0) {
      log_default.warn(
        "manifest",
        `${newThumbnailTracks.length} new Thumbnail tracks found when merging.`
      );
      res.addedThumbnailTracks.push(
        ...newThumbnailTracks.map((t) => ({
          id: t.id,
          mimeType: t.mimeType,
          height: t.height,
          width: t.width,
          horizontalTiles: t.horizontalTiles,
          verticalTiles: t.verticalTiles,
          start: t.start,
          end: t.end,
          tileDuration: t.tileDuration
        }))
      );
      oldPeriod.thumbnailTracks.push(...newThumbnailTracks);
    }
    const oldAdaptations = oldPeriod.getAdaptations();
    const newAdaptations = newPeriod.getAdaptations();
    for (let j = 0; j < oldAdaptations.length; j++) {
      const oldAdaptation = oldAdaptations[j];
      const newAdaptationIdx = arrayFindIndex(
        newAdaptations,
        (a) => a.id === oldAdaptation.id
      );
      if (newAdaptationIdx === -1) {
        log_default.warn(
          "manifest",
          'Adaptation "' + oldAdaptations[j].id + '" not found when merging.'
        );
        const [removed] = oldAdaptations.splice(j, 1);
        j--;
        res.removedAdaptations.push({
          id: removed.id,
          trackType: removed.type
        });
      } else {
        const [newAdaptation] = newAdaptations.splice(newAdaptationIdx, 1);
        const updatedRepresentations = [];
        const addedRepresentations = [];
        const removedRepresentations = [];
        res.updatedAdaptations.push({
          adaptation: oldAdaptation.id,
          trackType: oldAdaptation.type,
          updatedRepresentations,
          addedRepresentations,
          removedRepresentations
        });
        const oldRepresentations = oldAdaptation.representations;
        const newRepresentations = newAdaptation.representations.slice();
        for (let k = 0; k < oldRepresentations.length; k++) {
          const oldRepresentation = oldRepresentations[k];
          const newRepresentationIdx = arrayFindIndex(
            newRepresentations,
            (representation) => representation.id === oldRepresentation.id
          );
          if (newRepresentationIdx === -1) {
            log_default.warn(
              "manifest",
              `Representation "${oldRepresentations[k].id}" not found when merging.`
            );
            const [removed] = oldRepresentations.splice(k, 1);
            k--;
            removedRepresentations.push(removed.id);
          } else {
            const [newRepresentation] = newRepresentations.splice(newRepresentationIdx, 1);
            updatedRepresentations.push(oldRepresentation.getMetadataSnapshot());
            oldRepresentation.cdnMetadata = newRepresentation.cdnMetadata;
            if (updateType === 0 /* Full */) {
              oldRepresentation.index._replace(newRepresentation.index);
            } else {
              oldRepresentation.index._update(newRepresentation.index);
            }
          }
        }
        if (newRepresentations.length > 0) {
          log_default.warn(
            "manifest",
            `${newRepresentations.length} new Representations found when merging.`
          );
          oldAdaptation.representations.push(...newRepresentations);
          addedRepresentations.push(
            ...newRepresentations.map((r) => r.getMetadataSnapshot())
          );
        }
      }
    }
    if (newAdaptations.length > 0) {
      log_default.warn(
        "manifest",
        `${newAdaptations.length} new Adaptations found when merging.`
      );
      for (const adap of newAdaptations) {
        const prevAdaps = oldPeriod.adaptations[adap.type];
        if (prevAdaps === void 0) {
          oldPeriod.adaptations[adap.type] = [adap];
        } else {
          prevAdaps.push(adap);
        }
        res.addedAdaptations.push(adap.getMetadataSnapshot());
      }
    }
    return res;
  }

  // src/manifest/classes/update_periods.ts
  function replacePeriods(oldPeriods, newPeriods) {
    const res = {
      updatedPeriods: [],
      addedPeriods: [],
      removedPeriods: []
    };
    let firstUnhandledPeriodIdx = 0;
    for (let i = 0; i < newPeriods.length; i++) {
      const newPeriod = newPeriods[i];
      let j = firstUnhandledPeriodIdx;
      let oldPeriod = oldPeriods[j];
      while (oldPeriod !== void 0 && oldPeriod.id !== newPeriod.id) {
        j++;
        oldPeriod = oldPeriods[j];
      }
      if (oldPeriod !== void 0) {
        const result = updatePeriodInPlace(oldPeriod, newPeriod, 0 /* Full */);
        res.updatedPeriods.push({
          period: {
            id: oldPeriod.id,
            start: oldPeriod.start,
            end: oldPeriod.end,
            duration: oldPeriod.duration,
            streamEvents: oldPeriod.streamEvents
          },
          result
        });
        const periodsToInclude = newPeriods.slice(firstUnhandledPeriodIdx, i);
        const nbrOfPeriodsToRemove = j - firstUnhandledPeriodIdx;
        const removed = oldPeriods.splice(
          firstUnhandledPeriodIdx,
          nbrOfPeriodsToRemove,
          ...periodsToInclude
        );
        res.removedPeriods.push(
          ...removed.map((p) => ({
            id: p.id,
            start: p.start,
            end: p.end
          }))
        );
        res.addedPeriods.push(...periodsToInclude.map((p) => p.getMetadataSnapshot()));
        firstUnhandledPeriodIdx = i + 1;
      }
    }
    if (firstUnhandledPeriodIdx > oldPeriods.length) {
      log_default.error("manifest", "error when updating Periods");
      return res;
    }
    if (firstUnhandledPeriodIdx < oldPeriods.length) {
      const removed = oldPeriods.splice(
        firstUnhandledPeriodIdx,
        oldPeriods.length - firstUnhandledPeriodIdx
      );
      res.removedPeriods.push(
        ...removed.map((p) => ({
          id: p.id,
          start: p.start,
          end: p.end
        }))
      );
    }
    const remainingNewPeriods = newPeriods.slice(
      firstUnhandledPeriodIdx,
      newPeriods.length
    );
    if (remainingNewPeriods.length > 0) {
      oldPeriods.push(...remainingNewPeriods);
      res.addedPeriods.push(...remainingNewPeriods.map((p) => p.getMetadataSnapshot()));
    }
    return res;
  }
  function updatePeriods(oldPeriods, newPeriods) {
    const res = {
      updatedPeriods: [],
      addedPeriods: [],
      removedPeriods: []
    };
    if (oldPeriods.length === 0) {
      oldPeriods.splice(0, 0, ...newPeriods);
      res.addedPeriods.push(...newPeriods.map((p) => p.getMetadataSnapshot()));
      return res;
    }
    if (newPeriods.length === 0) {
      return res;
    }
    const oldLastPeriod = oldPeriods[oldPeriods.length - 1];
    if (oldLastPeriod.start < newPeriods[0].start) {
      if (oldLastPeriod.end !== newPeriods[0].start) {
        throw new MediaError(
          "MANIFEST_UPDATE_ERROR",
          "Cannot perform partial update: not enough data"
        );
      }
      oldPeriods.push(...newPeriods);
      res.addedPeriods.push(...newPeriods.map((p) => p.getMetadataSnapshot()));
      return res;
    }
    const indexOfNewFirstPeriod = arrayFindIndex(
      oldPeriods,
      ({ id }) => id === newPeriods[0].id
    );
    if (indexOfNewFirstPeriod < 0) {
      throw new MediaError(
        "MANIFEST_UPDATE_ERROR",
        "Cannot perform partial update: incoherent data"
      );
    }
    const updateRes = updatePeriodInPlace(
      oldPeriods[indexOfNewFirstPeriod],
      newPeriods[0],
      1 /* Partial */
    );
    res.updatedPeriods.push({
      period: object_assign_default(oldPeriods[indexOfNewFirstPeriod].getMetadataSnapshot(), {
        adaptations: void 0
      }),
      result: updateRes
    });
    let prevIndexOfNewPeriod = indexOfNewFirstPeriod + 1;
    for (let i = 1; i < newPeriods.length; i++) {
      const newPeriod = newPeriods[i];
      let indexOfNewPeriod = -1;
      for (let j = prevIndexOfNewPeriod; j < oldPeriods.length; j++) {
        if (newPeriod.id === oldPeriods[j].id) {
          indexOfNewPeriod = j;
          break;
        }
      }
      if (indexOfNewPeriod < 0) {
        let toRemoveUntil = -1;
        for (let j = prevIndexOfNewPeriod; j < oldPeriods.length; j++) {
          if (newPeriod.start < oldPeriods[j].start) {
            toRemoveUntil = j;
            break;
          }
        }
        const nbElementsToRemove = toRemoveUntil - prevIndexOfNewPeriod;
        const removed = oldPeriods.splice(
          prevIndexOfNewPeriod,
          nbElementsToRemove,
          newPeriod
        );
        res.addedPeriods.push(newPeriod.getMetadataSnapshot());
        res.removedPeriods.push(
          ...removed.map((p) => ({
            id: p.id,
            start: p.start,
            end: p.end
          }))
        );
      } else {
        if (indexOfNewPeriod > prevIndexOfNewPeriod) {
          log_default.warn("manifest", "old Periods not found in new when updating, removing");
          const removed = oldPeriods.splice(
            prevIndexOfNewPeriod,
            indexOfNewPeriod - prevIndexOfNewPeriod
          );
          res.removedPeriods.push(
            ...removed.map((p) => ({
              id: p.id,
              start: p.start,
              end: p.end
            }))
          );
          indexOfNewPeriod = prevIndexOfNewPeriod;
        }
        const result = updatePeriodInPlace(
          oldPeriods[indexOfNewPeriod],
          newPeriod,
          0 /* Full */
        );
        res.updatedPeriods.push({
          period: object_assign_default(oldPeriods[indexOfNewPeriod].getMetadataSnapshot(), {
            adaptations: void 0
          }),
          result
        });
      }
      prevIndexOfNewPeriod++;
    }
    if (prevIndexOfNewPeriod < oldPeriods.length) {
      log_default.warn("manifest", "Ending Periods not found in new when updating, removing");
      const removed = oldPeriods.splice(
        prevIndexOfNewPeriod,
        oldPeriods.length - prevIndexOfNewPeriod
      );
      res.removedPeriods.push(
        ...removed.map((p) => ({
          id: p.id,
          start: p.start,
          end: p.end
        }))
      );
    }
    return res;
  }

  // src/manifest/classes/manifest.ts
  var generateNewManifestId = idGenerator();
  var Manifest = class extends EventEmitter {
    /**
     * Construct a Manifest instance from a parsed Manifest object (as returned by
     * Manifest parsers) and options.
     *
     * @param {Object} parsedManifest
     * @param {Object} options
     */
    constructor(parsedManifest, options) {
      var _a2;
      super();
      const { representationFilter, manifestUpdateUrl } = options;
      this.manifestFormat = 0 /* Class */;
      this.id = generateNewManifestId();
      this.expired = (_a2 = parsedManifest.expired) != null ? _a2 : null;
      this.transport = parsedManifest.transportType;
      this.clockOffset = parsedManifest.clockOffset;
      this._cachedCodecSupport = new CodecSupportCache([]);
      this.periods = parsedManifest.periods.map((parsedPeriod) => {
        const period = new Period(
          parsedPeriod,
          this._cachedCodecSupport,
          representationFilter
        );
        return period;
      }).sort((a, b) => a.start - b.start);
      this.adaptations = this.periods[0] === void 0 ? {} : this.periods[0].adaptations;
      this.timeBounds = parsedManifest.timeBounds;
      this.isDynamic = parsedManifest.isDynamic;
      this.isLive = parsedManifest.isLive;
      this.isLastPeriodKnown = parsedManifest.isLastPeriodKnown;
      this.uris = parsedManifest.uris === void 0 ? [] : parsedManifest.uris;
      this.updateUrl = manifestUpdateUrl;
      this.lifetime = parsedManifest.lifetime;
      this.clockOffset = parsedManifest.clockOffset;
      this.suggestedPresentationDelay = parsedManifest.suggestedPresentationDelay;
      this.availabilityStartTime = parsedManifest.availabilityStartTime;
      this.publishTime = parsedManifest.publishTime;
    }
    /**
     * Some environments (e.g. in a WebWorker) may not have the capability to know
     * if a mimetype+codec combination is supported on the current platform.
     *
     * Calling `updateCodecSupport` manually once the codecs supported are known
     * by the current environnement allows to work-around this issue.
     *
     * @param {Array<Object>} [updatedCodecSupportInfo]
     * @returns {Error|null} - Refreshing codec support might reveal that some
     * `Adaptation` don't have any of their `Representation`s supported.
     * In that case, an error object will be created and returned, so you can
     * e.g. later emit it as a warning through the RxPlayer API.
     */
    updateCodecSupport(updatedCodecSupportInfo = []) {
      if (updatedCodecSupportInfo.length === 0) {
        return null;
      }
      this._cachedCodecSupport.addCodecs(updatedCodecSupportInfo);
      const unsupportedAdaptations = [];
      for (const period of this.periods) {
        period.refreshCodecSupport(unsupportedAdaptations, this._cachedCodecSupport);
      }
      this.trigger("supportUpdate", null);
      if (unsupportedAdaptations.length > 0) {
        return new MediaError(
          "MANIFEST_INCOMPATIBLE_CODECS_ERROR",
          "An Adaptation contains only incompatible codecs.",
          { tracks: unsupportedAdaptations.map(toTaggedTrack) }
        );
      }
      return null;
    }
    /**
     * Returns the Period corresponding to the given `id`.
     * Returns `undefined` if there is none.
     * @param {string} id
     * @returns {Object|undefined}
     */
    getPeriod(id) {
      return arrayFind(this.periods, (period) => {
        return id === period.id;
      });
    }
    /**
     * Returns the Period encountered at the given time.
     * Returns `undefined` if there is no Period exactly at the given time.
     * @param {number} time
     * @returns {Object|undefined}
     */
    getPeriodForTime(time) {
      return getPeriodForTime(this, time);
    }
    /**
     * Returns the first Period starting strictly after the given time.
     * Returns `undefined` if there is no Period starting after that time.
     * @param {number} time
     * @returns {Object|undefined}
     */
    getNextPeriod(time) {
      return arrayFind(this.periods, (period) => {
        return period.start > time;
      });
    }
    /**
     * Returns the Period coming chronologically just after another given Period.
     * Returns `undefined` if not found.
     * @param {Object} period
     * @returns {Object|null}
     */
    getPeriodAfter(period) {
      return getPeriodAfter(this, period);
    }
    /**
     * Returns the most important URL from which the Manifest can be refreshed.
     * `undefined` if no URL is found.
     * @returns {Array.<string>}
     */
    getUrls() {
      return this.uris;
    }
    /**
     * Update the current Manifest properties by giving a new updated version.
     * This instance will be updated with the new information coming from it.
     * @param {Object} newManifest
     */
    replace(newManifest) {
      this._performUpdate(newManifest, 0 /* Full */);
    }
    /**
     * Update the current Manifest properties by giving a new but shorter version
     * of it.
     * This instance will add the new information coming from it and will
     * automatically clean old Periods that shouldn't be available anymore.
     *
     * /!\ Throws if the given Manifest cannot be used or is not sufficient to
     * update the Manifest.
     * @param {Object} newManifest
     */
    update(newManifest) {
      this._performUpdate(newManifest, 1 /* Partial */);
    }
    /**
     * Returns the theoretical minimum playable position on the content
     * regardless of the current Adaptation chosen, as estimated at parsing
     * time.
     * @returns {number}
     */
    getMinimumSafePosition() {
      return getMinimumSafePosition(this);
    }
    /**
     * Get the position of the live edge - that is, the position of what is
     * currently being broadcasted, in seconds.
     * @returns {number|undefined}
     */
    getLivePosition() {
      return getLivePosition(this);
    }
    /**
     * Returns the theoretical maximum playable position on the content
     * regardless of the current Adaptation chosen, as estimated at parsing
     * time.
     */
    getMaximumSafePosition() {
      return getMaximumSafePosition(this);
    }
    updateCodecSupportList(cachedCodecSupport) {
      this._cachedCodecSupport = cachedCodecSupport;
    }
    /**
     * Look in the Manifest for Representations linked to the given key ID,
     * and mark them as being impossible to decrypt.
     * Then trigger a "decipherabilityUpdate" event to notify everyone of the
     * changes performed.
     * @param {Function} isDecipherableCb
     */
    updateRepresentationsDeciperability(isDecipherableCb) {
      const updates = updateDeciperability(this, isDecipherableCb);
      if (updates.length > 0) {
        this.trigger("decipherabilityUpdate", updates);
      }
    }
    /**
     * Indicate that some `Representation` needs to be avoided due to playback
     * issues.
     * @param {Array.<Object>} items
     */
    addRepresentationsToAvoid(items) {
      const updates = [];
      for (const item of items) {
        const period = this.getPeriod(item.period.id);
        if (period === void 0) {
          continue;
        }
        const adaptation = period.getAdaptation(item.adaptation.id);
        if (adaptation === void 0) {
          continue;
        }
        const representation = adaptation.getRepresentation(item.representation.id);
        if (representation === void 0) {
          continue;
        }
        representation.shouldBeAvoided = true;
        updates.push({
          manifest: this,
          period,
          adaptation,
          representation
        });
      }
      if (updates.length > 0) {
        this.trigger("representationAvoidanceUpdate", updates);
      }
    }
    /**
     * @deprecated only returns adaptations for the first period
     * @returns {Array.<Object>}
     */
    getAdaptations() {
      warnOnce(
        "manifest.getAdaptations() is deprecated. Please use manifest.period[].getAdaptations() instead"
      );
      const firstPeriod = this.periods[0];
      if (firstPeriod === void 0) {
        return [];
      }
      const adaptationsByType = firstPeriod.adaptations;
      const adaptationsList = [];
      for (const adaptationType in adaptationsByType) {
        if (Object.prototype.hasOwnProperty.call(adaptationsByType, adaptationType)) {
          const adaptations = adaptationsByType[adaptationType];
          adaptationsList.push(...adaptations);
        }
      }
      return adaptationsList;
    }
    /**
     * @deprecated only returns adaptations for the first period
     * @returns {Array.<Object>}
     */
    getAdaptationsForType(adaptationType) {
      warnOnce(
        "manifest.getAdaptationsForType(type) is deprecated. Please use manifest.period[].getAdaptationsForType(type) instead"
      );
      const firstPeriod = this.periods[0];
      if (firstPeriod === void 0) {
        return [];
      }
      const adaptationsForType = firstPeriod.adaptations[adaptationType];
      return adaptationsForType === void 0 ? [] : adaptationsForType;
    }
    /**
     * @deprecated only returns adaptations for the first period
     * @returns {Array.<Object>}
     */
    getAdaptation(wantedId) {
      warnOnce(
        "manifest.getAdaptation(id) is deprecated. Please use manifest.period[].getAdaptation(id) instead"
      );
      return arrayFind(this.getAdaptations(), ({ id }) => wantedId === id);
    }
    /**
     * Format the current `Manifest`'s properties into a
     * `IManifestMetadata` format which can better be communicated through
     * another thread.
     *
     * Please bear in mind however that the returned object will not be updated
     * when the current `Manifest` instance is updated, it is only a
     * snapshot at the current time.
     *
     * If you want to keep that data up-to-date with the current `Manifest`
     * instance, you will have to do it yourself.
     *
     * @returns {Object}
     */
    getMetadataSnapshot() {
      const periods = [];
      for (const period of this.periods) {
        periods.push(period.getMetadataSnapshot());
      }
      return {
        manifestFormat: 1 /* MetadataObject */,
        id: this.id,
        periods,
        isDynamic: this.isDynamic,
        isLive: this.isLive,
        isLastPeriodKnown: this.isLastPeriodKnown,
        suggestedPresentationDelay: this.suggestedPresentationDelay,
        clockOffset: this.clockOffset,
        uris: this.uris,
        availabilityStartTime: this.availabilityStartTime,
        timeBounds: this.timeBounds
      };
    }
    /**
     * Returns a list of all codecs that the support is not known yet.
     * If a representation with (`isSupported`) is undefined, we consider the
     * codec support as unknown.
     *
     * This function iterates through all periods, adaptations, and representations,
     * and collects unknown codecs.
     *
     * @returns {Array} The list of codecs with unknown support status.
     */
    getCodecsWithUnknownSupport() {
      return getCodecsWithUnknownSupport(this);
    }
    /**
     * @param {Object} newManifest
     * @param {number} updateType
     */
    _performUpdate(newManifest, updateType) {
      this.availabilityStartTime = newManifest.availabilityStartTime;
      this.expired = newManifest.expired;
      this.isDynamic = newManifest.isDynamic;
      this.isLive = newManifest.isLive;
      this.isLastPeriodKnown = newManifest.isLastPeriodKnown;
      this.lifetime = newManifest.lifetime;
      this.clockOffset = newManifest.clockOffset;
      this.suggestedPresentationDelay = newManifest.suggestedPresentationDelay;
      this.transport = newManifest.transport;
      this.publishTime = newManifest.publishTime;
      let updatedPeriodsResult;
      if (updateType === 0 /* Full */) {
        this.timeBounds = newManifest.timeBounds;
        this.uris = newManifest.uris;
        updatedPeriodsResult = replacePeriods(this.periods, newManifest.periods);
      } else {
        this.timeBounds.maximumTimeData = newManifest.timeBounds.maximumTimeData;
        this.updateUrl = newManifest.uris[0];
        updatedPeriodsResult = updatePeriods(this.periods, newManifest.periods);
        const min = this.getMinimumSafePosition();
        while (this.periods.length > 0) {
          const period = this.periods[0];
          if (period.end === void 0 || period.end > min) {
            break;
          }
          this.periods.shift();
        }
      }
      this.updateCodecSupport();
      this.adaptations = this.periods[0] === void 0 ? {} : this.periods[0].adaptations;
      this.trigger("manifestUpdate", updatedPeriodsResult);
    }
  };
  function updateDeciperability(manifest, isDecipherable) {
    const updates = [];
    for (const period of manifest.periods) {
      for (const adaptation of period.getAdaptations()) {
        let hasOnlyUndecipherableRepresentations = true;
        for (const representation of adaptation.representations) {
          const content = { manifest, period, adaptation, representation };
          const result = isDecipherable(content);
          if (result !== false) {
            hasOnlyUndecipherableRepresentations = false;
          }
          if (result !== representation.decipherable) {
            updates.push(content);
            representation.decipherable = result;
            if (result === true) {
              adaptation.supportStatus.isDecipherable = true;
            } else if (result === void 0 && adaptation.supportStatus.isDecipherable === false) {
              adaptation.supportStatus.isDecipherable = void 0;
            }
            log_default.debug(
              "manifest",
              `Decipherability changed for "${representation.id}"`,
              `(${representation.bitrate})`,
              String(representation.decipherable)
            );
          }
        }
        if (hasOnlyUndecipherableRepresentations) {
          adaptation.supportStatus.isDecipherable = false;
        }
      }
    }
    return updates;
  }

  // src/manifest/classes/utils.ts
  function areSameContent(content1, content2) {
    return content1.segment.id === content2.segment.id && content1.representation.uniqueId === content2.representation.uniqueId;
  }
  function getLoggableSegmentId(content) {
    if (isNullOrUndefined(content)) {
      return null;
    }
    const { period, adaptation, representation, segment } = content;
    return {
      t: adaptation.type[0],
      p: period.id,
      a: adaptation.id,
      r: representation.id,
      ss: segment.isInit ? null : segment.time,
      se: segment.isInit || !segment.complete ? null : segment.end
    };
  }

  // src/manifest/classes/index.ts
  var classes_default = Manifest;

  // src/playback_observer/utils/observation_position.ts
  var ObservationPosition = class {
    constructor(last, wanted) {
      this._last = last;
      this._wanted = wanted;
    }
    /**
     * Obtain arguments allowing to instanciate the same ObservationPosition.
     *
     * This can be used to create a new `ObservationPosition` across JS realms,
     * generally to communicate its data between the main thread and a WebWorker.
     * @returns {Array.<number>}
     */
    serialize() {
      return [this._last, this._wanted];
    }
    /**
     * Returns the playback position actually observed on the media element at
     * the time the playback observation was made.
     *
     * Note that it may be different than the position for which media data is
     * wanted in rare scenarios where the goal position is not yet set on the
     * media element.
     *
     * You should use this value when you want to obtain the actual position set
     * on the media element for browser compatibility purposes. Note that this
     * position was calculated at observation time, it might thus not be
     * up-to-date if what you want is milliseconds-accuracy.
     *
     * If what you want is the actual position which the player is intended to
     * play, you should rely on `getWanted` instead`.
     * @returns {number}
     */
    getPolled() {
      return this._last;
    }
    /**
     * Returns the position which the player should consider to load media data
     * at the time the observation was made.
     *
     * It can be different than the value returned by `getPolled` in rare
     * scenarios:
     *
     *   - When the initial position has not been set yet.
     *
     *   - When the current device do not let the RxPlayer peform precize seeks,
     *     usually for perfomance reasons by seeking to a previous IDR frame
     *     instead (for now only Tizen may be like this), in which case we
     *     prefer to generally rely on the position wanted by the player (this
     *     e.g. prevents issues where the RxPlayer logic and the device are
     *     seeking back and forth in a loop).
     *
     *   - When a wanted position has been "forced" (@see forceWantedPosition).
     * @returns {number}
     */
    getWanted() {
      var _a2;
      return (_a2 = this._wanted) != null ? _a2 : this._last;
    }
    /**
     * Method to call if you want to overwrite the currently wanted position.
     * @param {number} pos
     */
    forceWantedPosition(pos) {
      this._wanted = pos;
    }
    /**
     * Returns `true` when the position wanted returned by `getWanted` and the
     * actual position returned by `getPolled` may be different, meaning that
     * we're currently not at the position we want to reach.
     *
     * This is a relatively rare situation which only happens when either the
     * initial seek has not yet been performed. on specific targets where the
     * seeking behavior is a little broken (@see getWanted) or when the wanted
     * position has been forced (@see forceWantedPosition).
     *
     * In those situations, you might temporarily refrain from acting upon the
     * actual current media position, as it may change soon.
     *
     * @returns {boolean}
     */
    isAwaitingFuturePosition() {
      return this._wanted !== null;
    }
  };

  // src/playback_observer/utils/generate_read_only_observer.ts
  function generateReadOnlyObserver(src, transform, cancellationSignal) {
    const mappedRef = transform(src.getReference(), cancellationSignal);
    return {
      getCurrentTime() {
        return src.getCurrentTime();
      },
      getReadyState() {
        return src.getReadyState();
      },
      getPlaybackRate() {
        return src.getPlaybackRate();
      },
      getIsPaused() {
        return src.getIsPaused();
      },
      getReference() {
        return mappedRef;
      },
      listen(cb, params) {
        if (cancellationSignal.isCancelled() || params.clearSignal.isCancelled()) {
          return;
        }
        mappedRef.onUpdate(cb, {
          clearSignal: params.clearSignal,
          emitCurrentValue: params.includeLastObservation
        });
      },
      deriveReadOnlyObserver(newTransformFn) {
        return generateReadOnlyObserver(this, newTransformFn, cancellationSignal);
      }
    };
  }

  // src/playback_observer/core_playback_observer.ts
  var CorePlaybackObserver = class {
    constructor(src, contentId, sendMessage2, cancellationSignal) {
      this._src = src;
      this._contentId = contentId;
      this._messageSender = sendMessage2;
      this._cancelSignal = cancellationSignal;
    }
    getCurrentTime() {
      return void 0;
    }
    getReadyState() {
      return void 0;
    }
    getIsPaused() {
      return void 0;
    }
    getReference() {
      return this._src;
    }
    setPlaybackRate(playbackRate) {
      this._messageSender({
        type: "update-playback-rate" /* UpdatePlaybackRate */,
        contentId: this._contentId,
        value: playbackRate
      });
    }
    getPlaybackRate() {
      return void 0;
    }
    listen(cb, params) {
      if (this._cancelSignal.isCancelled() || params.clearSignal.isCancelled()) {
        return;
      }
      this._src.onUpdate(cb, {
        clearSignal: params.clearSignal,
        emitCurrentValue: params.includeLastObservation
      });
    }
    deriveReadOnlyObserver(transform) {
      return generateReadOnlyObserver(this, transform, this._cancelSignal);
    }
  };

  // src/utils/queue_microtask.ts
  var queue_microtask_default = typeof queueMicrotask === "function" ? queueMicrotask : function queueMicrotaskPonyfill(cb) {
    Promise.resolve().then(cb, () => cb());
  };

  // src/utils/sorted_list.ts
  var SortedList = class {
    /**
     * @param {Function} sortingFunction
     */
    constructor(sortingFunction) {
      this._array = [];
      this._sortingFn = sortingFunction;
    }
    /**
     * Add a new element to the List at the right place for the List to stay
     * sorted.
     *
     * /!\ The added Element will share the same reference than the given
     * argument, any mutation on your part can lead to an un-sorted SortedList.
     * You can still re-force the sorting to happen by calling forceSort.
     * @param {...*} elements
     */
    add(...elements) {
      elements.sort(this._sortingFn);
      let j = 0;
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        let inserted = false;
        while (!inserted && j < this._array.length) {
          if (this._sortingFn(element, this._array[j]) < 0) {
            this._array.splice(j, 0, element);
            inserted = true;
          } else {
            j++;
          }
        }
        if (!inserted) {
          this._array.push(element);
        }
      }
    }
    /**
     * Returns the current length of the list.
     * @returns {number}
     */
    length() {
      return this._array.length;
    }
    /**
     * Returns the nth element. Throws if the index does not exist.
     *
     * /!\ The returned Element shares the same reference with what is used
     * internally, any mutation on your part can lead to an un-sorted SortedList.
     * You can still re-force the sorting to happen by calling forceSort.
     * @throws Error - Throws if the given index is negative or superior to the
     * array's length.
     * @param {number} index
     * @returns {*}
     */
    get(index) {
      if (index < 0 || index >= this._array.length) {
        throw new Error("Invalid index.");
      }
      return this._array[index];
    }
    toArray() {
      return this._array.slice();
    }
    /**
     * Find the first element corresponding to the given predicate.
     *
     * /!\ The returned element shares the same reference with what is used
     * internally, any mutation on your part can lead to an un-sorted SortedList.
     * You can still re-force the sorting to happen by calling forceSort.
     * @param {Function} fn
     * @returns {*}
     */
    findFirst(fn) {
      return arrayFind(this._array, fn);
    }
    /**
     * Returns true if the List contains the given element.
     * @param {*} element
     * @returns {Boolean}
     */
    has(element) {
      return arrayIncludes(this._array, element);
    }
    /**
     * Remove the first occurence of the given element.
     * Returns the index of the removed element. Undefined if not found.
     * @returns {number|undefined}
     */
    removeElement(element) {
      const indexOf = this._array.indexOf(element);
      if (indexOf >= 0) {
        this._array.splice(indexOf, 1);
        return indexOf;
      }
      return void 0;
    }
    /**
     * Returns the first element.
     *
     * /!\ The returned Element shares the same reference with what is used
     * internally, any mutation on your part can lead to an un-sorted SortedList.
     * You can still re-force the sorting to happen by calling forceSort.
     * @returns {*}
     */
    head() {
      return this._array[0];
    }
    /**
     * Returns the last element.
     *
     * /!\ The returned Element shares the same reference with what is used
     * internally, any mutation on your part can lead to an un-sorted SortedList.
     * You can still re-force the sorting to happen by calling forceSort.
     * @returns {*}
     */
    last() {
      return this._array[this._array.length - 1];
    }
    /**
     * Remove the first element.
     * Returns the element removed or undefined if no element were removed.
     * @returns {*}
     */
    shift() {
      return this._array.shift();
    }
    /**
     * Remove the last element.
     * Returns the element removed or undefined if no element were removed.
     * @returns {*}
     */
    pop() {
      return this._array.pop();
    }
    /**
     * Returns true if the wrapped Array is well-sorted.
     *
     * You might want to call this function to know if a mutation you've done
     * yourself impacted the order of elements.
     * You can then call the forceSort function to sort the list manually.
     *
     * @example
     * ```js
     * const sortedList = new SortedList((a, b) => a.start - b.start);
     * const element1 = { start: 20 };
     * const element2 = { start: 10 };
     *
     * sortedList.add(element1, element2);
     * console.log(sortedList.unwrap()); // -> [{ start: 10 }, { start : 20 }]
     * console.log(sortedList.checkSort()); // -> true
     *
     * element2.start = 5; // Mutation impacting the order of elements
     * console.log(sortedList.unwrap()); // -> [{ start: 10 }, { start : 5 }]
     * console.log(sortedList.checkSort()); // -> false
     *
     * sortedList.forceSort();
     * console.log(sortedList.unwrap()); // -> [{ start: 5 }, { start : 10 }]
     * console.log(sortedList.checkSort()); // -> true
     * ```
     * @returns {Boolean}
     */
    // checkSort() : boolean {
    //   for (let i = 0; i < this._array.length - 1; i++) {
    //     if (this._sortingFn(this._array[i], this._array[i + 1]) > 0) {
    //       return false;
    //     }
    //   }
    //   return true;
    // }
    /**
     * Force the array to be sorted.
     *
     * You might want to call this function when you're unsure that a mutation
     * you've done yourself impacted the order of the elements in the list.
     */
    // forceSort() {
    //   this._array.sort(this._sortingFn);
    // }
  };

  // src/utils/weak_map_memory.ts
  var WeakMapMemory = class {
    /**
     * @param {Function}
     */
    constructor(fn) {
      this._weakMap = /* @__PURE__ */ new WeakMap();
      this._fn = fn;
    }
    /**
     * @param {Object} obj
     * @returns {*}
     */
    get(obj) {
      const fromMemory = this._weakMap.get(obj);
      if (fromMemory === void 0) {
        const newElement = this._fn(obj);
        this._weakMap.set(obj, newElement);
        return newElement;
      } else {
        return fromMemory;
      }
    }
    /**
     * @param {Object} obj
     */
    destroy(obj) {
      this._weakMap.delete(obj);
    }
  };

  // src/utils/ranges.ts
  var EPSILON = 1 / 60;
  function nearlyEqual(a, b) {
    return Math.abs(a - b) < EPSILON;
  }
  function createRangeUnion(range1, range2) {
    const start = Math.min(range1.start, range2.start);
    const end = Math.max(range1.end, range2.end);
    return { start, end };
  }
  function removeEmptyRanges(ranges) {
    for (let index = 0; index < ranges.length; index++) {
      const range = ranges[index];
      if (range.start === range.end) {
        ranges.splice(index--, 1);
      }
    }
    return ranges;
  }
  function mergeContiguousRanges(ranges) {
    for (let index = 1; index < ranges.length; index++) {
      const prevRange = ranges[index - 1];
      const currRange = ranges[index];
      if (areRangesNearlyContiguous(prevRange, currRange)) {
        const unionRange = createRangeUnion(prevRange, currRange);
        ranges.splice(--index, 2, unionRange);
      }
    }
    return ranges;
  }
  function isBefore(range1, range2) {
    return range1.end <= range2.start;
  }
  function isTimeInRange({ start, end }, time) {
    return start <= time && time < end;
  }
  function areRangesOverlapping(range1, range2) {
    return isTimeInRange(range1, range2.start) || range1.start < range2.end && range2.end < range1.end || isTimeInRange(range2, range1.start);
  }
  function areRangesNearlyContiguous(range1, range2) {
    return nearlyEqual(range2.start, range1.end) || nearlyEqual(range2.end, range1.start);
  }
  function convertToRanges(timeRanges) {
    const ranges = [];
    for (let i = 0; i < timeRanges.length; i++) {
      ranges.push({ start: timeRanges.start(i), end: timeRanges.end(i) });
    }
    return ranges;
  }
  function getRange(ranges, time) {
    for (let i = ranges.length - 1; i >= 0; i--) {
      const start = ranges[i].start;
      if (time >= start) {
        const end = ranges[i].end;
        if (time < end) {
          return ranges[i];
        }
      }
    }
    return null;
  }
  function getInnerAndOuterRanges(ranges, time) {
    let innerRange = null;
    const outerRanges = [];
    for (let i = 0; i < ranges.length; i++) {
      const start = ranges[i].start;
      const end = ranges[i].end;
      if (time < start || time >= end) {
        outerRanges.push({ start, end });
      } else {
        innerRange = { start, end };
      }
    }
    return { outerRanges, innerRange };
  }
  function getLeftSizeOfRange(ranges, currentTime) {
    const range = getRange(ranges, currentTime);
    return range !== null ? range.end - currentTime : Infinity;
  }
  function insertInto(ranges, rangeToAddArg) {
    if (rangeToAddArg.start === rangeToAddArg.end) {
      return ranges;
    }
    let rangeToAdd = rangeToAddArg;
    let index = 0;
    for (; index < ranges.length; index++) {
      const range = ranges[index];
      const overlapping = areRangesOverlapping(rangeToAdd, range);
      const contiguous = areRangesNearlyContiguous(rangeToAdd, range);
      if (overlapping || contiguous) {
        rangeToAdd = createRangeUnion(rangeToAdd, range);
        ranges.splice(index--, 1);
      } else {
        if (index === 0) {
          if (isBefore(rangeToAdd, ranges[0])) {
            break;
          }
        } else {
          if (isBefore(ranges[index - 1], rangeToAdd) && isBefore(rangeToAdd, range)) {
            break;
          }
        }
      }
    }
    ranges.splice(index, 0, rangeToAdd);
    return mergeContiguousRanges(removeEmptyRanges(ranges));
  }
  function findOverlappingRanges(range, ranges) {
    const resultingRanges = [];
    for (let i = 0; i < ranges.length; i++) {
      if (areRangesOverlapping(range, ranges[i])) {
        resultingRanges.push(ranges[i]);
      }
    }
    return resultingRanges;
  }
  function excludeFromRanges(baseRanges, rangesToExclude) {
    const result = [];
    for (let i = 0; i < baseRanges.length; i++) {
      const range = baseRanges[i];
      const intersections = [];
      const overlappingRanges = findOverlappingRanges(range, rangesToExclude);
      if (overlappingRanges.length > 0) {
        for (let j = 0; j < overlappingRanges.length; j++) {
          const overlappingRange = overlappingRanges[j];
          intersections.push({
            start: Math.max(range.start, overlappingRange.start),
            end: Math.min(range.end, overlappingRange.end)
          });
        }
      }
      if (intersections.length === 0) {
        result.push(range);
      } else {
        let lastStart = range.start;
        for (let j = 0; j < intersections.length; j++) {
          if (intersections[j].start > lastStart) {
            result.push({ start: lastStart, end: intersections[j].start });
          }
          lastStart = intersections[j].end;
        }
        if (lastStart < range.end) {
          result.push({ start: lastStart, end: range.end });
        }
      }
    }
    return result;
  }

  // src/core/segment_sinks/garbage_collector.ts
  function BufferGarbageCollector({
    segmentSink,
    playbackObserver,
    maxBufferBehind,
    maxBufferAhead
  }, cancellationSignal) {
    let lastPosition;
    let lastBuffered = [];
    playbackObserver.listen(
      (o) => {
        lastPosition = o.position.getWanted();
        lastBuffered = o.buffered[segmentSink.bufferType];
        clean();
      },
      { includeLastObservation: true, clearSignal: cancellationSignal }
    );
    function clean() {
      if (lastBuffered === null) {
        return;
      }
      clearBuffer(
        segmentSink,
        lastPosition,
        lastBuffered,
        maxBufferBehind.getValue(),
        maxBufferAhead.getValue(),
        cancellationSignal
      ).catch((e) => {
        if (cancellationSignal.isCancelled() && TaskCanceller.isCancellationError(e)) {
          return;
        }
        const errMsg = e instanceof Error ? e.message : "Unknown error";
        log_default.error("Stream", "Could not run BufferGarbageCollector:", errMsg);
      });
    }
    maxBufferBehind.onUpdate(clean, { clearSignal: cancellationSignal });
    maxBufferAhead.onUpdate(clean, { clearSignal: cancellationSignal });
    clean();
  }
  async function clearBuffer(segmentSink, position, buffered, maxBufferBehind, maxBufferAhead, cancellationSignal) {
    if (!isFinite(maxBufferBehind) && !isFinite(maxBufferAhead)) {
      return Promise.resolve();
    }
    const cleanedupRanges = [];
    const { innerRange, outerRanges } = getInnerAndOuterRanges(buffered, position);
    const collectBufferBehind = () => {
      if (!isFinite(maxBufferBehind)) {
        return;
      }
      for (const outerRange of outerRanges) {
        if (position - maxBufferBehind >= outerRange.end) {
          cleanedupRanges.push(outerRange);
        } else if (position >= outerRange.end && position - maxBufferBehind > outerRange.start && position - maxBufferBehind < outerRange.end) {
          cleanedupRanges.push({
            start: outerRange.start,
            end: position - maxBufferBehind
          });
        }
      }
      if (!isNullOrUndefined(innerRange)) {
        if (position - maxBufferBehind > innerRange.start) {
          cleanedupRanges.push({
            start: innerRange.start,
            end: position - maxBufferBehind
          });
        }
      }
    };
    const collectBufferAhead = () => {
      if (!isFinite(maxBufferAhead)) {
        return;
      }
      for (const outerRange of outerRanges) {
        if (position + maxBufferAhead <= outerRange.start) {
          cleanedupRanges.push(outerRange);
        } else if (position <= outerRange.start && position + maxBufferAhead < outerRange.end && position + maxBufferAhead > outerRange.start) {
          cleanedupRanges.push({
            start: position + maxBufferAhead,
            end: outerRange.end
          });
        }
      }
      if (!isNullOrUndefined(innerRange)) {
        if (position + maxBufferAhead < innerRange.end) {
          cleanedupRanges.push({
            start: position + maxBufferAhead,
            end: innerRange.end
          });
        }
      }
    };
    collectBufferBehind();
    collectBufferAhead();
    for (const range of cleanedupRanges) {
      if (range.start < range.end) {
        log_default.debug("Stream", "cleaning range from SegmentSink", {
          start: range.start,
          end: range.end
        });
        if (cancellationSignal.cancellationError !== null) {
          throw cancellationSignal.cancellationError;
        }
        await segmentSink.removeBuffer(range.start, range.end);
      }
    }
  }

  // src/core/segment_sinks/inventory/buffered_history.ts
  var BufferedHistory = class {
    /**
     * @param {number} lifetime - Maximum time a history entry should be retained.
     * @param {number} maxHistoryLength - Maximum number of entries the history
     * should have.
     */
    constructor(lifetime, maxHistoryLength) {
      this._history = [];
      this._lifetime = lifetime;
      this._maxHistoryLength = maxHistoryLength;
    }
    /**
     * Add an entry to the `BufferedHistory`'s history indicating the buffered
     * range of a pushed segment.
     *
     * To call when the full range of a given segment becomes known.
     *
     * @param {Object} context
     * @param {Array.<number>|null} buffered
     */
    addBufferedSegment(context, buffered) {
      const now = monotonic_timestamp_default();
      this._history.push({ date: now, buffered, context });
      this._cleanHistory(now);
    }
    /**
     * Returns all entries linked to the given segment.
     * @param {Object} context
     * @returns {Array.<Object>}
     */
    getHistoryFor(context) {
      return this._history.filter((el) => areSameContent(el.context, context));
    }
    /**
     * If the current history does not satisfy `_lifetime` or `_maxHistoryLength`,
     * clear older entries until it does.
     * @param {number} now - Current monotonically-raising timestamp.
     */
    _cleanHistory(now) {
      const historyEarliestLimit = now - this._lifetime;
      let firstKeptIndex = 0;
      for (const event of this._history) {
        if (event.date < historyEarliestLimit) {
          firstKeptIndex++;
        } else {
          break;
        }
      }
      if (firstKeptIndex > 0) {
        this._history = this._history.splice(firstKeptIndex);
      }
      if (this._history.length > this._maxHistoryLength) {
        const toRemove = this._history.length - this._maxHistoryLength;
        this._history = this._history.splice(toRemove);
      }
    }
  };

  // src/core/segment_sinks/inventory/segment_inventory.ts
  var SegmentInventory = class {
    constructor() {
      const { BUFFERED_HISTORY_RETENTION_TIME, BUFFERED_HISTORY_MAXIMUM_ENTRIES } = config_default.getCurrent();
      this._inventory = [];
      this._bufferedHistory = new BufferedHistory(
        BUFFERED_HISTORY_RETENTION_TIME,
        BUFFERED_HISTORY_MAXIMUM_ENTRIES
      );
    }
    /**
     * Reset the whole inventory.
     */
    reset() {
      this._inventory.length = 0;
    }
    /**
     * Infer each segment's `bufferedStart` and `bufferedEnd` properties from the
     * ranges given.
     *
     * The ranges object given should come from the media buffer linked to that
     * SegmentInventory.
     *
     * /!\ A SegmentInventory should not be associated to multiple media buffers
     * at a time, so each `synchronizeBuffered` call should be given ranges coming
     * from the same buffer.
     * @param {Array.<Object>} ranges
     */
    synchronizeBuffered(ranges) {
      var _a2, _b2, _c2, _d2, _e2, _f, _g;
      const inventory = this._inventory;
      let inventoryIndex = 0;
      let thisSegment = inventory[0];
      const { MINIMUM_SEGMENT_SIZE } = config_default.getCurrent();
      const bufferType = thisSegment == null ? void 0 : thisSegment.infos.adaptation.type;
      if (log_default.hasLevel("DEBUG")) {
        const prettyPrintedRanges = ranges.map((r) => `${r.start}-${r.end}`).join(",");
        log_default.debug(
          "SI",
          `synchronizing ${bufferType != null ? bufferType : "unknown"} buffered ranges:`,
          prettyPrintedRanges
        );
      }
      const rangesLength = ranges.length;
      for (let i = 0; i < rangesLength; i++) {
        if (thisSegment === void 0) {
          return;
        }
        const rangeStart = ranges[i].start;
        const rangeEnd = ranges[i].end;
        if (rangeEnd - rangeStart < MINIMUM_SEGMENT_SIZE) {
          log_default.warn("SI", "skipped range when synchronizing because it was too small", {
            t: bufferType,
            rangeStart,
            rangeEnd
          });
          continue;
        }
        const indexBefore = inventoryIndex;
        while (thisSegment !== void 0 && ((_a2 = thisSegment.bufferedEnd) != null ? _a2 : thisSegment.end) - rangeStart < MINIMUM_SEGMENT_SIZE) {
          thisSegment = inventory[++inventoryIndex];
        }
        let lastDeletedSegmentInfos = null;
        const numberOfSegmentToDelete = inventoryIndex - indexBefore;
        if (numberOfSegmentToDelete > 0) {
          const lastDeletedSegment = inventory[indexBefore + numberOfSegmentToDelete - 1];
          lastDeletedSegmentInfos = {
            end: (_b2 = lastDeletedSegment.bufferedEnd) != null ? _b2 : lastDeletedSegment.end,
            precizeEnd: lastDeletedSegment.precizeEnd
          };
          log_default.debug("SI", `${numberOfSegmentToDelete} segments GCed.`, {
            t: bufferType
          });
          const removed = inventory.splice(indexBefore, numberOfSegmentToDelete);
          for (const seg of removed) {
            if (seg.bufferedStart === void 0 && seg.bufferedEnd === void 0 && seg.status !== 2 /* Failed */) {
              this._bufferedHistory.addBufferedSegment(seg.infos, null);
            }
          }
          inventoryIndex = indexBefore;
        }
        if (thisSegment === void 0) {
          return;
        }
        if (rangeEnd - ((_c2 = thisSegment.bufferedStart) != null ? _c2 : thisSegment.start) >= MINIMUM_SEGMENT_SIZE) {
          guessBufferedStartFromRangeStart(
            thisSegment,
            rangeStart,
            lastDeletedSegmentInfos,
            bufferType
          );
          if (inventoryIndex === inventory.length - 1) {
            guessBufferedEndFromRangeEnd(thisSegment, rangeEnd, bufferType);
            return;
          }
          thisSegment = inventory[++inventoryIndex];
          let thisSegmentStart = (_d2 = thisSegment.bufferedStart) != null ? _d2 : thisSegment.start;
          let thisSegmentEnd = (_e2 = thisSegment.bufferedEnd) != null ? _e2 : thisSegment.end;
          const nextRangeStart = i < rangesLength - 1 ? ranges[i + 1].start : void 0;
          while (thisSegment !== void 0) {
            if (rangeEnd < thisSegmentStart) {
              break;
            }
            if (rangeEnd - thisSegmentStart < MINIMUM_SEGMENT_SIZE && thisSegmentEnd - rangeEnd >= MINIMUM_SEGMENT_SIZE) {
              break;
            }
            if (nextRangeStart !== void 0 && rangeEnd - thisSegmentStart < thisSegmentEnd - nextRangeStart) {
              break;
            }
            const prevSegment = inventory[inventoryIndex - 1];
            if (prevSegment.bufferedEnd === void 0) {
              if (thisSegment.precizeStart) {
                prevSegment.bufferedEnd = thisSegment.start;
              } else if (prevSegment.infos.segment.complete) {
                prevSegment.bufferedEnd = prevSegment.end;
              } else {
                prevSegment.bufferedEnd = thisSegment.start;
              }
              log_default.debug("SI", "calculating buffered end of contiguous segment", {
                t: bufferType,
                prevSegmentBufferedEnd: prevSegment.bufferedEnd,
                pse: prevSegment.end
              });
            }
            thisSegment.bufferedStart = prevSegment.bufferedEnd;
            thisSegment = inventory[++inventoryIndex];
            if (thisSegment !== void 0) {
              thisSegmentStart = (_f = thisSegment.bufferedStart) != null ? _f : thisSegment.start;
              thisSegmentEnd = (_g = thisSegment.bufferedEnd) != null ? _g : thisSegment.end;
            }
          }
        }
        const lastSegmentInRange = inventory[inventoryIndex - 1];
        if (lastSegmentInRange !== void 0) {
          guessBufferedEndFromRangeEnd(lastSegmentInRange, rangeEnd, bufferType);
        }
      }
      if (!isNullOrUndefined(thisSegment)) {
        const { SEGMENT_SYNCHRONIZATION_DELAY } = config_default.getCurrent();
        const now = monotonic_timestamp_default();
        for (let i = inventoryIndex; i < inventory.length; i++) {
          const segmentInfo = inventory[i];
          if (now - segmentInfo.insertionTs >= SEGMENT_SYNCHRONIZATION_DELAY) {
            log_default.debug(
              "SI",
              "A segment at the end has been completely GCed",
              getLoggableSegmentId(segmentInfo.infos)
            );
            if (segmentInfo.bufferedStart === void 0 && segmentInfo.bufferedEnd === void 0 && segmentInfo.status !== 2 /* Failed */) {
              this._bufferedHistory.addBufferedSegment(segmentInfo.infos, null);
            }
            inventory.splice(i, 1);
            i--;
          }
        }
      }
      if (bufferType !== void 0 && log_default.hasLevel("DEBUG")) {
        log_default.debug(
          "SI",
          `current ${bufferType} inventory timeline:
` + prettyPrintInventory(this._inventory)
        );
      }
    }
    /**
     * Add a new chunk in the inventory.
     *
     * Chunks are decodable sub-parts of a whole segment. Once all chunks in a
     * segment have been inserted, you should call the `completeSegment` method.
     * @param {Object} chunkInformation
     * @param {boolean} succeed - If `true` the insertion operation finished with
     * success, if `false` an error arised while doing it.
     * @param {number} insertionTs - The monotonically-increasing timestamp at the
     * time the segment has been confirmed to be inserted by the buffer.
     */
    insertChunk({
      period,
      adaptation,
      representation,
      segment,
      chunkSize,
      start,
      end
    }, succeed, insertionTs) {
      if (segment.isInit) {
        return;
      }
      const bufferType = adaptation.type;
      if (start >= end) {
        log_default.warn("SI", "Invalid chunked inserted: starts before it ends", {
          t: bufferType,
          start,
          end
        });
        return;
      }
      const inventory = this._inventory;
      const newSegment = {
        status: succeed ? 0 /* PartiallyPushed */ : 2 /* Failed */,
        insertionTs,
        chunkSize,
        splitted: false,
        start,
        end,
        precizeStart: false,
        precizeEnd: false,
        bufferedStart: void 0,
        bufferedEnd: void 0,
        infos: { segment, period, adaptation, representation }
      };
      for (let i = inventory.length - 1; i >= 0; i--) {
        const segmentI = inventory[i];
        if (segmentI.start <= start) {
          if (segmentI.end <= start) {
            log_default.debug("SI", "Pushing segment strictly after previous one.", {
              t: bufferType,
              pse: segmentI.end,
              ss: start
            });
            this._inventory.splice(i + 1, 0, newSegment);
            i += 2;
            while (i < inventory.length && inventory[i].start < newSegment.end) {
              if (inventory[i].end > newSegment.end) {
                log_default.debug("SI", "Segment pushed updates the start of the next one", {
                  t: bufferType,
                  pss: inventory[i].start,
                  ss: start,
                  se: end
                });
                inventory[i].start = newSegment.end;
                inventory[i].bufferedStart = void 0;
                inventory[i].precizeStart = inventory[i].precizeStart && newSegment.precizeEnd;
                return;
              }
              log_default.debug("SI", "Segment pushed removes the next one", {
                t: bufferType,
                ss: start,
                se: end,
                pss: inventory[i].start,
                pse: inventory[i].end
              });
              inventory.splice(i, 1);
            }
            return;
          } else {
            if (segmentI.start === start) {
              if (segmentI.end <= end) {
                log_default.debug("SI", "Segment pushed replace another one", {
                  t: bufferType,
                  ss: start,
                  se: end,
                  pss: segmentI.start,
                  pse: segmentI.end
                });
                this._inventory.splice(i, 1, newSegment);
                i += 1;
                while (i < inventory.length && inventory[i].start < newSegment.end) {
                  if (inventory[i].end > newSegment.end) {
                    log_default.debug("SI", "Segment pushed updates the start of the next one", {
                      t: bufferType,
                      ss: start,
                      se: end,
                      pss: inventory[i].start,
                      pse: inventory[i].end
                    });
                    inventory[i].start = newSegment.end;
                    inventory[i].bufferedStart = void 0;
                    inventory[i].precizeStart = inventory[i].precizeStart && newSegment.precizeEnd;
                    return;
                  }
                  log_default.debug("SI", "Segment pushed removes the next one", {
                    t: bufferType,
                    ss: start,
                    se: end,
                    pss: inventory[i].start,
                    pse: inventory[i].end
                  });
                  inventory.splice(i, 1);
                }
                return;
              } else {
                log_default.debug("SI", "Segment pushed ends before another with the same start", {
                  t: bufferType,
                  ss: start,
                  se: end,
                  pse: segmentI.end
                });
                inventory.splice(i, 0, newSegment);
                segmentI.start = newSegment.end;
                segmentI.bufferedStart = void 0;
                segmentI.precizeStart = segmentI.precizeStart && newSegment.precizeEnd;
                return;
              }
            } else {
              if (segmentI.end <= newSegment.end) {
                log_default.debug("SI", "Segment pushed updates end of previous one", {
                  t: bufferType,
                  ss: start,
                  se: end,
                  pss: segmentI.start,
                  pse: segmentI.end
                });
                this._inventory.splice(i + 1, 0, newSegment);
                segmentI.end = newSegment.start;
                segmentI.bufferedEnd = void 0;
                segmentI.precizeEnd = segmentI.precizeEnd && newSegment.precizeStart;
                i += 2;
                while (i < inventory.length && inventory[i].start < newSegment.end) {
                  if (inventory[i].end > newSegment.end) {
                    log_default.debug("SI", "Segment pushed updates the start of the next one", {
                      t: bufferType,
                      ss: start,
                      se: end,
                      pss: inventory[i].start
                    });
                    inventory[i].start = newSegment.end;
                    inventory[i].bufferedStart = void 0;
                    inventory[i].precizeStart = inventory[i].precizeStart && newSegment.precizeEnd;
                    return;
                  }
                  log_default.debug("SI", "Segment pushed removes the next one", {
                    t: bufferType,
                    ss: start,
                    se: end,
                    pss: inventory[i].start,
                    pse: inventory[i].end
                  });
                  inventory.splice(i, 1);
                }
                return;
              } else {
                log_default.warn("SI", "Segment pushed is contained in a previous one", {
                  t: bufferType,
                  ss: start,
                  se: end,
                  pss: segmentI.start,
                  pse: segmentI.end
                });
                const nextSegment = {
                  status: segmentI.status,
                  insertionTs: segmentI.insertionTs,
                  /**
                   * Note: this sadly means we're doing as if
                   * that chunk is present two times.
                   * Thankfully, this scenario should be
                   * fairly rare.
                   */
                  chunkSize: segmentI.chunkSize,
                  splitted: true,
                  start: newSegment.end,
                  end: segmentI.end,
                  precizeStart: segmentI.precizeStart && segmentI.precizeEnd && newSegment.precizeEnd,
                  precizeEnd: segmentI.precizeEnd,
                  bufferedStart: void 0,
                  bufferedEnd: segmentI.end,
                  infos: segmentI.infos
                };
                segmentI.end = newSegment.start;
                segmentI.splitted = true;
                segmentI.bufferedEnd = void 0;
                segmentI.precizeEnd = segmentI.precizeEnd && newSegment.precizeStart;
                inventory.splice(i + 1, 0, newSegment);
                inventory.splice(i + 2, 0, nextSegment);
                return;
              }
            }
          }
        }
      }
      const firstSegment = this._inventory[0];
      if (firstSegment === void 0) {
        log_default.debug("SI", "first segment pushed", { t: bufferType, ss: start, se: end });
        this._inventory.push(newSegment);
        return;
      }
      if (firstSegment.start >= end) {
        log_default.debug("SI", "Segment pushed comes before all previous ones", {
          t: bufferType,
          ss: start,
          se: end,
          pss: firstSegment.start
        });
        this._inventory.splice(0, 0, newSegment);
      } else if (firstSegment.end <= end) {
        log_default.debug(
          "SI",
          "Segment pushed starts before and completely recovers the previous first one",
          {
            t: bufferType,
            ss: start,
            se: end,
            pss: firstSegment.start,
            pse: firstSegment.end
          }
        );
        this._inventory.splice(0, 1, newSegment);
        while (inventory.length > 1 && inventory[1].start < newSegment.end) {
          if (inventory[1].end > newSegment.end) {
            log_default.debug("SI", "Segment pushed updates the start of the next one", {
              t: bufferType,
              ss: start,
              se: end,
              pss: inventory[1].start,
              pse: inventory[1].end
            });
            inventory[1].start = newSegment.end;
            inventory[1].bufferedStart = void 0;
            inventory[1].precizeStart = newSegment.precizeEnd;
            return;
          }
          log_default.debug("SI", "Segment pushed removes the next one", {
            t: bufferType,
            ss: start,
            se: end,
            pss: inventory[1].start,
            pse: inventory[1].end
          });
          inventory.splice(1, 1);
        }
        return;
      } else {
        log_default.debug("SI", "Segment pushed start of the next one", bufferType, {
          ss: start,
          se: end,
          pss: firstSegment.start,
          pse: firstSegment.end
        });
        firstSegment.start = end;
        firstSegment.bufferedStart = void 0;
        firstSegment.precizeStart = newSegment.precizeEnd;
        this._inventory.splice(0, 0, newSegment);
        return;
      }
    }
    /**
     * Indicate that inserted chunks can now be considered as a fully-loaded
     * segment.
     * Take in argument the same content than what was given to `insertChunk` for
     * the corresponding chunks.
     * @param {Object} content
     */
    completeSegment(content) {
      if (content.segment.isInit) {
        return;
      }
      const inventory = this._inventory;
      const resSegments = [];
      for (let i = 0; i < inventory.length; i++) {
        if (areSameContent(inventory[i].infos, content)) {
          let splitted = false;
          if (resSegments.length > 0) {
            splitted = true;
            if (resSegments.length === 1) {
              log_default.warn(
                "SI",
                "Completed Segment is splitted.",
                getLoggableSegmentId(content)
              );
              resSegments[0].splitted = true;
            }
          }
          const firstI = i;
          let segmentSize = inventory[i].chunkSize;
          i += 1;
          while (i < inventory.length && areSameContent(inventory[i].infos, content)) {
            const chunkSize = inventory[i].chunkSize;
            if (segmentSize !== void 0 && chunkSize !== void 0) {
              segmentSize += chunkSize;
            }
            i++;
          }
          const lastI = i - 1;
          const length = lastI - firstI;
          const lastEnd = inventory[lastI].end;
          const lastBufferedEnd = inventory[lastI].bufferedEnd;
          if (length > 0) {
            this._inventory.splice(firstI + 1, length);
            i -= length;
          }
          if (this._inventory[firstI].status === 0 /* PartiallyPushed */) {
            this._inventory[firstI].status = 1 /* FullyLoaded */;
          }
          this._inventory[firstI].chunkSize = segmentSize;
          this._inventory[firstI].end = lastEnd;
          this._inventory[firstI].bufferedEnd = lastBufferedEnd;
          this._inventory[firstI].splitted = splitted;
          resSegments.push(this._inventory[firstI]);
        }
      }
      if (resSegments.length === 0) {
        log_default.warn("SI", "Completed Segment not found", getLoggableSegmentId(content));
      } else {
        for (const seg of resSegments) {
          if (seg.bufferedStart !== void 0 && seg.bufferedEnd !== void 0) {
            if (seg.status !== 2 /* Failed */) {
              this._bufferedHistory.addBufferedSegment(seg.infos, {
                start: seg.bufferedStart,
                end: seg.bufferedEnd
              });
            }
          } else {
            log_default.debug("SI", "buffered range not known after sync. Skipping history.", {
              ss: seg.start,
              se: seg.end
            });
          }
        }
      }
    }
    /**
     * Returns the whole inventory.
     *
     * To get a list synchronized with what a media buffer actually has buffered
     * you might want to call `synchronizeBuffered` before calling this method.
     * @returns {Array.<Object>}
     */
    getInventory() {
      return this._inventory;
    }
    /**
     * Returns a recent history of registered operations performed and event
     * received linked to the segment given in argument.
     *
     * Not all operations and events are registered in the returned history.
     * Please check the return type for more information on what is available.
     *
     * Note that history is short-lived for memory usage and performance reasons.
     * You may not receive any information on operations that happened too long
     * ago.
     * @param {Object} context
     * @returns {Array.<Object>}
     */
    getHistoryFor(context) {
      return this._bufferedHistory.getHistoryFor(context);
    }
  };
  function bufferedStartLooksCoherent(thisSegment) {
    if (thisSegment.bufferedStart === void 0 || thisSegment.status !== 1 /* FullyLoaded */) {
      return false;
    }
    const { start, end } = thisSegment;
    const duration = end - start;
    const {
      MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE,
      MAX_MANIFEST_BUFFERED_DURATION_DIFFERENCE
    } = config_default.getCurrent();
    return Math.abs(start - thisSegment.bufferedStart) <= MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE && (thisSegment.bufferedEnd === void 0 || thisSegment.bufferedEnd > thisSegment.bufferedStart && Math.abs(thisSegment.bufferedEnd - thisSegment.bufferedStart - duration) <= Math.min(MAX_MANIFEST_BUFFERED_DURATION_DIFFERENCE, duration / 3));
  }
  function bufferedEndLooksCoherent(thisSegment) {
    if (thisSegment.bufferedEnd === void 0 || !thisSegment.infos.segment.complete || thisSegment.status !== 1 /* FullyLoaded */) {
      return false;
    }
    const { start, end } = thisSegment;
    const duration = end - start;
    const {
      MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE,
      MAX_MANIFEST_BUFFERED_DURATION_DIFFERENCE
    } = config_default.getCurrent();
    return Math.abs(end - thisSegment.bufferedEnd) <= MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE && thisSegment.bufferedStart !== void 0 && thisSegment.bufferedEnd > thisSegment.bufferedStart && Math.abs(thisSegment.bufferedEnd - thisSegment.bufferedStart - duration) <= Math.min(MAX_MANIFEST_BUFFERED_DURATION_DIFFERENCE, duration / 3);
  }
  function guessBufferedStartFromRangeStart(firstSegmentInRange, rangeStart, lastDeletedSegmentInfos, bufferType) {
    const {
      MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE,
      MISSING_DATA_TRIGGER_SYNC_DELAY,
      SEGMENT_SYNCHRONIZATION_DELAY
    } = config_default.getCurrent();
    if (firstSegmentInRange.bufferedStart !== void 0) {
      if (firstSegmentInRange.bufferedStart < rangeStart) {
        log_default.debug("SI", "Segment partially GCed at the start", {
          t: bufferType,
          firstsbs: firstSegmentInRange.bufferedStart,
          rs: rangeStart
        });
        firstSegmentInRange.bufferedStart = rangeStart;
      }
      if (!firstSegmentInRange.precizeStart && bufferedStartLooksCoherent(firstSegmentInRange)) {
        firstSegmentInRange.start = firstSegmentInRange.bufferedStart;
        firstSegmentInRange.precizeStart = true;
      }
    } else if (firstSegmentInRange.precizeStart) {
      log_default.debug("SI", "buffered start is precize start", {
        t: bufferType,
        firstss: firstSegmentInRange.start
      });
      firstSegmentInRange.bufferedStart = firstSegmentInRange.start;
    } else if (lastDeletedSegmentInfos !== null && lastDeletedSegmentInfos.end > rangeStart && (lastDeletedSegmentInfos.precizeEnd || firstSegmentInRange.start - lastDeletedSegmentInfos.end <= MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE)) {
      log_default.debug("SI", "buffered start is end of previous segment", {
        t: bufferType,
        rs: rangeStart,
        firstss: firstSegmentInRange.start,
        lastdelse: lastDeletedSegmentInfos.end
      });
      firstSegmentInRange.bufferedStart = lastDeletedSegmentInfos.end;
      if (bufferedStartLooksCoherent(firstSegmentInRange)) {
        firstSegmentInRange.start = lastDeletedSegmentInfos.end;
        firstSegmentInRange.precizeStart = true;
      }
    } else if (firstSegmentInRange.start - rangeStart <= MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE) {
      const now = monotonic_timestamp_default();
      if (firstSegmentInRange.start - rangeStart >= MISSING_DATA_TRIGGER_SYNC_DELAY && now - firstSegmentInRange.insertionTs < SEGMENT_SYNCHRONIZATION_DELAY) {
        log_default.debug("SI", "Ignored bufferedStart synchronization", {
          t: bufferType,
          rs: rangeStart,
          firstss: firstSegmentInRange.start,
          delta: now - firstSegmentInRange.insertionTs
        });
        return;
      }
      log_default.debug("SI", "found true buffered start", {
        t: bufferType,
        rs: rangeStart,
        firstss: firstSegmentInRange.start
      });
      firstSegmentInRange.bufferedStart = rangeStart;
      if (bufferedStartLooksCoherent(firstSegmentInRange)) {
        firstSegmentInRange.start = rangeStart;
        firstSegmentInRange.precizeStart = true;
      }
    } else if (rangeStart < firstSegmentInRange.start) {
      log_default.debug("SI", "range start too far from expected start", {
        t: bufferType,
        rs: rangeStart,
        firstss: firstSegmentInRange.start
      });
      firstSegmentInRange.bufferedStart = firstSegmentInRange.start;
    } else {
      const now = monotonic_timestamp_default();
      if (firstSegmentInRange.start - rangeStart >= MISSING_DATA_TRIGGER_SYNC_DELAY && now - firstSegmentInRange.insertionTs < SEGMENT_SYNCHRONIZATION_DELAY) {
        log_default.debug("SI", "Ignored bufferedStart synchronization", {
          t: bufferType,
          rs: rangeStart,
          firstss: firstSegmentInRange.start,
          delta: now - firstSegmentInRange.insertionTs
        });
        return;
      }
      log_default.debug("SI", "Segment appears immediately garbage collected at the start", {
        t: bufferType,
        rs: rangeStart,
        firstss: firstSegmentInRange.start
      });
      firstSegmentInRange.bufferedStart = rangeStart;
    }
  }
  function guessBufferedEndFromRangeEnd(lastSegmentInRange, rangeEnd, bufferType) {
    const {
      MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE,
      MISSING_DATA_TRIGGER_SYNC_DELAY,
      SEGMENT_SYNCHRONIZATION_DELAY
    } = config_default.getCurrent();
    if (lastSegmentInRange.bufferedEnd !== void 0) {
      if (lastSegmentInRange.bufferedEnd > rangeEnd) {
        log_default.debug("SI", "Segment partially GCed at the end", {
          t: bufferType,
          lastsbe: lastSegmentInRange.bufferedEnd,
          re: rangeEnd
        });
        lastSegmentInRange.bufferedEnd = rangeEnd;
      }
      if (!lastSegmentInRange.precizeEnd && rangeEnd - lastSegmentInRange.end <= MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE && bufferedEndLooksCoherent(lastSegmentInRange)) {
        lastSegmentInRange.precizeEnd = true;
        lastSegmentInRange.end = rangeEnd;
      }
    } else if (lastSegmentInRange.precizeEnd) {
      log_default.debug("SI", "buffered end is precize end", {
        t: bufferType,
        lastse: lastSegmentInRange.end
      });
      lastSegmentInRange.bufferedEnd = lastSegmentInRange.end;
    } else if (rangeEnd - lastSegmentInRange.end <= MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE || !lastSegmentInRange.infos.segment.complete) {
      const now = monotonic_timestamp_default();
      if (rangeEnd - lastSegmentInRange.end >= MISSING_DATA_TRIGGER_SYNC_DELAY && now - lastSegmentInRange.insertionTs < SEGMENT_SYNCHRONIZATION_DELAY) {
        log_default.debug("SI", "Ignored bufferedEnd synchronization", {
          t: bufferType,
          re: rangeEnd,
          lastse: lastSegmentInRange.end,
          delta: now - lastSegmentInRange.insertionTs
        });
        return;
      }
      log_default.debug("SI", "found true buffered end", {
        t: bufferType,
        re: rangeEnd,
        lastse: lastSegmentInRange.end
      });
      lastSegmentInRange.bufferedEnd = rangeEnd;
      if (bufferedEndLooksCoherent(lastSegmentInRange)) {
        lastSegmentInRange.end = rangeEnd;
        lastSegmentInRange.precizeEnd = true;
      }
    } else if (rangeEnd > lastSegmentInRange.end) {
      log_default.debug("SI", "range end too far from expected end", {
        t: bufferType,
        re: rangeEnd,
        lastse: lastSegmentInRange.end
      });
      lastSegmentInRange.bufferedEnd = lastSegmentInRange.end;
    } else {
      const now = monotonic_timestamp_default();
      if (rangeEnd - lastSegmentInRange.end >= MISSING_DATA_TRIGGER_SYNC_DELAY && now - lastSegmentInRange.insertionTs < SEGMENT_SYNCHRONIZATION_DELAY) {
        log_default.debug("SI", "Ignored bufferedEnd synchronization", {
          t: bufferType,
          re: rangeEnd,
          lastse: lastSegmentInRange.end,
          delta: now - lastSegmentInRange.insertionTs
        });
        return;
      }
      log_default.debug("SI", "Segment appears immediately garbage collected at the end", {
        t: bufferType,
        lastsbe: lastSegmentInRange.bufferedEnd,
        re: rangeEnd
      });
      lastSegmentInRange.bufferedEnd = rangeEnd;
    }
  }
  function prettyPrintInventory(inventory) {
    const roundingError = 1 / 60;
    const encounteredReps = {};
    const letters = [];
    let lastChunk = null;
    let lastLetter = null;
    function generateNewLetter(infos) {
      const currentLetter = String.fromCharCode(letters.length + 65);
      letters.push({
        letter: currentLetter,
        periodId: infos.period.id,
        representationId: infos.representation.id,
        bitrate: infos.representation.bitrate
      });
      return currentLetter;
    }
    let str = "";
    for (const chunk of inventory) {
      if (chunk.bufferedStart !== void 0 && chunk.bufferedEnd !== void 0) {
        const periodId = chunk.infos.period.id;
        const representationId = chunk.infos.representation.id;
        const encounteredPeriod = encounteredReps[periodId];
        let currentLetter;
        if (encounteredPeriod === void 0) {
          currentLetter = generateNewLetter(chunk.infos);
          encounteredReps[periodId] = { [representationId]: currentLetter };
        } else {
          const previousLetter = encounteredPeriod[representationId];
          if (previousLetter === void 0) {
            currentLetter = generateNewLetter(chunk.infos);
            encounteredPeriod[representationId] = currentLetter;
          } else {
            currentLetter = previousLetter;
          }
        }
        if (lastChunk === null) {
          str += `${chunk.bufferedStart.toFixed(2)}|${currentLetter}|`;
        } else if (lastLetter === currentLetter) {
          if (lastChunk.bufferedEnd + roundingError < chunk.bufferedStart) {
            str += `${lastChunk.bufferedEnd.toFixed(2)} ~ ${chunk.bufferedStart.toFixed(2)}|${currentLetter}|`;
          }
        } else {
          str += `${lastChunk.bufferedEnd.toFixed(2)} ~ ${chunk.bufferedStart.toFixed(2)}|${currentLetter}|`;
        }
        lastChunk = chunk;
        lastLetter = currentLetter;
      }
    }
    if (lastChunk !== null) {
      str += String(lastChunk.end.toFixed(2));
    }
    letters.forEach((letterInfo) => {
      var _a2;
      str += `
[${letterInfo.letter}] P: ${letterInfo.periodId} || R: ${letterInfo.representationId}(${(_a2 = letterInfo.bitrate) != null ? _a2 : "unknown bitrate"})`;
    });
    return str;
  }

  // src/core/segment_sinks/inventory/utils.ts
  function getLastSegmentBeforePeriod(inventory, period) {
    for (let i = 0; i < inventory.length; i++) {
      if (inventory[i].infos.period.start >= period.start) {
        if (i > 0) {
          return inventory[i - 1];
        }
        return null;
      }
    }
    return inventory.length > 0 ? inventory[inventory.length - 1] : null;
  }
  function getFirstSegmentAfterPeriod(inventory, period) {
    for (const segment of inventory) {
      if (segment.infos.period.start > period.start) {
        return segment;
      }
    }
    return null;
  }

  // src/core/segment_sinks/inventory/index.ts
  var inventory_default = SegmentInventory;

  // src/core/segment_sinks/implementations/types.ts
  var SegmentSink = class {
    constructor() {
      this._segmentInventory = new inventory_default();
    }
    /**
     * The maintained inventory can fall out of sync from garbage collection or
     * other events.
     *
     * This methods allow to manually trigger a synchronization by providing the
     * buffered time ranges of the real SourceBuffer implementation.
     */
    synchronizeInventory(ranges) {
      this._segmentInventory.synchronizeBuffered(ranges);
    }
    /**
     * Returns an inventory of the last known segments to be currently contained in
     * the SegmentSink.
     *
     * /!\ Note that this data may not be up-to-date with the real current content
     * of the SegmentSink.
     * Generally speaking, pushed segments are added right away to it but segments
     * may have been since removed, which might not be known right away.
     * Please consider this when using this method, by considering that it does
     * not reflect the full reality of the underlying buffer.
     * @returns {Array.<Object>}
     */
    getLastKnownInventory() {
      return this._segmentInventory.getInventory();
    }
    /**
     * Returns a recent history of registered operations performed and event
     * received linked to the segment given in argument.
     *
     * Not all operations and events are registered in the returned history.
     * Please check the return type for more information on what is available.
     *
     * Note that history is short-lived for memory usage and performance reasons.
     * You may not receive any information on operations that happened too long
     * ago.
     * @param {Object} context
     * @returns {Array.<Object>}
     */
    getSegmentHistory(context) {
      return this._segmentInventory.getHistoryFor(context);
    }
  };

  // src/core/segment_sinks/implementations/audio_video/audio_video_segment_sink.ts
  var AudioVideoSegmentSink = class extends SegmentSink {
    /**
     * @constructor
     * @param {string} bufferType
     * @param {string} codec
     * @param {Object} mediaSource
     */
    constructor(bufferType, codec, mediaSource) {
      super();
      log_default.info("Stream", "calling `mediaSource.addSourceBuffer`", { codec });
      const sourceBuffer = mediaSource.addSourceBuffer(bufferType, codec);
      this.bufferType = bufferType;
      this._sourceBuffer = sourceBuffer;
      this._lastInitSegmentUniqueId = null;
      this.codec = codec;
      this._initSegmentsMap = /* @__PURE__ */ new Map();
      this._pendingOperations = [];
    }
    /** @see SegmentSink */
    declareInitSegment(uniqueId, initSegmentData) {
      assertDataIsBufferSource(initSegmentData);
      this._initSegmentsMap.set(uniqueId, initSegmentData);
    }
    /** @see SegmentSink */
    freeInitSegment(uniqueId) {
      this._initSegmentsMap.delete(uniqueId);
    }
    /**
     * Push a chunk of the media segment given to the attached SourceBuffer.
     *
     * Once all chunks of a single Segment have been given to `pushChunk`, you
     * should call `signalSegmentComplete` to indicate that the whole Segment has
     * been pushed.
     *
     * Depending on the type of data appended, the pushed chunk might rely on an
     * initialization segment, given through the `data.initSegment` property.
     *
     * Such initialization segment will be first pushed to the SourceBuffer if the
     * last pushed segment was associated to another initialization segment.
     * This detection rely on the initialization segment's reference so you need
     * to avoid mutating in-place a initialization segment given to that function
     * (to avoid having two different values which have the same reference).
     *
     * If you don't need any initialization segment to push the wanted chunk, you
     * can just set `data.initSegment` to `null`.
     *
     * You can also only push an initialization segment by setting the
     * `data.chunk` argument to null.
     *
     * @param {Object} infos
     * @returns {Promise}
     */
    async pushChunk(infos) {
      assertDataIsBufferSource(infos.data.chunk);
      log_default.debug("Stream", "queuing push order", getLoggableSegmentId(infos.inventoryInfos));
      const dataToPush = this._getActualDataToPush(
        infos.data
      );
      if (dataToPush.length === 0) {
        dataToPush.push(new Uint8Array());
      }
      const promise = Promise.all(
        dataToPush.map((data) => {
          const { codec, timestampOffset, appendWindow } = infos.data;
          log_default.debug("Stream", "now pushing", getLoggableSegmentId(infos.inventoryInfos));
          return this._sourceBuffer.appendBuffer(data, {
            codec,
            timestampOffset,
            appendWindow
          });
        })
      );
      this._addToOperationQueue(promise, {
        type: 0 /* Push */,
        value: infos
      });
      let res;
      try {
        res = await promise;
      } catch (err) {
        this._segmentInventory.insertChunk(
          infos.inventoryInfos,
          false,
          monotonic_timestamp_default()
        );
        throw err;
      }
      if (infos.inventoryInfos !== null) {
        this._segmentInventory.insertChunk(
          infos.inventoryInfos,
          true,
          monotonic_timestamp_default()
        );
      }
      const ranges = res[res.length - 1];
      this._segmentInventory.synchronizeBuffered(ranges);
      return ranges;
    }
    /** @see SegmentSink */
    async removeBuffer(start, end) {
      log_default.debug("Stream", "queuing remove order", {
        bufferType: this.bufferType,
        start,
        end
      });
      const promise = this._sourceBuffer.remove(start, end);
      this._addToOperationQueue(promise, {
        type: 1 /* Remove */,
        value: { start, end }
      });
      const ranges = await promise;
      this._segmentInventory.synchronizeBuffered(ranges);
      return ranges;
    }
    /**
     * Indicate that every chunks from a Segment has been given to pushChunk so
     * far.
     * This will update our internal Segment inventory accordingly.
     * The returned Promise will resolve once the whole segment has been pushed
     * and this indication is acknowledged.
     * @param {Object} infos
     * @returns {Promise}
     */
    async signalSegmentComplete(infos) {
      if (this._pendingOperations.length > 0) {
        const { promise } = this._pendingOperations[this._pendingOperations.length - 1];
        this._addToOperationQueue(promise, {
          type: 2 /* SignalSegmentComplete */,
          value: infos
        });
        try {
          await promise;
        } catch (_) {
        }
      }
      this._segmentInventory.completeSegment(infos);
    }
    /**
     * Returns the list of every operations that the `AudioVideoSegmentSink` is
     * still processing.
     * @returns {Array.<Object>}
     */
    getPendingOperations() {
      return this._pendingOperations.map((p) => p.operation);
    }
    /** @see SegmentSink */
    dispose(reason) {
      try {
        log_default.debug("Stream", "Calling `dispose` on the SourceBufferInterface");
        this._sourceBuffer.dispose(reason);
      } catch (e) {
        log_default.debug(
          "Stream",
          `Failed to dispose a ${this.bufferType} SourceBufferInterface:`,
          e instanceof Error ? e : "Unknown Error"
        );
      }
    }
    /**
     * A single `pushChunk` might actually necessitate two `appendBuffer` call
     * if the initialization segment needs to be pushed again.
     *
     * This method perform this check and actually return both the
     * initialization segment then the media segment when the former needs to
     * be pushed again first.
     * @param {Object} data
     * @returns {Object}
     */
    _getActualDataToPush(data) {
      const dataToPush = [];
      if (data.initSegmentUniqueId !== null && !this._isLastInitSegment(data.initSegmentUniqueId)) {
        let segmentData = this._initSegmentsMap.get(data.initSegmentUniqueId);
        if (segmentData === void 0) {
          throw new Error("Invalid initialization segment uniqueId");
        }
        const dst = new ArrayBuffer(segmentData.byteLength);
        const tmpU8 = new Uint8Array(dst);
        tmpU8.set(
          segmentData instanceof ArrayBuffer ? new Uint8Array(segmentData) : new Uint8Array(segmentData.buffer)
        );
        segmentData = tmpU8;
        dataToPush.push(segmentData);
        this._lastInitSegmentUniqueId = data.initSegmentUniqueId;
      }
      if (data.chunk !== null) {
        dataToPush.push(data.chunk);
      }
      return dataToPush;
    }
    /**
     * Return `true` if the given `uniqueId` is the identifier of the last
     * initialization segment pushed to the `AudioVideoSegmentSink`.
     * @param {string} uniqueId
     * @returns {boolean}
     */
    _isLastInitSegment(uniqueId) {
      if (this._lastInitSegmentUniqueId === null) {
        return false;
      }
      return this._lastInitSegmentUniqueId === uniqueId;
    }
    _addToOperationQueue(promise, operation) {
      const queueObject = { operation, promise };
      this._pendingOperations.push(queueObject);
      const endOperation = () => {
        const indexOf = this._pendingOperations.indexOf(queueObject);
        if (indexOf >= 0) {
          this._pendingOperations.splice(indexOf, 1);
        }
      };
      promise.then(endOperation, endOperation);
    }
  };
  function assertDataIsBufferSource(data) {
    if (define_ENVIRONMENT_default.CURRENT_ENV === define_ENVIRONMENT_default.PRODUCTION) {
      return;
    }
    if (typeof data !== "object" || data !== null && !(data instanceof ArrayBuffer) && !(data.buffer instanceof ArrayBuffer)) {
      throw new Error("Invalid data given to the AudioVideoSegmentSink");
    }
  }

  // src/core/segment_sinks/implementations/audio_video/index.ts
  var audio_video_default = AudioVideoSegmentSink;

  // src/core/segment_sinks/implementations/text/text_segment_sink.ts
  var TextSegmentSink = class extends SegmentSink {
    /**
     * @param {Object} textDisplayerSender
     */
    constructor(textDisplayerSender) {
      log_default.debug("Stream", "Creating TextSegmentSink");
      super();
      this.bufferType = "text";
      this._sender = textDisplayerSender;
      this._pendingOperations = [];
      this._sender.reset();
    }
    /**
     * @param {string} uniqueId
     */
    declareInitSegment(uniqueId) {
      log_default.warn("Stream", "Declaring initialization segment for  Text SegmentSink", {
        uniqueId
      });
    }
    /**
     * @param {string} uniqueId
     */
    freeInitSegment(uniqueId) {
      log_default.warn("Stream", "Freeing initialization segment for  Text SegmentSink", {
        uniqueId
      });
    }
    /**
     * Push text segment to the TextSegmentSink.
     * @param {Object} infos
     * @returns {Promise}
     */
    async pushChunk(infos) {
      const { data } = infos;
      assertChunkIsTextTrackSegmentData(data.chunk);
      const promise = this._sender.pushTextData(__spreadProps(__spreadValues({}, data), {
        chunk: data.chunk
      }));
      this._addToOperationQueue(promise, {
        type: 0 /* Push */,
        value: infos
      });
      const ranges = await promise;
      if (infos.inventoryInfos !== null) {
        this._segmentInventory.insertChunk(
          infos.inventoryInfos,
          true,
          monotonic_timestamp_default()
        );
      }
      this._segmentInventory.synchronizeBuffered(ranges);
      return ranges;
    }
    /**
     * Remove buffered data.
     * @param {number} start - start position, in seconds
     * @param {number} end - end position, in seconds
     * @returns {Promise}
     */
    async removeBuffer(start, end) {
      const promise = this._sender.remove(start, end);
      this._addToOperationQueue(promise, {
        type: 1 /* Remove */,
        value: { start, end }
      });
      const ranges = await promise;
      this._segmentInventory.synchronizeBuffered(ranges);
      return ranges;
    }
    /**
     * @param {Object} infos
     * @returns {Promise}
     */
    async signalSegmentComplete(infos) {
      if (this._pendingOperations.length > 0) {
        const { promise } = this._pendingOperations[this._pendingOperations.length - 1];
        this._addToOperationQueue(promise, {
          type: 2 /* SignalSegmentComplete */,
          value: infos
        });
        try {
          await promise;
        } catch (_) {
        }
      }
      this._segmentInventory.completeSegment(infos);
    }
    /**
     * @returns {Array.<Object>}
     */
    getPendingOperations() {
      return this._pendingOperations.map((p) => p.operation);
    }
    dispose() {
      log_default.debug("Stream", "Disposing TextSegmentSink");
      this._sender.reset();
    }
    _addToOperationQueue(promise, operation) {
      const queueObject = { operation, promise };
      this._pendingOperations.push(queueObject);
      const endOperation = () => {
        const indexOf = this._pendingOperations.indexOf(queueObject);
        if (indexOf >= 0) {
          this._pendingOperations.splice(indexOf, 1);
        }
      };
      promise.then(endOperation, endOperation);
    }
  };
  function assertChunkIsTextTrackSegmentData(chunk) {
    if (define_ENVIRONMENT_default.CURRENT_ENV === define_ENVIRONMENT_default.PRODUCTION) {
      return;
    }
    if (typeof chunk !== "object" || chunk === null || isNullOrUndefined(chunk.data)) {
      throw new Error("Invalid format given to a TextSegmentSink");
    }
    if (!isTextTracksBufferSegmentData(chunk)) {
      throw new Error("Invalid format given to a TextSegmentSink");
    }
    if (typeof chunk.data !== "string" && typeof chunk.data.byteLength !== "number") {
      throw new Error("Invalid format given to a TextSegmentSink");
    }
  }
  function isTextTracksBufferSegmentData(chunk) {
    if (typeof chunk !== "object" || chunk === null) {
      return false;
    }
    if (typeof chunk.type !== "string") {
      return false;
    }
    if (chunk.language !== void 0 && typeof chunk.language !== "string") {
      return false;
    }
    if (chunk.initTimescale !== null && typeof chunk.initTimescale !== "number") {
      return false;
    }
    if (chunk.start !== void 0 && typeof chunk.start !== "number") {
      return false;
    }
    if (chunk.end !== void 0 && typeof chunk.end !== "number") {
      return false;
    }
    return true;
  }
  if (define_ENVIRONMENT_default.CURRENT_ENV === define_ENVIRONMENT_default.DEV) {
    let _checkType = function(input) {
      function checkEqual(_arg) {
      }
      checkEqual(input);
    };
    _checkType2 = _checkType;
  }
  var _checkType2;

  // src/core/segment_sinks/implementations/text/index.ts
  var text_default = TextSegmentSink;

  // src/core/segment_sinks/segment_sinks_store.ts
  var POSSIBLE_BUFFER_TYPES = ["audio", "video", "text"];
  var SegmentSinksStore = class _SegmentSinksStore {
    /**
     * Returns true if the type is linked to a "native" media buffer (i.e. relying
     * on a SourceBuffer object, native to the browser).
     * Native media buffers needed for the current content must all be created
     * before the content begins to be played and cannot be disposed during
     * playback.
     * @param {string} bufferType
     * @returns {Boolean}
     */
    static isNative(bufferType) {
      return shouldHaveNativeBuffer(bufferType);
    }
    /**
     * @param {Object} mediaSource
     * @constructor
     */
    constructor(mediaSource, hasVideo, textDisplayerInterface) {
      this._mediaSource = mediaSource;
      this._textInterface = textDisplayerInterface;
      this._hasVideo = hasVideo;
      this._initializedSegmentSinks = {};
      this._onNativeBufferAddedOrDisabled = [];
    }
    /**
     * Get all currently available buffer types.
     * /!\ This list can evolve at runtime depending on feature switching.
     * @returns {Array.<string>}
     */
    getBufferTypes() {
      const bufferTypes = this.getNativeBufferTypes();
      if (this._textInterface !== null) {
        bufferTypes.push("text");
      }
      return bufferTypes;
    }
    /**
     * Get all "native" buffer types that should be created before beginning to
     * push contents.
     * @returns {Array.<string>}
     */
    getNativeBufferTypes() {
      return this._hasVideo ? ["video", "audio"] : ["audio"];
    }
    /**
     * Returns the current "status" of the SegmentSink linked to the buffer
     * type given.
     *
     * This function will return  an object containing a key named `type` which
     * can be equal to either one of those three value:
     *
     *   - "initialized": A SegmentSink has been created for that type.
     *     You will in this case also have a second key, `value`, which will
     *     contain the related SegmentSink instance.
     *     Please note that you will need to wait until
     *     `this.waitForUsableBuffers()` has emitted before pushing segment
     *     data to a SegmentSink relying on a SourceBuffer.
     *
     *   - "disabled": The SegmentSink has been explicitely disabled for this
     *     type.
     *
     *   - "uninitialized": No action has yet been yet for that SegmentSink.
     *
     * @param {string} bufferType
     * @returns {Object|null}
     */
    getStatus(bufferType) {
      const initializedBuffer = this._initializedSegmentSinks[bufferType];
      if (initializedBuffer === void 0) {
        return { type: "uninitialized" };
      }
      if (initializedBuffer === null) {
        return { type: "disabled" };
      }
      return { type: "initialized", value: initializedBuffer };
    }
    /**
     * Native media buffers (audio and video) needed for playing the current
     * content need to all be created (by creating SegmentSinks linked to them)
     * before any one can be used.
     *
     * This function will return a Promise resolving when any and all native
     * SourceBuffers can be used.
     *
     * From https://w3c.github.io/media-source/#methods
     *   For example, a user agent may throw a QuotaExceededError
     *   exception if the media element has reached the HAVE_METADATA
     *   readyState. This can occur if the user agent's media engine
     *   does not support adding more tracks during playback.
     * @param {Object} cancelWaitSignal
     * @return {Promise}
     */
    waitForUsableBuffers(cancelWaitSignal) {
      if (this._areNativeBuffersUsable()) {
        return Promise.resolve();
      }
      return createCancellablePromise(cancelWaitSignal, (res) => {
        let onAddedOrDisabled = noop_default;
        const removeCallback = () => {
          const indexOf = this._onNativeBufferAddedOrDisabled.indexOf(onAddedOrDisabled);
          if (indexOf >= 0) {
            this._onNativeBufferAddedOrDisabled.splice(indexOf, 1);
          }
        };
        onAddedOrDisabled = () => {
          if (this._areNativeBuffersUsable()) {
            removeCallback();
            res();
          }
        };
        this._onNativeBufferAddedOrDisabled.push(onAddedOrDisabled);
        return removeCallback;
      });
    }
    /**
     * Explicitely disable the SegmentSink for a given buffer type.
     * A call to this function is needed at least for unused native buffer types
     * (usually "audio" and "video"), to be able to emit through
     * `waitForUsableBuffers` when conditions are met.
     * @param {string} bufferType
     */
    disableSegmentSink(bufferType) {
      const currentValue = this._initializedSegmentSinks[bufferType];
      if (currentValue === null) {
        log_default.warn("Stream", `The ${bufferType} SegmentSink was already disabled.`);
        return;
      }
      if (currentValue !== void 0) {
        throw new Error("Cannot disable an active SegmentSink.");
      }
      this._initializedSegmentSinks[bufferType] = null;
      if (_SegmentSinksStore.isNative(bufferType)) {
        this._onNativeBufferAddedOrDisabled.slice().forEach((cb) => cb());
        assert(this._onNativeBufferAddedOrDisabled.length === 0);
      }
    }
    /**
     * Creates a new SegmentSink associated to a type.
     * Reuse an already created one if a SegmentSink for the given type
     * already exists.
     *
     * Please note that you will need to wait until `this.waitForUsableBuffers()`
     * has emitted before pushing segment data to a SegmentSink of a native
     * type.
     * @param {string} bufferType
     * @param {string} codec
     * @returns {Object}
     */
    createSegmentSink(bufferType, codec) {
      const memorizedSegmentSink = this._initializedSegmentSinks[bufferType];
      if (shouldHaveNativeBuffer(bufferType)) {
        if (!isNullOrUndefined(memorizedSegmentSink)) {
          if (memorizedSegmentSink instanceof audio_video_default && memorizedSegmentSink.codec !== codec) {
            log_default.warn(
              "Stream",
              "Reusing native SegmentSink with codec",
              memorizedSegmentSink.codec,
              "for codec",
              codec
            );
          } else {
            log_default.info("Stream", "Reusing native SegmentSink with codec", codec);
          }
          return memorizedSegmentSink;
        }
        log_default.info("Stream", "Adding native SegmentSink with codec", codec);
        const sourceBufferType = bufferType === "audio" ? "audio" /* Audio */ : "video" /* Video */;
        const nativeSegmentSink = new audio_video_default(
          sourceBufferType,
          codec,
          this._mediaSource
        );
        this._initializedSegmentSinks[bufferType] = nativeSegmentSink;
        this._onNativeBufferAddedOrDisabled.slice().forEach((cb) => cb());
        assert(this._onNativeBufferAddedOrDisabled.length === 0);
        return nativeSegmentSink;
      }
      if (!isNullOrUndefined(memorizedSegmentSink)) {
        log_default.info("Stream", "Reusing a previous custom SegmentSink", { bufferType });
        return memorizedSegmentSink;
      }
      let segmentSink;
      if (bufferType === "text") {
        log_default.info("Stream", "Creating a new text SegmentSink");
        if (this._textInterface === null) {
          throw new Error("HTML Text track feature not activated");
        }
        segmentSink = new text_default(this._textInterface);
        this._initializedSegmentSinks.text = segmentSink;
        return segmentSink;
      }
      log_default.error("Stream", "Unknown buffer type:", { bufferType });
      throw new MediaError(
        "BUFFER_TYPE_UNKNOWN",
        "The player wants to create a SegmentSink of an unknown type."
      );
    }
    /**
     * Dispose of the active SegmentSink for the given type.
     * @param {string} bufferType
     * @param {string | undefined} reason - Human-inspectable reason behind the
     * dispose. Used for debugging matters, especially for debug log
     * inspection.
     */
    disposeSegmentSink(bufferType, reason) {
      const memorizedSegmentSink = this._initializedSegmentSinks[bufferType];
      if (isNullOrUndefined(memorizedSegmentSink)) {
        log_default.warn("Stream", "Trying to dispose a SegmentSink that does not exist", {
          bufferType
        });
        return;
      }
      log_default.info("Stream", "Aborting SegmentSink", { bufferType });
      memorizedSegmentSink.dispose(reason);
      delete this._initializedSegmentSinks[bufferType];
    }
    /**
     * Dispose of all SegmentSink created on this SegmentSinksStore.
     * @param {string | undefined} reason - Human-inspectable reason behind the
     * dispose. Used for debugging matters, especially for debug log
     * inspection.
     */
    disposeAll(reason) {
      POSSIBLE_BUFFER_TYPES.forEach((bufferType) => {
        if (this.getStatus(bufferType).type === "initialized") {
          this.disposeSegmentSink(bufferType, reason);
        }
      });
    }
    /**
     * Returns `true` when we're ready to push and decode contents to
     * SourceBuffers created by SegmentSinks of a native buffer type.
     */
    _areNativeBuffersUsable() {
      const nativeBufferTypes = this.getNativeBufferTypes();
      const hasUnitializedBuffers = nativeBufferTypes.some(
        (sbType) => this._initializedSegmentSinks[sbType] === void 0
      );
      if (hasUnitializedBuffers) {
        return false;
      }
      const areAllDisabled = nativeBufferTypes.every(
        (sbType) => this._initializedSegmentSinks[sbType] === null
      );
      if (areAllDisabled) {
        return false;
      }
      return true;
    }
    createSegmentSinkMetricsForType(bufferType) {
      var _a2, _b2;
      const inventory = (_a2 = this._initializedSegmentSinks[bufferType]) == null ? void 0 : _a2.getLastKnownInventory();
      let sizeEstimate;
      if (inventory !== void 0) {
        sizeEstimate = 0;
        for (const item of inventory) {
          if (item.chunkSize === void 0 || sizeEstimate === void 0) {
            sizeEstimate = void 0;
            break;
          }
          sizeEstimate += item.chunkSize;
        }
      }
      return {
        bufferType,
        sizeEstimate,
        codec: (_b2 = this._initializedSegmentSinks[bufferType]) == null ? void 0 : _b2.codec,
        segmentInventory: inventory == null ? void 0 : inventory.map((chunk) => __spreadProps(__spreadValues({}, chunk), {
          infos: getChunkContextSnapshot(chunk.infos)
        }))
      };
    }
    getSegmentSinksMetrics() {
      return {
        segmentSinks: {
          audio: this.createSegmentSinkMetricsForType("audio"),
          video: this.createSegmentSinkMetricsForType("video"),
          text: this.createSegmentSinkMetricsForType("text")
        }
      };
    }
  };
  function shouldHaveNativeBuffer(bufferType) {
    return bufferType === "audio" || bufferType === "video";
  }
  function getChunkContextSnapshot(context) {
    return {
      adaptation: context.adaptation.getMetadataSnapshot(),
      period: context.period.getMetadataSnapshot(),
      representation: context.representation.getMetadataSnapshot()
    };
  }

  // src/core/segment_sinks/index.ts
  var segment_sinks_default = SegmentSinksStore;

  // src/core/stream/representation/utils/check_for_discontinuity.ts
  function checkForDiscontinuity(content, checkedRange, nextSegmentStart, hasFinishedLoading, bufferedSegments) {
    const { period, adaptation, representation } = content;
    const nextBufferedInRangeIdx = getIndexOfFirstChunkInRange(
      bufferedSegments,
      checkedRange
    );
    if (nextBufferedInRangeIdx === null) {
      if (nextSegmentStart === null) {
        if (hasFinishedLoading && period.end !== void 0 && checkedRange.end >= period.end) {
          return { start: void 0, end: null };
        }
        const discontinuityEnd = representation.index.checkDiscontinuity(
          checkedRange.start
        );
        if (discontinuityEnd !== null) {
          return { start: void 0, end: discontinuityEnd };
        }
      }
      return null;
    }
    const nextBufferedSegment = bufferedSegments[nextBufferedInRangeIdx];
    if (
      // Next buffered segment starts after the start of the current range
      nextBufferedSegment.bufferedStart !== void 0 && nextBufferedSegment.bufferedStart > checkedRange.start && // and no segment will fill in that hole
      (nextSegmentStart === null || nextBufferedSegment.infos.segment.end <= nextSegmentStart)
    ) {
      const discontinuityEnd = nextBufferedSegment.bufferedStart;
      if (!hasFinishedLoading && representation.index.awaitSegmentBetween(checkedRange.start, discontinuityEnd) !== false) {
        return null;
      }
      log_default.debug("Stream", "current discontinuity encountered", {
        bufferType: adaptation.type,
        nextSegmentTime: nextBufferedSegment.bufferedStart,
        checkStartTime: checkedRange.start
      });
      return { start: void 0, end: discontinuityEnd };
    }
    const nextHoleIdx = getIndexOfFirstDiscontinuityBetweenChunks(
      bufferedSegments,
      checkedRange,
      nextBufferedInRangeIdx + 1
    );
    if (nextHoleIdx !== null) {
      const segmentInfoBeforeHole = bufferedSegments[nextHoleIdx - 1];
      const segmentInfoAfterHole = bufferedSegments[nextHoleIdx];
      if (nextSegmentStart === null || segmentInfoAfterHole.infos.segment.end <= nextSegmentStart) {
        if (!hasFinishedLoading && representation.index.awaitSegmentBetween(
          segmentInfoBeforeHole.infos.segment.end,
          segmentInfoAfterHole.infos.segment.time
        ) !== false) {
          return null;
        }
        const start = segmentInfoBeforeHole.bufferedEnd;
        const end = segmentInfoAfterHole.bufferedStart;
        log_default.debug("Stream", "future discontinuity encountered", {
          bufferType: adaptation.type,
          discontinuityStart: start,
          discontinuityEnd: end
        });
        return { start, end };
      }
    }
    if (nextSegmentStart === null) {
      if (hasFinishedLoading && period.end !== void 0) {
        if (checkedRange.end < period.end) {
          return null;
        }
        const lastBufferedInPeriodIdx = getIndexOfLastChunkInPeriod(
          bufferedSegments,
          period.end
        );
        if (lastBufferedInPeriodIdx !== null) {
          const lastSegment = bufferedSegments[lastBufferedInPeriodIdx];
          if (lastSegment.bufferedEnd !== void 0 && lastSegment.bufferedEnd < period.end) {
            log_default.debug(
              "Stream",
              "discontinuity encountered at the end of the current period",
              {
                bufferType: adaptation.type,
                segmentsEndTimeFromPeriod: lastSegment.bufferedEnd,
                periodEnd: period.end
              }
            );
            return { start: lastSegment.bufferedEnd, end: null };
          }
        }
      }
      if (period.end !== void 0 && checkedRange.end >= period.end) {
        return null;
      }
      for (let bufIdx = bufferedSegments.length - 1; bufIdx >= 0; bufIdx--) {
        const bufSeg = bufferedSegments[bufIdx];
        if (bufSeg.bufferedStart === void 0) {
          break;
        }
        if (bufSeg.bufferedStart < checkedRange.end) {
          if (bufSeg.bufferedEnd !== void 0 && bufSeg.bufferedEnd < checkedRange.end) {
            const discontinuityEnd = representation.index.checkDiscontinuity(
              checkedRange.end
            );
            if (discontinuityEnd !== null) {
              return { start: bufSeg.bufferedEnd, end: discontinuityEnd };
            }
          }
          return null;
        }
      }
    }
    return null;
  }
  function getIndexOfFirstChunkInRange(bufferedChunks, range) {
    for (let bufIdx = 0; bufIdx < bufferedChunks.length; bufIdx++) {
      const bufSeg = bufferedChunks[bufIdx];
      if (bufSeg.bufferedStart === void 0 || bufSeg.bufferedEnd === void 0 || bufSeg.bufferedStart >= range.end) {
        return null;
      }
      if (bufSeg.bufferedEnd > range.start) {
        return bufIdx;
      }
    }
    return null;
  }
  function getIndexOfFirstDiscontinuityBetweenChunks(bufferedChunks, range, startFromIndex) {
    if (startFromIndex <= 0) {
      log_default.error("Stream", "Asked to check a discontinuity before the first chunk.");
      return null;
    }
    for (let bufIdx = startFromIndex; bufIdx < bufferedChunks.length; bufIdx++) {
      const currSegment = bufferedChunks[bufIdx];
      const prevSegment = bufferedChunks[bufIdx - 1];
      if (currSegment.bufferedStart === void 0 || prevSegment.bufferedEnd === void 0 || currSegment.bufferedStart >= range.end) {
        return null;
      }
      if (currSegment.bufferedStart - prevSegment.bufferedEnd > 0) {
        return bufIdx;
      }
    }
    return null;
  }
  function getIndexOfLastChunkInPeriod(bufferedChunks, periodEnd) {
    for (let bufIdx = bufferedChunks.length - 1; bufIdx >= 0; bufIdx--) {
      const bufSeg = bufferedChunks[bufIdx];
      if (bufSeg.bufferedStart === void 0) {
        return null;
      }
      if (bufSeg.bufferedStart < periodEnd) {
        return bufIdx;
      }
    }
    return null;
  }

  // src/core/stream/representation/utils/get_needed_segments.ts
  function getNeededSegments({
    bufferedSegments,
    content,
    currentPlaybackTime,
    fastSwitchThreshold,
    getBufferedHistory,
    neededRange,
    segmentsBeingPushed,
    maxBufferSize
  }) {
    const { adaptation, representation } = content;
    let availableBufferSize = getAvailableBufferSize(
      bufferedSegments,
      segmentsBeingPushed,
      maxBufferSize
    );
    const availableSegmentsForRange = representation.index.getSegments(
      neededRange.start,
      neededRange.end - neededRange.start
    );
    const segmentsToKeep = bufferedSegments.filter(
      (bufferedSegment) => !shouldContentBeReplaced(
        bufferedSegment.infos,
        content,
        currentPlaybackTime,
        fastSwitchThreshold
      )
    );
    const reusableSegments = filterOutGCedSegments(
      segmentsToKeep,
      neededRange,
      getBufferedHistory
    );
    const { MINIMUM_SEGMENT_SIZE, MIN_BUFFER_AHEAD } = config_default.getCurrent();
    let shouldStopLoadingSegments = false;
    const ROUNDING_ERROR = Math.min(1 / 60, MINIMUM_SEGMENT_SIZE);
    let isBufferFull = false;
    const segmentsOnHold = [];
    const segmentsToLoad = availableSegmentsForRange.filter((segment) => {
      const contentObject = object_assign_default({ segment }, content);
      if (segmentsBeingPushed.length > 0) {
        const isAlreadyBeingPushed = segmentsBeingPushed.some(
          (pendingSegment) => areSameContent(contentObject, pendingSegment)
        );
        if (isAlreadyBeingPushed) {
          return false;
        }
      }
      const { duration, time, end } = segment;
      if (segment.isInit) {
        return true;
      }
      if (shouldStopLoadingSegments) {
        segmentsOnHold.push(segment);
        return false;
      }
      if (segment.complete && duration < MINIMUM_SEGMENT_SIZE) {
        return false;
      }
      if (segmentsBeingPushed.length > 0) {
        const waitForPushedSegment = segmentsBeingPushed.some((pendingSegment) => {
          if (pendingSegment.period.id !== content.period.id || pendingSegment.adaptation.id !== content.adaptation.id) {
            return false;
          }
          const { segment: oldSegment } = pendingSegment;
          if (oldSegment.time - ROUNDING_ERROR > time) {
            return false;
          }
          if (oldSegment.complete) {
            if (oldSegment.end + ROUNDING_ERROR < end) {
              return false;
            }
          } else if (Math.abs(time - oldSegment.time) > time) {
            return false;
          }
          return !shouldContentBeReplaced(
            pendingSegment,
            contentObject,
            currentPlaybackTime,
            fastSwitchThreshold
          );
        });
        if (waitForPushedSegment) {
          return false;
        }
      }
      for (const completeSeg of reusableSegments) {
        const areFromSamePeriod = completeSeg.infos.period.id === content.period.id;
        if (completeSeg.status === 1 /* FullyLoaded */ && areFromSamePeriod) {
          const completeSegInfos = completeSeg.infos.segment;
          if (time - completeSegInfos.time > -ROUNDING_ERROR) {
            if (completeSegInfos.complete) {
              if (completeSegInfos.end - end > -ROUNDING_ERROR) {
                return false;
              }
            } else if (Math.abs(time - completeSegInfos.time) < ROUNDING_ERROR) {
              return false;
            }
          }
        }
      }
      const estimatedSegmentSize = duration * content.representation.bitrate;
      if (availableBufferSize - estimatedSegmentSize < 0) {
        isBufferFull = true;
        if (time > neededRange.start + MIN_BUFFER_AHEAD) {
          shouldStopLoadingSegments = true;
          segmentsOnHold.push(segment);
          return false;
        }
      }
      const segmentHistory = getBufferedHistory(contentObject);
      if (segmentHistory.length > 1) {
        const lastTimeItWasPushed = segmentHistory[segmentHistory.length - 1];
        const beforeLastTimeItWasPushed = segmentHistory[segmentHistory.length - 2];
        if (lastTimeItWasPushed.buffered === null && beforeLastTimeItWasPushed.buffered === null) {
          log_default.warn(
            "Stream",
            "Segment GCed multiple times in a row, ignoring it.",
            "If this happens a lot and lead to unpleasant experience, please  check your device's available memory. If it's low when this message is emitted, you might want to update the RxPlayer's settings (`maxBufferAhead`, `maxVideoBufferSize` etc.) so less memory is used by regular media data buffering.",
            {
              bufferType: adaptation.type,
              representationId: representation.id,
              segmentTime: segment.time
            }
          );
          return false;
        }
      }
      for (let i = 0; i < reusableSegments.length; i++) {
        const completeSeg = reusableSegments[i];
        if (completeSeg.end + ROUNDING_ERROR > time) {
          const shouldLoad = completeSeg.start > time + ROUNDING_ERROR || getLastContiguousSegment(reusableSegments, i).end < end - ROUNDING_ERROR;
          if (shouldLoad) {
            availableBufferSize -= estimatedSegmentSize;
          }
          return shouldLoad;
        }
      }
      availableBufferSize -= estimatedSegmentSize;
      return true;
    });
    return { segmentsToLoad, segmentsOnHold, isBufferFull };
  }
  function getAvailableBufferSize(bufferedSegments, segmentsBeingPushed, maxVideoBufferSize) {
    let availableBufferSize = maxVideoBufferSize * 8e3;
    availableBufferSize -= segmentsBeingPushed.reduce((size, segment) => {
      const { bitrate } = segment.representation;
      const { duration } = segment.segment;
      return size + bitrate * duration;
    }, 0);
    return bufferedSegments.reduce((size, chunk) => {
      if (chunk.chunkSize !== void 0) {
        return size - chunk.chunkSize * 8;
      } else {
        return size;
      }
    }, availableBufferSize);
  }
  function getLastContiguousSegment(bufferedSegments, startIndex) {
    let j = startIndex + 1;
    const { MINIMUM_SEGMENT_SIZE } = config_default.getCurrent();
    const ROUNDING_ERROR = Math.min(1 / 60, MINIMUM_SEGMENT_SIZE);
    while (j < bufferedSegments.length - 1 && bufferedSegments[j - 1].end + ROUNDING_ERROR > bufferedSegments[j].start) {
      j++;
    }
    j--;
    return bufferedSegments[j];
  }
  function shouldContentBeReplaced(oldContent, currentContent, currentPlaybackTime, fastSwitchThreshold) {
    const { CONTENT_REPLACEMENT_PADDING } = config_default.getCurrent();
    if (oldContent.period.id !== currentContent.period.id) {
      return false;
    }
    const { segment } = oldContent;
    if (segment.time < currentPlaybackTime + CONTENT_REPLACEMENT_PADDING) {
      return false;
    }
    if (oldContent.adaptation.id !== currentContent.adaptation.id) {
      return true;
    }
    return canFastSwitch(
      oldContent.representation,
      currentContent.representation,
      fastSwitchThreshold
    );
  }
  function canFastSwitch(oldSegmentRepresentation, newSegmentRepresentation, fastSwitchThreshold) {
    const oldContentBitrate = oldSegmentRepresentation.bitrate;
    const { BITRATE_REBUFFERING_RATIO } = config_default.getCurrent();
    if (fastSwitchThreshold === void 0) {
      const bitrateCeil = oldContentBitrate * BITRATE_REBUFFERING_RATIO;
      return newSegmentRepresentation.bitrate > bitrateCeil;
    }
    return oldContentBitrate < fastSwitchThreshold && newSegmentRepresentation.bitrate > oldContentBitrate;
  }
  function doesStartSeemGarbageCollected(currentSeg, prevSeg, maximumStartTime) {
    const { MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT } = config_default.getCurrent();
    if (currentSeg.bufferedStart === void 0) {
      return false;
    }
    if (prevSeg !== null && prevSeg.bufferedEnd !== void 0 && currentSeg.bufferedStart - prevSeg.bufferedEnd < 0.1) {
      return false;
    }
    if (maximumStartTime < currentSeg.bufferedStart && currentSeg.bufferedStart - currentSeg.start > MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT) {
      log_default.info("Stream", "The start of the wanted segment has been garbage collected", {
        segmentStart: currentSeg.start,
        currentStartInBuffer: currentSeg.bufferedStart
      });
      return true;
    }
    return false;
  }
  function doesEndSeemGarbageCollected(currentSeg, nextSeg, minimumEndTime) {
    const { MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT } = config_default.getCurrent();
    if (currentSeg.bufferedEnd === void 0) {
      return false;
    }
    if (nextSeg !== null && nextSeg.bufferedStart !== void 0 && nextSeg.bufferedStart - currentSeg.bufferedEnd < 0.1) {
      return false;
    }
    if (minimumEndTime > currentSeg.bufferedEnd && currentSeg.end - currentSeg.bufferedEnd > MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT) {
      log_default.info("Stream", "The end of the wanted segment has been garbage collected", {
        segmentEnd: currentSeg.end,
        currentEndInBuffer: currentSeg.bufferedEnd
      });
      return true;
    }
    return false;
  }
  function shouldReloadSegmentGCedAtTheStart(segmentEntries, currentBufferedStart) {
    var _a2, _b2;
    if (segmentEntries.length < 2) {
      return true;
    }
    const lastEntry = segmentEntries[segmentEntries.length - 1];
    const lastBufferedStart = (_a2 = lastEntry.buffered) == null ? void 0 : _a2.start;
    if (currentBufferedStart !== void 0 && lastBufferedStart !== void 0 && currentBufferedStart - lastBufferedStart > 0.05) {
      return true;
    }
    const prevEntry = segmentEntries[segmentEntries.length - 2];
    const prevBufferedStart = (_b2 = prevEntry.buffered) == null ? void 0 : _b2.start;
    if (prevBufferedStart === void 0 || lastBufferedStart === void 0) {
      return true;
    }
    return Math.abs(prevBufferedStart - lastBufferedStart) > 0.01;
  }
  function shouldReloadSegmentGCedAtTheEnd(segmentEntries, currentBufferedEnd) {
    var _a2, _b2;
    if (segmentEntries.length < 2) {
      return true;
    }
    const lastEntry = segmentEntries[segmentEntries.length - 1];
    const lastBufferedEnd = (_a2 = lastEntry.buffered) == null ? void 0 : _a2.end;
    if (currentBufferedEnd !== void 0 && lastBufferedEnd !== void 0 && lastBufferedEnd - currentBufferedEnd > 0.05) {
      return true;
    }
    const prevEntry = segmentEntries[segmentEntries.length - 2];
    const prevBufferedEnd = (_b2 = prevEntry.buffered) == null ? void 0 : _b2.end;
    if (prevBufferedEnd === void 0 || lastBufferedEnd === void 0) {
      return true;
    }
    return Math.abs(prevBufferedEnd - lastBufferedEnd) > 0.01;
  }
  function filterOutGCedSegments(segments, neededRange, getBufferedHistory) {
    return segments.filter((currentSeg, i, consideredSegments) => {
      const prevSeg = i === 0 ? null : consideredSegments[i - 1];
      const nextSeg = i >= consideredSegments.length - 1 ? null : consideredSegments[i + 1];
      let lazySegmentHistory = null;
      if (doesStartSeemGarbageCollected(currentSeg, prevSeg, neededRange.start)) {
        lazySegmentHistory = getBufferedHistory(currentSeg.infos);
        if (shouldReloadSegmentGCedAtTheStart(lazySegmentHistory, currentSeg.bufferedStart)) {
          return false;
        }
        log_default.debug("Stream", "skipping segment gc-ed at the start", {
          segmentStart: currentSeg.start,
          currentStartInBuffer: currentSeg.bufferedStart
        });
      }
      if (doesEndSeemGarbageCollected(currentSeg, nextSeg, neededRange.end)) {
        lazySegmentHistory = lazySegmentHistory != null ? lazySegmentHistory : getBufferedHistory(currentSeg.infos);
        if (shouldReloadSegmentGCedAtTheEnd(lazySegmentHistory, currentSeg.bufferedEnd)) {
          return false;
        }
        log_default.debug("Stream", "skipping segment gc-ed at the end", {
          segmentEnd: currentSeg.end,
          currentEndInBuffer: currentSeg.bufferedEnd
        });
      }
      return true;
    });
  }

  // src/core/stream/representation/utils/get_segment_priority.ts
  function getSegmentPriority(segmentTime, wantedStartTimestamp) {
    const distance = segmentTime - wantedStartTimestamp;
    const { SEGMENT_PRIORITIES_STEPS } = config_default.getCurrent();
    for (let priority = 0; priority < SEGMENT_PRIORITIES_STEPS.length; priority++) {
      if (distance < SEGMENT_PRIORITIES_STEPS[priority]) {
        return priority;
      }
    }
    return SEGMENT_PRIORITIES_STEPS.length;
  }

  // src/core/stream/representation/utils/get_buffer_status.ts
  function getBufferStatus(content, initialWantedTime, playbackObserver, fastSwitchThreshold, bufferGoal, maxBufferSize, segmentSink) {
    var _a2, _b2, _c2;
    const { representation } = content;
    const isPaused = (_b2 = (_a2 = playbackObserver.getIsPaused()) != null ? _a2 : playbackObserver.getReference().getValue().paused.pending) != null ? _b2 : playbackObserver.getReference().getValue().paused.last;
    const playbackRate = (_c2 = playbackObserver.getPlaybackRate()) != null ? _c2 : playbackObserver.getReference().getValue().speed;
    let askedStart = initialWantedTime;
    if (isPaused === void 0 || playbackRate === void 0 || isPaused || playbackRate <= 0) {
      askedStart -= 0.1;
    }
    const neededRange = getRangeOfNeededSegments(content, askedStart, bufferGoal);
    const shouldRefreshManifest = representation.index.shouldRefresh(
      neededRange.start,
      neededRange.end
    );
    const segmentsBeingPushed = segmentSink.getPendingOperations().filter(
      (operation) => operation.type === 2 /* SignalSegmentComplete */
    ).map((operation) => operation.value);
    const bufferedSegments = segmentSink.getLastKnownInventory();
    let currentPlaybackTime = playbackObserver.getCurrentTime();
    if (currentPlaybackTime === void 0) {
      currentPlaybackTime = playbackObserver.getReference().getValue().position.getWanted();
    }
    const getBufferedHistory = segmentSink.getSegmentHistory.bind(segmentSink);
    const { segmentsToLoad, segmentsOnHold, isBufferFull } = getNeededSegments({
      content,
      bufferedSegments,
      currentPlaybackTime,
      fastSwitchThreshold,
      getBufferedHistory,
      neededRange,
      segmentsBeingPushed,
      maxBufferSize
    });
    const prioritizedNeededSegments = segmentsToLoad.map((segment) => ({
      priority: getSegmentPriority(segment.time, askedStart),
      segment
    }));
    const hasFinishedLoading = representation.index.isInitialized() && !representation.index.isStillAwaitingFutureSegments() && neededRange.hasReachedPeriodEnd && prioritizedNeededSegments.length === 0 && segmentsOnHold.length === 0;
    let nextSegmentStart = null;
    if (segmentsBeingPushed.length > 0) {
      nextSegmentStart = Math.min(...segmentsBeingPushed.map((info) => info.segment.time));
    }
    if (segmentsOnHold.length > 0) {
      nextSegmentStart = nextSegmentStart !== null ? Math.min(nextSegmentStart, segmentsOnHold[0].time) : segmentsOnHold[0].time;
    }
    if (prioritizedNeededSegments.length > 0) {
      nextSegmentStart = nextSegmentStart !== null ? Math.min(nextSegmentStart, prioritizedNeededSegments[0].segment.time) : prioritizedNeededSegments[0].segment.time;
    }
    const imminentDiscontinuity = checkForDiscontinuity(
      content,
      neededRange,
      nextSegmentStart,
      hasFinishedLoading,
      bufferedSegments
    );
    return {
      imminentDiscontinuity,
      hasFinishedLoading,
      neededSegments: prioritizedNeededSegments,
      isBufferFull,
      shouldRefreshManifest
    };
  }
  function getRangeOfNeededSegments(content, initialWantedTime, bufferGoal) {
    var _a2;
    let wantedStartPosition;
    const { manifest, period, representation } = content;
    const lastIndexPosition = representation.index.getLastAvailablePosition();
    const representationIndex = representation.index;
    if (!isNullOrUndefined(lastIndexPosition) && segment_sinks_default.isNative(content.adaptation.type) && initialWantedTime >= lastIndexPosition && representationIndex.isInitialized() && !representationIndex.isStillAwaitingFutureSegments() && isPeriodTheCurrentAndLastOne(manifest, period, initialWantedTime)) {
      wantedStartPosition = lastIndexPosition - 1;
    } else {
      wantedStartPosition = initialWantedTime - 0.1;
    }
    const wantedEndPosition = wantedStartPosition + bufferGoal;
    let hasReachedPeriodEnd;
    if (!representation.index.isInitialized() || representation.index.isStillAwaitingFutureSegments() || period.end === void 0) {
      hasReachedPeriodEnd = false;
    } else if (lastIndexPosition === void 0) {
      hasReachedPeriodEnd = wantedEndPosition >= period.end;
    } else if (lastIndexPosition === null) {
      hasReachedPeriodEnd = true;
    } else {
      hasReachedPeriodEnd = wantedEndPosition >= lastIndexPosition;
    }
    return {
      start: Math.max(wantedStartPosition, period.start),
      end: Math.min(wantedEndPosition, (_a2 = period.end) != null ? _a2 : Infinity),
      hasReachedPeriodEnd
    };
  }
  function isPeriodTheCurrentAndLastOne(manifest, period, time) {
    var _a2;
    const nextPeriod = manifest.getPeriodAfter(period);
    return period.containsTime(time, nextPeriod) && manifest.isLastPeriodKnown && period.id === ((_a2 = manifest.periods[manifest.periods.length - 1]) == null ? void 0 : _a2.id);
  }

  // src/core/stream/representation/utils/append_segment_to_buffer.ts
  async function appendSegmentToBuffer(playbackObserver, segmentSink, dataInfos, bufferGoal, cancellationSignal) {
    try {
      return await segmentSink.pushChunk(dataInfos);
    } catch (appendError) {
      if (cancellationSignal.isCancelled() && appendError instanceof CancellationError) {
        throw appendError;
      } else if (!(appendError instanceof SourceBufferError) || !appendError.isBufferFull) {
        const reason = appendError instanceof Error ? appendError.toString() : "An unknown error happened when pushing content";
        throw new MediaError("BUFFER_APPEND_ERROR", reason, {
          tracks: [toTaggedTrack(dataInfos.inventoryInfos.adaptation)]
        });
      }
      const { position } = playbackObserver.getReference().getValue();
      const currentPos = position.getWanted();
      try {
        log_default.warn("Stream", "Running garbage collector");
        const start = Math.max(currentPos - 5, 0);
        const end = currentPos + bufferGoal.getValue() + 12;
        if (start > 0) {
          await segmentSink.removeBuffer(0, start);
        }
        if (end < Number.MAX_VALUE) {
          await segmentSink.removeBuffer(end, Number.MAX_VALUE);
        }
        await sleep(200);
        if (cancellationSignal.cancellationError !== null) {
          throw cancellationSignal.cancellationError;
        }
        return await segmentSink.pushChunk(dataInfos);
      } catch (err2) {
        if (err2 instanceof CancellationError) {
          throw err2;
        }
        const reason = err2 instanceof Error ? err2.toString() : "Could not clean the buffer";
        throw new MediaError("BUFFER_FULL_ERROR", reason, {
          tracks: [toTaggedTrack(dataInfos.inventoryInfos.adaptation)]
        });
      }
    }
  }

  // src/core/stream/representation/utils/push_init_segment.ts
  async function pushInitSegment({
    playbackObserver,
    content,
    initSegmentUniqueId,
    segment,
    segmentSink,
    bufferGoal
  }, cancelSignal) {
    const codec = content.representation.getMimeTypeString();
    const data = {
      initSegmentUniqueId,
      chunk: null,
      timestampOffset: 0,
      appendWindow: [void 0, void 0],
      codec
    };
    const inventoryInfos = object_assign_default(
      { segment, chunkSize: void 0, start: 0, end: 0 },
      content
    );
    const buffered = await appendSegmentToBuffer(
      playbackObserver,
      segmentSink,
      { data, inventoryInfos },
      bufferGoal,
      cancelSignal
    );
    return { content, segment, buffered };
  }

  // src/core/stream/representation/utils/push_media_segment.ts
  async function pushMediaSegment({
    playbackObserver,
    bufferGoal,
    content,
    initSegmentUniqueId,
    parsedSegment,
    segment,
    segmentSink
  }, cancelSignal) {
    var _a2, _b2;
    if (parsedSegment.chunkData === null) {
      return null;
    }
    const { chunkData, chunkInfos, chunkOffset, chunkSize, appendWindow } = parsedSegment;
    const codec = content.representation.getMimeTypeString();
    const { APPEND_WINDOW_SECURITIES } = config_default.getCurrent();
    const safeAppendWindow = [
      appendWindow[0] !== void 0 ? Math.max(0, appendWindow[0] - APPEND_WINDOW_SECURITIES.START) : void 0,
      appendWindow[1] !== void 0 ? appendWindow[1] + APPEND_WINDOW_SECURITIES.END : void 0
    ];
    const data = {
      initSegmentUniqueId,
      chunk: chunkData,
      timestampOffset: chunkOffset,
      appendWindow: safeAppendWindow,
      codec
    };
    let estimatedStart = (_a2 = chunkInfos == null ? void 0 : chunkInfos.time) != null ? _a2 : segment.time;
    const estimatedDuration = (_b2 = chunkInfos == null ? void 0 : chunkInfos.duration) != null ? _b2 : segment.duration;
    let estimatedEnd = estimatedStart + estimatedDuration;
    if (safeAppendWindow[0] !== void 0) {
      estimatedStart = Math.max(estimatedStart, safeAppendWindow[0]);
    }
    if (safeAppendWindow[1] !== void 0) {
      estimatedEnd = Math.min(estimatedEnd, safeAppendWindow[1]);
    }
    const inventoryInfos = object_assign_default(
      { segment, chunkSize, start: estimatedStart, end: estimatedEnd },
      content
    );
    const buffered = await appendSegmentToBuffer(
      playbackObserver,
      segmentSink,
      { data, inventoryInfos },
      bufferGoal,
      cancelSignal
    );
    return { content, segment, buffered };
  }

  // src/core/stream/representation/representation_stream.ts
  function RepresentationStream({
    content,
    options,
    playbackObserver,
    segmentSink,
    segmentQueue,
    terminate
  }, callbacks, parentCancelSignal) {
    log_default.debug("Stream", "Creating RepresentationStream", {
      periodStart: content.period.start,
      bufferType: content.adaptation.type,
      adaptationId: content.adaptation.id,
      representationBitrate: content.representation.bitrate,
      mimeType: content.representation.getMimeTypeString()
    });
    const { period, adaptation, representation } = content;
    const { bufferGoal, maxBufferSize, drmSystemId, fastSwitchThreshold } = options;
    const bufferType = adaptation.type;
    const canceller = new TaskCanceller("RepresentationStream " + bufferType);
    canceller.linkToSignal(parentCancelSignal);
    const initSegmentState = {
      segment: representation.index.getInitSegment(),
      uniqueId: null,
      isLoaded: false
    };
    canceller.signal.register(() => {
      if (initSegmentState.uniqueId !== null) {
        segmentSink.freeInitSegment(initSegmentState.uniqueId);
      }
    });
    const hasInitSegment = initSegmentState.segment !== null;
    if (!hasInitSegment) {
      initSegmentState.isLoaded = true;
    }
    let hasSentEncryptionData = false;
    if (drmSystemId !== void 0) {
      const encryptionData = representation.getEncryptionData(drmSystemId);
      if (encryptionData.length > 0 && encryptionData.every((e) => e.keyIds !== void 0)) {
        hasSentEncryptionData = true;
        callbacks.encryptionDataEncountered(
          encryptionData.map((d) => object_assign_default({ content }, d))
        );
        if (canceller.isUsed()) {
          return;
        }
      }
    }
    segmentQueue.addEventListener("error", (err) => {
      if (canceller.signal.isCancelled()) {
        return;
      }
      canceller.cancel("RepresentationStream: SegmentQueue err");
      callbacks.error(err);
    });
    segmentQueue.addEventListener("parsedInitSegment", onParsedChunk, canceller.signal);
    segmentQueue.addEventListener("parsedMediaSegment", onParsedChunk, canceller.signal);
    segmentQueue.addEventListener("emptyQueue", checkStatus, canceller.signal);
    segmentQueue.addEventListener(
      "requestRetry",
      (payload) => {
        callbacks.warning(payload.error);
        if (canceller.signal.isCancelled()) {
          return;
        }
        const retriedSegment = payload.segment;
        const { index } = representation;
        if (index.isSegmentStillAvailable(retriedSegment) === false) {
          checkStatus();
        } else if (index.canBeOutOfSyncError(payload.error, retriedSegment)) {
          callbacks.manifestMightBeOufOfSync();
        }
      },
      canceller.signal
    );
    segmentQueue.addEventListener(
      "fullyLoadedSegment",
      (segment) => {
        segmentSink.signalSegmentComplete(object_assign_default({ segment }, content)).catch(onFatalBufferError);
      },
      canceller.signal
    );
    const segmentsToLoadRef = segmentQueue.resetForContent(
      content,
      hasInitSegment,
      "new RepresentationStream linked to SegmentQueue"
    );
    canceller.signal.register((err) => {
      segmentQueue.stop(err.reason);
    });
    playbackObserver.listen(checkStatus, {
      includeLastObservation: false,
      clearSignal: canceller.signal
    });
    content.manifest.addEventListener("manifestUpdate", checkStatus, canceller.signal);
    bufferGoal.onUpdate(checkStatus, {
      emitCurrentValue: false,
      clearSignal: canceller.signal
    });
    maxBufferSize.onUpdate(checkStatus, {
      emitCurrentValue: false,
      clearSignal: canceller.signal
    });
    terminate.onUpdate(checkStatus, {
      emitCurrentValue: false,
      clearSignal: canceller.signal
    });
    checkStatus();
    return;
    function checkStatus() {
      if (canceller.isUsed()) {
        return;
      }
      const observation = playbackObserver.getReference().getValue();
      const initialWantedTime = observation.position.getWanted();
      const status = getBufferStatus(
        content,
        initialWantedTime,
        playbackObserver,
        fastSwitchThreshold.getValue(),
        bufferGoal.getValue(),
        maxBufferSize.getValue(),
        segmentSink
      );
      const { neededSegments } = status;
      let neededInitSegment = null;
      if (!representation.index.isInitialized()) {
        if (initSegmentState.segment === null) {
          log_default.warn("Stream", "Uninitialized index without an initialization segment", {
            bufferType,
            representationBitrate: content.representation.bitrate
          });
        } else if (initSegmentState.isLoaded) {
          log_default.warn(
            "Stream",
            "Uninitialized index with an already loaded initialization segment",
            {
              bufferType,
              representationBitrate: content.representation.bitrate
            }
          );
        } else {
          const wantedStart = observation.position.getWanted();
          neededInitSegment = {
            segment: initSegmentState.segment,
            priority: getSegmentPriority(period.start, wantedStart)
          };
        }
      } else if (neededSegments.length > 0 && !initSegmentState.isLoaded && initSegmentState.segment !== null) {
        const initSegmentPriority = neededSegments[0].priority;
        neededInitSegment = {
          segment: initSegmentState.segment,
          priority: initSegmentPriority
        };
      }
      const terminateVal = terminate.getValue();
      if (terminateVal === null) {
        segmentsToLoadRef.setValue({
          initSegment: neededInitSegment,
          segmentQueue: neededSegments
        });
      } else if (terminateVal.urgent) {
        log_default.debug("Stream", "Urgent switch, terminate now.", {
          bufferType,
          representationBitrate: content.representation.bitrate
        });
        segmentsToLoadRef.setValue({ initSegment: null, segmentQueue: [] });
        segmentsToLoadRef.finish();
        canceller.cancel(terminateVal.reason);
        callbacks.terminating();
        return;
      } else {
        const mostNeededSegment = neededSegments[0];
        const initSegmentRequest = segmentQueue.getRequestedInitSegment();
        const currentSegmentRequest = segmentQueue.getRequestedMediaSegment();
        const nextQueue = currentSegmentRequest === null || mostNeededSegment === void 0 || currentSegmentRequest.id !== mostNeededSegment.segment.id ? [] : [mostNeededSegment];
        const nextInit = initSegmentRequest === null ? null : neededInitSegment;
        segmentsToLoadRef.setValue({
          initSegment: nextInit,
          segmentQueue: nextQueue
        });
        if (nextQueue.length === 0 && nextInit === null) {
          log_default.debug("Stream", "No request left, terminate", {
            bufferType,
            representationBitrate: content.representation.bitrate
          });
          segmentsToLoadRef.finish();
          canceller.cancel(terminateVal.reason);
          callbacks.terminating();
          return;
        }
      }
      callbacks.streamStatusUpdate({
        period,
        position: observation.position.getWanted(),
        bufferType,
        imminentDiscontinuity: status.imminentDiscontinuity,
        isEmptyStream: false,
        hasFinishedLoading: status.hasFinishedLoading,
        neededSegments: status.neededSegments
      });
      if (canceller.signal.isCancelled()) {
        return;
      }
      const { UPTO_CURRENT_POSITION_CLEANUP } = config_default.getCurrent();
      if (status.isBufferFull) {
        const gcedPosition = Math.max(0, initialWantedTime - UPTO_CURRENT_POSITION_CLEANUP);
        if (gcedPosition > 0) {
          segmentSink.removeBuffer(0, gcedPosition).catch(onFatalBufferError);
        }
      }
      if (status.shouldRefreshManifest) {
        callbacks.needsManifestRefresh();
      }
    }
    function onParsedChunk(evt) {
      for (const protInfo of evt.protectionData) {
        representation.addProtectionData(
          protInfo.initDataType,
          protInfo.keyId,
          protInfo.initData
        );
      }
      if (!hasSentEncryptionData) {
        const allEncryptionData = representation.getAllEncryptionData();
        if (allEncryptionData.length > 0) {
          callbacks.encryptionDataEncountered(
            allEncryptionData.map((p) => object_assign_default({ content }, p))
          );
          hasSentEncryptionData = true;
        }
      }
      if (evt.segmentType === "init") {
        if (!representation.index.isInitialized() && evt.segmentList !== void 0) {
          representation.index.initialize(evt.segmentList);
        }
        initSegmentState.isLoaded = true;
        if (evt.initializationData !== null) {
          const initSegmentUniqueId = representation.uniqueId;
          initSegmentState.uniqueId = initSegmentUniqueId;
          segmentSink.declareInitSegment(initSegmentUniqueId, evt.initializationData);
          pushInitSegment(
            {
              playbackObserver,
              bufferGoal,
              content,
              initSegmentUniqueId,
              segment: evt.segment,
              segmentData: evt.initializationData,
              segmentSink
            },
            canceller.signal
          ).then((result) => {
            if (result !== null) {
              callbacks.addedSegment(result);
            }
          }).catch(onFatalBufferError);
        }
        checkStatus();
        return;
      } else {
        const { inbandEvents, predictedSegments, needsManifestRefresh } = evt;
        if (predictedSegments !== void 0) {
          representation.index.addPredictedSegments(predictedSegments, evt.segment);
        }
        if (needsManifestRefresh === true) {
          callbacks.needsManifestRefresh();
          if (canceller.isUsed()) {
            return;
          }
        }
        if (inbandEvents !== void 0 && inbandEvents.length > 0) {
          callbacks.inbandEvent(inbandEvents);
          if (canceller.isUsed()) {
            return;
          }
        }
        const initSegmentUniqueId = initSegmentState.uniqueId;
        pushMediaSegment(
          {
            playbackObserver,
            bufferGoal,
            content,
            initSegmentUniqueId,
            parsedSegment: evt,
            segment: evt.segment,
            segmentSink
          },
          canceller.signal
        ).then((result) => {
          if (result !== null) {
            callbacks.addedSegment(result);
          }
        }).catch(onFatalBufferError);
      }
    }
    function onFatalBufferError(err) {
      if (canceller.isUsed() && err instanceof CancellationError) {
        return;
      }
      log_default.warn(
        "Stream",
        "Received fatal buffer error",
        {
          bufferType,
          representationBitrate: content.representation.bitrate
        },
        err instanceof Error ? err : null
      );
      canceller.cancel("RepresentationStream: fatal buffer err");
      callbacks.error(err);
    }
  }

  // src/core/stream/representation/index.ts
  var representation_default2 = RepresentationStream;

  // src/core/stream/adaptation/get_representations_switch_strategy.ts
  function getRepresentationsSwitchingStrategy(period, adaptation, settings, segmentSink, playbackObserver) {
    var _a2, _b2, _c2, _d2;
    if (settings.switchingMode === "lazy") {
      return { type: "continue", value: void 0 };
    }
    const inventory = segmentSink.getLastKnownInventory();
    const unwantedRange = [];
    for (const elt of inventory) {
      if (elt.infos.period.id === period.id && (elt.infos.adaptation.id !== adaptation.id || !arrayIncludes(settings.representationIds, elt.infos.representation.id))) {
        insertInto(unwantedRange, {
          start: (_a2 = elt.bufferedStart) != null ? _a2 : elt.start,
          end: (_b2 = elt.bufferedEnd) != null ? _b2 : elt.end
        });
      }
    }
    const pendingOperations = segmentSink.getPendingOperations();
    for (const operation of pendingOperations) {
      if (operation.type === 0 /* Push */) {
        const info = operation.value.inventoryInfos;
        if (info.period.id === period.id && (info.adaptation.id !== adaptation.id || !arrayIncludes(settings.representationIds, info.representation.id))) {
          const start = info.segment.time;
          const end = start + info.segment.duration;
          insertInto(unwantedRange, { start, end });
        }
      }
    }
    if (unwantedRange.length === 0) {
      return { type: "continue", value: void 0 };
    }
    if (settings.switchingMode === "reload") {
      const readyState = playbackObserver.getReadyState();
      if (readyState === void 0 || readyState > 1) {
        return { type: "needs-reload", value: void 0 };
      }
    }
    const shouldFlush = settings.switchingMode === "direct";
    const rangesToExclude = [];
    const lastSegmentBefore = getLastSegmentBeforePeriod(inventory, period);
    if (lastSegmentBefore !== null && (lastSegmentBefore.bufferedEnd === void 0 || period.start - lastSegmentBefore.bufferedEnd < 1)) {
      rangesToExclude.push({ start: 0, end: period.start + 1 });
    }
    if (!shouldFlush) {
      const { ADAP_REP_SWITCH_BUFFER_PADDINGS } = config_default.getCurrent();
      const bufferType = adaptation.type;
      const paddingBefore = (_c2 = ADAP_REP_SWITCH_BUFFER_PADDINGS[bufferType].before) != null ? _c2 : 0;
      const paddingAfter = (_d2 = ADAP_REP_SWITCH_BUFFER_PADDINGS[bufferType].after) != null ? _d2 : 0;
      let currentTime = playbackObserver.getCurrentTime();
      if (currentTime === void 0) {
        const lastObservation = playbackObserver.getReference().getValue();
        currentTime = lastObservation.position.getPolled();
      }
      rangesToExclude.push({
        start: currentTime - paddingBefore,
        end: currentTime + paddingAfter
      });
    }
    if (period.end !== void 0) {
      const firstSegmentAfter = getFirstSegmentAfterPeriod(inventory, period);
      if (firstSegmentAfter !== null && (firstSegmentAfter.bufferedStart === void 0 || // Close to Period's end
      firstSegmentAfter.bufferedStart - period.end < 1)) {
        rangesToExclude.push({ start: period.end - 1, end: Number.MAX_VALUE });
      }
    }
    const toRemove = excludeFromRanges(unwantedRange, rangesToExclude);
    if (toRemove.length === 0) {
      return { type: "continue", value: void 0 };
    }
    return shouldFlush ? { type: "flush-buffer", value: toRemove } : { type: "clean-buffer", value: toRemove };
  }

  // src/core/stream/adaptation/adaptation_stream.ts
  function AdaptationStream({
    playbackObserver,
    content,
    options,
    representationEstimator,
    segmentSink,
    segmentQueueCreator,
    wantedBufferAhead,
    maxVideoBufferSize
  }, callbacks, parentCancelSignal) {
    const { manifest, period, adaptation } = content;
    const adapStreamCanceller = new TaskCanceller("AdaptationStream " + adaptation.type);
    adapStreamCanceller.linkToSignal(parentCancelSignal);
    const bufferGoalRatioMap = /* @__PURE__ */ new Map();
    const currentRepresentation = new reference_default(
      null,
      adapStreamCanceller.signal
    );
    let previouslyEmittedBitrate;
    const initialRepIds = content.representations.getValue().representationIds;
    const initialRepresentations = getRepresentationList(
      content.adaptation.representations,
      initialRepIds
    );
    const representationsList = new reference_default(
      initialRepresentations,
      adapStreamCanceller.signal
    );
    const { estimates: estimateRef, callbacks: abrCallbacks } = representationEstimator(
      { manifest, period, adaptation },
      currentRepresentation,
      representationsList,
      playbackObserver,
      adapStreamCanceller.signal
    );
    const isMediaSegmentQueueInterrupted = new reference_default(false);
    playbackObserver.listen(
      (observation) => {
        var _a2;
        const observationCanStream = (_a2 = observation.canStream) != null ? _a2 : true;
        if (isMediaSegmentQueueInterrupted.getValue() === observationCanStream) {
          log_default.debug(
            "Stream",
            "isMediaSegmentQueueInterrupted updated to",
            !observationCanStream
          );
          isMediaSegmentQueueInterrupted.setValue(!observationCanStream);
        }
      },
      { clearSignal: adapStreamCanceller.signal }
    );
    const segmentQueue = segmentQueueCreator.createSegmentQueue(
      adaptation.type,
      /* eslint-disable @typescript-eslint/unbound-method */
      {
        onRequestBegin: abrCallbacks.requestBegin,
        onRequestEnd: abrCallbacks.requestEnd,
        onProgress: abrCallbacks.requestProgress,
        onMetrics: abrCallbacks.metrics
      },
      isMediaSegmentQueueInterrupted
    );
    const fastSwitchThreshold = new reference_default(0);
    estimateRef.onUpdate(
      ({ bitrate, knownStableBitrate }) => {
        if (options.enableFastSwitching) {
          fastSwitchThreshold.setValueIfChanged(knownStableBitrate);
        }
        if (bitrate === void 0 || bitrate === previouslyEmittedBitrate) {
          return;
        }
        previouslyEmittedBitrate = bitrate;
        log_default.debug("Stream", `new ${adaptation.type} bitrate estimate received from ABR`, {
          bitrate
        });
        callbacks.bitrateEstimateChange({ type: adaptation.type, bitrate });
      },
      { emitCurrentValue: true, clearSignal: adapStreamCanceller.signal }
    );
    let cancelCurrentStreams;
    content.representations.onUpdate(
      (val) => {
        if (cancelCurrentStreams !== void 0) {
          cancelCurrentStreams.cancel("locked representations changed");
        }
        const newRepIds = content.representations.getValue().representationIds;
        const newRepresentations = getRepresentationList(
          content.adaptation.representations,
          newRepIds
        );
        representationsList.setValueIfChanged(newRepresentations);
        cancelCurrentStreams = new TaskCanceller(
          "AdaptationStream: RepresentationStream Group " + adaptation.type
        );
        cancelCurrentStreams.linkToSignal(adapStreamCanceller.signal);
        onRepresentationsChoiceChange(val, cancelCurrentStreams.signal).catch((err) => {
          if ((cancelCurrentStreams == null ? void 0 : cancelCurrentStreams.isUsed()) === true && TaskCanceller.isCancellationError(err)) {
            return;
          }
          adapStreamCanceller.cancel("RepresentationStream err");
          callbacks.error(err);
        });
      },
      { clearSignal: adapStreamCanceller.signal, emitCurrentValue: true }
    );
    return;
    async function onRepresentationsChoiceChange(choice, fnCancelSignal) {
      const switchStrat = getRepresentationsSwitchingStrategy(
        period,
        adaptation,
        choice,
        segmentSink,
        playbackObserver
      );
      switch (switchStrat.type) {
        case "continue":
          break;
        // nothing to do
        case "needs-reload":
          return queue_microtask_default(() => {
            playbackObserver.listen(
              () => {
                if (fnCancelSignal.isCancelled()) {
                  return;
                }
                const { DELTA_POSITION_AFTER_RELOAD } = config_default.getCurrent();
                const timeOffset = DELTA_POSITION_AFTER_RELOAD.bitrateSwitch;
                return callbacks.waitingMediaSourceReload({
                  bufferType: adaptation.type,
                  period,
                  timeOffset,
                  stayInPeriod: true
                });
              },
              { includeLastObservation: true, clearSignal: fnCancelSignal }
            );
          });
        case "flush-buffer":
        // Clean + flush
        case "clean-buffer":
          for (const range of switchStrat.value) {
            await segmentSink.removeBuffer(range.start, range.end);
            if (fnCancelSignal.isCancelled()) {
              return;
            }
          }
          if (switchStrat.type === "flush-buffer") {
            callbacks.needsBufferFlush();
            if (fnCancelSignal.isCancelled()) {
              return;
            }
          }
          break;
        default:
          assertUnreachable(switchStrat);
      }
      recursivelyCreateRepresentationStreams(fnCancelSignal);
    }
    function recursivelyCreateRepresentationStreams(fnCancelSignal) {
      const repStreamTerminatingCanceller = new TaskCanceller(
        "AdaptationStream: RepresentationStream creation " + adaptation.type
      );
      repStreamTerminatingCanceller.linkToSignal(fnCancelSignal);
      const { representation } = estimateRef.getValue();
      if (representation === null) {
        return;
      }
      const terminateCurrentStream = new reference_default(
        null,
        repStreamTerminatingCanceller.signal
      );
      estimateRef.onUpdate(
        (estimate) => {
          if (estimate.representation === null || estimate.representation.id === representation.id) {
            return;
          }
          if (estimate.urgent) {
            log_default.info("Stream", "urgent Representation switch", {
              bufferType: adaptation.type,
              estimateBitrate: estimate.bitrate,
              prevRepresentationBitrate: representation.bitrate,
              newRepresentationBitrate: estimate.representation.bitrate
            });
            return terminateCurrentStream.setValue({
              urgent: true,
              reason: "Urgent Representation switch"
            });
          } else {
            log_default.info("Stream", "slow Representation switch", {
              bufferType: adaptation.type,
              estimateBitrate: estimate.bitrate,
              prevRepresentationBitrate: representation.bitrate,
              newRepresentationBitrate: estimate.representation.bitrate
            });
            return terminateCurrentStream.setValue({
              urgent: false,
              reason: "Non-urgent Representation switch"
            });
          }
        },
        {
          clearSignal: repStreamTerminatingCanceller.signal,
          emitCurrentValue: true
        }
      );
      const repInfo = {
        type: adaptation.type,
        adaptation,
        period,
        representation
      };
      currentRepresentation.setValue(representation);
      if (fnCancelSignal.isCancelled()) {
        return;
      }
      callbacks.representationChange(repInfo);
      if (fnCancelSignal.isCancelled()) {
        return;
      }
      const representationStreamCallbacks = {
        streamStatusUpdate: callbacks.streamStatusUpdate,
        encryptionDataEncountered: callbacks.encryptionDataEncountered,
        manifestMightBeOufOfSync: callbacks.manifestMightBeOufOfSync,
        needsManifestRefresh: callbacks.needsManifestRefresh,
        inbandEvent: callbacks.inbandEvent,
        warning: callbacks.warning,
        error(err) {
          adapStreamCanceller.cancel("RepresentationStream err cb");
          callbacks.error(err);
        },
        addedSegment(segmentInfo) {
          abrCallbacks.addedSegment(segmentInfo);
        },
        terminating() {
          if (repStreamTerminatingCanceller.isUsed()) {
            return;
          }
          repStreamTerminatingCanceller.cancel("RepresentationStream terminating");
          return recursivelyCreateRepresentationStreams(fnCancelSignal);
        }
      };
      createRepresentationStream(
        representation,
        terminateCurrentStream,
        representationStreamCallbacks,
        fnCancelSignal
      );
    }
    function createRepresentationStream(representation, terminateCurrentStream, representationStreamCallbacks, fnCancelSignal) {
      let hasEncounteredError = false;
      const bufferGoalCanceller = new TaskCanceller(
        "AdaptationStream: BufferGoal " + adaptation.type
      );
      bufferGoalCanceller.linkToSignal(fnCancelSignal);
      const bufferGoal = createMappedReference(
        wantedBufferAhead,
        (prev) => {
          return getBufferGoal(representation, prev);
        },
        bufferGoalCanceller.signal
      );
      const maxBufferSize = adaptation.type === "video" ? maxVideoBufferSize : new reference_default(Infinity);
      log_default.info("Stream", "changing representation", {
        bufferType: adaptation.type,
        representationId: representation.id,
        representationBitrate: representation.bitrate
      });
      const updatedCallbacks = object_assign_default({}, representationStreamCallbacks, {
        error(err) {
          var _a2;
          if (hasEncounteredError) {
            log_default.warn("Stream", "Ignoring RepresentationStream error", err);
            return;
          }
          hasEncounteredError = true;
          const formattedError = formatError(err, {
            defaultCode: "NONE",
            defaultReason: "Unknown `RepresentationStream` error"
          });
          if (formattedError.code !== "BUFFER_FULL_ERROR") {
            representationStreamCallbacks.error(err);
          } else {
            log_default.warn("Stream", "received BUFFER_FULL_ERROR", {
              bufferType: adaptation.type,
              representationBitrate: representation.bitrate
            });
            const wba = wantedBufferAhead.getValue();
            const lastBufferGoalRatio = (_a2 = bufferGoalRatioMap.get(representation.id)) != null ? _a2 : 1;
            const newBufferGoalRatio = lastBufferGoalRatio * 0.7;
            bufferGoalRatioMap.set(representation.id, newBufferGoalRatio);
            if (newBufferGoalRatio <= 0.05 || getBufferGoal(representation, wba) <= 2) {
              representationStreamCallbacks.error(formattedError);
              return;
            }
            cancellableSleep(4e3, fnCancelSignal).then(() => {
              return createRepresentationStream(
                representation,
                terminateCurrentStream,
                representationStreamCallbacks,
                fnCancelSignal
              );
            }).catch(noop_default);
          }
        },
        terminating() {
          bufferGoalCanceller.cancel("Representation terminating");
          representationStreamCallbacks.terminating();
        }
      });
      representation_default2(
        {
          playbackObserver,
          content: { representation, adaptation, period, manifest },
          segmentSink,
          segmentQueue,
          terminate: terminateCurrentStream,
          options: {
            bufferGoal,
            maxBufferSize,
            drmSystemId: options.drmSystemId,
            fastSwitchThreshold
          }
        },
        updatedCallbacks,
        fnCancelSignal
      );
      manifest.addEventListener(
        "manifestUpdate",
        (updates) => {
          for (const element of updates.updatedPeriods) {
            if (element.period.id === period.id) {
              for (const updated of element.result.updatedAdaptations) {
                if (updated.adaptation === adaptation.id) {
                  for (const rep of updated.removedRepresentations) {
                    if (rep === representation.id) {
                      if (fnCancelSignal.isCancelled()) {
                        return;
                      }
                      return callbacks.waitingMediaSourceReload({
                        bufferType: adaptation.type,
                        period,
                        timeOffset: 0,
                        stayInPeriod: true
                      });
                    }
                  }
                }
              }
            } else if (element.period.start > period.start) {
              break;
            }
          }
        },
        fnCancelSignal
      );
    }
    function getBufferGoal(representation, wba) {
      const oldBufferGoalRatio = bufferGoalRatioMap.get(representation.id);
      const bufferGoalRatio = oldBufferGoalRatio !== void 0 ? oldBufferGoalRatio : 1;
      if (oldBufferGoalRatio === void 0) {
        bufferGoalRatioMap.set(representation.id, bufferGoalRatio);
      }
      if (bufferGoalRatio < 1 && wba === Infinity) {
        return 5 * 60 * 1e3 * bufferGoalRatio;
      }
      return wba * bufferGoalRatio;
    }
  }
  function getRepresentationList(availableRepresentations, authorizedRepIds) {
    const filteredRepresentations = availableRepresentations.filter(
      (r) => arrayIncludes(authorizedRepIds, r.id) && !r.shouldBeAvoided && r.isPlayable() !== false
    );
    if (filteredRepresentations.length > 0) {
      return filteredRepresentations;
    }
    return availableRepresentations.filter(
      (r) => arrayIncludes(authorizedRepIds, r.id) && r.isPlayable() !== false
    );
  }

  // src/core/stream/adaptation/index.ts
  var adaptation_default = AdaptationStream;

  // src/core/stream/period/utils/get_adaptation_switch_strategy.ts
  function getAdaptationSwitchStrategy(segmentSink, period, adaptation, switchingMode, playbackObserver, options) {
    var _a2, _b2, _c2, _d2;
    if (segmentSink.codec !== void 0 && options.onCodecSwitch === "reload" && !hasCompatibleCodec(adaptation, segmentSink.codec)) {
      return { type: "needs-reload", value: void 0 };
    }
    const inventory = segmentSink.getLastKnownInventory();
    const unwantedRange = [];
    for (const elt of inventory) {
      if (elt.infos.period.id === period.id && elt.infos.adaptation.id !== adaptation.id) {
        insertInto(unwantedRange, {
          start: (_a2 = elt.bufferedStart) != null ? _a2 : elt.start,
          end: (_b2 = elt.bufferedEnd) != null ? _b2 : elt.end
        });
      }
    }
    const pendingOperations = segmentSink.getPendingOperations();
    for (const operation of pendingOperations) {
      if (operation.type === 0 /* Push */) {
        const info = operation.value.inventoryInfos;
        if (info.period.id === period.id && info.adaptation.id !== adaptation.id) {
          const start = info.segment.time;
          const end = start + info.segment.duration;
          insertInto(unwantedRange, { start, end });
        }
      }
    }
    if (unwantedRange.length === 0) {
      return { type: "continue", value: void 0 };
    }
    if (switchingMode === "reload") {
      const readyState = playbackObserver.getReadyState();
      if (readyState === void 0 || readyState > 1) {
        return { type: "needs-reload", value: void 0 };
      }
    }
    const shouldCleanAll = switchingMode === "direct";
    const rangesToExclude = [];
    const lastSegmentBefore = getLastSegmentBeforePeriod(inventory, period);
    if (lastSegmentBefore !== null && (lastSegmentBefore.bufferedEnd === void 0 || period.start - lastSegmentBefore.bufferedEnd < 1)) {
      rangesToExclude.push({ start: 0, end: period.start + 1 });
    }
    if (!shouldCleanAll) {
      const bufferType = adaptation.type;
      const { ADAP_REP_SWITCH_BUFFER_PADDINGS } = config_default.getCurrent();
      const paddingBefore = (_c2 = ADAP_REP_SWITCH_BUFFER_PADDINGS[bufferType].before) != null ? _c2 : 0;
      const paddingAfter = (_d2 = ADAP_REP_SWITCH_BUFFER_PADDINGS[bufferType].after) != null ? _d2 : 0;
      let currentTime = playbackObserver.getCurrentTime();
      if (currentTime === void 0) {
        const lastObservation = playbackObserver.getReference().getValue();
        currentTime = lastObservation.position.getPolled();
      }
      rangesToExclude.push({
        start: currentTime - paddingBefore,
        end: currentTime + paddingAfter
      });
    }
    if (period.end !== void 0) {
      const firstSegmentAfter = getFirstSegmentAfterPeriod(inventory, period);
      if (firstSegmentAfter !== null && (firstSegmentAfter.bufferedStart === void 0 || firstSegmentAfter.bufferedStart - period.end < 1)) {
        rangesToExclude.push({ start: period.end - 1, end: Number.MAX_VALUE });
      }
    }
    const toRemove = excludeFromRanges(unwantedRange, rangesToExclude);
    if (toRemove.length === 0) {
      return { type: "continue", value: void 0 };
    }
    return shouldCleanAll && adaptation.type !== "text" ? { type: "flush-buffer", value: toRemove } : { type: "clean-buffer", value: toRemove };
  }
  function hasCompatibleCodec(adaptation, segmentSinkCodec) {
    return adaptation.representations.some(
      (rep) => rep.isPlayable() === true && are_codecs_compatible_default(rep.getMimeTypeString(), segmentSinkCodec)
    );
  }

  // src/core/stream/period/period_stream.ts
  function PeriodStream({
    bufferType,
    content,
    garbageCollectors,
    playbackObserver,
    representationEstimator,
    segmentQueueCreator,
    segmentSinksStore,
    options,
    wantedBufferAhead,
    maxVideoBufferSize
  }, callbacks, parentCancelSignal) {
    const { manifest, period } = content;
    const adaptationRef = new reference_default(
      void 0,
      parentCancelSignal
    );
    callbacks.periodStreamReady({
      type: bufferType,
      manifest,
      period,
      adaptationRef
    });
    if (parentCancelSignal.isCancelled()) {
      return;
    }
    let currentStreamCanceller;
    let isFirstAdaptationSwitch = true;
    adaptationRef.onUpdate(
      (choice) => {
        (async () => {
          var _a2;
          if (choice === void 0) {
            return;
          }
          const streamCanceller = new TaskCanceller(
            "PeriodStream: Adaptation choice " + bufferType
          );
          streamCanceller.linkToSignal(parentCancelSignal);
          currentStreamCanceller == null ? void 0 : currentStreamCanceller.cancel("PeriodStream: Adaptation update");
          currentStreamCanceller = streamCanceller;
          if (choice === null) {
            log_default.info(`Stream`, `Set no Adaptation`, {
              periodStart: period.start,
              bufferType
            });
            const segmentSinkStatus = segmentSinksStore.getStatus(bufferType);
            if (segmentSinkStatus.type === "initialized") {
              log_default.info(`Stream`, `Clearing previous SegmentSink`, {
                periodStart: period.start,
                bufferType
              });
              if (segment_sinks_default.isNative(bufferType)) {
                return askForMediaSourceReload(0, true, streamCanceller.signal);
              } else {
                const periodEnd = (_a2 = period.end) != null ? _a2 : Infinity;
                if (period.start > periodEnd) {
                  log_default.warn("Stream", "Can't free buffer: period's start is after its end", {
                    periodStart: period.start,
                    periodEnd,
                    bufferType
                  });
                } else {
                  await segmentSinkStatus.value.removeBuffer(period.start, periodEnd);
                  if (streamCanceller.isUsed()) {
                    return;
                  }
                }
              }
            } else if (segmentSinkStatus.type === "uninitialized") {
              segmentSinksStore.disableSegmentSink(bufferType);
              if (streamCanceller.isUsed()) {
                return;
              }
            }
            callbacks.adaptationChange({
              type: bufferType,
              adaptation: null,
              period
            });
            if (streamCanceller.isUsed()) {
              return;
            }
            return createEmptyAdaptationStream(
              playbackObserver,
              wantedBufferAhead,
              bufferType,
              { period },
              callbacks,
              streamCanceller.signal
            );
          }
          const adaptations = period.adaptations[bufferType];
          const adaptation = arrayFind(
            adaptations != null ? adaptations : [],
            (a) => a.id === choice.adaptationId
          );
          if (adaptation === void 0) {
            currentStreamCanceller.cancel("PeriodStream: Adaptation not found");
            log_default.warn("Stream", "Unfound chosen Adaptation choice", {
              adaptationId: choice.adaptationId
            });
            return;
          }
          const { DELTA_POSITION_AFTER_RELOAD } = config_default.getCurrent();
          let relativePosHasBeenDefaulted = false;
          let relativePosAfterSwitch;
          if (isFirstAdaptationSwitch) {
            relativePosAfterSwitch = 0;
          } else if (choice.relativeResumingPosition !== void 0) {
            relativePosAfterSwitch = choice.relativeResumingPosition;
          } else {
            relativePosHasBeenDefaulted = true;
            switch (bufferType) {
              case "audio":
                relativePosAfterSwitch = DELTA_POSITION_AFTER_RELOAD.trackSwitch.audio;
                break;
              case "video":
                relativePosAfterSwitch = DELTA_POSITION_AFTER_RELOAD.trackSwitch.video;
                break;
              default:
                relativePosAfterSwitch = DELTA_POSITION_AFTER_RELOAD.trackSwitch.other;
                break;
            }
          }
          isFirstAdaptationSwitch = false;
          if (segment_sinks_default.isNative(bufferType) && segmentSinksStore.getStatus(bufferType).type === "disabled") {
            return askForMediaSourceReload(
              relativePosAfterSwitch,
              true,
              streamCanceller.signal
            );
          }
          manifest.addEventListener(
            "manifestUpdate",
            (updates) => {
              for (const element of updates.updatedPeriods) {
                if (element.period.id === period.id) {
                  for (const adap of element.result.removedAdaptations) {
                    if (adap.id === adaptation.id) {
                      return askForMediaSourceReload(
                        relativePosAfterSwitch,
                        true,
                        streamCanceller.signal
                      );
                    }
                  }
                } else if (element.period.start > period.start) {
                  break;
                }
              }
            },
            currentStreamCanceller.signal
          );
          const { representations } = choice;
          log_default.info(`Stream`, `Updating adaptation`, {
            bufferType: adaptation.type,
            periodStart: period.start,
            adaptationId: adaptation.id
          });
          callbacks.adaptationChange({ type: bufferType, adaptation, period });
          if (streamCanceller.isUsed()) {
            return;
          }
          const segmentSink = createOrReuseSegmentSink(
            segmentSinksStore,
            bufferType,
            adaptation
          );
          const strategy = getAdaptationSwitchStrategy(
            segmentSink,
            period,
            adaptation,
            choice.switchingMode,
            playbackObserver,
            options
          );
          if (strategy.type === "needs-reload") {
            return askForMediaSourceReload(
              relativePosAfterSwitch,
              true,
              streamCanceller.signal
            );
          }
          await segmentSinksStore.waitForUsableBuffers(streamCanceller.signal);
          if (streamCanceller.isUsed()) {
            return;
          }
          if (strategy.type === "flush-buffer" || strategy.type === "clean-buffer") {
            for (const { start, end } of strategy.value) {
              await segmentSink.removeBuffer(start, end);
              if (streamCanceller.isUsed()) {
                return;
              }
            }
            if (strategy.type === "flush-buffer") {
              callbacks.needsBufferFlush({
                relativeResumingPosition: relativePosAfterSwitch,
                relativePosHasBeenDefaulted
              });
              if (streamCanceller.isUsed()) {
                return;
              }
            }
          }
          garbageCollectors.get(segmentSink)(streamCanceller.signal);
          createAdaptationStream(
            adaptation,
            representations,
            segmentSink,
            streamCanceller.signal
          );
        })().catch((err) => {
          if (err instanceof CancellationError) {
            return;
          }
          currentStreamCanceller == null ? void 0 : currentStreamCanceller.cancel("PeriodStream err");
          callbacks.error(err);
        });
      },
      { clearSignal: parentCancelSignal, emitCurrentValue: true }
    );
    function createAdaptationStream(adaptation, representations, segmentSink, cancelSignal) {
      const adaptationPlaybackObserver = createAdaptationStreamPlaybackObserver(
        playbackObserver,
        adaptation.type
      );
      adaptation_default(
        {
          content: { manifest, period, adaptation, representations },
          options,
          playbackObserver: adaptationPlaybackObserver,
          representationEstimator,
          segmentSink,
          segmentQueueCreator,
          wantedBufferAhead,
          maxVideoBufferSize
        },
        __spreadProps(__spreadValues({}, callbacks), { error: onAdaptationStreamError }),
        cancelSignal
      );
      function onAdaptationStreamError(error) {
        if (!segment_sinks_default.isNative(bufferType)) {
          log_default.error(
            `Stream`,
            `${bufferType} Stream crashed. Aborting it.`,
            error instanceof Error ? error : ""
          );
          segmentSinksStore.disposeSegmentSink(bufferType, "AdaptationStream err");
          const formattedError = formatError(error, {
            defaultCode: "NONE",
            defaultReason: "Unknown `AdaptationStream` error"
          });
          callbacks.warning(formattedError);
          if (cancelSignal.isCancelled()) {
            return;
          }
          return createEmptyAdaptationStream(
            playbackObserver,
            wantedBufferAhead,
            bufferType,
            { period },
            callbacks,
            cancelSignal
          );
        }
        log_default.error(
          `Stream`,
          `${bufferType} Stream crashed. Stopping playback.`,
          error instanceof Error ? error : ""
        );
        callbacks.error(error);
      }
    }
    function askForMediaSourceReload(timeOffset, stayInPeriod, cancelSignal) {
      queue_microtask_default(() => {
        playbackObserver.listen(
          () => {
            if (cancelSignal.isCancelled()) {
              return;
            }
            callbacks.waitingMediaSourceReload({
              bufferType,
              period,
              timeOffset,
              stayInPeriod
            });
          },
          { includeLastObservation: true, clearSignal: cancelSignal }
        );
      });
    }
  }
  function createOrReuseSegmentSink(segmentSinksStore, bufferType, adaptation) {
    const segmentSinkStatus = segmentSinksStore.getStatus(bufferType);
    if (segmentSinkStatus.type === "initialized") {
      log_default.info("Stream", "Reusing a previous SegmentSink for the type", { bufferType });
      return segmentSinkStatus.value;
    }
    const codec = getFirstDeclaredMimeType(adaptation);
    return segmentSinksStore.createSegmentSink(bufferType, codec);
  }
  function getFirstDeclaredMimeType(adaptation) {
    const representations = adaptation.representations.filter(
      (r) => r.isPlayable() !== false
    );
    if (representations.length > 0) {
      return representations[0].getMimeTypeString();
    } else if (adaptation.representations.length > 0) {
      return adaptation.representations[0].getMimeTypeString();
    } else {
      const noRepErr = new MediaError(
        "NO_PLAYABLE_REPRESENTATION",
        "No Representation in the chosen " + adaptation.type + " Adaptation can be played",
        { tracks: [toTaggedTrack(adaptation)] }
      );
      throw noRepErr;
    }
  }
  function createAdaptationStreamPlaybackObserver(initialPlaybackObserver, trackType) {
    return initialPlaybackObserver.deriveReadOnlyObserver(function transform(observationRef, cancellationSignal) {
      const newRef = new reference_default(
        constructAdaptationStreamPlaybackObservation(),
        cancellationSignal
      );
      observationRef.onUpdate(emitAdaptationStreamPlaybackObservation, {
        clearSignal: cancellationSignal,
        emitCurrentValue: false
      });
      return newRef;
      function constructAdaptationStreamPlaybackObservation() {
        const baseObservation = observationRef.getValue();
        const buffered = baseObservation.buffered[trackType];
        const bufferGap = buffered !== null ? getLeftSizeOfRange(buffered, baseObservation.position.getWanted()) : 0;
        return object_assign_default({}, baseObservation, { bufferGap, buffered });
      }
      function emitAdaptationStreamPlaybackObservation() {
        newRef.setValue(constructAdaptationStreamPlaybackObservation());
      }
    });
  }
  function createEmptyAdaptationStream(playbackObserver, wantedBufferAhead, bufferType, content, callbacks, cancelSignal) {
    const { period } = content;
    let hasFinishedLoading = false;
    wantedBufferAhead.onUpdate(sendStatus, {
      emitCurrentValue: false,
      clearSignal: cancelSignal
    });
    playbackObserver.listen(sendStatus, {
      includeLastObservation: false,
      clearSignal: cancelSignal
    });
    sendStatus();
    function sendStatus() {
      const observation = playbackObserver.getReference().getValue();
      const wba = wantedBufferAhead.getValue();
      const position = observation.position.getWanted();
      if (period.end !== void 0 && position + wba >= period.end) {
        log_default.debug("Stream", 'full "empty" AdaptationStream', {
          bufferType,
          periodEnd: period.end,
          position,
          wantedBufferAhead: wba
        });
        hasFinishedLoading = true;
      }
      callbacks.streamStatusUpdate({
        period,
        bufferType,
        imminentDiscontinuity: null,
        position,
        isEmptyStream: true,
        hasFinishedLoading,
        neededSegments: []
      });
    }
  }

  // src/core/stream/period/index.ts
  var period_default = PeriodStream;

  // src/core/stream/orchestrator/get_time_ranges_for_content.ts
  function getTimeRangesForContent(segmentSink, contents) {
    if (contents.length === 0) {
      return [];
    }
    const ranges = [];
    const inventory = segmentSink.getLastKnownInventory();
    const pendingOperations = segmentSink.getPendingOperations();
    for (const chunk of inventory) {
      const hasContent = contents.some((content) => {
        return chunk.infos.period.id === content.period.id && chunk.infos.adaptation.id === content.adaptation.id && chunk.infos.representation.id === content.representation.id;
      });
      if (hasContent) {
        const { bufferedStart, bufferedEnd } = chunk;
        if (bufferedStart === void 0 || bufferedEnd === void 0) {
          log_default.warn("Stream", "No buffered start or end found from a segment.", {
            bufferType: chunk.infos.adaptation.type,
            segmentStart: chunk.infos.segment.time
          });
          return [{ start: 0, end: Number.MAX_VALUE }];
        }
        const previousLastElement = ranges[ranges.length - 1];
        if (previousLastElement !== void 0 && previousLastElement.end === bufferedStart) {
          previousLastElement.end = bufferedEnd;
        } else {
          ranges.push({ start: bufferedStart, end: bufferedEnd });
        }
      }
    }
    for (const operation of pendingOperations) {
      if (operation.type !== 0 /* Push */) {
        continue;
      }
      const pushInfo = operation.value;
      const hasContent = contents.some((content) => {
        return pushInfo.inventoryInfos.period.id === content.period.id && pushInfo.inventoryInfos.adaptation.id === content.adaptation.id && pushInfo.inventoryInfos.representation.id === content.representation.id;
      });
      if (hasContent) {
        insertInto(ranges, {
          start: pushInfo.inventoryInfos.start,
          end: pushInfo.inventoryInfos.end
        });
      }
    }
    return ranges;
  }

  // src/core/stream/orchestrator/stream_orchestrator.ts
  function StreamOrchestrator(content, playbackObserver, representationEstimator, segmentSinksStore, segmentQueueCreator, options, callbacks, orchestratorCancelSignal) {
    const { manifest, initialPeriod } = content;
    const { maxBufferAhead, maxBufferBehind, wantedBufferAhead, maxVideoBufferSize } = options;
    const {
      MINIMUM_MAX_BUFFER_AHEAD,
      MAXIMUM_MAX_BUFFER_AHEAD,
      MAXIMUM_MAX_BUFFER_BEHIND
    } = config_default.getCurrent();
    const garbageCollectors = new WeakMapMemory((segmentSink) => {
      var _a2, _b2;
      const { bufferType } = segmentSink;
      const defaultMaxBehind = (_a2 = MAXIMUM_MAX_BUFFER_BEHIND[bufferType]) != null ? _a2 : Infinity;
      const maxAheadHigherBound = (_b2 = MAXIMUM_MAX_BUFFER_AHEAD[bufferType]) != null ? _b2 : Infinity;
      return (gcCancelSignal) => {
        BufferGarbageCollector(
          {
            segmentSink,
            playbackObserver,
            maxBufferBehind: createMappedReference(
              maxBufferBehind,
              (val) => Math.min(val, defaultMaxBehind),
              gcCancelSignal
            ),
            maxBufferAhead: createMappedReference(
              maxBufferAhead,
              (val) => {
                var _a3;
                const lowerBound = Math.max(val, (_a3 = MINIMUM_MAX_BUFFER_AHEAD[bufferType]) != null ? _a3 : 0);
                return Math.min(lowerBound, maxAheadHigherBound);
              },
              gcCancelSignal
            )
          },
          gcCancelSignal
        );
      };
    });
    for (const bufferType of segmentSinksStore.getBufferTypes()) {
      manageEveryStreams(bufferType, initialPeriod);
    }
    function manageEveryStreams(bufferType, basePeriod) {
      const periodList = new SortedList((a, b) => a.start - b.start);
      let enableOutOfBoundsCheck = false;
      let currentCanceller = new TaskCanceller(
        "StreamOrchestrator Streams for " + bufferType
      );
      currentCanceller.linkToSignal(orchestratorCancelSignal);
      playbackObserver.listen(
        ({ position }) => {
          const time = position.getWanted();
          if (!enableOutOfBoundsCheck || !isOutOfPeriodList(time)) {
            return;
          }
          const getNewBasePeriod = () => {
            var _a2;
            return (_a2 = manifest.getPeriodForTime(time)) != null ? _a2 : manifest.getNextPeriod(time);
          };
          let nextPeriod = getNewBasePeriod();
          if (!isNullOrUndefined(nextPeriod) && periodList.has(nextPeriod)) {
            return;
          }
          log_default.info(
            "Stream",
            "Destroying all PeriodStreams due to out of bounds situation",
            { bufferType, time }
          );
          enableOutOfBoundsCheck = false;
          while (periodList.length() > 0) {
            const period = periodList.get(periodList.length() - 1);
            periodList.removeElement(period);
            callbacks.periodStreamCleared({ type: bufferType, manifest, period });
          }
          currentCanceller.cancel("PeriodStream is out of bounds");
          currentCanceller = new TaskCanceller(
            "StreamOrchestrator Streams for " + bufferType
          );
          currentCanceller.linkToSignal(orchestratorCancelSignal);
          nextPeriod = getNewBasePeriod();
          if (nextPeriod === void 0) {
            log_default.warn("Stream", "The wanted position is not found in the Manifest.");
            enableOutOfBoundsCheck = true;
            return;
          }
          launchConsecutiveStreamsForPeriod(nextPeriod);
        },
        { clearSignal: orchestratorCancelSignal, includeLastObservation: true }
      );
      manifest.addEventListener(
        "decipherabilityUpdate",
        (evt) => {
          if (orchestratorCancelSignal.isCancelled()) {
            return;
          }
          onDecipherabilityUpdates(evt).catch((err) => {
            if (orchestratorCancelSignal.isCancelled()) {
              return;
            }
            currentCanceller.cancel("decipherabilityUpdate event");
            callbacks.error(err);
          });
        },
        orchestratorCancelSignal
      );
      return launchConsecutiveStreamsForPeriod(basePeriod);
      function launchConsecutiveStreamsForPeriod(period) {
        const consecutivePeriodStreamCb = __spreadProps(__spreadValues({}, callbacks), {
          waitingMediaSourceReload(payload) {
            const firstPeriod = periodList.head();
            if (firstPeriod === void 0 || firstPeriod.id !== payload.period.id) {
              callbacks.lockedStream({
                bufferType: payload.bufferType,
                period: payload.period
              });
            } else {
              callbacks.needsMediaSourceReload({
                timeOffset: payload.timeOffset,
                minimumPosition: payload.stayInPeriod ? payload.period.start : void 0,
                maximumPosition: payload.stayInPeriod ? payload.period.end : void 0
              });
            }
          },
          periodStreamReady(payload) {
            enableOutOfBoundsCheck = true;
            periodList.add(payload.period);
            callbacks.periodStreamReady(payload);
          },
          periodStreamCleared(payload) {
            periodList.removeElement(payload.period);
            callbacks.periodStreamCleared(payload);
          },
          error(err) {
            currentCanceller.cancel("PeriodStream err callback");
            callbacks.error(err);
          }
        });
        manageConsecutivePeriodStreams(
          bufferType,
          period,
          consecutivePeriodStreamCb,
          currentCanceller.signal
        );
      }
      function isOutOfPeriodList(time) {
        const head = periodList.head();
        const last = periodList.last();
        if (head === void 0 || last === void 0) {
          return true;
        }
        return head.start > time || (isNullOrUndefined(last.end) ? Infinity : last.end) < time;
      }
      async function onDecipherabilityUpdates(updates) {
        const segmentSinkStatus = segmentSinksStore.getStatus(bufferType);
        const ofCurrentType = updates.filter(
          (update) => update.adaptation.type === bufferType
        );
        if (
          // No update concerns the current type of data
          ofCurrentType.length === 0 || segmentSinkStatus.type !== "initialized" || // The update only notifies of now-decipherable streams
          ofCurrentType.every((x) => x.representation.decipherable === true)
        ) {
          return;
        }
        const segmentSink = segmentSinkStatus.value;
        const resettedContent = ofCurrentType.filter(
          (update) => update.representation.decipherable === void 0
        );
        const undecipherableContent = ofCurrentType.filter(
          (update) => update.representation.decipherable === false
        );
        const undecipherableRanges = getTimeRangesForContent(
          segmentSink,
          undecipherableContent
        );
        const rangesToRemove = getTimeRangesForContent(segmentSink, resettedContent);
        enableOutOfBoundsCheck = false;
        log_default.info("Stream", "Destroying all PeriodStreams for decipherability matters", {
          bufferType
        });
        while (periodList.length() > 0) {
          const period = periodList.get(periodList.length() - 1);
          periodList.removeElement(period);
          callbacks.periodStreamCleared({ type: bufferType, manifest, period });
        }
        currentCanceller.cancel("decipherability update");
        currentCanceller = new TaskCanceller(
          "StreamOrchestrator Streams for " + bufferType
        );
        currentCanceller.linkToSignal(orchestratorCancelSignal);
        for (const { start, end } of [...undecipherableRanges, ...rangesToRemove]) {
          if (orchestratorCancelSignal.isCancelled()) {
            return;
          }
          if (start < end) {
            if (orchestratorCancelSignal.isCancelled()) {
              return;
            }
            await segmentSink.removeBuffer(start, end);
          }
        }
        queue_microtask_default(() => {
          if (orchestratorCancelSignal.isCancelled()) {
            return;
          }
          const observation = playbackObserver.getReference().getValue();
          if (needsFlushingAfterClean(observation, undecipherableRanges)) {
            callbacks.needsDecipherabilityFlush();
            if (orchestratorCancelSignal.isCancelled()) {
              return;
            }
          } else if (needsFlushingAfterClean(observation, rangesToRemove)) {
            callbacks.needsBufferFlush();
            if (orchestratorCancelSignal.isCancelled()) {
              return;
            }
          }
          const lastPosition = observation.position.getWanted();
          let newInitialPeriod = manifest.getPeriodForTime(lastPosition);
          if (newInitialPeriod === void 0) {
            newInitialPeriod = manifest.getNextPeriod(lastPosition);
            log_default.warn(
              "Stream",
              "No Period found for the reloading position, selecting next one instead",
              {
                reloadPosition: lastPosition,
                nextPeriodStart: newInitialPeriod == null ? void 0 : newInitialPeriod.start
              }
            );
          }
          if (newInitialPeriod === void 0) {
            newInitialPeriod = manifest.periods[manifest.periods.length - 1];
            log_default.warn(
              "Stream",
              "No Period found for of after the reloading position, selecting the last one",
              {
                reloadPosition: lastPosition,
                nextPeriodStart: newInitialPeriod == null ? void 0 : newInitialPeriod.start,
                nextPeriodEnd: newInitialPeriod == null ? void 0 : newInitialPeriod.end
              }
            );
          }
          if (newInitialPeriod === void 0) {
            callbacks.error(
              new MediaError(
                "MEDIA_TIME_NOT_FOUND",
                "The wanted position is not found in the Manifest."
              )
            );
            return;
          }
          launchConsecutiveStreamsForPeriod(newInitialPeriod);
        });
      }
    }
    function manageConsecutivePeriodStreams(bufferType, basePeriod, consecutivePeriodStreamCb, cancelSignal) {
      log_default.info("Stream", "Creating new PeriodStream", {
        bufferType,
        periodStart: basePeriod.start
      });
      let nextStreamInfo = null;
      const currentStreamCanceller = new TaskCanceller(
        "StreamOrchestrator current consecutive Streams " + bufferType
      );
      currentStreamCanceller.linkToSignal(cancelSignal);
      playbackObserver.listen(
        ({ position }, stopListeningObservations) => {
          if (basePeriod.end !== void 0 && position.getWanted() >= basePeriod.end) {
            const nextPeriod = manifest.getPeriodAfter(basePeriod);
            if (basePeriod.containsTime(position.getWanted(), nextPeriod)) {
              return;
            }
            log_default.info(
              "Stream",
              "Destroying PeriodStream as the current playhead moved above it",
              {
                bufferType,
                periodStart: basePeriod.start,
                periodEnd: basePeriod.end,
                position: position.getWanted()
              }
            );
            stopListeningObservations();
            consecutivePeriodStreamCb.periodStreamCleared({
              type: bufferType,
              manifest,
              period: basePeriod
            });
            currentStreamCanceller.cancel("Position ahead of PeriodStream");
          }
        },
        { clearSignal: cancelSignal, includeLastObservation: true }
      );
      const periodStreamArgs = {
        bufferType,
        content: { manifest, period: basePeriod },
        garbageCollectors,
        maxVideoBufferSize,
        segmentQueueCreator,
        segmentSinksStore,
        options,
        playbackObserver,
        representationEstimator,
        wantedBufferAhead
      };
      const periodStreamCallbacks = __spreadProps(__spreadValues({}, consecutivePeriodStreamCb), {
        streamStatusUpdate(value) {
          if (value.hasFinishedLoading) {
            const nextPeriod = manifest.getPeriodAfter(basePeriod);
            if (nextPeriod !== null) {
              checkOrCreateNextPeriodStream(nextPeriod);
            }
          } else if (nextStreamInfo !== null) {
            log_default.info(
              "Stream",
              "Destroying next PeriodStream due to current one being active",
              {
                bufferType,
                periodStart: basePeriod.start,
                nextPeriodStart: nextStreamInfo.period.start
              }
            );
            consecutivePeriodStreamCb.periodStreamCleared({
              type: bufferType,
              manifest,
              period: nextStreamInfo.period
            });
            nextStreamInfo.canceller.cancel("previous PeriodStream is active");
            nextStreamInfo = null;
          }
          consecutivePeriodStreamCb.streamStatusUpdate(value);
        },
        error(err) {
          if (nextStreamInfo !== null) {
            nextStreamInfo.canceller.cancel("previous PeriodStream err");
            nextStreamInfo = null;
          }
          currentStreamCanceller.cancel("PeriodStream err");
          consecutivePeriodStreamCb.error(err);
        }
      });
      period_default(periodStreamArgs, periodStreamCallbacks, currentStreamCanceller.signal);
      handleUnexpectedManifestUpdates(currentStreamCanceller.signal);
      function checkOrCreateNextPeriodStream(nextPeriod) {
        if (nextStreamInfo !== null) {
          if (nextStreamInfo.period.id === nextPeriod.id) {
            return;
          }
          log_default.warn(
            "Stream",
            "Creating next `PeriodStream` while one was already created.",
            {
              bufferType,
              nextPeriodStart: nextPeriod.start
            }
          );
          consecutivePeriodStreamCb.periodStreamCleared({
            type: bufferType,
            manifest,
            period: nextStreamInfo.period
          });
          nextStreamInfo.canceller.cancel("PeriodStream recreation");
        }
        const nextStreamCanceller = new TaskCanceller(
          "StreamOrchestrator next PeriodStream " + bufferType
        );
        nextStreamCanceller.linkToSignal(cancelSignal);
        nextStreamInfo = { canceller: nextStreamCanceller, period: nextPeriod };
        manageConsecutivePeriodStreams(
          bufferType,
          nextPeriod,
          consecutivePeriodStreamCb,
          nextStreamInfo.canceller.signal
        );
      }
      function handleUnexpectedManifestUpdates(innerCancelSignal) {
        manifest.addEventListener(
          "manifestUpdate",
          (updates) => {
            for (const period of updates.removedPeriods) {
              if (period.id === basePeriod.id) {
                if (manifest.periods.length > 0 && manifest.periods[0].start <= period.start) {
                  return queue_microtask_default(() => {
                    if (innerCancelSignal.isCancelled()) {
                      return;
                    }
                    return callbacks.needsMediaSourceReload({
                      timeOffset: 0,
                      minimumPosition: void 0,
                      maximumPosition: void 0
                    });
                  });
                }
              } else if (period.start > basePeriod.start) {
                break;
              }
            }
            if (updates.addedPeriods.length > 0) {
              if (nextStreamInfo !== null) {
                const newNextPeriod = manifest.getPeriodAfter(basePeriod);
                if (newNextPeriod === null || nextStreamInfo.period.id !== newNextPeriod.id) {
                  log_default.warn(
                    "Stream",
                    "Destroying next PeriodStream due to new one being added",
                    {
                      bufferType,
                      nextPeriodStart: nextStreamInfo.period.start
                    }
                  );
                  consecutivePeriodStreamCb.periodStreamCleared({
                    type: bufferType,
                    manifest,
                    period: nextStreamInfo.period
                  });
                  nextStreamInfo.canceller.cancel("Next Period changed");
                  nextStreamInfo = null;
                }
              }
            }
          },
          innerCancelSignal
        );
      }
    }
  }
  function needsFlushingAfterClean(observation, cleanedRanges) {
    if (cleanedRanges.length === 0) {
      return false;
    }
    const curPos = observation.position.getPolled();
    return observation.speed >= 0 ? cleanedRanges[cleanedRanges.length - 1].end >= curPos - 5 : cleanedRanges[0].start <= curPos + 5;
  }

  // src/core/stream/orchestrator/index.ts
  var orchestrator_default = StreamOrchestrator;

  // src/core/stream/index.ts
  var stream_default = orchestrator_default;

  // src/compat/change_source_buffer_type.ts
  function tryToChangeSourceBufferType(sourceBuffer, codec) {
    if (typeof sourceBuffer.changeType === "function") {
      try {
        sourceBuffer.changeType(codec);
      } catch (e) {
        log_default.warn(
          "mse",
          "Could not call 'changeType' on the given SourceBuffer:",
          e instanceof Error ? e : ""
        );
        return false;
      }
      return true;
    }
    return false;
  }

  // src/mse/utils/end_of_stream.ts
  function getUpdatingSourceBuffers(sourceBuffers) {
    const updatingSourceBuffers = [];
    for (let i = 0; i < sourceBuffers.length; i++) {
      const SourceBuffer = sourceBuffers[i];
      if (SourceBuffer.updating) {
        updatingSourceBuffers.push(SourceBuffer);
      }
    }
    return updatingSourceBuffers;
  }
  function triggerEndOfStream(mediaSource, cancelSignal) {
    log_default.debug("mse", "Trying to call endOfStream");
    if (mediaSource.readyState !== "open") {
      log_default.debug("mse", "MediaSource not open, cancel endOfStream");
      return;
    }
    const { sourceBuffers } = mediaSource;
    const updatingSourceBuffers = getUpdatingSourceBuffers(sourceBuffers);
    if (updatingSourceBuffers.length === 0) {
      log_default.info("mse", "Triggering end of stream");
      try {
        mediaSource.endOfStream();
      } catch (err) {
        log_default.error(
          "mse",
          "Unable to call endOfStream",
          err instanceof Error ? err : new Error("Unknown error")
        );
      }
      return;
    }
    log_default.debug("mse", "Waiting SourceBuffers to be updated before calling endOfStream.");
    const innerCanceller = new TaskCanceller("EndOfStream current iteration");
    innerCanceller.linkToSignal(cancelSignal);
    for (const sourceBuffer of updatingSourceBuffers) {
      onSourceBufferUpdate(
        sourceBuffer,
        () => {
          innerCanceller.cancel("SourceBuffer update");
          triggerEndOfStream(mediaSource, cancelSignal);
        },
        innerCanceller.signal
      );
    }
    onRemoveSourceBuffers(
      sourceBuffers,
      () => {
        innerCanceller.cancel("SourceBuffer remove");
        triggerEndOfStream(mediaSource, cancelSignal);
      },
      innerCanceller.signal
    );
  }
  function maintainEndOfStream(mediaSource, cancelSignal) {
    let endOfStreamCanceller = new TaskCanceller("EndOfStream");
    endOfStreamCanceller.linkToSignal(cancelSignal);
    onSourceOpen(
      mediaSource,
      () => {
        log_default.debug("mse", "MediaSource re-opened while end-of-stream is active");
        endOfStreamCanceller.cancel("MediaSource re-opened");
        endOfStreamCanceller = new TaskCanceller("EndOfStream");
        endOfStreamCanceller.linkToSignal(cancelSignal);
        triggerEndOfStream(mediaSource, endOfStreamCanceller.signal);
      },
      cancelSignal
    );
    triggerEndOfStream(mediaSource, endOfStreamCanceller.signal);
  }

  // src/compat/has_issues_with_high_media_source_duration.ts
  function hasIssuesWithHighMediaSourceDuration() {
    const { FORCE_HAS_ISSUES_WITH_HIGH_MEDIA_SOURCE_DURATION } = config_default.getCurrent();
    return FORCE_HAS_ISSUES_WITH_HIGH_MEDIA_SOURCE_DURATION || env_detector_default.device === env_detector_default.DEVICES.PlayStation5;
  }

  // src/mse/utils/media_source_duration_updater.ts
  var YEAR_IN_SECONDS = 365 * 24 * 3600;
  var MediaSourceDurationUpdater = class {
    /**
     * Create a new `MediaSourceDurationUpdater`,
     * @param {MediaSource} mediaSource - The MediaSource on which the content is
     * played.
     */
    constructor(mediaSource) {
      this._mediaSource = mediaSource;
      this._currentMediaSourceDurationUpdateCanceller = null;
    }
    /**
     * Indicate to the `MediaSourceDurationUpdater` the currently known duration
     * of the content.
     *
     * The `MediaSourceDurationUpdater` will then use that value to determine
     * which `duration` attribute should be set on the `MediaSource` associated
     *
     * @param {number} newDuration
     * @param {boolean} isRealEndKnown - If set to `false`, the current content is
     * a dynamic content (it might evolve in the future) and the `newDuration`
     * communicated might be greater still. In effect the
     * `MediaSourceDurationUpdater` will actually set a much higher value to the
     * `MediaSource`'s duration to prevent being annoyed by the HTML-related
     * side-effects of having a too low duration (such as the impossibility to
     * seek over that value).
     */
    updateDuration(newDuration, isRealEndKnown) {
      if (this._currentMediaSourceDurationUpdateCanceller !== null) {
        this._currentMediaSourceDurationUpdateCanceller.cancel("manual duration update");
      }
      this._currentMediaSourceDurationUpdateCanceller = new TaskCanceller(
        "MediaSource Duration Update"
      );
      const mediaSource = this._mediaSource;
      const currentSignal = this._currentMediaSourceDurationUpdateCanceller.signal;
      const isMediaSourceOpened = createMediaSourceOpenReference(
        mediaSource,
        currentSignal
      );
      let msOpenStatusCanceller = new TaskCanceller(
        void 0
      );
      msOpenStatusCanceller.linkToSignal(currentSignal);
      isMediaSourceOpened.onUpdate(onMediaSourceOpenedStatusChanged, {
        emitCurrentValue: true,
        clearSignal: currentSignal
      });
      function onMediaSourceOpenedStatusChanged() {
        msOpenStatusCanceller.cancel("MediaSource open status changed");
        if (!isMediaSourceOpened.getValue()) {
          return;
        }
        msOpenStatusCanceller = new TaskCanceller(
          void 0
        );
        msOpenStatusCanceller.linkToSignal(currentSignal);
        const areSourceBuffersUpdating = createSourceBuffersUpdatingReference(
          mediaSource.sourceBuffers,
          msOpenStatusCanceller.signal
        );
        let sourceBuffersUpdatingCanceller = new TaskCanceller(void 0);
        sourceBuffersUpdatingCanceller.linkToSignal(msOpenStatusCanceller.signal);
        return areSourceBuffersUpdating.onUpdate(
          (areUpdating) => {
            sourceBuffersUpdatingCanceller.cancel("SourceBuffer status update");
            sourceBuffersUpdatingCanceller = new TaskCanceller(void 0);
            sourceBuffersUpdatingCanceller.linkToSignal(msOpenStatusCanceller.signal);
            if (areUpdating) {
              return;
            }
            recursivelyForceDurationUpdate(
              mediaSource,
              newDuration,
              isRealEndKnown,
              sourceBuffersUpdatingCanceller.signal
            );
          },
          { clearSignal: msOpenStatusCanceller.signal, emitCurrentValue: true }
        );
      }
    }
    /**
     * Abort the last duration-setting operation and free its resources.
     * @param {string | undefined} reason - Human-inspectable reason behind the
     * stop. Used for debugging matters, especially for debug log
     * inspection.
     */
    stopUpdating(reason) {
      if (this._currentMediaSourceDurationUpdateCanceller !== null) {
        this._currentMediaSourceDurationUpdateCanceller.cancel(reason != null ? reason : "stop MSDU");
        this._currentMediaSourceDurationUpdateCanceller = null;
      }
    }
  };
  function setMediaSourceDuration(mediaSource, duration, isRealEndKnown) {
    let newDuration = duration;
    if (!isRealEndKnown) {
      newDuration = hasIssuesWithHighMediaSourceDuration() ? Infinity : getMaximumLiveSeekablePosition(duration);
    }
    let maxBufferedEnd = 0;
    for (let i = 0; i < mediaSource.sourceBuffers.length; i++) {
      const sourceBuffer = mediaSource.sourceBuffers[i];
      const sbBufferedLen = sourceBuffer.buffered.length;
      if (sbBufferedLen > 0) {
        maxBufferedEnd = Math.max(
          maxBufferedEnd,
          sourceBuffer.buffered.end(sbBufferedLen - 1)
        );
      }
    }
    if (newDuration === mediaSource.duration) {
      return "success" /* Success */;
    } else if (maxBufferedEnd > newDuration) {
      if (maxBufferedEnd < mediaSource.duration) {
        try {
          log_default.info("mse", "Updating duration to what is currently buffered", {
            maxBufferedEnd
          });
          mediaSource.duration = maxBufferedEnd;
        } catch (err) {
          log_default.warn(
            "mse",
            "Can't update duration on the MediaSource.",
            err instanceof Error ? err : ""
          );
          return "failed" /* Failed */;
        }
      }
      return "partial" /* Partial */;
    } else {
      const oldDuration = mediaSource.duration;
      try {
        log_default.info("mse", "Updating duration", { newDuration });
        mediaSource.duration = newDuration;
        if (mediaSource.readyState === "open" && !isFinite(newDuration)) {
          const maxSeekable = getMaximumLiveSeekablePosition(duration);
          log_default.info("mse", "calling `mediaSource.setLiveSeekableRange`", { maxSeekable });
          mediaSource.setLiveSeekableRange(0, maxSeekable);
        }
      } catch (err) {
        log_default.warn(
          "mse",
          "Can't update duration on the MediaSource.",
          err instanceof Error ? err : ""
        );
        return "failed" /* Failed */;
      }
      const deltaToExpected = Math.abs(mediaSource.duration - newDuration);
      if (deltaToExpected >= 0.1) {
        const deltaToBefore = Math.abs(mediaSource.duration - oldDuration);
        return deltaToExpected < deltaToBefore ? "partial" /* Partial */ : "failed" /* Failed */;
      }
      return "success" /* Success */;
    }
  }
  function createSourceBuffersUpdatingReference(sourceBuffers, cancelSignal) {
    if (sourceBuffers.length === 0) {
      const notOpenedRef = new reference_default(false);
      notOpenedRef.finish();
      return notOpenedRef;
    }
    const areUpdatingRef = new reference_default(false, cancelSignal);
    reCheck();
    for (let i = 0; i < sourceBuffers.length; i++) {
      const sourceBuffer = sourceBuffers[i];
      sourceBuffer.addEventListener("updatestart", reCheck);
      sourceBuffer.addEventListener("update", reCheck);
      cancelSignal.register(() => {
        sourceBuffer.removeEventListener("updatestart", reCheck);
        sourceBuffer.removeEventListener("update", reCheck);
      });
    }
    return areUpdatingRef;
    function reCheck() {
      for (let i = 0; i < sourceBuffers.length; i++) {
        const sourceBuffer = sourceBuffers[i];
        if (sourceBuffer.updating) {
          areUpdatingRef.setValueIfChanged(true);
          return;
        }
      }
      areUpdatingRef.setValueIfChanged(false);
    }
  }
  function createMediaSourceOpenReference(mediaSource, cancelSignal) {
    const isMediaSourceOpen = new reference_default(
      mediaSource.readyState === "open",
      cancelSignal
    );
    onSourceOpen(
      mediaSource,
      () => {
        log_default.debug("mse", "Reacting to MediaSource open in duration updater");
        isMediaSourceOpen.setValueIfChanged(true);
      },
      cancelSignal
    );
    onSourceEnded(
      mediaSource,
      () => {
        log_default.debug("mse", "Reacting to MediaSource ended in duration updater");
        isMediaSourceOpen.setValueIfChanged(false);
      },
      cancelSignal
    );
    onSourceClose(
      mediaSource,
      () => {
        log_default.debug("mse", "Reacting to MediaSource close in duration updater");
        isMediaSourceOpen.setValueIfChanged(false);
      },
      cancelSignal
    );
    return isMediaSourceOpen;
  }
  function recursivelyForceDurationUpdate(mediaSource, duration, isRealEndKnown, cancelSignal) {
    const res = setMediaSourceDuration(mediaSource, duration, isRealEndKnown);
    if (res === "success" /* Success */) {
      return;
    }
    const timeoutId = setTimeout(() => {
      unregisterClear();
      recursivelyForceDurationUpdate(mediaSource, duration, isRealEndKnown, cancelSignal);
    }, 2e3);
    const unregisterClear = cancelSignal.register(() => {
      clearTimeout(timeoutId);
    });
  }
  function getMaximumLiveSeekablePosition(contentLastPosition) {
    return Math.max(Math.pow(2, 32), contentLastPosition + YEAR_IN_SECONDS);
  }

  // src/mse/main_media_source_interface.ts
  var MainMediaSourceInterface = class extends EventEmitter {
    /**
     * Creates a new `MainMediaSourceInterface` alongside its `MediaSource` MSE
     * object.
     *
     * You can then obtain a link to that `MediaSource`, for example to link it
     * to an `HTMLMediaElement`, through the `handle` property.
     */
    constructor(id, forcedMediaSource) {
      super();
      this.id = id;
      this.sourceBuffers = [];
      this._canceller = new TaskCanceller("MainMediaSourceInterface");
      if (isNullOrUndefined(MediaSource_)) {
        throw new MediaError(
          "MEDIA_SOURCE_NOT_SUPPORTED",
          "No MediaSource Object was found in the current browser."
        );
      }
      log_default.info("mse", "Creating MediaSource");
      const mediaSource = forcedMediaSource !== void 0 ? new forcedMediaSource() : new MediaSource_();
      const handle = mediaSource.handle;
      this.handle = isNullOrUndefined(handle) ? (
        // eslint-disable-next-line @typescript-eslint/no-restricted-types
        { type: "media-source", value: mediaSource }
      ) : { type: "handle", value: handle };
      this._mediaSource = mediaSource;
      this.readyState = mediaSource.readyState;
      this._durationUpdater = new MediaSourceDurationUpdater(mediaSource);
      this._endOfStreamCanceller = null;
      onSourceOpen(
        mediaSource,
        () => {
          this.readyState = mediaSource.readyState;
          this.trigger("mediaSourceOpen", null);
        },
        this._canceller.signal
      );
      onSourceEnded(
        mediaSource,
        () => {
          this.readyState = mediaSource.readyState;
          this.trigger("mediaSourceEnded", null);
        },
        this._canceller.signal
      );
      onSourceClose(
        mediaSource,
        () => {
          this.readyState = mediaSource.readyState;
          this.trigger("mediaSourceClose", null);
        },
        this._canceller.signal
      );
      if (this._mediaSource.streaming !== void 0) {
        this.streaming = this._mediaSource.streaming;
      }
      this._mediaSource.addEventListener("startstreaming", () => {
        this.streaming = true;
        this.trigger("streamingChanged", null);
      });
      this._mediaSource.addEventListener("endstreaming", () => {
        this.streaming = false;
        this.trigger("streamingChanged", null);
      });
    }
    /** @see IMediaSourceInterface */
    addSourceBuffer(sbType, codec) {
      const sourceBuffer = this._mediaSource.addSourceBuffer(codec);
      const sb = new MainSourceBufferInterface(sbType, codec, sourceBuffer);
      this.sourceBuffers.push(sb);
      return sb;
    }
    /** @see IMediaSourceInterface */
    setDuration(newDuration, isRealEndKnown) {
      this._durationUpdater.updateDuration(newDuration, isRealEndKnown);
    }
    /** @see IMediaSourceInterface */
    interruptDurationSetting(reason) {
      this._durationUpdater.stopUpdating(reason);
    }
    /** @see IMediaSourceInterface */
    maintainEndOfStream() {
      if (this._endOfStreamCanceller === null) {
        this._endOfStreamCanceller = new TaskCanceller(
          "MainMediaSourceInterface EndOfStream"
        );
        this._endOfStreamCanceller.linkToSignal(this._canceller.signal);
        log_default.debug("mse", "end-of-stream order received.");
        maintainEndOfStream(this._mediaSource, this._endOfStreamCanceller.signal);
      }
    }
    /** @see IMediaSourceInterface */
    stopEndOfStream() {
      if (this._endOfStreamCanceller !== null) {
        log_default.debug("mse", "resume-stream order received.");
        this._endOfStreamCanceller.cancel("MediaSourceInterface stopEndOfStream");
        this._endOfStreamCanceller = null;
      }
    }
    /** @see IMediaSourceInterface */
    dispose(reason) {
      this.sourceBuffers.forEach((s) => s.dispose(reason));
      this._canceller.cancel(reason != null ? reason : "MainMediaSourceInterface dispose");
      resetMediaSource(this._mediaSource);
    }
  };
  var MainSourceBufferInterface = class {
    /**
     * Creates a new `SourceBufferInterface` linked to the given `SourceBuffer`
     * instance.
     * @param {string} sbType
     * @param {string} codec
     * @param {SourceBuffer} sourceBuffer
     */
    constructor(sbType, codec, sourceBuffer) {
      this.type = sbType;
      this.codec = codec;
      this._canceller = new TaskCanceller("MainSourceBufferInterface " + sbType);
      this._sourceBuffer = sourceBuffer;
      this._operationQueue = [];
      this._currentOperations = [];
      const onError = this._onError.bind(this);
      const onUpdateEnd = this._onUpdateEnd.bind(this);
      sourceBuffer.addEventListener("updateend", onUpdateEnd);
      sourceBuffer.addEventListener("error", onError);
      this._canceller.signal.register(() => {
        sourceBuffer.removeEventListener("updateend", onUpdateEnd);
        sourceBuffer.removeEventListener("error", onError);
      });
    }
    /** @see ISourceBufferInterface */
    appendBuffer(...args) {
      log_default.debug("mse", "receiving order to push data to the SourceBuffer", {
        type: this.type
      });
      return this._addToQueue({
        operationName: 0 /* Push */,
        params: args
      });
    }
    /** @see ISourceBufferInterface */
    remove(start, end) {
      log_default.debug("mse", "receiving order to remove data from the SourceBuffer", {
        type: this.type,
        start,
        end
      });
      return this._addToQueue({
        operationName: 1 /* Remove */,
        params: [start, end]
      });
    }
    /** @see ISourceBufferInterface */
    getBuffered() {
      try {
        return convertToRanges(this._sourceBuffer.buffered);
      } catch (err) {
        log_default.error(
          "mse",
          "Failed to get buffered time range of SourceBuffer",
          {
            type: this.type
          },
          err instanceof Error ? err : "Unknown Error"
        );
        return [];
      }
    }
    /** @see ISourceBufferInterface */
    abort(reason) {
      try {
        this._sourceBuffer.abort();
      } catch (err) {
        log_default.debug(
          "mse",
          "Failed to abort SourceBuffer:",
          err instanceof Error ? err : "Unknown Error"
        );
      }
      this._emptyCurrentQueue(reason);
    }
    /** @see ISourceBufferInterface */
    dispose(reason) {
      try {
        this._sourceBuffer.abort();
      } catch (_) {
      }
      this._emptyCurrentQueue(reason);
    }
    _onError(evt) {
      let error;
      if (evt instanceof Error) {
        error = evt;
      } else if (evt.error instanceof Error) {
        error = evt.error;
      } else {
        error = new Error("Unknown SourceBuffer Error");
      }
      const currentOps = this._currentOperations;
      this._currentOperations = [];
      if (currentOps.length === 0) {
        log_default.error("mse", "error for an unknown operation", error);
      } else {
        const rejected = new SourceBufferError(
          error.name,
          error.message,
          error.name === "QuotaExceededError"
        );
        for (const op of currentOps) {
          op.reject(rejected);
        }
      }
    }
    _onUpdateEnd() {
      const currentOps = this._currentOperations;
      this._currentOperations = [];
      try {
        for (const op of currentOps) {
          op.resolve(convertToRanges(this._sourceBuffer.buffered));
        }
      } catch (err) {
        for (const op of currentOps) {
          if (err instanceof Error && err.name === "InvalidStateError") {
            op.resolve([]);
          } else {
            op.reject(err);
          }
        }
      }
      this._performNextOperation();
    }
    /**
     * @param {string | undefined} reason - Human-inspectable reason behind the
     * action. Used for debugging matters, especially for debug log
     * inspection.
     */
    _emptyCurrentQueue(reason) {
      const error = new CancellationError(
        "MainSourceBufferInterface queue " + this.type,
        reason
      );
      if (this._currentOperations.length > 0) {
        this._currentOperations.forEach((op) => {
          op.reject(error);
        });
        this._currentOperations = [];
      }
      if (this._operationQueue.length > 0) {
        this._operationQueue.forEach((op) => {
          op.reject(error);
        });
        this._operationQueue = [];
      }
    }
    _addToQueue(operation) {
      return new Promise((resolve, reject) => {
        const shouldRestartQueue = this._operationQueue.length === 0 && this._currentOperations.length === 0;
        const queueItem = object_assign_default(
          { resolve, reject },
          operation
        );
        this._operationQueue.push(queueItem);
        if (shouldRestartQueue) {
          this._performNextOperation();
        }
      });
    }
    _performNextOperation() {
      var _a2, _b2, _c2, _d2, _e2;
      if (this._currentOperations.length !== 0 || this._sourceBuffer.updating) {
        return;
      }
      const nextElem = this._operationQueue.shift();
      if (nextElem === void 0) {
        return;
      } else if (nextElem.operationName === 0 /* Push */) {
        this._currentOperations = [
          {
            operationName: 0 /* Push */,
            resolve: nextElem.resolve,
            reject: nextElem.reject
          }
        ];
        const ogData = nextElem.params[0];
        const params = nextElem.params[1];
        let segmentData = ogData;
        if (this._operationQueue.length > 0 && this._operationQueue[0].operationName === 0 /* Push */) {
          let prevU8;
          if (ogData instanceof ArrayBuffer) {
            prevU8 = new Uint8Array(ogData);
          } else if (ogData instanceof Uint8Array) {
            prevU8 = ogData;
          } else {
            prevU8 = new Uint8Array(ogData.buffer);
          }
          const toConcat = [prevU8];
          while (((_a2 = this._operationQueue[0]) == null ? void 0 : _a2.operationName) === 0 /* Push */) {
            const followingElem = this._operationQueue[0];
            const cAw = (_b2 = params.appendWindow) != null ? _b2 : [void 0, void 0];
            const fAw = (_c2 = followingElem.params[1].appendWindow) != null ? _c2 : [void 0, void 0];
            const cTo = (_d2 = params.timestampOffset) != null ? _d2 : 0;
            const fTo = (_e2 = followingElem.params[1].timestampOffset) != null ? _e2 : 0;
            if (cAw[0] === fAw[0] && cAw[1] === fAw[1] && params.codec === followingElem.params[1].codec && cTo === fTo) {
              const newData = followingElem.params[0];
              let newU8;
              if (newData instanceof ArrayBuffer) {
                newU8 = new Uint8Array(newData);
              } else if (newData instanceof Uint8Array) {
                newU8 = newData;
              } else {
                newU8 = new Uint8Array(newData.buffer);
              }
              toConcat.push(newU8);
              this._operationQueue.splice(0, 1);
              this._currentOperations.push({
                operationName: 0 /* Push */,
                resolve: followingElem.resolve,
                reject: followingElem.reject
              });
            } else {
              break;
            }
          }
          if (toConcat.length > 1) {
            log_default.info("mse", `: Merging ${toConcat.length} segments together for perf`, {
              type: this.type
            });
            segmentData = concat(...toConcat).buffer;
          }
        }
        try {
          this._appendBufferNow(segmentData, params);
        } catch (err) {
          const error = err instanceof Error ? new SourceBufferError(
            err.name,
            err.message,
            err.name === "QuotaExceededError"
          ) : new SourceBufferError(
            "Error",
            "Unknown SourceBuffer Error during appendBuffer",
            false
          );
          this._currentOperations.forEach((op) => {
            op.reject(error);
          });
          this._currentOperations = [];
          this._performNextOperation();
        }
      } else {
        this._currentOperations = [nextElem];
        const [start, end] = nextElem.params;
        log_default.debug("mse", "removing data from SourceBuffer", {
          type: this.type,
          start,
          end
        });
        try {
          this._sourceBuffer.remove(start, end);
        } catch (err) {
          const error = err instanceof Error ? new SourceBufferError(err.name, err.message, false) : new SourceBufferError(
            "Error",
            "Unknown SourceBuffer Error during remove",
            false
          );
          nextElem.reject(error);
          this._currentOperations.forEach((op) => {
            op.reject(error);
          });
          this._currentOperations = [];
          this._performNextOperation();
        }
      }
    }
    _appendBufferNow(data, params) {
      const sourceBuffer = this._sourceBuffer;
      const { codec, timestampOffset, appendWindow = [] } = params;
      if (codec !== void 0 && codec !== this.codec) {
        log_default.debug("mse", "updating codec", {
          type: this.type,
          prevCodec: this.codec,
          newCodec: codec
        });
        const hasUpdatedSourceBufferType = tryToChangeSourceBufferType(sourceBuffer, codec);
        if (hasUpdatedSourceBufferType) {
          this.codec = codec;
        } else {
          log_default.debug("mse", "could not update codec", {
            type: this.type,
            prevCodec: this.codec,
            newCodec: codec
          });
        }
      }
      if (timestampOffset !== void 0 && sourceBuffer.timestampOffset !== timestampOffset) {
        const newTimestampOffset = timestampOffset;
        log_default.debug("mse", "updating timestampOffset", {
          type: this.type,
          codec,
          prevTimestampOffset: sourceBuffer.timestampOffset,
          newTimestampOffset
        });
        sourceBuffer.timestampOffset = newTimestampOffset;
      }
      if (appendWindow[0] === void 0) {
        if (sourceBuffer.appendWindowStart > 0) {
          log_default.debug("mse", "re-setting `appendWindowStart`", {
            type: this.type,
            prevWindowStart: sourceBuffer.appendWindowStart
          });
          sourceBuffer.appendWindowStart = 0;
        }
      } else if (appendWindow[0] !== sourceBuffer.appendWindowStart) {
        if (appendWindow[0] >= sourceBuffer.appendWindowEnd) {
          const newWindowEnd = appendWindow[0] + 1;
          log_default.debug("mse", "pre-updating `appendWindowEnd`", {
            type: this.type,
            prevWindowEnd: sourceBuffer.appendWindowEnd,
            newWindowEnd
          });
          sourceBuffer.appendWindowEnd = newWindowEnd;
        }
        log_default.debug("mse", "setting `appendWindowStart`", {
          type: this.type,
          appendWindowStart: appendWindow[0]
        });
        sourceBuffer.appendWindowStart = appendWindow[0];
      }
      if (appendWindow[1] === void 0) {
        if (sourceBuffer.appendWindowEnd !== Infinity) {
          log_default.debug("mse", "re-setting `appendWindowEnd`", {
            type: this.type,
            prevWindowStart: sourceBuffer.appendWindowStart
          });
          sourceBuffer.appendWindowEnd = Infinity;
        }
      } else if (appendWindow[1] !== sourceBuffer.appendWindowEnd) {
        log_default.debug("mse", "setting `appendWindowEnd`", {
          type: this.type,
          prevWindowEnd: sourceBuffer.appendWindowEnd,
          newWindowEnd: appendWindow[1]
        });
        sourceBuffer.appendWindowEnd = appendWindow[1];
      }
      log_default.debug("mse", "pushing segment", { type: this.type });
      sourceBuffer.appendBuffer(data);
    }
  };
  function resetMediaSource(mediaSource) {
    if (mediaSource.readyState !== "closed") {
      const { readyState, sourceBuffers } = mediaSource;
      for (let i = sourceBuffers.length - 1; i >= 0; i--) {
        const sourceBuffer = sourceBuffers[i];
        try {
          if (readyState === "open") {
            log_default.info("mse", "Aborting SourceBuffer before removing");
            try {
              sourceBuffer.abort();
            } catch (_) {
            }
          }
          log_default.info("mse", "Removing SourceBuffer from mediaSource");
          mediaSource.removeSourceBuffer(sourceBuffer);
        } catch (_) {
        }
      }
      if (sourceBuffers.length > 0) {
        log_default.info("mse", "Not all SourceBuffers could have been removed.");
      }
    }
  }

  // src/mse/worker_media_source_interface.ts
  var generateMediaSourceId = idGenerator();
  var generateSourceBufferOperationId = idGenerator();
  var MAX_WORKER_SOURCE_BUFFER_QUEUE_SIZE = Infinity;
  var WorkerMediaSourceInterface = class extends EventEmitter {
    constructor(id, contentId, messageSender) {
      super();
      this.id = id;
      this.sourceBuffers = [];
      this._canceller = new TaskCanceller("WorkerMediaSourceInterface");
      this.readyState = "closed";
      this._messageSender = messageSender;
      const mediaSourceId = generateMediaSourceId();
      this._messageSender({
        type: "create-media-source" /* CreateMediaSource */,
        contentId,
        mediaSourceId
      });
    }
    onMediaSourceReadyStateChanged(readyState) {
      switch (readyState) {
        case "closed":
          this.readyState = "closed";
          this.trigger("mediaSourceClose", null);
          break;
        case "open":
          this.readyState = "open";
          this.trigger("mediaSourceOpen", null);
          break;
        case "ended":
          this.readyState = "ended";
          this.trigger("mediaSourceEnded", null);
          break;
      }
    }
    addSourceBuffer(sbType, codec) {
      this._messageSender({
        type: "add-source-buffer" /* AddSourceBuffer */,
        mediaSourceId: this.id,
        value: {
          sourceBufferType: sbType,
          codec
        }
      });
      const sb = new WorkerSourceBufferInterface(
        sbType,
        codec,
        this.id,
        this._messageSender
      );
      this.sourceBuffers.push(sb);
      return sb;
    }
    setDuration(newDuration, isRealEndKnown) {
      this._messageSender({
        type: "update-media-source-duration" /* UpdateMediaSourceDuration */,
        mediaSourceId: this.id,
        value: {
          duration: newDuration,
          isRealEndKnown
        }
      });
    }
    interruptDurationSetting() {
      this._messageSender({
        type: "stop-media-source-duration" /* InterruptMediaSourceDurationUpdate */,
        mediaSourceId: this.id,
        value: null
      });
    }
    maintainEndOfStream() {
      this._messageSender({
        type: "end-of-stream" /* EndOfStream */,
        mediaSourceId: this.id,
        value: null
      });
    }
    stopEndOfStream() {
      this._messageSender({
        type: "stop-end-of-stream" /* InterruptEndOfStream */,
        mediaSourceId: this.id,
        value: null
      });
    }
    /**
     * @param {string | undefined} reason - Human-inspectable reason behind the
     * dispose. Used for debugging matters, especially for debug log
     * inspection.
     */
    dispose(reason) {
      this.sourceBuffers.forEach((s) => s.dispose(reason));
      this._canceller.cancel("WorkerMediaSourceInterface dispose");
      this._messageSender({
        type: "dispose-media-source" /* DisposeMediaSource */,
        mediaSourceId: this.id,
        value: null
      });
    }
  };
  var WorkerSourceBufferInterface = class {
    constructor(sbType, codec, mediaSourceId, messageSender) {
      this.type = sbType;
      this.codec = codec;
      this._canceller = new TaskCanceller("WorkerSourceBufferInterface " + sbType);
      this._mediaSourceId = mediaSourceId;
      this._queuedOperations = [];
      this._pendingOperations = /* @__PURE__ */ new Map();
      this._messageSender = messageSender;
    }
    onOperationSuccess(operationId, ranges) {
      const mapElt = this._pendingOperations.get(operationId);
      if (mapElt === void 0) {
        log_default.warn("mse", "unknown SourceBuffer operation succeeded", {
          type: this.type
        });
      } else {
        this._pendingOperations.delete(operationId);
        mapElt.resolve(ranges);
      }
      this._performNextQueuedOperationIfItExists();
    }
    onOperationFailure(operationId, error) {
      const formattedErr = error.errorName === "CancellationError" ? new CancellationError("Pending SBI Operation " + this.type, "SBI Failure") : new SourceBufferError(error.errorName, error.message, error.isBufferFull);
      const mapElt = this._pendingOperations.get(operationId);
      if (mapElt === void 0) {
        log_default.info(
          "mse",
          "unknown SourceBuffer operation failed",
          { type: this.type },
          formattedErr
        );
      } else {
        this._pendingOperations.delete(operationId);
        mapElt.reject(formattedErr);
      }
      const cancellationError = new CancellationError(
        "Queued SBI Operation " + this.type,
        "SBI failure"
      );
      for (const operation of this._queuedOperations) {
        operation.reject(cancellationError);
      }
      this._queuedOperations = [];
    }
    appendBuffer(data, params) {
      return new Promise((resolve, reject) => {
        if (this._queuedOperations.length > 0 || this._pendingOperations.size >= MAX_WORKER_SOURCE_BUFFER_QUEUE_SIZE) {
          this._queuedOperations.push({
            operationName: 0 /* Push */,
            params: [data, params],
            resolve,
            reject
          });
          return;
        }
        try {
          let segmentSinkPushed;
          if (data instanceof ArrayBuffer) {
            segmentSinkPushed = data;
          } else if (data.byteLength === data.buffer.byteLength) {
            segmentSinkPushed = data.buffer;
          } else {
            segmentSinkPushed = data.buffer.slice(
              data.byteOffset,
              data.byteLength + data.byteOffset
            );
          }
          const operationId = generateSourceBufferOperationId();
          this._messageSender(
            {
              type: "source-buffer-append" /* SourceBufferAppend */,
              mediaSourceId: this._mediaSourceId,
              sourceBufferType: this.type,
              operationId,
              value: {
                data: segmentSinkPushed,
                params
              }
            },
            [segmentSinkPushed]
          );
          this._addOperationToQueue(operationId, resolve, reject);
        } catch (err) {
          reject(err);
        }
      });
    }
    remove(start, end) {
      return new Promise((resolve, reject) => {
        if (this._queuedOperations.length > 0 || this._pendingOperations.size >= MAX_WORKER_SOURCE_BUFFER_QUEUE_SIZE) {
          this._queuedOperations.push({
            operationName: 1 /* Remove */,
            params: [start, end],
            resolve,
            reject
          });
          return;
        }
        try {
          const operationId = generateSourceBufferOperationId();
          this._messageSender({
            type: "source-buffer-remove" /* SourceBufferRemove */,
            mediaSourceId: this._mediaSourceId,
            sourceBufferType: this.type,
            operationId,
            value: {
              start,
              end
            }
          });
          this._addOperationToQueue(operationId, resolve, reject);
        } catch (err) {
          reject(err);
        }
      });
    }
    abort() {
      this._messageSender({
        type: "abort-source-buffer" /* AbortSourceBuffer */,
        mediaSourceId: this._mediaSourceId,
        sourceBufferType: this.type,
        value: null
      });
    }
    /**
     * @param {string | undefined} reason - Human-inspectable reason behind the
     * dispose. Used for debugging matters, especially for debug log
     * inspection.
     */
    dispose(reason) {
      this.abort();
      this._canceller.cancel(reason != null ? reason : "WorkerSourceBufferInterface dispose");
    }
    getBuffered() {
      return;
    }
    _addOperationToQueue(operationId, resolve, reject) {
      this._pendingOperations.set(operationId, {
        resolve: onResolve,
        reject: onReject
      });
      const unbindCanceller = this._canceller.signal.register((error) => {
        this._pendingOperations.delete(operationId);
        reject(error);
      });
      function onResolve(ranges) {
        unbindCanceller();
        resolve(ranges);
      }
      function onReject(err) {
        unbindCanceller();
        reject(err);
      }
    }
    _performNextQueuedOperationIfItExists() {
      const nextOp = this._queuedOperations.shift();
      if (nextOp !== void 0) {
        try {
          if (nextOp.operationName === 0 /* Push */) {
            const [data, params] = nextOp.params;
            let segmentSinkPushed;
            if (data instanceof ArrayBuffer) {
              segmentSinkPushed = data;
            } else if (data.byteLength === data.buffer.byteLength) {
              segmentSinkPushed = data.buffer;
            } else {
              segmentSinkPushed = data.buffer.slice(
                data.byteOffset,
                data.byteLength + data.byteOffset
              );
            }
            const nOpId = generateSourceBufferOperationId();
            this._messageSender(
              {
                type: "source-buffer-append" /* SourceBufferAppend */,
                mediaSourceId: this._mediaSourceId,
                sourceBufferType: this.type,
                operationId: nOpId,
                value: {
                  data: segmentSinkPushed,
                  params
                }
              },
              [segmentSinkPushed]
            );
            this._addOperationToQueue(nOpId, nextOp.resolve, nextOp.reject);
          } else {
            const [start, end] = nextOp.params;
            const nOpId = generateSourceBufferOperationId();
            this._messageSender({
              type: "source-buffer-remove" /* SourceBufferRemove */,
              mediaSourceId: this._mediaSourceId,
              sourceBufferType: this.type,
              operationId: nOpId,
              value: {
                start,
                end
              }
            });
            this._addOperationToQueue(nOpId, nextOp.resolve, nextOp.reject);
          }
        } catch (err) {
          nextOp.reject(err);
        }
      }
    }
  };

  // src/core/adaptive/utils/get_buffer_levels.ts
  function getBufferLevels(bitrates) {
    const logs = bitrates.map((b) => Math.log(b / bitrates[0]));
    const utilities = logs.map((l) => l - logs[0] + 1);
    const gp = (utilities[utilities.length - 1] - 1) / (bitrates.length * 2 + 10);
    const Vp = 1 / gp;
    return bitrates.map((_, i) => minBufferLevelForBitrate(i));
    function minBufferLevelForBitrate(index) {
      if (index === 0) {
        return 0;
      }
      const boundedIndex = Math.min(Math.max(1, index), bitrates.length - 1);
      if (bitrates[boundedIndex] === bitrates[boundedIndex - 1]) {
        return minBufferLevelForBitrate(index - 1);
      }
      return Vp * (gp + (bitrates[boundedIndex] * utilities[boundedIndex - 1] - bitrates[boundedIndex - 1] * utilities[boundedIndex]) / (bitrates[boundedIndex] - bitrates[boundedIndex - 1])) + 4;
    }
  }

  // src/core/adaptive/utils/ewma.ts
  var EWMA = class {
    /**
     * @param {number} halfLife
     */
    constructor(halfLife) {
      this._alpha = Math.exp(Math.log(0.5) / halfLife);
      this._lastEstimate = 0;
      this._totalWeight = 0;
    }
    /**
     * @param {number} weight
     * @param {number} value
     */
    addSample(weight, value) {
      const adjAlpha = Math.pow(this._alpha, weight);
      const newEstimate = value * (1 - adjAlpha) + adjAlpha * this._lastEstimate;
      if (!isNaN(newEstimate)) {
        this._lastEstimate = newEstimate;
        this._totalWeight += weight;
      }
    }
    /**
     * @returns {number} value
     */
    getEstimate() {
      const zeroFactor = 1 - Math.pow(this._alpha, this._totalWeight);
      return this._lastEstimate / zeroFactor;
    }
  };

  // src/core/adaptive/utils/representation_score_calculator.ts
  var RepresentationScoreCalculator = class {
    constructor() {
      this._currentRepresentationData = null;
      this._lastRepresentationWithGoodScore = null;
    }
    /**
     * Add new sample data.
     * @param {Object} representation
     * @param {number} requestDuration - duration taken for doing the request for
     * the whole segment.
     * @param {number} segmentDuration - media duration of the whole segment, in
     * seconds.
     */
    addSample(representation, requestDuration, segmentDuration) {
      const ratio = segmentDuration / requestDuration;
      const currentRep = this._currentRepresentationData;
      let currentEWMA;
      if (currentRep !== null && currentRep.representation.id === representation.id) {
        currentEWMA = currentRep.ewma;
        currentRep.ewma.addSample(requestDuration, ratio);
        currentRep.loadedDuration += segmentDuration;
        currentRep.loadedSegments++;
      } else {
        currentEWMA = new EWMA(5);
        currentEWMA.addSample(requestDuration, ratio);
        this._currentRepresentationData = {
          representation,
          ewma: currentEWMA,
          loadedDuration: segmentDuration,
          loadedSegments: 0
        };
      }
      if (currentEWMA.getEstimate() > 1 && this._lastRepresentationWithGoodScore !== representation) {
        log_default.debug("ABR", "New last stable representation", {
          bitrate: representation.bitrate
        });
        this._lastRepresentationWithGoodScore = representation;
      }
    }
    /**
     * Get score estimate for the given Representation.
     * undefined if no estimate is available.
     * @param {Object} representation
     * @returns {number|undefined}
     */
    getEstimate(representation) {
      if (this._currentRepresentationData === null || this._currentRepresentationData.representation.id !== representation.id) {
        return void 0;
      }
      const { ewma, loadedSegments, loadedDuration } = this._currentRepresentationData;
      const estimate = ewma.getEstimate();
      const confidenceLevel = loadedSegments >= 5 && loadedDuration >= 10 ? 1 /* HIGH */ : 0 /* LOW */;
      return { score: estimate, confidenceLevel };
    }
    /**
     * Returns last Representation which had reached a score superior to 1.
     * This Representation is the last known one which could be maintained.
     * Useful to know if a current guess is higher than what you should
     * normally be able to play.
     * `null` if no Representation ever reach that score.
     * @returns {Object|null}
     */
    getLastStableRepresentation() {
      return this._lastRepresentationWithGoodScore;
    }
  };

  // src/core/adaptive/buffer_based_chooser.ts
  var MINIMUM_BLOCK_RAISE_DELAY = 6e3;
  var MAXIMUM_BLOCK_RAISE_DELAY = 15e3;
  var RAISE_BLOCKING_DELAY_INCREMENT = 3e3;
  var RAISE_BLOCKING_DELAY_DECREMENT = 1e3;
  var STABILITY_CHECK_DELAY = 9e3;
  var BufferBasedChooser = class {
    /**
     * @param {Array.<number>} bitrates
     */
    constructor(bitrates) {
      this._levelsMap = getBufferLevels(bitrates).map((bl) => {
        return bl + 4;
      });
      this._bitrates = bitrates;
      this._lastUnsuitableQualityTimestamp = void 0;
      this._blockRaiseDelay = MINIMUM_BLOCK_RAISE_DELAY;
      log_default.debug(
        "ABR",
        "Steps for buffer based chooser.",
        this._levelsMap.map((l, i) => `bufferLevel: ${l}, bitrate: ${bitrates[i]}`).join(" ,")
      );
    }
    /**
     * @param {Object} playbackObservation
     * @returns {number|undefined}
     */
    onAddedSegment(playbackObservation) {
      const bufferLevels = this._levelsMap;
      const bitrates = this._bitrates;
      const { bufferGap, currentBitrate, currentScore, speed } = playbackObservation;
      if (isNullOrUndefined(currentBitrate)) {
        this._currentEstimate = bitrates[0];
        return;
      }
      let currentBitrateIndex = -1;
      for (let i = 0; i < bitrates.length; i++) {
        const bitrate = bitrates[i];
        if (bitrate === currentBitrate) {
          currentBitrateIndex = i;
        } else if (bitrate > currentBitrate) {
          break;
        }
      }
      if (currentBitrateIndex < 0 || bitrates.length !== bufferLevels.length) {
        log_default.info("ABR", "Current Bitrate not found in the calculated levels");
        this._currentEstimate = bitrates[0];
        return;
      }
      let scaledScore;
      if (currentScore !== void 0) {
        scaledScore = speed === 0 ? currentScore.score : currentScore.score / speed;
      }
      const actualBufferGap = isFinite(bufferGap) ? bufferGap : 0;
      const now = monotonic_timestamp_default();
      if (actualBufferGap < bufferLevels[currentBitrateIndex] || scaledScore !== void 0 && scaledScore < 1 && (currentScore == null ? void 0 : currentScore.confidenceLevel) === 1 /* HIGH */) {
        const timeSincePrev = this._lastUnsuitableQualityTimestamp === void 0 ? -1 : now - this._lastUnsuitableQualityTimestamp;
        if (timeSincePrev < this._blockRaiseDelay + STABILITY_CHECK_DELAY) {
          const newDelay = this._blockRaiseDelay + RAISE_BLOCKING_DELAY_INCREMENT;
          log_default.debug(
            "ABR",
            "Incrementing blocking raise in BufferBasedChooser due to unstable quality",
            { prevDelay: this._blockRaiseDelay, newDelay }
          );
          this._blockRaiseDelay = Math.min(newDelay, MAXIMUM_BLOCK_RAISE_DELAY);
        } else {
          const newDelay = this._blockRaiseDelay - RAISE_BLOCKING_DELAY_DECREMENT;
          log_default.debug("ABR", "Lowering quality in BufferBasedChooser", {
            prevDelay: this._blockRaiseDelay,
            newDelay
          });
          this._blockRaiseDelay = Math.max(MINIMUM_BLOCK_RAISE_DELAY, newDelay);
        }
        this._lastUnsuitableQualityTimestamp = now;
        const baseIndex = arrayFindIndex(bitrates, (b) => b === currentBitrate);
        for (let i = baseIndex - 1; i >= 0; i--) {
          if (actualBufferGap >= bufferLevels[i]) {
            this._currentEstimate = bitrates[i];
            return;
          }
        }
        this._currentEstimate = bitrates[0];
        return;
      }
      if (this._lastUnsuitableQualityTimestamp !== void 0 && now - this._lastUnsuitableQualityTimestamp < this._blockRaiseDelay || scaledScore === void 0 || scaledScore < 1.15 || (currentScore == null ? void 0 : currentScore.confidenceLevel) !== 1 /* HIGH */) {
        this._currentEstimate = currentBitrate;
        return;
      }
      const currentBufferLevel = bufferLevels[currentBitrateIndex];
      const nextIndex = (() => {
        for (let i = currentBitrateIndex + 1; i < bufferLevels.length; i++) {
          if (bufferLevels[i] > currentBufferLevel) {
            return i;
          }
        }
      })();
      if (nextIndex !== void 0) {
        const nextBufferLevel = bufferLevels[nextIndex];
        if (bufferGap >= nextBufferLevel) {
          log_default.debug("ABR", "Raising quality in BufferBasedChooser", {
            bitrate: bitrates[nextIndex]
          });
          this._currentEstimate = bitrates[nextIndex];
          return;
        }
      }
      this._currentEstimate = currentBitrate;
      return;
    }
    /**
     * Returns the last best Representation's bitrate estimate made by the
     * `BufferBasedChooser` or `undefined` if it has no such guess for now.
     *
     * Might be updated after `onAddedSegment` is called.
     *
     * @returns {number|undefined}
     */
    getLastEstimate() {
      return this._currentEstimate;
    }
  };

  // src/core/adaptive/network_analyzer.ts
  function getConcernedRequests(requests, neededPosition) {
    let nextSegmentIndex = -1;
    for (let i = 0; i < requests.length; i++) {
      const { segment } = requests[i].content;
      if (segment.duration <= 0) {
        continue;
      }
      const segmentEnd = segment.time + segment.duration;
      if (!segment.complete) {
        if (i === requests.length - 1 && neededPosition - segment.time > -1.2) {
          nextSegmentIndex = i;
          break;
        }
      }
      if (segmentEnd > neededPosition && neededPosition - segment.time > -1.2) {
        nextSegmentIndex = i;
        break;
      }
    }
    if (nextSegmentIndex < 0) {
      return [];
    }
    const nextRequest = requests[nextSegmentIndex];
    const segmentTime = nextRequest.content.segment.time;
    const filteredRequests = [nextRequest];
    for (let i = nextSegmentIndex + 1; i < requests.length; i++) {
      if (requests[i].content.segment.time === segmentTime) {
        filteredRequests.push(requests[i]);
      } else {
        break;
      }
    }
    return filteredRequests;
  }
  function estimateRequestBandwidth(request2) {
    if (request2.progress.length < 5) {
      return void 0;
    }
    const ewma1 = new EWMA(2);
    const { progress } = request2;
    for (let i = 1; i < progress.length; i++) {
      const bytesDownloaded = progress[i].size - progress[i - 1].size;
      const timeElapsed = progress[i].timestamp - progress[i - 1].timestamp;
      const reqBitrate = bytesDownloaded * 8 / (timeElapsed / 1e3);
      ewma1.addSample(timeElapsed / 1e3, reqBitrate);
    }
    return ewma1.getEstimate();
  }
  function estimateRemainingTime(lastProgressEvent, bandwidthEstimate) {
    const remainingData = (lastProgressEvent.totalSize - lastProgressEvent.size) * 8;
    return Math.max(remainingData / bandwidthEstimate, 0);
  }
  function estimateStarvationModeBitrate(pendingRequests, playbackInfo, currentRepresentation, lowLatencyMode, lastEstimatedBitrate) {
    if (lowLatencyMode) {
      return void 0;
    }
    const { bufferGap, speed, position } = playbackInfo;
    const realBufferGap = isFinite(bufferGap) ? bufferGap : 0;
    const nextNeededPosition = position.getWanted() + realBufferGap;
    const concernedRequests = getConcernedRequests(pendingRequests, nextNeededPosition);
    if (concernedRequests.length !== 1) {
      return void 0;
    }
    const concernedRequest = concernedRequests[0];
    const now = monotonic_timestamp_default();
    let minimumRequestTime = concernedRequest.content.segment.duration * 1.5;
    minimumRequestTime = Math.min(minimumRequestTime, 3e3);
    minimumRequestTime = Math.max(minimumRequestTime, 12e3);
    if (now - concernedRequest.requestTimestamp < minimumRequestTime) {
      return void 0;
    }
    const lastProgressEvent = concernedRequest.progress.length > 0 ? concernedRequest.progress[concernedRequest.progress.length - 1] : void 0;
    const bandwidthEstimate = estimateRequestBandwidth(concernedRequest);
    if (lastProgressEvent !== void 0 && bandwidthEstimate !== void 0) {
      const remainingTime = estimateRemainingTime(lastProgressEvent, bandwidthEstimate);
      if ((now - lastProgressEvent.timestamp) / 1e3 <= remainingTime) {
        const expectedRebufferingTime = remainingTime - realBufferGap / speed;
        if (expectedRebufferingTime > 2500) {
          return bandwidthEstimate;
        }
      }
    }
    if (!concernedRequest.content.segment.complete) {
      return void 0;
    }
    const chunkDuration = concernedRequest.content.segment.duration;
    const requestElapsedTime = (now - concernedRequest.requestTimestamp) / 1e3;
    const reasonableElapsedTime = requestElapsedTime <= (chunkDuration * 1.5 + 2) / speed;
    if (isNullOrUndefined(currentRepresentation) || reasonableElapsedTime) {
      return void 0;
    }
    const factor = chunkDuration / requestElapsedTime;
    const reducedBitrate = currentRepresentation.bitrate * Math.min(0.7, factor);
    if (lastEstimatedBitrate === void 0 || reducedBitrate < lastEstimatedBitrate) {
      return reducedBitrate;
    }
  }
  function shouldDirectlySwitchToLowBitrate(playbackInfo, requests, lowLatencyMode) {
    if (lowLatencyMode) {
      return true;
    }
    const realBufferGap = isFinite(playbackInfo.bufferGap) ? playbackInfo.bufferGap : 0;
    const nextNeededPosition = playbackInfo.position.getWanted() + realBufferGap;
    const nextRequest = arrayFind(
      requests,
      ({ content }) => content.segment.duration > 0 && content.segment.time + content.segment.duration > nextNeededPosition
    );
    if (nextRequest === void 0) {
      return true;
    }
    const now = monotonic_timestamp_default();
    const lastProgressEvent = nextRequest.progress.length > 0 ? nextRequest.progress[nextRequest.progress.length - 1] : void 0;
    const bandwidthEstimate = estimateRequestBandwidth(nextRequest);
    if (lastProgressEvent === void 0 || bandwidthEstimate === void 0) {
      return true;
    }
    const remainingTime = estimateRemainingTime(lastProgressEvent, bandwidthEstimate);
    if ((now - lastProgressEvent.timestamp) / 1e3 > remainingTime * 1.2) {
      return true;
    }
    const expectedRebufferingTime = remainingTime - realBufferGap / playbackInfo.speed;
    return expectedRebufferingTime > -1.5;
  }
  var NetworkAnalyzer = class {
    constructor(initialBitrate, lowLatencyMode) {
      const {
        ABR_STARVATION_GAP,
        OUT_OF_STARVATION_GAP,
        ABR_STARVATION_FACTOR,
        ABR_REGULAR_FACTOR
      } = config_default.getCurrent();
      this._initialBitrate = initialBitrate;
      this._inStarvationMode = false;
      this._lowLatencyMode = lowLatencyMode;
      if (lowLatencyMode) {
        this._config = {
          starvationGap: ABR_STARVATION_GAP.LOW_LATENCY,
          outOfStarvationGap: OUT_OF_STARVATION_GAP.LOW_LATENCY,
          starvationBitrateFactor: ABR_STARVATION_FACTOR.LOW_LATENCY,
          regularBitrateFactor: ABR_REGULAR_FACTOR.LOW_LATENCY
        };
      } else {
        this._config = {
          starvationGap: ABR_STARVATION_GAP.DEFAULT,
          outOfStarvationGap: OUT_OF_STARVATION_GAP.DEFAULT,
          starvationBitrateFactor: ABR_STARVATION_FACTOR.DEFAULT,
          regularBitrateFactor: ABR_REGULAR_FACTOR.DEFAULT
        };
      }
    }
    /**
     * Gives an estimate of the current bandwidth and of the bitrate that should
     * be considered for chosing a `representation`.
     * This estimate is only based on network metrics.
     * @param {Object} playbackInfo - Gives current information about playback.
     * @param {Object} bandwidthEstimator - `BandwidthEstimator` allowing to
     * produce network bandwidth estimates.
     * @param {Object|null} currentRepresentation - The Representation currently
     * chosen.
     * `null` if no Representation has been chosen yet.
     * @param {Array.<Object>} currentRequests - All segment requests by segment's
     * start chronological order
     * @param {number|undefined} lastEstimatedBitrate - Bitrate emitted during the
     * last estimate.
     * @returns {Object}
     */
    getBandwidthEstimate(playbackInfo, bandwidthEstimator, currentRepresentation, currentRequests, lastEstimatedBitrate) {
      let newBitrateCeil;
      let bandwidthEstimate;
      const localConf = this._config;
      const { bufferGap, position, duration } = playbackInfo;
      const realBufferGap = isFinite(bufferGap) ? bufferGap : 0;
      const { ABR_STARVATION_DURATION_DELTA } = config_default.getCurrent();
      if (isNaN(duration) || realBufferGap + position.getWanted() < duration - ABR_STARVATION_DURATION_DELTA) {
        if (!this._inStarvationMode && realBufferGap <= localConf.starvationGap) {
          log_default.info("ABR", "enter starvation mode.", {
            buffergap: realBufferGap,
            enterStarvation: localConf.starvationGap
          });
          this._inStarvationMode = true;
        } else if (this._inStarvationMode && realBufferGap >= localConf.outOfStarvationGap) {
          log_default.info("ABR", "exit starvation mode.", {
            bufferGap: realBufferGap,
            outOfStarvation: localConf.starvationGap
          });
          this._inStarvationMode = false;
        }
      } else if (this._inStarvationMode) {
        log_default.info("ABR", "exit starvation mode.", {
          bufferGap: realBufferGap
        });
        this._inStarvationMode = false;
      }
      if (this._inStarvationMode) {
        bandwidthEstimate = estimateStarvationModeBitrate(
          currentRequests,
          playbackInfo,
          currentRepresentation,
          this._lowLatencyMode,
          lastEstimatedBitrate
        );
        if (bandwidthEstimate !== void 0) {
          log_default.info("ABR", "starvation mode emergency estimate:", {
            bandwidth: bandwidthEstimate
          });
          bandwidthEstimator.reset();
          newBitrateCeil = isNullOrUndefined(currentRepresentation) ? bandwidthEstimate : Math.min(bandwidthEstimate, currentRepresentation.bitrate);
        }
      }
      if (isNullOrUndefined(newBitrateCeil)) {
        bandwidthEstimate = bandwidthEstimator.getEstimate();
        if (bandwidthEstimate !== void 0) {
          newBitrateCeil = bandwidthEstimate * (this._inStarvationMode ? localConf.starvationBitrateFactor : localConf.regularBitrateFactor);
        } else if (lastEstimatedBitrate !== void 0) {
          newBitrateCeil = lastEstimatedBitrate * (this._inStarvationMode ? localConf.starvationBitrateFactor : localConf.regularBitrateFactor);
        } else {
          newBitrateCeil = this._initialBitrate;
        }
      }
      if (playbackInfo.speed > 1) {
        newBitrateCeil /= playbackInfo.speed;
      }
      return { bandwidthEstimate, bitrateChosen: newBitrateCeil };
    }
    /**
     * For a given wanted bitrate, tells if should switch urgently.
     * @param {number} bitrate - The new estimated bitrate.
     * @param {Object|null} currentRepresentation - The Representation being
     * presently being loaded.
     * @param {Array.<Object>} currentRequests - All segment requests by segment's
     * start chronological order
     * @param {Object} playbackInfo - Information on the current playback.
     * @returns {boolean}
     */
    isUrgent(bitrate, currentRepresentation, currentRequests, playbackInfo) {
      if (currentRepresentation === null) {
        return true;
      } else if (bitrate >= currentRepresentation.bitrate) {
        return false;
      }
      return shouldDirectlySwitchToLowBitrate(
        playbackInfo,
        currentRequests,
        this._lowLatencyMode
      );
    }
  };

  // src/core/adaptive/utils/last_estimate_storage.ts
  var LastEstimateStorage = class {
    constructor() {
      this.bandwidth = void 0;
      this.representation = null;
      this.algorithmType = 3 /* None */;
    }
    /**
     * Update this `LastEstimateStorage` with new values.
     * @param {Object} representation - Estimated Representation.
     * @param {number|undefined} bandwidth - Estimated bandwidth.
     * @param {number} algorithmType - The type of algorithm used to produce that
     * estimate.
     */
    update(representation, bandwidth, algorithmType) {
      this.representation = representation;
      this.bandwidth = bandwidth;
      this.algorithmType = algorithmType;
    }
  };

  // src/core/adaptive/guess_based_chooser.ts
  var GuessBasedChooser = class {
    /**
     * Create a new `GuessBasedChooser`.
     * @param {Object} scoreCalculator
     * @param {Object} prevEstimate
     */
    constructor(scoreCalculator, prevEstimate) {
      this._scoreCalculator = scoreCalculator;
      this._lastAbrEstimate = prevEstimate;
      this._consecutiveWrongGuesses = 0;
      this._blockGuessesUntil = 0;
      this._lastMaintanableBitrate = null;
    }
    /**
     * Perform a "guess", which basically indicates which Representation should be
     * chosen according to the `GuessBasedChooser`.
     *
     * @param {Array.<Object>} representations - Array of all Representation the
     * GuessBasedChooser can choose from, sorted by bitrate ascending.
     * /!\ It is very important that Representation in that Array are sorted by
     * bitrate ascending for this method to work as intented.
     * @param {Object} observation - Last playback observation performed.
     * @param {Object} currentRepresentation - The Representation currently
     * loading.
     * @param {number} incomingBestBitrate - The bitrate of the Representation
     * chosen by the more optimistic of the other ABR algorithms currently.
     * @param {Array.<Object>} requests - Information on all pending requests.
     * @returns {Object|null} - If a guess is made, return that guess, else
     * returns `null` (in which case you should fallback to another ABR
     * algorithm).
     */
    getGuess(representations, observation, currentRepresentation, incomingBestBitrate, requests) {
      const { bufferGap, speed } = observation;
      const lastChosenRep = this._lastAbrEstimate.representation;
      if (lastChosenRep === null) {
        return null;
      }
      if (incomingBestBitrate > lastChosenRep.bitrate) {
        if (this._lastAbrEstimate.algorithmType === 2 /* GuessBased */) {
          if (this._lastAbrEstimate.representation !== null) {
            this._lastMaintanableBitrate = this._lastAbrEstimate.representation.bitrate;
          }
          this._consecutiveWrongGuesses = 0;
        }
        return null;
      }
      const scoreData = this._scoreCalculator.getEstimate(currentRepresentation);
      if (this._lastAbrEstimate.algorithmType !== 2 /* GuessBased */) {
        if (scoreData === void 0) {
          return null;
        }
        if (this._canGuessHigher(bufferGap, speed, scoreData)) {
          const nextRepresentation = getNextRepresentation(
            representations,
            currentRepresentation
          );
          if (nextRepresentation !== null) {
            return nextRepresentation;
          }
        }
        return null;
      }
      if (this._isLastGuessValidated(lastChosenRep, incomingBestBitrate, scoreData)) {
        log_default.debug("ABR", "Guessed Representation validated", {
          chosenBitrate: lastChosenRep.bitrate,
          otherAbrAlgosBitrate: incomingBestBitrate,
          scoreData: scoreData == null ? void 0 : scoreData.score,
          scoreConfidence: scoreData == null ? void 0 : scoreData.confidenceLevel
        });
        this._lastMaintanableBitrate = lastChosenRep.bitrate;
        this._consecutiveWrongGuesses = 0;
      }
      if (currentRepresentation.id !== lastChosenRep.id) {
        return lastChosenRep;
      }
      const shouldStopGuess = this._shouldStopGuess(
        currentRepresentation,
        scoreData,
        bufferGap,
        requests
      );
      if (shouldStopGuess) {
        this._consecutiveWrongGuesses++;
        this._blockGuessesUntil = monotonic_timestamp_default() + Math.min(this._consecutiveWrongGuesses * 15e3, 12e4);
        return getPreviousRepresentation(representations, currentRepresentation);
      } else if (scoreData === void 0) {
        return currentRepresentation;
      }
      if (this._canGuessHigher(bufferGap, speed, scoreData)) {
        const nextRepresentation = getNextRepresentation(
          representations,
          currentRepresentation
        );
        if (nextRepresentation !== null) {
          return nextRepresentation;
        }
      }
      return currentRepresentation;
    }
    /**
     * Returns `true` if we've enough confidence on the current situation to make
     * a higher guess.
     * @param {number} bufferGap
     * @param {number} speed
     * @param {Array} scoreData
     * @returns {boolean}
     */
    _canGuessHigher(bufferGap, speed, { score, confidenceLevel }) {
      return isFinite(bufferGap) && bufferGap >= 2.5 && monotonic_timestamp_default() > this._blockGuessesUntil && confidenceLevel === 1 /* HIGH */ && score / speed > 1.01;
    }
    /**
     * Returns `true` if the pending guess of `lastGuess` seems to not
     * be maintainable and as such should be stopped.
     * @param {Object} lastGuess
     * @param {Array} scoreData
     * @param {number} bufferGap
     * @param {Array.<Object>} requests
     * @returns {boolean}
     */
    _shouldStopGuess(lastGuess, scoreData, bufferGap, requests) {
      if (scoreData !== void 0 && scoreData.score < 1.01) {
        return true;
      } else if ((scoreData === void 0 || scoreData.score < 1.2) && bufferGap < 0.6) {
        return true;
      }
      const guessedRepresentationRequests = requests.filter((req) => {
        return req.content.representation.id === lastGuess.id;
      });
      const now = monotonic_timestamp_default();
      for (const req of guessedRepresentationRequests) {
        const requestElapsedTime = now - req.requestTimestamp;
        if (req.content.segment.isInit) {
          if (requestElapsedTime > 1e3) {
            return true;
          }
        } else if (requestElapsedTime > req.content.segment.duration * 1e3 + 200) {
          return true;
        } else {
          const fastBw = estimateRequestBandwidth(req);
          if (fastBw !== void 0 && fastBw < lastGuess.bitrate * 0.8) {
            return true;
          }
        }
      }
      return false;
    }
    _isLastGuessValidated(lastGuess, incomingBestBitrate, scoreData) {
      if (scoreData !== void 0 && scoreData.confidenceLevel === 1 /* HIGH */ && scoreData.score > 1.5) {
        return true;
      }
      return incomingBestBitrate >= lastGuess.bitrate && (this._lastMaintanableBitrate === null || this._lastMaintanableBitrate < lastGuess.bitrate);
    }
  };
  function getNextRepresentation(representations, currentRepresentation) {
    const len = representations.length;
    let index = arrayFindIndex(
      representations,
      ({ id }) => id === currentRepresentation.id
    );
    if (index < 0) {
      log_default.error("ABR", "Current Representation not found.");
      return null;
    }
    while (++index < len) {
      if (representations[index].bitrate > currentRepresentation.bitrate) {
        return representations[index];
      }
    }
    return null;
  }
  function getPreviousRepresentation(representations, currentRepresentation) {
    let index = arrayFindIndex(
      representations,
      ({ id }) => id === currentRepresentation.id
    );
    if (index < 0) {
      log_default.error("ABR", "Current Representation not found.");
      return null;
    }
    while (--index >= 0) {
      if (representations[index].bitrate < currentRepresentation.bitrate) {
        return representations[index];
      }
    }
    return null;
  }

  // src/core/adaptive/utils/bandwidth_estimator.ts
  var BandwidthEstimator = class {
    constructor() {
      const { ABR_FAST_EMA, ABR_SLOW_EMA } = config_default.getCurrent();
      this._fastEWMA = new EWMA(ABR_FAST_EMA);
      this._slowEWMA = new EWMA(ABR_SLOW_EMA);
      this._bytesSampled = 0;
    }
    /**
     * Takes a bandwidth sample.
     * @param {number} durationInMs - The amount of time, in milliseconds, for a
     * particular request.
     * @param {number} numberOfBytes - The total number of bytes transferred in
     * that request.
     */
    addSample(durationInMs, numberOfBytes) {
      const { ABR_MINIMUM_CHUNK_SIZE } = config_default.getCurrent();
      if (numberOfBytes < ABR_MINIMUM_CHUNK_SIZE) {
        return;
      }
      const bandwidth = numberOfBytes * 8e3 / durationInMs;
      const weight = durationInMs / 1e3;
      this._bytesSampled += numberOfBytes;
      this._fastEWMA.addSample(weight, bandwidth);
      this._slowEWMA.addSample(weight, bandwidth);
    }
    /**
     * Get estimate of the bandwidth, in bits per seconds.
     * @returns {Number|undefined}
     */
    getEstimate() {
      const { ABR_MINIMUM_TOTAL_BYTES } = config_default.getCurrent();
      if (this._bytesSampled < ABR_MINIMUM_TOTAL_BYTES) {
        return void 0;
      }
      return Math.min(this._fastEWMA.getEstimate(), this._slowEWMA.getEstimate());
    }
    /** Reset the bandwidth estimation. */
    reset() {
      const { ABR_FAST_EMA, ABR_SLOW_EMA } = config_default.getCurrent();
      this._fastEWMA = new EWMA(ABR_FAST_EMA);
      this._slowEWMA = new EWMA(ABR_SLOW_EMA);
      this._bytesSampled = 0;
    }
  };

  // src/core/adaptive/utils/filter_by_bitrate.ts
  function filterByBitrate(representations, bitrate) {
    if (representations.length === 0) {
      return [];
    }
    representations.sort((ra, rb) => ra.bitrate - rb.bitrate);
    const minimumBitrate = representations[0].bitrate;
    const bitrateCeil = Math.max(bitrate, minimumBitrate);
    const firstSuperiorBitrateIndex = arrayFindIndex(
      representations,
      (representation) => representation.bitrate > bitrateCeil
    );
    if (firstSuperiorBitrateIndex === -1) {
      return representations;
    }
    return representations.slice(0, firstSuperiorBitrateIndex);
  }

  // src/core/adaptive/utils/filter_by_resolution.ts
  function filterByResolution(representations, resolution) {
    if (resolution.width === void 0 || resolution.height === void 0) {
      return representations;
    }
    const width = resolution.width * resolution.pixelRatio;
    const height = resolution.height * resolution.pixelRatio;
    const sortedRepsByWidth = representations.slice().sort((a, b) => {
      var _a2, _b2;
      return ((_a2 = a.width) != null ? _a2 : 0) - ((_b2 = b.width) != null ? _b2 : 0);
    });
    const repWithMaxWidth = arrayFind(
      sortedRepsByWidth,
      (representation) => typeof representation.width === "number" && representation.width >= width && typeof representation.height === "number" && representation.height >= height
    );
    if (repWithMaxWidth === void 0) {
      return representations;
    }
    const maxWidth = typeof repWithMaxWidth.width === "number" ? repWithMaxWidth.width : 0;
    return representations.filter(
      (representation) => typeof representation.width === "number" ? representation.width <= maxWidth : true
    );
  }

  // src/core/adaptive/utils/pending_requests_store.ts
  var PendingRequestsStore = class {
    constructor() {
      this._currentRequests = {};
    }
    /**
     * Add information about a new pending request.
     * @param {Object} payload
     */
    add(payload) {
      const { id, requestTimestamp, content } = payload;
      this._currentRequests[id] = { requestTimestamp, progress: [], content };
    }
    /**
     * Notify of the progress of a currently pending request.
     * @param {Object} progress
     */
    addProgress(progress) {
      const request2 = this._currentRequests[progress.id];
      if (isNullOrUndefined(request2)) {
        if (define_ENVIRONMENT_default.CURRENT_ENV === define_ENVIRONMENT_default.DEV) {
          throw new Error("ABR: progress for a request not added");
        }
        log_default.warn("ABR", "progress for a request not added", { requestId: progress.id });
        return;
      }
      request2.progress.push(progress);
    }
    /**
     * Remove a request previously set as pending.
     * @param {string} id
     */
    remove(id) {
      if (isNullOrUndefined(this._currentRequests[id])) {
        if (define_ENVIRONMENT_default.CURRENT_ENV === define_ENVIRONMENT_default.DEV) {
          throw new Error("ABR: can't remove unknown request");
        }
        log_default.warn("ABR", "can't remove unknown request", { requestId: id });
      }
      delete this._currentRequests[id];
    }
    /**
     * Returns information about all pending requests, in segment's chronological
     * order.
     * @returns {Array.<Object>}
     */
    getRequests() {
      return object_values_default(this._currentRequests).filter((x) => !isNullOrUndefined(x)).sort((reqA, reqB) => reqA.content.segment.time - reqB.content.segment.time);
    }
  };

  // src/core/adaptive/utils/select_optimal_representation.ts
  function selectOptimalRepresentation(representations, wantedBitrate) {
    const firstIndexTooHigh = arrayFindIndex(
      representations,
      (representation) => representation.bitrate > wantedBitrate
    );
    if (firstIndexTooHigh === -1) {
      return representations[representations.length - 1];
    } else if (firstIndexTooHigh === 0) {
      return representations[0];
    }
    return representations[firstIndexTooHigh - 1];
  }

  // src/core/adaptive/adaptive_representation_selector.ts
  var limitResolutionDefaultRef = new reference_default(
    void 0
  );
  limitResolutionDefaultRef.finish();
  var throttleBitrateDefaultRef = new reference_default(Infinity);
  throttleBitrateDefaultRef.finish();
  function createAdaptiveRepresentationSelector(options) {
    const bandwidthEstimators = {};
    const { initialBitrates, throttlers, lowLatencyMode } = options;
    return function getEstimates(context, currentRepresentation, representations, playbackObserver, stopAllEstimates) {
      var _a2, _b2, _c2;
      const { type } = context.adaptation;
      const bandwidthEstimator = _getBandwidthEstimator(type);
      const initialBitrate = (_a2 = initialBitrates[type]) != null ? _a2 : 0;
      const filters = {
        limitResolution: (_b2 = throttlers.limitResolution[type]) != null ? _b2 : limitResolutionDefaultRef,
        throttleBitrate: (_c2 = throttlers.throttleBitrate[type]) != null ? _c2 : throttleBitrateDefaultRef
      };
      return getEstimateReference(
        {
          bandwidthEstimator,
          context,
          currentRepresentation,
          filters,
          initialBitrate,
          playbackObserver,
          representations,
          lowLatencyMode
        },
        stopAllEstimates
      );
    };
    function _getBandwidthEstimator(bufferType) {
      const originalBandwidthEstimator = bandwidthEstimators[bufferType];
      if (isNullOrUndefined(originalBandwidthEstimator)) {
        log_default.debug("ABR", "Creating new BandwidthEstimator", { bufferType });
        const bandwidthEstimator = new BandwidthEstimator();
        bandwidthEstimators[bufferType] = bandwidthEstimator;
        return bandwidthEstimator;
      }
      return originalBandwidthEstimator;
    }
  }
  function getEstimateReference({
    bandwidthEstimator,
    context,
    currentRepresentation,
    filters,
    initialBitrate,
    lowLatencyMode,
    playbackObserver,
    representations: representationsRef
  }, stopAllEstimates) {
    const scoreCalculator = new RepresentationScoreCalculator();
    const networkAnalyzer = new NetworkAnalyzer(initialBitrate != null ? initialBitrate : 0, lowLatencyMode);
    const requestsStore = new PendingRequestsStore();
    let onAddedSegment = noop_default;
    const callbacks = {
      metrics: onMetric,
      requestBegin: onRequestBegin,
      requestProgress: onRequestProgress,
      requestEnd: onRequestEnd,
      addedSegment(val) {
        onAddedSegment(val);
      }
    };
    let currentEstimatesCanceller = new TaskCanceller("ABR " + context.adaptation.type);
    currentEstimatesCanceller.linkToSignal(stopAllEstimates);
    const estimateRef = createEstimateReference(
      representationsRef.getValue(),
      currentEstimatesCanceller.signal
    );
    representationsRef.onUpdate(restartEstimatesProductionFromCurrentConditions, {
      clearSignal: stopAllEstimates
    });
    return { estimates: estimateRef, callbacks };
    function createEstimateReference(unsortedRepresentations, innerCancellationSignal) {
      if (unsortedRepresentations.length <= 1) {
        return new reference_default({
          bitrate: void 0,
          representation: unsortedRepresentations[0],
          urgent: true,
          knownStableBitrate: void 0
        });
      }
      let allowBufferBasedEstimates = false;
      const sortedRepresentations = unsortedRepresentations.sort(
        (ra, rb) => ra.bitrate - rb.bitrate
      );
      const bufferBasedChooser = new BufferBasedChooser(
        sortedRepresentations.map((r) => r.bitrate)
      );
      const prevEstimate = new LastEstimateStorage();
      const guessBasedChooser = new GuessBasedChooser(scoreCalculator, prevEstimate);
      let lastPlaybackObservation = playbackObserver.getReference().getValue();
      const innerEstimateRef = new reference_default(getCurrentEstimate());
      playbackObserver.listen(
        (obs) => {
          lastPlaybackObservation = obs;
          updateEstimate();
        },
        { includeLastObservation: false, clearSignal: innerCancellationSignal }
      );
      onAddedSegment = function(val) {
        if (lastPlaybackObservation === null) {
          return;
        }
        const { position, speed } = lastPlaybackObservation;
        const timeRanges = val.buffered;
        const bufferGap = getLeftSizeOfRange(timeRanges, position.getWanted());
        const { representation } = val.content;
        const currentScore = scoreCalculator.getEstimate(representation);
        const currentBitrate = representation.bitrate;
        const observation = { bufferGap, currentBitrate, currentScore, speed };
        bufferBasedChooser.onAddedSegment(observation);
        updateEstimate();
      };
      innerCancellationSignal.register(() => {
        onAddedSegment = noop_default;
      });
      filters.throttleBitrate.onUpdate(updateEstimate, {
        clearSignal: innerCancellationSignal
      });
      filters.limitResolution.onUpdate(updateEstimate, {
        clearSignal: innerCancellationSignal
      });
      return innerEstimateRef;
      function updateEstimate() {
        innerEstimateRef.setValue(getCurrentEstimate());
      }
      function getCurrentEstimate() {
        const { bufferGap, position, maximumPosition } = lastPlaybackObservation;
        const resolutionLimit = filters.limitResolution.getValue();
        const bitrateThrottle = filters.throttleBitrate.getValue();
        const currentRepresentationVal = currentRepresentation.getValue();
        const filteredReps = getFilteredRepresentations(
          sortedRepresentations,
          resolutionLimit,
          bitrateThrottle
        );
        const requests = requestsStore.getRequests();
        const { bandwidthEstimate, bitrateChosen } = networkAnalyzer.getBandwidthEstimate(
          lastPlaybackObservation,
          bandwidthEstimator,
          currentRepresentationVal,
          requests,
          prevEstimate.bandwidth
        );
        const stableRepresentation = scoreCalculator.getLastStableRepresentation();
        const knownStableBitrate = stableRepresentation === null ? void 0 : stableRepresentation.bitrate / (lastPlaybackObservation.speed > 0 ? lastPlaybackObservation.speed : 1);
        const { ABR_ENTER_BUFFER_BASED_ALGO, ABR_EXIT_BUFFER_BASED_ALGO } = config_default.getCurrent();
        if (allowBufferBasedEstimates && bufferGap <= ABR_EXIT_BUFFER_BASED_ALGO) {
          allowBufferBasedEstimates = false;
        } else if (!allowBufferBasedEstimates && isFinite(bufferGap) && bufferGap >= ABR_ENTER_BUFFER_BASED_ALGO) {
          allowBufferBasedEstimates = true;
        }
        const chosenRepFromBandwidth = selectOptimalRepresentation(
          filteredReps,
          bitrateChosen
        );
        const currentBufferBasedEstimate = bufferBasedChooser.getLastEstimate();
        let currentBestBitrate = chosenRepFromBandwidth.bitrate;
        let chosenRepFromBufferSize = null;
        if (allowBufferBasedEstimates && currentBufferBasedEstimate !== void 0 && currentBufferBasedEstimate > currentBestBitrate) {
          chosenRepFromBufferSize = selectOptimalRepresentation(
            filteredReps,
            currentBufferBasedEstimate
          );
          currentBestBitrate = chosenRepFromBufferSize.bitrate;
        }
        let chosenRepFromGuessMode = null;
        if (lowLatencyMode && currentRepresentationVal !== null && context.manifest.isDynamic && maximumPosition - position.getWanted() < 40) {
          chosenRepFromGuessMode = guessBasedChooser.getGuess(
            sortedRepresentations,
            lastPlaybackObservation,
            currentRepresentationVal,
            currentBestBitrate,
            requests
          );
        }
        if (chosenRepFromGuessMode !== null && chosenRepFromGuessMode.bitrate > currentBestBitrate) {
          log_default.debug("ABR", "new guess-based estimate", {
            bitrate: chosenRepFromGuessMode.bitrate,
            representation: chosenRepFromGuessMode.id
          });
          prevEstimate.update(
            chosenRepFromGuessMode,
            bandwidthEstimate,
            2 /* GuessBased */
          );
          return {
            bitrate: bandwidthEstimate,
            representation: chosenRepFromGuessMode,
            urgent: currentRepresentationVal === null || chosenRepFromGuessMode.bitrate < currentRepresentationVal.bitrate,
            knownStableBitrate
          };
        } else if (chosenRepFromBufferSize !== null) {
          log_default.debug("ABR", "new buffer-based estimate", {
            bitrate: chosenRepFromBufferSize.bitrate,
            representation: chosenRepFromBufferSize.id
          });
          prevEstimate.update(
            chosenRepFromBufferSize,
            bandwidthEstimate,
            0 /* BufferBased */
          );
          return {
            bitrate: bandwidthEstimate,
            representation: chosenRepFromBufferSize,
            urgent: networkAnalyzer.isUrgent(
              chosenRepFromBufferSize.bitrate,
              currentRepresentationVal,
              requests,
              lastPlaybackObservation
            ),
            knownStableBitrate
          };
        } else {
          log_default.debug("ABR", "new bandwidth estimate", {
            bitrate: chosenRepFromBandwidth.bitrate,
            representation: chosenRepFromBandwidth.id
          });
          prevEstimate.update(
            chosenRepFromBandwidth,
            bandwidthEstimate,
            1 /* BandwidthBased */
          );
          return {
            bitrate: bandwidthEstimate,
            representation: chosenRepFromBandwidth,
            urgent: networkAnalyzer.isUrgent(
              chosenRepFromBandwidth.bitrate,
              currentRepresentationVal,
              requests,
              lastPlaybackObservation
            ),
            knownStableBitrate
          };
        }
      }
    }
    function restartEstimatesProductionFromCurrentConditions() {
      const representations = representationsRef.getValue();
      currentEstimatesCanceller.cancel("restart");
      currentEstimatesCanceller = new TaskCanceller("ABR " + context.adaptation.type);
      currentEstimatesCanceller.linkToSignal(stopAllEstimates);
      const newRef = createEstimateReference(
        representations,
        currentEstimatesCanceller.signal
      );
      newRef.onUpdate(
        function onNewEstimate(newEstimate) {
          estimateRef.setValue(newEstimate);
        },
        { clearSignal: currentEstimatesCanceller.signal, emitCurrentValue: true }
      );
    }
    function onMetric(value) {
      const { requestDuration, segmentDuration, size, content } = value;
      bandwidthEstimator.addSample(requestDuration, size);
      if (!content.segment.isInit) {
        const { segment, representation } = content;
        if (segmentDuration === void 0 && !segment.complete) {
          return;
        }
        const segDur = segmentDuration != null ? segmentDuration : segment.duration;
        scoreCalculator.addSample(representation, requestDuration / 1e3, segDur);
      }
    }
    function onRequestBegin(val) {
      requestsStore.add(val);
    }
    function onRequestProgress(val) {
      requestsStore.addProgress(val);
    }
    function onRequestEnd(val) {
      requestsStore.remove(val.id);
    }
  }
  function getFilteredRepresentations(representations, resolutionLimit, bitrateThrottle) {
    let filteredReps = representations;
    if (bitrateThrottle !== void 0 && bitrateThrottle < Infinity) {
      filteredReps = filterByBitrate(filteredReps, bitrateThrottle);
    }
    if (resolutionLimit !== void 0) {
      filteredReps = filterByResolution(filteredReps, resolutionLimit);
    }
    return filteredReps;
  }

  // src/core/adaptive/index.ts
  var adaptive_default = createAdaptiveRepresentationSelector;

  // src/utils/create_uuid.ts
  function createUuid() {
    var _a2;
    if (typeof ((_a2 = global_scope_default.crypto) == null ? void 0 : _a2.randomUUID) === "function") {
      return global_scope_default.crypto.randomUUID();
    }
    let ts1 = (/* @__PURE__ */ new Date()).getTime();
    let ts2 = monotonic_timestamp_default();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      let r = Math.random() * 16;
      if (ts1 > 0) {
        r = (ts1 + r) % 16 | 0;
        ts1 = Math.floor(ts1 / 16);
      } else {
        r = (ts2 + r) % 16 | 0;
        ts2 = Math.floor(ts2 / 16);
      }
      return (c === "x" ? r : r & 3 | 8).toString(16);
    });
  }

  // src/utils/url-utils.ts
  var schemeRe = /^(?:[a-z]+:)?\/\//i;
  var urlComponentRegex = /^(?:([^:/?#]+):)?(?:\/\/([^/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/;
  function getFilenameIndexInUrl(url) {
    const indexOfLastSlash = url.lastIndexOf("/");
    if (indexOfLastSlash < 0) {
      return url.length;
    }
    if (schemeRe.test(url)) {
      const firstSlashIndex = url.indexOf("/");
      if (firstSlashIndex >= 0 && indexOfLastSlash === firstSlashIndex + 1) {
        return url.length;
      }
    }
    const indexOfQuestionMark = url.indexOf("?");
    if (indexOfQuestionMark >= 0 && indexOfQuestionMark < indexOfLastSlash) {
      return getFilenameIndexInUrl(url.substring(0, indexOfQuestionMark));
    }
    return indexOfLastSlash + 1;
  }
  function getRelativeUrl(baseUrl, newUrl) {
    const baseParts = parseURL(baseUrl);
    const newParts = parseURL(newUrl);
    if (baseParts.scheme !== newParts.scheme || baseParts.authority !== newParts.authority) {
      return null;
    }
    if (
      // if base and new path are mixed between absolute and relative path, return null
      baseParts.path[0] !== void 0 && baseParts.path[0] !== "/" && newParts.path[0] === "/" || newParts.path[0] !== void 0 && newParts.path[0] !== "/" && baseParts.path[0] === "/"
    ) {
      return null;
    }
    const baseNormalizedPath = removeDotSegment(baseParts.path);
    const newNormalizedPath = removeDotSegment(newParts.path);
    let relativePath;
    if (baseNormalizedPath === newNormalizedPath) {
      relativePath = "";
    } else {
      const basePathSplitted = baseNormalizedPath.split("/");
      basePathSplitted.pop();
      const newPathSplitted = newNormalizedPath.split("/");
      while (basePathSplitted.length > 0 && newPathSplitted.length > 0 && basePathSplitted[0] === newPathSplitted[0]) {
        basePathSplitted.shift();
        newPathSplitted.shift();
      }
      while (basePathSplitted.length > 0) {
        basePathSplitted.shift();
        newPathSplitted.unshift("..");
      }
      let pathJoined = newPathSplitted.join("/");
      if (pathJoined.endsWith("../") || pathJoined.endsWith("./")) {
        pathJoined = pathJoined.slice(0, pathJoined.length - 1);
      }
      relativePath = pathJoined === "" ? "." : pathJoined;
    }
    let result = relativePath;
    if (relativePath === "" && newParts.query === baseParts.query) {
    } else if (isNonEmptyString(newParts.query)) {
      result += "?";
      result += newParts.query;
    }
    if (isNonEmptyString(newParts.fragment)) {
      result += "#";
      result += newParts.fragment;
    }
    return result;
  }
  function _resolveURL(base, relative) {
    const baseParts = parseURL(base);
    const relativeParts = parseURL(relative);
    if (isNonEmptyString(relativeParts.scheme)) {
      return formatURL(relativeParts);
    }
    const target = {
      scheme: baseParts.scheme,
      authority: baseParts.authority,
      path: "",
      query: relativeParts.query,
      fragment: relativeParts.fragment
    };
    if (isNonEmptyString(relativeParts.authority)) {
      target.authority = relativeParts.authority;
      target.path = removeDotSegment(relativeParts.path);
      return formatURL(target);
    }
    if (relativeParts.path === "") {
      target.path = baseParts.path;
      if (!isNonEmptyString(relativeParts.query)) {
        target.query = baseParts.query;
      }
    } else {
      if (startsWith(relativeParts.path, "/")) {
        target.path = removeDotSegment(relativeParts.path);
      } else {
        target.path = removeDotSegment(mergePaths(baseParts, relativeParts.path));
      }
    }
    return formatURL(target);
  }
  var parsedUrlCache = /* @__PURE__ */ new Map();
  var MAX_URL_CACHE_ENTRIES = 200;
  function parseURL(url) {
    var _a2, _b2, _c2, _d2, _e2;
    if (parsedUrlCache.has(url)) {
      return parsedUrlCache.get(url);
    }
    const matches = url.match(urlComponentRegex);
    let parsed;
    if (matches === null) {
      parsed = {
        scheme: "",
        authority: "",
        path: "",
        query: "",
        fragment: ""
      };
    } else {
      parsed = {
        scheme: (_a2 = matches[1]) != null ? _a2 : "",
        authority: (_b2 = matches[2]) != null ? _b2 : "",
        path: (_c2 = matches[3]) != null ? _c2 : "",
        query: (_d2 = matches[4]) != null ? _d2 : "",
        fragment: (_e2 = matches[5]) != null ? _e2 : ""
      };
    }
    if (parsedUrlCache.size >= MAX_URL_CACHE_ENTRIES) {
      parsedUrlCache.clear();
    }
    parsedUrlCache.set(url, parsed);
    return parsed;
  }
  function formatURL(parts) {
    let url = "";
    if (isNonEmptyString(parts.scheme)) {
      url += parts.scheme + ":";
    }
    if (isNonEmptyString(parts.authority)) {
      url += "//" + parts.authority;
    }
    url += parts.path;
    if (isNonEmptyString(parts.query)) {
      url += "?" + parts.query;
    }
    if (isNonEmptyString(parts.fragment)) {
      url += "#" + parts.fragment;
    }
    return url;
  }
  function removeDotSegment(path) {
    const segments = path.split(/(?=\/)/);
    const output = [];
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (segment === ".." || segment === "." || segment === "") {
        continue;
      }
      if (segment === "/..") {
        output.pop();
        if (i === segments.length - 1) {
          output.push("/");
        }
        continue;
      }
      if (segment === "/.") {
        if (i === segments.length - 1) {
          output.push("/");
        }
        continue;
      }
      output.push(segment);
    }
    return output.join("");
  }
  function mergePaths(baseParts, relativePath) {
    if (isNonEmptyString(baseParts.authority) && baseParts.path === "") {
      return "/" + relativePath;
    }
    const basePath = baseParts.path;
    return basePath.substring(0, basePath.lastIndexOf("/") + 1) + relativePath;
  }
  function resolveURL(...args) {
    var _a2, _b2, _c2;
    const filteredArgs = args.filter((val) => val !== "");
    const len = filteredArgs.length;
    if (len === 0) {
      return "";
    }
    if (len === 1) {
      return (_a2 = filteredArgs[0]) != null ? _a2 : "";
    } else {
      const basePart = (_b2 = filteredArgs[0]) != null ? _b2 : "";
      const relativeParts = (_c2 = filteredArgs[1]) != null ? _c2 : "";
      const resolvedURL = _resolveURL(basePart, relativeParts);
      const remainingArgs = filteredArgs.slice(2);
      return resolveURL(resolvedURL, ...remainingArgs);
    }
  }

  // src/core/cmcd/cmcd_data_builder.ts
  var RTP_FACTOR = 4;
  var CmcdDataBuilder = class {
    /**
     * Create a new `CmcdDataBuilder`, linked to the given options (see type
     * definition).
     * @param {Object} options
     */
    constructor(options) {
      var _a2, _b2;
      this._sessionId = (_a2 = options.sessionId) != null ? _a2 : createUuid();
      this._contentId = (_b2 = options.contentId) != null ? _b2 : createUuid();
      this._typePreference = options.communicationType === "headers" ? 0 /* Headers */ : 1 /* QueryString */;
      this._bufferStarvationToggle = false;
      this._playbackObserver = null;
      this._lastThroughput = {};
      this._canceller = null;
    }
    /**
     * Start listening to the given `playbackObserver` so the `CmcdDataBuilder`
     * can extract some playback-linked metadata that it needs.
     *
     * It will keep listening for media data until `stopMonitoringPlayback` is called.
     *
     * If `startMonitoringPlayback` is called again, the previous monitoring is
     * also cancelled.
     * @param {Object} playbackObserver
     */
    startMonitoringPlayback(playbackObserver) {
      var _a2;
      (_a2 = this._canceller) == null ? void 0 : _a2.cancel("CmcdDataBuilder start");
      this._canceller = new TaskCanceller("CMCD monitoring");
      this._playbackObserver = playbackObserver;
      playbackObserver.listen(
        (obs) => {
          if (obs.rebuffering !== null) {
            this._bufferStarvationToggle = true;
          }
        },
        { includeLastObservation: true, clearSignal: this._canceller.signal }
      );
    }
    /**
     * Stop the monitoring of playback conditions started from the last
     * `stopMonitoringPlayback` call.
     */
    stopMonitoringPlayback() {
      var _a2;
      (_a2 = this._canceller) == null ? void 0 : _a2.cancel("CmcdDataBuilder stop");
      this._canceller = null;
      this._playbackObserver = null;
    }
    /**
     * Update the last measured throughput for a specific media type.
     * Needed for some of CMCD's properties.
     * @param {string} trackType
     * @param {number|undefined} throughput - Last throughput measured for that
     * media type. `undefined` if unknown.
     */
    updateThroughput(trackType, throughput) {
      this._lastThroughput[trackType] = throughput;
    }
    /**
     * Returns the base of data that is common to all resources' requests.
     * @param {number|undefined} lastThroughput - The last measured throughput to
     * provide. `undefined` to provide no throughput.
     * @returns {Object}
     */
    _getCommonCmcdData(lastThroughput) {
      var _a2;
      const props = {};
      props.bs = this._bufferStarvationToggle;
      this._bufferStarvationToggle = false;
      props.cid = this._contentId;
      props.mtp = lastThroughput !== void 0 ? Math.floor(Math.round(lastThroughput / 1e3 / 100) * 100) : void 0;
      props.sid = this._sessionId;
      const lastObservation = (_a2 = this._playbackObserver) == null ? void 0 : _a2.getReference().getValue();
      props.pr = lastObservation === void 0 || lastObservation.speed === 1 ? void 0 : lastObservation.speed;
      if (lastObservation !== void 0) {
        props.su = lastObservation.rebuffering !== null;
      }
      return props;
    }
    /**
     * For the given type of Manifest, returns the corresponding CMCD payload
     * that should be provided alongside its request.
     * @param {string} transportType
     * @returns {Object}
     */
    getCmcdDataForManifest(transportType) {
      var _a2;
      const props = this._getCommonCmcdData(
        (_a2 = this._lastThroughput.video) != null ? _a2 : this._lastThroughput.audio
      );
      props.ot = "m";
      switch (transportType) {
        case "dash":
          props.sf = "d";
          break;
        case "smooth":
          props.sf = "s";
          break;
        default:
          props.sf = "o";
          break;
      }
      return this._producePayload(props);
    }
    /**
     * For the given segment information, returns the corresponding CMCD payload
     * that should be provided alongside its request.
     * @param {Object} content
     * @returns {Object}
     */
    getCmcdDataForSegmentRequest(content) {
      var _a2, _b2, _c2, _d2;
      const lastObservation = (_a2 = this._playbackObserver) == null ? void 0 : _a2.getReference().getValue();
      const props = this._getCommonCmcdData(this._lastThroughput[content.adaptation.type]);
      props.br = Math.round(content.representation.bitrate / 1e3);
      props.d = Math.round(content.segment.duration * 1e3);
      switch (content.adaptation.type) {
        case "video":
          props.ot = "v";
          break;
        case "audio":
          props.ot = "a";
          break;
        case "text":
          props.ot = "c";
          break;
      }
      if (content.segment.isInit) {
        props.ot = "i";
      }
      if (!isNullOrUndefined(content.nextSegment) && content.segment.url !== null && content.nextSegment.url !== null) {
        if (!content.nextSegment.isInit || content.nextSegment.indexRange === void 0) {
          const currSegmentUrl = content.segment.url;
          const nextSegmentUrl = content.nextSegment.url;
          const relativeUrl = getRelativeUrl(currSegmentUrl, nextSegmentUrl);
          if (relativeUrl !== null) {
            if (relativeUrl !== ".") {
              props.nor = encodeURIComponent(relativeUrl);
            }
            if (content.nextSegment.range !== void 0) {
              props.nrr = String(content.nextSegment.range[0]) + "-";
              if (isFinite(content.nextSegment.range[1])) {
                props.nrr += String(content.nextSegment.range[1]);
              }
            }
          }
        }
      }
      let precizeBufferLengthMs;
      if (lastObservation !== void 0 && (props.ot === "v" || props.ot === "a" || props.ot === "av")) {
        const bufferedForType = lastObservation.buffered[content.adaptation.type];
        if (!isNullOrUndefined(bufferedForType)) {
          const position = (_d2 = (_c2 = (_b2 = this._playbackObserver) == null ? void 0 : _b2.getCurrentTime()) != null ? _c2 : lastObservation.position.getWanted()) != null ? _d2 : lastObservation.position.getPolled();
          for (const range of bufferedForType) {
            if (position >= range.start && position < range.end) {
              precizeBufferLengthMs = (range.end - position) * 1e3;
              props.bl = Math.floor(Math.round(precizeBufferLengthMs / 100) * 100);
              break;
            }
          }
        }
      }
      const precizeDeadlineMs = precizeBufferLengthMs === void 0 || lastObservation === void 0 ? void 0 : precizeBufferLengthMs / lastObservation.speed;
      props.dl = precizeDeadlineMs === void 0 ? void 0 : Math.floor(Math.round(precizeDeadlineMs / 100) * 100);
      if (precizeDeadlineMs !== void 0) {
        const estimatedFileSizeKb = content.representation.bitrate * content.segment.duration / 1e3;
        const wantedCeilBandwidthKbps = estimatedFileSizeKb / (precizeDeadlineMs / 1e3);
        props.rtp = Math.floor(
          Math.round(wantedCeilBandwidthKbps * RTP_FACTOR / 100) * 100
        );
      }
      switch (content.manifest.transport) {
        case "dash":
          props.sf = "d";
          break;
        case "smooth":
          props.sf = "s";
          break;
        default:
          props.sf = "o";
          break;
      }
      props.st = content.manifest.isDynamic ? "l" : "v";
      props.tb = content.adaptation.representations.reduce(
        (acc, representation) => {
          if (representation.isPlayable() !== true) {
            return acc;
          }
          if (acc === void 0) {
            return Math.round(representation.bitrate / 1e3);
          }
          return Math.max(acc, Math.round(representation.bitrate / 1e3));
        },
        void 0
      );
      return this._producePayload(props);
    }
    /**
     * From the given CMCD properties, produce the corresponding payload according
     * to current settings.
     * @param {Object} props
     * @returns {Object}
     */
    _producePayload(props) {
      const headers = {
        object: "",
        request: "",
        session: "",
        status: ""
      };
      let queryStringPayload = "";
      const addPayload = (payload, headerName) => {
        if (this._typePreference === 0 /* Headers */) {
          headers[headerName] += payload;
        } else {
          queryStringPayload += payload;
        }
      };
      const addNumberProperty = (prop, headerName) => {
        const val = props[prop];
        if (val !== void 0) {
          const toAdd = `${prop}=${String(val)},`;
          addPayload(toAdd, headerName);
        }
      };
      const addBooleanProperty = (prop, headerName) => {
        if (props[prop] === true) {
          const toAdd = `${prop},`;
          addPayload(toAdd, headerName);
        }
      };
      const addStringProperty = (prop, headerName) => {
        const val = props[prop];
        if (val !== void 0) {
          const formatted = `"${val.replace("\\", "\\\\").replace('"', '\\"')}"`;
          const toAdd = `prop=${formatted},`;
          addPayload(toAdd, headerName);
        }
      };
      const addTokenProperty = (prop, headerName) => {
        const val = props[prop];
        if (val !== void 0) {
          const toAdd = `prop=${val},`;
          addPayload(toAdd, headerName);
        }
      };
      addNumberProperty("bl", "request");
      addNumberProperty("br", "object");
      addBooleanProperty("bs", "status");
      addStringProperty("cid", "session");
      addNumberProperty("d", "object");
      addNumberProperty("dl", "request");
      addNumberProperty("mtp", "request");
      addStringProperty("nor", "request");
      addStringProperty("nrr", "request");
      addTokenProperty("ot", "object");
      addNumberProperty("pr", "session");
      addNumberProperty("rtp", "status");
      addTokenProperty("sf", "session");
      addStringProperty("sid", "session");
      addTokenProperty("st", "session");
      addBooleanProperty("su", "request");
      addNumberProperty("tb", "object");
      if (this._typePreference === 0 /* Headers */) {
        if (headers.object[headers.object.length - 1] === ",") {
          headers.object = headers.object.substring(0, headers.object.length - 1);
        }
        if (headers.request[headers.request.length - 1] === ",") {
          headers.request = headers.request.substring(0, headers.request.length - 1);
        }
        if (headers.session[headers.session.length - 1] === ",") {
          headers.session = headers.session.substring(0, headers.session.length - 1);
        }
        if (headers.status[headers.status.length - 1] === ",") {
          headers.status = headers.status.substring(0, headers.status.length - 1);
        }
        log_default.debug("CMCD", "proposing headers payload");
        return {
          type: "headers",
          value: {
            /* eslint-disable @typescript-eslint/naming-convention */
            "CMCD-Object": headers.object,
            "CMCD-Request": headers.request,
            "CMCD-Session": headers.session,
            "CMCD-Status": headers.status
            /* eslint-enable @typescript-eslint/naming-convention */
          }
        };
      }
      if (queryStringPayload[queryStringPayload.length - 1] === ",") {
        queryStringPayload = queryStringPayload.substring(0, queryStringPayload.length - 1);
      }
      queryStringPayload = encodeURIComponent(queryStringPayload);
      log_default.debug("CMCD", "proposing query string payload", {
        queryString: queryStringPayload
      });
      return {
        type: "query",
        value: [["CMCD", queryStringPayload]]
      };
    }
  };

  // src/core/cmcd/index.ts
  var cmcd_default = CmcdDataBuilder;

  // src/core/fetchers/cdn_prioritizer.ts
  var CdnPrioritizer = class extends EventEmitter {
    /**
     * @param {Object} destroySignal
     */
    constructor(destroySignal) {
      super();
      this._downgradedCdnList = { metadata: [], timeouts: [] };
      destroySignal.register(() => {
        for (const timeout of this._downgradedCdnList.timeouts) {
          clearTimeout(timeout);
        }
        this._downgradedCdnList = { metadata: [], timeouts: [] };
      });
    }
    /**
     * From the list of __ALL__ CDNs available to a resource, return them in the
     * order in which requests should be performed.
     *
     * Note: It is VERY important to include all CDN that are able to reach the
     * wanted resource, even those which will in the end not be used anyway.
     * If some CDN are not communicated, the `CdnPrioritizer` might wrongly
     * consider that the current resource don't have any of the CDN prioritized
     * internally and return other CDN which should have been forbidden if it knew
     * about the other, non-used, ones.
     *
     * @param {Array.<string>} everyCdnForResource - Array of ALL available CDN
     * able to reach the wanted resource - even those which might not be used in
     * the end.
     * @returns {Array.<Object>} - Array of CDN that can be tried to reach the
     * resource, sorted by order of CDN preference, according to the
     * `CdnPrioritizer`'s own list of priorities.
     */
    getCdnPreferenceForResource(everyCdnForResource) {
      if (everyCdnForResource.length <= 1) {
        return everyCdnForResource;
      }
      return this._innerGetCdnPreferenceForResource(everyCdnForResource);
    }
    /**
     * Limit usage of the CDN for a configured amount of time.
     * Call this method if you encountered an issue with that CDN which leads you
     * to want to prevent its usage currently.
     *
     * Note that the CDN can still be the preferred one if no other CDN exist for
     * a wanted resource.
     * @param {string} metadata
     */
    downgradeCdn(metadata) {
      const indexOf = indexOfMetadata(this._downgradedCdnList.metadata, metadata);
      if (indexOf >= 0) {
        this._removeIndexFromDowngradeList(indexOf);
      }
      const { DEFAULT_CDN_DOWNGRADE_TIME } = config_default.getCurrent();
      const downgradeTime = DEFAULT_CDN_DOWNGRADE_TIME;
      this._downgradedCdnList.metadata.push(metadata);
      const timeout = setTimeout(() => {
        const newIndex = indexOfMetadata(this._downgradedCdnList.metadata, metadata);
        if (newIndex >= 0) {
          this._removeIndexFromDowngradeList(newIndex);
        }
        this.trigger("priorityChange", null);
      }, downgradeTime);
      this._downgradedCdnList.timeouts.push(timeout);
      this.trigger("priorityChange", null);
    }
    /**
     * From the list of __ALL__ CDNs available to a resource, return them in the
     * order in which requests should be performed.
     *
     * Note: It is VERY important to include all CDN that are able to reach the
     * wanted resource, even those which will in the end not be used anyway.
     * If some CDN are not communicated, the `CdnPrioritizer` might wrongly
     * consider that the current resource don't have any of the CDN prioritized
     * internally and return other CDN which should have been forbidden if it knew
     * about the other, non-used, ones.
     *
     * @param {Array.<string>} everyCdnForResource - Array of ALL available CDN
     * able to reach the wanted resource - even those which might not be used in
     * the end.
     * @returns {Array.<string>} - Array of CDN that can be tried to reach the
     * resource, sorted by order of CDN preference, according to the
     * `CdnPrioritizer`'s own list of priorities.
     */
    _innerGetCdnPreferenceForResource(everyCdnForResource) {
      const [allowedInOrder, downgradedInOrder] = everyCdnForResource.reduce(
        (acc, elt) => {
          if (this._downgradedCdnList.metadata.some(
            (c) => c.id === elt.id && c.baseUrl === elt.baseUrl
          )) {
            acc[1].push(elt);
          } else {
            acc[0].push(elt);
          }
          return acc;
        },
        [[], []]
      );
      return allowedInOrder.concat(downgradedInOrder);
    }
    /**
     * @param {number} index
     */
    _removeIndexFromDowngradeList(index) {
      this._downgradedCdnList.metadata.splice(index, 1);
      const oldTimeout = this._downgradedCdnList.timeouts.splice(index, 1);
      clearTimeout(oldTimeout[0]);
    }
  };
  function indexOfMetadata(arr, elt) {
    if (arr.length === 0) {
      return -1;
    }
    return elt.id !== void 0 ? arrayFindIndex(arr, (m) => m.id === elt.id) : arrayFindIndex(arr, (m) => m.baseUrl === elt.baseUrl);
  }

  // src/core/fetchers/utils/error_selector.ts
  function errorSelector(error) {
    if (error instanceof RequestError) {
      return new NetworkError("PIPELINE_LOAD_ERROR", error);
    }
    return formatError(error, {
      defaultCode: "PIPELINE_LOAD_ERROR",
      defaultReason: "Unknown error when fetching the Manifest"
    });
  }

  // src/core/fetchers/utils/schedule_request.ts
  function shouldRetry(error) {
    if (error instanceof RequestError) {
      if (error.type === NetworkErrorTypes.ERROR_HTTP_CODE) {
        return error.status >= 500 || error.status === 404 || error.status === 415 || // some CDN seems to use that code when
        // requesting low-latency segments too much
        // in advance
        error.status === 412;
      }
      return error.type === NetworkErrorTypes.TIMEOUT || error.type === NetworkErrorTypes.ERROR_EVENT;
    } else if (error instanceof CustomLoaderError) {
      if (typeof error.canRetry === "boolean") {
        return error.canRetry;
      }
      if (error.xhr !== void 0) {
        return error.xhr.status >= 500 || error.xhr.status === 404 || error.xhr.status === 415 || // some CDN seems to use that code when
        // requesting low-latency segments too much
        // in advance
        error.xhr.status === 412;
      }
      return false;
    }
    return isKnownError(error) && error.code === "INTEGRITY_ERROR";
  }
  async function scheduleRequestWithCdns(cdns, cdnPrioritizer, performRequest, options, cancellationSignal) {
    if (cancellationSignal.cancellationError !== null) {
      return Promise.reject(cancellationSignal.cancellationError);
    }
    const { baseDelay, maxDelay, maxRetry, onRetry } = options;
    if (cdns !== null && cdns.length === 0) {
      log_default.warn("utils", "No CDN given to `scheduleRequestWithCdns`.");
    }
    const missedAttempts = /* @__PURE__ */ new Map();
    const initialCdnToRequest = getCdnToRequest();
    if (initialCdnToRequest === void 0) {
      throw new Error("No CDN to request");
    }
    return requestCdn(initialCdnToRequest);
    function getCdnToRequest() {
      if (cdns === null) {
        const nullAttemptObject = missedAttempts.get(null);
        if (nullAttemptObject !== void 0 && nullAttemptObject.isBlacklisted) {
          return void 0;
        }
        return null;
      } else if (cdnPrioritizer === null) {
        return getPrioritaryRequestableCdnFromSortedList(cdns);
      } else {
        const prioritized = cdnPrioritizer.getCdnPreferenceForResource(cdns);
        return getPrioritaryRequestableCdnFromSortedList(prioritized);
      }
    }
    async function requestCdn(cdn) {
      try {
        const res = await performRequest(cdn, cancellationSignal);
        return res;
      } catch (error) {
        if (TaskCanceller.isCancellationError(error)) {
          throw error;
        }
        if (cdn !== null && cdnPrioritizer !== null) {
          cdnPrioritizer.downgradeCdn(cdn);
        }
        let missedAttemptsObj = missedAttempts.get(cdn);
        if (missedAttemptsObj === void 0) {
          missedAttemptsObj = {
            errorCounter: 1,
            blockedUntil: void 0,
            isBlacklisted: false
          };
          missedAttempts.set(cdn, missedAttemptsObj);
        } else {
          missedAttemptsObj.errorCounter++;
        }
        if (!shouldRetry(error)) {
          missedAttemptsObj.blockedUntil = void 0;
          missedAttemptsObj.isBlacklisted = true;
          return retryWithNextCdn(error);
        }
        if (missedAttemptsObj.errorCounter > maxRetry) {
          missedAttemptsObj.blockedUntil = void 0;
          missedAttemptsObj.isBlacklisted = true;
        } else {
          const errorCounter = missedAttemptsObj.errorCounter;
          const delay = Math.min(baseDelay * Math.pow(2, errorCounter - 1), maxDelay);
          const fuzzedDelay = getFuzzedDelay(delay);
          missedAttemptsObj.blockedUntil = monotonic_timestamp_default() + fuzzedDelay;
        }
        return retryWithNextCdn(error);
      }
    }
    async function retryWithNextCdn(prevRequestError) {
      const nextCdn = getCdnToRequest();
      if (cancellationSignal.isCancelled()) {
        throw cancellationSignal.cancellationError;
      }
      if (nextCdn === void 0) {
        throw prevRequestError;
      }
      onRetry(prevRequestError);
      if (cancellationSignal.isCancelled()) {
        throw cancellationSignal.cancellationError;
      }
      return waitPotentialBackoffAndRequest(nextCdn, prevRequestError);
    }
    function waitPotentialBackoffAndRequest(nextWantedCdn, prevRequestError) {
      const nextCdnAttemptObj = missedAttempts.get(nextWantedCdn);
      if (nextCdnAttemptObj === void 0 || nextCdnAttemptObj.blockedUntil === void 0) {
        return requestCdn(nextWantedCdn);
      }
      const now = monotonic_timestamp_default();
      const blockedFor = nextCdnAttemptObj.blockedUntil - now;
      if (blockedFor <= 0) {
        return requestCdn(nextWantedCdn);
      }
      const canceller = new TaskCanceller("Request Backoff");
      const unlinkCanceller = canceller.linkToSignal(cancellationSignal);
      return new Promise((res, rej) => {
        cdnPrioritizer == null ? void 0 : cdnPrioritizer.addEventListener(
          "priorityChange",
          () => {
            const updatedPrioritaryCdn = getCdnToRequest();
            if (cancellationSignal.isCancelled()) {
              throw cancellationSignal.cancellationError;
            }
            if (updatedPrioritaryCdn === void 0) {
              return cleanAndReject(prevRequestError);
            }
            if (updatedPrioritaryCdn !== nextWantedCdn) {
              canceller.cancel("new prioritized CDN");
              waitPotentialBackoffAndRequest(updatedPrioritaryCdn, prevRequestError).then(
                cleanAndResolve,
                cleanAndReject
              );
            }
          },
          canceller.signal
        );
        cancellableSleep(blockedFor, canceller.signal).then(
          () => requestCdn(nextWantedCdn).then(cleanAndResolve, cleanAndReject),
          noop_default
        );
        function cleanAndResolve(response) {
          unlinkCanceller();
          res(response);
        }
        function cleanAndReject(err) {
          unlinkCanceller();
          rej(err);
        }
      });
    }
    function getPrioritaryRequestableCdnFromSortedList(sortedCdns) {
      var _a2;
      if (missedAttempts.size === 0) {
        return sortedCdns[0];
      }
      const now = monotonic_timestamp_default();
      return (_a2 = sortedCdns.filter((c) => {
        var _a3;
        return ((_a3 = missedAttempts.get(c)) == null ? void 0 : _a3.isBlacklisted) !== true;
      }).reduce(
        (acc, x) => {
          var _a3;
          let blockedUntil = (_a3 = missedAttempts.get(x)) == null ? void 0 : _a3.blockedUntil;
          if (blockedUntil !== void 0 && blockedUntil <= now) {
            blockedUntil = void 0;
          }
          if (acc === void 0) {
            return [x, blockedUntil];
          }
          if (acc[1] === void 0) {
            return acc;
          }
          if (blockedUntil === void 0) {
            return [x, void 0];
          }
          if (blockedUntil < acc[1]) {
            return [x, blockedUntil];
          }
          return acc;
        },
        void 0
      )) == null ? void 0 : _a2[0];
    }
  }
  function scheduleRequestPromise(performRequest, options, cancellationSignal) {
    return scheduleRequestWithCdns(null, null, performRequest, options, cancellationSignal);
  }

  // src/core/fetchers/manifest/manifest_fetcher.ts
  var ManifestFetcher = class extends EventEmitter {
    /**
     * Construct a new ManifestFetcher.
     * @param {Array.<string> | undefined} urls - Manifest URLs, will be used when
     * no URL is provided to the `fetch` function.
     * `undefined` if unknown or if a Manifest should be retrieved through other
     * means than an HTTP request.
     * @param {Object} pipelines - Transport pipelines used to perform the
     * Manifest loading and parsing operations.
     * @param {Object} settings - Configure the `ManifestFetcher`.
     */
    constructor(urls, pipelines, settings) {
      super();
      this.scheduleManualRefresh = noop_default;
      this._manifestUrls = urls;
      this._pipelines = pipelines.manifest;
      this._transportName = pipelines.transportName;
      this._settings = settings;
      this._canceller = new TaskCanceller("ManifestFetcher");
      this._isStarted = false;
      this._isRefreshPending = false;
      this._consecutiveUnsafeMode = 0;
      this._prioritizedContentUrl = null;
    }
    /**
     * Free resources and stop refresh mechanism from happening.
     *
     * Once `dispose` has been called. This `ManifestFetcher` cannot be relied on
     * anymore.
     * @param {string | undefined} reason - Human-inspectable reason behind the
     * cancellation. Used for debugging matters, especially for debug log
     * inspection.
     */
    dispose(reason) {
      this._canceller.cancel(reason != null ? reason : "ManifestFetcher dispose");
      this.removeEventListener();
    }
    /**
     * Start requesting the Manifest as well as the Manifest refreshing logic, if
     * needed.
     *
     * Once `start` has been called, this mechanism can only be stopped by calling
     * `dispose`.
     */
    start() {
      if (this._isStarted) {
        return;
      }
      this._isStarted = true;
      let manifestProm;
      const initialManifest = this._settings.initialManifest;
      if (initialManifest instanceof classes_default) {
        manifestProm = Promise.resolve({ manifest: initialManifest });
      } else if (initialManifest !== void 0) {
        manifestProm = this.parse(
          initialManifest,
          { previousManifest: null, unsafeMode: false },
          void 0
        );
      } else {
        manifestProm = this._fetchManifest(void 0).then((val) => {
          return val.parse({ previousManifest: null, unsafeMode: false });
        });
      }
      manifestProm.then((val) => {
        this.trigger("manifestReady", val.manifest);
        if (!this._canceller.isUsed()) {
          this._recursivelyRefreshManifest(val.manifest, val);
        }
      }).catch((err) => this._onFatalError(err));
    }
    /**
     * Update URL of the fetched Manifest.
     * @param {Array.<string> | undefined} urls - New Manifest URLs by order of
     * priority or `undefined` if there's now no URL.
     * @param {boolean} refreshNow - If set to `true`, the next Manifest refresh
     * will be triggered immediately.
     */
    updateContentUrls(urls, refreshNow) {
      var _a2;
      this._prioritizedContentUrl = (_a2 = urls == null ? void 0 : urls[0]) != null ? _a2 : void 0;
      if (refreshNow) {
        this.scheduleManualRefresh({
          enablePartialRefresh: false,
          delay: 0,
          canUseUnsafeMode: false
        });
      }
    }
    /**
     * (re-)Load the Manifest.
     * This method does not yet parse it, parsing will then be available through
     * a callback available on the response.
     *
     * You can set an `url` on which that Manifest will be requested.
     * If not set, the regular Manifest url - defined on the `ManifestFetcher`
     * instanciation - will be used instead.
     *
     * @param {string | undefined} url
     * @returns {Promise}
     */
    async _fetchManifest(url) {
      var _a2;
      const cancelSignal = this._canceller.signal;
      const settings = this._settings;
      const transportName = this._transportName;
      const pipelines = this._pipelines;
      const requestUrl = url != null ? url : (_a2 = this._manifestUrls) == null ? void 0 : _a2[0];
      const backoffSettings = this._getBackoffSetting((err) => {
        this.trigger("warning", errorSelector(err));
      });
      try {
        const response = await callLoaderWithRetries(requestUrl);
        return {
          parse: (parserOptions) => {
            return this._parseLoadedManifest(response, parserOptions, requestUrl);
          }
        };
      } catch (err) {
        throw errorSelector(err);
      }
      function callLoaderWithRetries(manifestUrl) {
        var _a3;
        const { loadManifest } = pipelines;
        let requestTimeout = settings.requestTimeout === void 0 ? config_default.getCurrent().DEFAULT_REQUEST_TIMEOUT : settings.requestTimeout;
        let connectionTimeout = settings.connectionTimeout === void 0 ? config_default.getCurrent().DEFAULT_CONNECTION_TIMEOUT : settings.connectionTimeout;
        if (requestTimeout < 0) {
          requestTimeout = void 0;
        }
        if (connectionTimeout < 0) {
          connectionTimeout = void 0;
        }
        const requestOptions = {
          timeout: requestTimeout,
          connectionTimeout,
          cmcdPayload: (_a3 = settings.cmcdDataBuilder) == null ? void 0 : _a3.getCmcdDataForManifest(transportName)
        };
        const callLoader = () => loadManifest(manifestUrl, requestOptions, cancelSignal);
        return scheduleRequestPromise(callLoader, backoffSettings, cancelSignal);
      }
    }
    /**
     * Parse an already loaded Manifest.
     *
     * This method should be reserved for Manifests for which no request has been
     * done.
     * In other cases, it's preferable to go through the `fetch` method, so
     * information on the request can be used by the parsing process.
     * @param {*} manifest
     * @param {Object} parserOptions
     * @param {string | undefined} originalUrl
     * @returns {Promise}
     */
    parse(manifest, parserOptions, originalUrl) {
      return this._parseLoadedManifest(
        { responseData: manifest, size: void 0, requestDuration: void 0 },
        parserOptions,
        originalUrl
      );
    }
    /**
     * Parse a Manifest.
     *
     * @param {Object} loaded - Information about the loaded Manifest as well as
     * about the corresponding request.
     * @param {Object} parserOptions - Options used when parsing the Manifest.
     * @param {string | undefined} requestUrl
     * @returns {Promise}
     */
    async _parseLoadedManifest(loaded, parserOptions, requestUrl) {
      var _a2;
      const parsingTimeStart = monotonic_timestamp_default();
      const cancelSignal = this._canceller.signal;
      const trigger = this.trigger.bind(this);
      const { sendingTime, receivedTime } = loaded;
      const backoffSettings = this._getBackoffSetting((err) => {
        this.trigger("warning", errorSelector(err));
      });
      const originalUrl = requestUrl != null ? requestUrl : (_a2 = this._manifestUrls) == null ? void 0 : _a2[0];
      const opts = {
        externalClockOffset: parserOptions.externalClockOffset,
        unsafeMode: parserOptions.unsafeMode,
        previousManifest: parserOptions.previousManifest,
        originalUrl
      };
      try {
        const res = this._pipelines.parseManifest(
          loaded,
          opts,
          onWarnings,
          cancelSignal,
          scheduleRequest
        );
        if (!isPromise(res)) {
          return finish(res.manifest);
        } else {
          const { manifest } = await res;
          return finish(manifest);
        }
      } catch (err) {
        const formattedError = formatError(err, {
          defaultCode: "PIPELINE_PARSE_ERROR",
          defaultReason: "Unknown error when parsing the Manifest"
        });
        throw formattedError;
      }
      async function scheduleRequest(performRequest) {
        try {
          const data = await scheduleRequestPromise(
            performRequest,
            backoffSettings,
            cancelSignal
          );
          return data;
        } catch (err) {
          throw errorSelector(err);
        }
      }
      function onWarnings(warnings) {
        for (const warning of warnings) {
          if (cancelSignal.isCancelled()) {
            return;
          }
          const formattedError = formatError(warning, {
            defaultCode: "PIPELINE_PARSE_ERROR",
            defaultReason: "Unknown error when parsing the Manifest"
          });
          trigger("warning", formattedError);
        }
      }
      function finish(manifest) {
        const parsingTime = monotonic_timestamp_default() - parsingTimeStart;
        log_default.info("MF", `Manifest parsed in ${parsingTime}ms`);
        return { manifest, sendingTime, receivedTime, parsingTime };
      }
    }
    /**
     * Construct "backoff settings" that can be used with a range of functions
     * allowing to perform multiple request attempts
     * @param {Function} onRetry
     * @returns {Object}
     */
    _getBackoffSetting(onRetry) {
      const {
        DEFAULT_MAX_MANIFEST_REQUEST_RETRY,
        INITIAL_BACKOFF_DELAY_BASE,
        MAX_BACKOFF_DELAY_BASE
      } = config_default.getCurrent();
      const { lowLatencyMode, maxRetry: ogRegular } = this._settings;
      const baseDelay = lowLatencyMode ? INITIAL_BACKOFF_DELAY_BASE.LOW_LATENCY : INITIAL_BACKOFF_DELAY_BASE.REGULAR;
      const maxDelay = lowLatencyMode ? MAX_BACKOFF_DELAY_BASE.LOW_LATENCY : MAX_BACKOFF_DELAY_BASE.REGULAR;
      const maxRetry = ogRegular != null ? ogRegular : DEFAULT_MAX_MANIFEST_REQUEST_RETRY;
      return { onRetry, baseDelay, maxDelay, maxRetry };
    }
    /**
     * Performs Manifest refresh (recursively) when it judges it is time to do so.
     * @param {Object} manifest
     * @param {Object} manifestRequestInfos - Various information linked to the
     * last Manifest loading and parsing operations.
     */
    _recursivelyRefreshManifest(manifest, {
      sendingTime,
      parsingTime,
      updatingTime
    }) {
      const {
        MAX_CONSECUTIVE_MANIFEST_PARSING_IN_UNSAFE_MODE,
        MIN_MANIFEST_PARSING_TIME_TO_ENTER_UNSAFE_MODE
      } = config_default.getCurrent();
      const totalUpdateTime = parsingTime !== void 0 ? parsingTime + (updatingTime != null ? updatingTime : 0) : void 0;
      let unsafeModeEnabled = false;
      if (this._consecutiveUnsafeMode > 0) {
        unsafeModeEnabled = this._consecutiveUnsafeMode < MAX_CONSECUTIVE_MANIFEST_PARSING_IN_UNSAFE_MODE;
      } else if (totalUpdateTime !== void 0) {
        unsafeModeEnabled = totalUpdateTime >= MIN_MANIFEST_PARSING_TIME_TO_ENTER_UNSAFE_MODE;
      }
      const timeSinceRequest = sendingTime === void 0 ? 0 : monotonic_timestamp_default() - sendingTime;
      const minInterval = Math.max(
        this._settings.minimumManifestUpdateInterval - timeSinceRequest,
        0
      );
      const nextRefreshCanceller = new TaskCanceller("ManifestFetcher refresh handling");
      nextRefreshCanceller.linkToSignal(this._canceller.signal);
      this.scheduleManualRefresh = (settings) => {
        const { enablePartialRefresh, delay, canUseUnsafeMode } = settings;
        const unsafeMode = canUseUnsafeMode && unsafeModeEnabled;
        const timeSinceLastRefresh = sendingTime === void 0 ? 0 : monotonic_timestamp_default() - sendingTime;
        const _minInterval = Math.max(
          this._settings.minimumManifestUpdateInterval - timeSinceLastRefresh,
          0
        );
        const timeoutId = setTimeout(
          () => {
            nextRefreshCanceller.cancel("manifest request timeout");
            this._triggerNextManifestRefresh(manifest, {
              enablePartialRefresh,
              unsafeMode
            });
          },
          Math.max((delay != null ? delay : 0) - timeSinceLastRefresh, _minInterval)
        );
        nextRefreshCanceller.signal.register(() => {
          clearTimeout(timeoutId);
        });
      };
      if (manifest.expired !== null) {
        const timeoutId = setTimeout(() => {
          var _a2;
          (_a2 = manifest.expired) == null ? void 0 : _a2.then(() => {
            nextRefreshCanceller.cancel("manifest expiration");
            this._triggerNextManifestRefresh(manifest, {
              enablePartialRefresh: false,
              unsafeMode: unsafeModeEnabled
            });
          }, noop_default);
        }, minInterval);
        nextRefreshCanceller.signal.register(() => {
          clearTimeout(timeoutId);
        });
      }
      if (manifest.lifetime !== void 0 && manifest.lifetime >= 0) {
        const regularRefreshDelay = manifest.lifetime * 1e3 - timeSinceRequest;
        let actualRefreshInterval;
        if (totalUpdateTime === void 0) {
          actualRefreshInterval = regularRefreshDelay;
        } else if (manifest.lifetime < 3 && totalUpdateTime >= 100) {
          actualRefreshInterval = Math.min(
            Math.max(
              // Take 3 seconds as a default safe value for a base interval.
              3e3 - timeSinceRequest,
              // Add update time to the original interval.
              Math.max(regularRefreshDelay, 0) + totalUpdateTime
            ),
            // Limit the postponment's higher bound to a very high value relative
            // to `regularRefreshDelay`.
            // This avoid perpetually postponing a Manifest update when
            // performance seems to have been abysmal one time.
            regularRefreshDelay * 6
          );
          log_default.info(
            "MF",
            "Manifest update rythm is too frequent. Postponing next request.",
            { regularRefreshDelay, newRefreshDelay: actualRefreshInterval }
          );
        } else if (totalUpdateTime >= manifest.lifetime * 1e3 / 10) {
          actualRefreshInterval = Math.min(
            // Just add the update time to the original waiting time
            Math.max(regularRefreshDelay, 0) + totalUpdateTime,
            // Limit the postponment's higher bound to a very high value relative
            // to `regularRefreshDelay`.
            // This avoid perpetually postponing a Manifest update when
            // performance seems to have been abysmal one time.
            regularRefreshDelay * 6
          );
          log_default.info("MF", "Manifest took too long to parse. Postponing next request", {
            regularRefreshDelay,
            newRefreshDelay: actualRefreshInterval
          });
        } else {
          actualRefreshInterval = regularRefreshDelay;
        }
        const timeoutId = setTimeout(
          () => {
            nextRefreshCanceller.cancel("manifest request timeout");
            this._triggerNextManifestRefresh(manifest, {
              enablePartialRefresh: false,
              unsafeMode: unsafeModeEnabled
            });
          },
          Math.max(actualRefreshInterval, minInterval)
        );
        nextRefreshCanceller.signal.register(() => {
          clearTimeout(timeoutId);
        });
      }
    }
    /**
     * Refresh the Manifest, performing a full update if a partial update failed.
     * Also re-call `recursivelyRefreshManifest` to schedule the next refresh
     * trigger.
     * @param {Object} manifest
     * @param {Object} refreshInformation
     */
    _triggerNextManifestRefresh(manifest, {
      enablePartialRefresh,
      unsafeMode
    }) {
      const manifestUpdateUrl = manifest.updateUrl;
      let fullRefresh;
      let refreshURL;
      if (this._prioritizedContentUrl !== null) {
        fullRefresh = true;
        refreshURL = this._prioritizedContentUrl;
        this._prioritizedContentUrl = null;
      } else {
        fullRefresh = !enablePartialRefresh || manifestUpdateUrl === void 0;
        refreshURL = fullRefresh ? manifest.getUrls()[0] : manifestUpdateUrl;
      }
      const externalClockOffset = manifest.clockOffset;
      if (unsafeMode) {
        this._consecutiveUnsafeMode += 1;
        log_default.info(
          "MF",
          'Refreshing the Manifest in "unsafeMode" for the ' + String(this._consecutiveUnsafeMode) + " consecutive time."
        );
      } else if (this._consecutiveUnsafeMode > 0) {
        log_default.info(
          "MF",
          'Not parsing the Manifest in "unsafeMode" anymore after ' + String(this._consecutiveUnsafeMode) + " consecutive times."
        );
        this._consecutiveUnsafeMode = 0;
      }
      if (this._isRefreshPending) {
        return;
      }
      this._isRefreshPending = true;
      this._fetchManifest(refreshURL).then(
        (res) => res.parse({
          externalClockOffset,
          previousManifest: manifest,
          unsafeMode
        })
      ).then((res) => {
        this._isRefreshPending = false;
        const { manifest: newManifest, sendingTime: newSendingTime, parsingTime } = res;
        const updateTimeStart = monotonic_timestamp_default();
        if (fullRefresh) {
          manifest.replace(newManifest);
        } else {
          try {
            manifest.update(newManifest);
          } catch (e) {
            const message = e instanceof Error ? e.message : "unknown error";
            log_default.warn(
              "MF",
              `Attempt to update Manifest failed: ${message}`,
              "Re-downloading the Manifest fully"
            );
            const { FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY } = config_default.getCurrent();
            const timeSinceLastRefresh = newSendingTime === void 0 ? 0 : monotonic_timestamp_default() - newSendingTime;
            const _minInterval = Math.max(
              this._settings.minimumManifestUpdateInterval - timeSinceLastRefresh,
              0
            );
            let unregisterCanceller = noop_default;
            const timeoutId = setTimeout(
              () => {
                unregisterCanceller();
                this._triggerNextManifestRefresh(manifest, {
                  enablePartialRefresh: false,
                  unsafeMode: false
                });
              },
              Math.max(
                FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY - timeSinceLastRefresh,
                _minInterval
              )
            );
            unregisterCanceller = this._canceller.signal.register(() => {
              clearTimeout(timeoutId);
            });
            return;
          }
        }
        const updatingTime = monotonic_timestamp_default() - updateTimeStart;
        this._recursivelyRefreshManifest(manifest, {
          sendingTime: newSendingTime,
          parsingTime,
          updatingTime
        });
      }).catch((err) => {
        this._isRefreshPending = false;
        this._onFatalError(err);
      });
    }
    _onFatalError(err) {
      if (this._canceller.isUsed()) {
        return;
      }
      this.trigger("error", err);
      this.dispose("ManifestFetcher fatal err");
    }
  };
  function isPromise(val) {
    return val instanceof Promise;
  }

  // src/core/fetchers/manifest/index.ts
  var manifest_default = ManifestFetcher;

  // src/core/fetchers/segment/prioritized_segment_fetcher.ts
  function applyPrioritizerToSegmentFetcher(prioritizer, fetcher) {
    const taskHandlers = /* @__PURE__ */ new WeakMap();
    return {
      /**
       * Create a Segment request with a given priority.
       * @param {Object} content - content to request
       * @param {Number} priority - priority at which the content should be requested.
       * Lower number == higher priority.
       * @param {Object} callbacks
       * @param {Object} cancelSignal
       * @returns {Promise}
       */
      createRequest(content, priority, callbacks, cancelSignal) {
        const givenTask = (innerCancelSignal) => {
          return fetcher(content, callbacks, innerCancelSignal);
        };
        const ret = prioritizer.create(givenTask, priority, callbacks, cancelSignal);
        taskHandlers.set(ret, givenTask);
        return ret;
      },
      /**
       * Update the priority of a pending request, created through
       * `createRequest`.
       * @param {Promise} task - The Promise returned by `createRequest`.
       * @param {Number} priority - The new priority value.
       */
      updatePriority(task, priority) {
        const correspondingTask = taskHandlers.get(task);
        if (correspondingTask === void 0) {
          log_default.warn("SF", "Cannot update the priority of a request: task not found.");
          return;
        }
        prioritizer.updatePriority(correspondingTask, priority);
      }
    };
  }

  // src/core/fetchers/segment/initialization_segment_cache.ts
  var InitializationSegmentCache = class {
    constructor() {
      this._cache = /* @__PURE__ */ new WeakMap();
    }
    /**
     * @param {Object} obj
     * @param {*} response
     */
    add({ representation, segment }, response) {
      if (segment.isInit) {
        this._cache.set(representation, response);
      }
    }
    /**
     * @param {Object} obj
     * @returns {*} response
     */
    get({
      representation,
      segment
    }) {
      if (segment.isInit) {
        const value = this._cache.get(representation);
        if (value !== void 0) {
          return value;
        }
      }
      return null;
    }
  };
  var initialization_segment_cache_default = InitializationSegmentCache;

  // src/core/fetchers/segment/segment_fetcher.ts
  var generateRequestID = idGenerator();
  function createSegmentFetcher({
    bufferType,
    pipeline,
    cdnPrioritizer,
    cmcdDataBuilder,
    eventListeners,
    requestOptions
  }) {
    let connectionTimeout;
    if (requestOptions.connectionTimeout === void 0 || requestOptions.connectionTimeout < 0) {
      connectionTimeout = void 0;
    } else {
      connectionTimeout = requestOptions.connectionTimeout;
    }
    const pipelineRequestOptions = {
      timeout: requestOptions.requestTimeout < 0 ? void 0 : requestOptions.requestTimeout,
      connectionTimeout,
      cmcdPayload: void 0
    };
    const cache = arrayIncludes(["audio", "video"], bufferType) ? new initialization_segment_cache_default() : void 0;
    const { loadSegment, parseSegment } = pipeline;
    return async function fetchSegment(content, fetcherCallbacks, cancellationSignal) {
      var _a2, _b2, _c2;
      const { segment, adaptation, representation, manifest, period } = content;
      const segmentIdString = getLoggableSegmentId(content);
      const requestId = generateRequestID();
      let requestInfo;
      const parsedChunks = [];
      let segmentDurationAcc = 0;
      let metricsSent = false;
      const context = {
        segment,
        type: adaptation.type,
        language: adaptation.language,
        isLive: manifest.isLive,
        periodStart: period.start,
        periodEnd: period.end,
        mimeType: representation.mimeType,
        codecs: representation.codecs[0],
        manifestPublishTime: manifest.publishTime
      };
      const loaderCallbacks = {
        /**
         * Callback called when the segment loader has progress information on
         * the request.
         * @param {Object} info
         */
        onProgress(info) {
          var _a3;
          if (requestInfo !== void 0) {
            return;
          }
          if (info.totalSize !== void 0 && info.size < info.totalSize) {
            (_a3 = eventListeners.onProgress) == null ? void 0 : _a3.call(eventListeners, {
              duration: info.duration,
              size: info.size,
              totalSize: info.totalSize,
              timestamp: monotonic_timestamp_default(),
              id: requestId
            });
          }
        },
        /**
         * Callback called when the segment is communicated by the loader
         * through decodable sub-segment(s) called chunk(s), with a chunk in
         * argument.
         * @param {*} chunkData
         */
        onNewChunk(chunkData) {
          fetcherCallbacks.onChunk(generateParserFunction(chunkData, true));
        }
      };
      const cached = cache !== void 0 ? cache.get(content) : null;
      if (cached !== null) {
        log_default.debug("SF", "Found wanted segment in cache", segmentIdString);
        fetcherCallbacks.onChunk(generateParserFunction(cached, false));
        return Promise.resolve();
      }
      log_default.debug("SF", "Beginning request", segmentIdString);
      (_a2 = eventListeners.onRequestBegin) == null ? void 0 : _a2.call(eventListeners, {
        requestTimestamp: monotonic_timestamp_default(),
        id: requestId,
        content
      });
      cancellationSignal.register(onCancellation);
      try {
        const res = await scheduleRequestWithCdns(
          content.representation.cdnMetadata,
          cdnPrioritizer,
          callLoaderWithUrl,
          object_assign_default({ onRetry }, requestOptions),
          cancellationSignal
        );
        if (res.resultType === "segment-loaded") {
          const loadedData = res.resultData.responseData;
          if (cache !== void 0) {
            cache.add(content, res.resultData.responseData);
          }
          fetcherCallbacks.onChunk(generateParserFunction(loadedData, false));
        } else if (res.resultType === "segment-created") {
          fetcherCallbacks.onChunk(generateParserFunction(res.resultData, false));
        }
        log_default.debug("SF", "Segment request ended with success", segmentIdString);
        fetcherCallbacks.onAllChunksReceived();
        if (res.resultType !== "segment-created") {
          requestInfo = res.resultData;
          sendNetworkMetricsIfAvailable();
        } else {
          requestInfo = null;
        }
        if (!cancellationSignal.isCancelled()) {
          (_b2 = eventListeners.onRequestEnd) == null ? void 0 : _b2.call(eventListeners, { id: requestId });
        }
        cancellationSignal.deregister(onCancellation);
      } catch (err) {
        cancellationSignal.deregister(onCancellation);
        requestInfo = null;
        if (err instanceof CancellationError) {
          log_default.debug("SF", "Segment request aborted", segmentIdString);
          throw err;
        }
        log_default.debug("SF", "Segment request failed", segmentIdString);
        (_c2 = eventListeners.onRequestEnd) == null ? void 0 : _c2.call(eventListeners, { id: requestId });
        throw errorSelector(err);
      }
      function onCancellation() {
        var _a3;
        if (requestInfo !== void 0) {
          return;
        }
        log_default.debug("SF", "Segment request cancelled", segmentIdString);
        requestInfo = null;
        (_a3 = eventListeners.onRequestEnd) == null ? void 0 : _a3.call(eventListeners, { id: requestId });
      }
      function callLoaderWithUrl(cdnMetadata) {
        pipelineRequestOptions.cmcdPayload = cmcdDataBuilder == null ? void 0 : cmcdDataBuilder.getCmcdDataForSegmentRequest(content);
        return loadSegment(
          cdnMetadata,
          context,
          pipelineRequestOptions,
          cancellationSignal,
          loaderCallbacks
        );
      }
      function generateParserFunction(data, isChunked) {
        parsedChunks.push(false);
        const parsedChunkId = parsedChunks.length - 1;
        return function parse(initTimescale) {
          const loaded = { data, isChunked };
          try {
            const parsed = parseSegment(loaded, context, initTimescale);
            if (!parsedChunks[parsedChunkId]) {
              segmentDurationAcc = segmentDurationAcc !== void 0 && parsed.segmentType === "media" && parsed.chunkInfos !== null && parsed.chunkInfos.duration !== void 0 ? segmentDurationAcc + parsed.chunkInfos.duration : void 0;
              parsedChunks[parsedChunkId] = true;
              sendNetworkMetricsIfAvailable();
            }
            return parsed;
          } catch (error) {
            throw formatError(error, {
              defaultCode: "PIPELINE_PARSE_ERROR",
              defaultReason: "Unknown parsing error"
            });
          }
        };
      }
      function onRetry(err) {
        fetcherCallbacks.onRetry(errorSelector(err));
      }
      function sendNetworkMetricsIfAvailable() {
        var _a3;
        if (metricsSent) {
          return;
        }
        if (!isNullOrUndefined(requestInfo) && requestInfo.size !== void 0 && requestInfo.requestDuration !== void 0 && parsedChunks.length > 0 && parsedChunks.every((isParsed) => isParsed)) {
          metricsSent = true;
          (_a3 = eventListeners.onMetrics) == null ? void 0 : _a3.call(eventListeners, {
            size: requestInfo.size,
            requestDuration: requestInfo.requestDuration,
            content,
            segmentDuration: segmentDurationAcc
          });
        }
      }
    };
  }
  function getSegmentFetcherRequestOptions({
    maxRetry,
    lowLatencyMode,
    requestTimeout,
    connectionTimeout
  }) {
    const {
      DEFAULT_MAX_REQUESTS_RETRY_ON_ERROR,
      DEFAULT_REQUEST_TIMEOUT,
      DEFAULT_CONNECTION_TIMEOUT,
      INITIAL_BACKOFF_DELAY_BASE,
      MAX_BACKOFF_DELAY_BASE
    } = config_default.getCurrent();
    return {
      maxRetry: maxRetry != null ? maxRetry : DEFAULT_MAX_REQUESTS_RETRY_ON_ERROR,
      baseDelay: lowLatencyMode ? INITIAL_BACKOFF_DELAY_BASE.LOW_LATENCY : INITIAL_BACKOFF_DELAY_BASE.REGULAR,
      maxDelay: lowLatencyMode ? MAX_BACKOFF_DELAY_BASE.LOW_LATENCY : MAX_BACKOFF_DELAY_BASE.REGULAR,
      requestTimeout: requestTimeout === void 0 ? DEFAULT_REQUEST_TIMEOUT : requestTimeout,
      connectionTimeout: connectionTimeout === void 0 ? DEFAULT_CONNECTION_TIMEOUT : connectionTimeout
    };
  }

  // src/core/fetchers/segment/segment_queue.ts
  var SegmentQueue = class extends EventEmitter {
    /**
     * Create a new `SegmentQueue`.
     *
     * @param {Object} segmentFetcher - Interface to facilitate the download of
     * segments.
     * @param {Object} isMediaSegmentQueueInterrupted - Reference to a boolean indicating
     * if the media segment queue is interrupted.
     */
    constructor(segmentFetcher, isMediaSegmentQueueInterrupted) {
      super();
      this._segmentFetcher = segmentFetcher;
      this._currentContentInfo = null;
      this.isMediaSegmentQueueInterrupted = isMediaSegmentQueueInterrupted;
    }
    /**
     * Returns the initialization segment currently being requested.
     * Returns `null` if no initialization segment request is pending.
     * @returns {Object | null}
     */
    getRequestedInitSegment() {
      var _a2, _b2, _c2;
      return (_c2 = (_b2 = (_a2 = this._currentContentInfo) == null ? void 0 : _a2.initSegmentRequest) == null ? void 0 : _b2.segment) != null ? _c2 : null;
    }
    /**
     * Returns the media segment currently being requested.
     * Returns `null` if no media segment request is pending.
     * @returns {Object | null}
     */
    getRequestedMediaSegment() {
      var _a2, _b2, _c2;
      return (_c2 = (_b2 = (_a2 = this._currentContentInfo) == null ? void 0 : _a2.mediaSegmentRequest) == null ? void 0 : _b2.segment) != null ? _c2 : null;
    }
    /**
     * Return an object allowing to schedule segment requests linked to the given
     * content.
     * The `SegmentQueue` will emit events as it loads and parses initialization
     * and media segments.
     *
     * Calling this method resets all previous queues that were previously started
     * on the same instance.
     *
     * @param {Object} content - The context of the Representation you want to
     * load segments for.
     * @param {boolean} hasInitSegment - Declare that an initialization segment
     * will need to be downloaded.
     *
     * A `SegmentQueue` ALWAYS wait for the initialization segment to be
     * loaded and parsed before parsing a media segment.
     *
     * In cases where no initialization segment exist, this would lead to the
     * `SegmentQueue` waiting indefinitely for it.
     *
     * By setting that value to `false`, you anounce to the `SegmentQueue`
     * that it should not wait for an initialization segment before parsing a
     * media segment.
     * @param {string | undefined} reason - Human-inspectable reason behind the
     * reset. Used for debugging matters, especially for debug log
     * inspection.
     * @returns {Object} - `SharedReference` on which the queue of segment for
     * that content can be communicated and updated. See type for more
     * information.
     */
    resetForContent(content, hasInitSegment, reason) {
      var _a2;
      (_a2 = this._currentContentInfo) == null ? void 0 : _a2.currentCanceller.cancel(reason != null ? reason : "SegmentQueue reset");
      const downloadQueue = new reference_default({
        initSegment: null,
        segmentQueue: []
      });
      const currentCanceller = new TaskCanceller("SegmentQueue " + content.adaptation.type);
      currentCanceller.signal.register(() => {
        downloadQueue.finish();
      });
      const currentContentInfo = {
        content,
        downloadQueue,
        initSegmentInfoRef: hasInitSegment ? new reference_default(void 0) : new reference_default(null),
        currentCanceller,
        initSegmentRequest: null,
        mediaSegmentRequest: null,
        mediaSegmentAwaitingInitMetadata: null
      };
      this._currentContentInfo = currentContentInfo;
      this.isMediaSegmentQueueInterrupted.onUpdate(
        (val) => {
          if (!val) {
            log_default.debug("SF", "Media segment can be loaded again, restarting queue.", {
              type: content.adaptation.type
            });
            this._restartMediaSegmentDownloadingQueue(currentContentInfo, "interrupt end");
          }
        },
        { clearSignal: currentCanceller.signal }
      );
      downloadQueue.onUpdate(
        (queue) => {
          const { segmentQueue } = queue;
          if (segmentQueue.length > 0 && segmentQueue[0].segment.id === currentContentInfo.mediaSegmentAwaitingInitMetadata) {
            return;
          }
          const currentSegmentRequest = currentContentInfo.mediaSegmentRequest;
          if (segmentQueue.length === 0) {
            if (currentSegmentRequest === null) {
              return;
            }
            log_default.debug("SF", "no more media segment to request. Cancelling queue.", {
              type: content.adaptation.type
            });
            this._restartMediaSegmentDownloadingQueue(
              currentContentInfo,
              "media segment queue empty"
            );
            return;
          } else if (currentSegmentRequest === null) {
            log_default.debug("SF", "Media segments now need to be requested. Starting queue.", {
              type: content.adaptation.type,
              queueLength: segmentQueue.length
            });
            this._restartMediaSegmentDownloadingQueue(
              currentContentInfo,
              "media segment queue start"
            );
            return;
          } else {
            const nextItem = segmentQueue[0];
            if (currentSegmentRequest.segment.id !== nextItem.segment.id) {
              log_default.debug("SF", "Next media segment changed, cancelling previous", {
                type: content.adaptation.type
              });
              this._restartMediaSegmentDownloadingQueue(
                currentContentInfo,
                "next media segment changed"
              );
              return;
            }
            if (currentSegmentRequest.priority !== nextItem.priority) {
              log_default.debug("SF", "Priority of next media segment changed, updating", {
                type: content.adaptation.type,
                prevPriority: currentSegmentRequest.priority,
                newPriority: nextItem.priority
              });
              this._segmentFetcher.updatePriority(
                currentSegmentRequest.request,
                nextItem.priority
              );
            }
            return;
          }
        },
        { emitCurrentValue: true, clearSignal: currentCanceller.signal }
      );
      downloadQueue.onUpdate(
        (next) => {
          var _a3;
          const initSegmentRequest = currentContentInfo.initSegmentRequest;
          if (next.initSegment !== null && initSegmentRequest !== null) {
            if (next.initSegment.priority !== initSegmentRequest.priority) {
              this._segmentFetcher.updatePriority(
                initSegmentRequest.request,
                next.initSegment.priority
              );
            }
            return;
          } else if (((_a3 = next.initSegment) == null ? void 0 : _a3.segment.id) === (initSegmentRequest == null ? void 0 : initSegmentRequest.segment.id)) {
            return;
          }
          if (next.initSegment === null) {
            log_default.debug("SF", "no more init segment to request. Cancelling queue.", {
              type: content.adaptation.type
            });
          }
          this._restartInitSegmentDownloadingQueue(
            currentContentInfo,
            next.initSegment,
            "init segment queue empty"
          );
        },
        { emitCurrentValue: true, clearSignal: currentCanceller.signal }
      );
      return downloadQueue;
    }
    /**
     * Stop the currently-active `SegmentQueue`.
     *
     * Do nothing if no queue is active.
     * @param {string | undefined} reason - Human-inspectable reason behind the
     * stop. Used for debugging matters, especially for debug log
     * inspection.
     */
    stop(reason) {
      var _a2;
      (_a2 = this._currentContentInfo) == null ? void 0 : _a2.currentCanceller.cancel(reason != null ? reason : "SegmentQueue stop");
      this._currentContentInfo = null;
    }
    /**
     * Internal logic performing media segment requests.
     * @param {string | undefined} reason - Human-inspectable reason behind the
     * restart. Used for debugging matters, especially for debug log
     * inspection.
     */
    _restartMediaSegmentDownloadingQueue(contentInfo, reason) {
      if (contentInfo.mediaSegmentRequest !== null) {
        contentInfo.mediaSegmentRequest.canceller.cancel(
          reason != null ? reason : "SegmentQueue media restart"
        );
      }
      const { downloadQueue, content, initSegmentInfoRef, currentCanceller } = contentInfo;
      const recursivelyRequestSegments = () => {
        var _a2;
        if (this.isMediaSegmentQueueInterrupted.getValue()) {
          log_default.debug("SF", "Segment fetching postponed because it cannot stream now.");
          return;
        }
        const { segmentQueue } = downloadQueue.getValue();
        const startingSegment = segmentQueue[0];
        if (currentCanceller !== null && currentCanceller.isUsed()) {
          contentInfo.mediaSegmentRequest = null;
          return;
        }
        if (startingSegment === void 0) {
          contentInfo.mediaSegmentRequest = null;
          this.trigger("emptyQueue", null);
          return;
        }
        const canceller = new TaskCanceller(
          "SegmentQueue media segments queue " + content.adaptation.type
        );
        const unlinkCanceller = currentCanceller === null ? noop_default : canceller.linkToSignal(currentCanceller.signal);
        const { segment, priority } = startingSegment;
        const context = object_assign_default(
          { segment, nextSegment: (_a2 = segmentQueue[1]) == null ? void 0 : _a2.segment },
          content
        );
        let isComplete = false;
        let isWaitingOnInitSegment = false;
        canceller.signal.register(() => {
          contentInfo.mediaSegmentRequest = null;
          if (isComplete) {
            return;
          }
          if (contentInfo.mediaSegmentAwaitingInitMetadata === segment.id) {
            contentInfo.mediaSegmentAwaitingInitMetadata = null;
          }
          isComplete = true;
          isWaitingOnInitSegment = false;
        });
        const emitChunk = (parsed) => {
          assert(parsed.segmentType === "media", "Should have loaded a media segment.");
          this.trigger("parsedMediaSegment", object_assign_default({}, parsed, { segment }));
        };
        const continueToNextSegment = () => {
          const lastQueue = downloadQueue.getValue().segmentQueue;
          if (lastQueue.length === 0) {
            isComplete = true;
            this.trigger("emptyQueue", null);
            return;
          } else if (lastQueue[0].segment.id === segment.id) {
            lastQueue.shift();
          }
          isComplete = true;
          recursivelyRequestSegments();
        };
        const request2 = this._segmentFetcher.createRequest(
          context,
          priority,
          {
            /**
             * Callback called when the request has to be retried.
             * @param {Error} error
             */
            onRetry: (error) => {
              this.trigger("requestRetry", { segment, error });
            },
            /**
             * Callback called when the request has to be interrupted and
             * restarted later.
             */
            beforeInterrupted() {
              log_default.info("SF", "segment request interrupted temporarly.", {
                segmentId: segment.id,
                segmentTime: segment.time
              });
            },
            /**
             * Callback called when a decodable chunk of the segment is available.
             * @param {Function} parse - Function allowing to parse the segment.
             */
            onChunk: (parse) => {
              const initTimescale = initSegmentInfoRef.getValue();
              if (initTimescale !== void 0) {
                emitChunk(parse(initTimescale != null ? initTimescale : void 0));
              } else {
                isWaitingOnInitSegment = true;
                initSegmentInfoRef.waitUntilDefined(
                  (actualTimescale) => {
                    emitChunk(parse(actualTimescale != null ? actualTimescale : void 0));
                  },
                  { clearSignal: canceller.signal }
                );
              }
            },
            /** Callback called after all chunks have been sent. */
            onAllChunksReceived: () => {
              if (!isWaitingOnInitSegment) {
                this.trigger("fullyLoadedSegment", segment);
              } else {
                contentInfo.mediaSegmentAwaitingInitMetadata = segment.id;
                initSegmentInfoRef.waitUntilDefined(
                  () => {
                    contentInfo.mediaSegmentAwaitingInitMetadata = null;
                    isWaitingOnInitSegment = false;
                    this.trigger("fullyLoadedSegment", segment);
                  },
                  { clearSignal: canceller.signal }
                );
              }
            },
            /**
             * Callback called right after the request ended but before the next
             * requests are scheduled. It is used to schedule the next segment.
             */
            beforeEnded: () => {
              unlinkCanceller();
              contentInfo.mediaSegmentRequest = null;
              if (isWaitingOnInitSegment) {
                initSegmentInfoRef.waitUntilDefined(continueToNextSegment, {
                  clearSignal: canceller.signal
                });
              } else {
                continueToNextSegment();
              }
            }
          },
          canceller.signal
        );
        request2.catch((error) => {
          unlinkCanceller();
          if (!isComplete) {
            isComplete = true;
            this.stop("request err");
            this.trigger("error", error);
          }
        });
        contentInfo.mediaSegmentRequest = { segment, priority, request: request2, canceller };
      };
      recursivelyRequestSegments();
    }
    /**
     * Internal logic performing initialization segment requests.
     * @param {Object} contentInfo
     * @param {Object} queuedInitSegment
     * @param {string | undefined} reason - Human-inspectable reason behind the
     * dispose. Used for debugging matters, especially for debug log
     * inspection.
     */
    _restartInitSegmentDownloadingQueue(contentInfo, queuedInitSegment, reason) {
      const { content, initSegmentInfoRef } = contentInfo;
      if (contentInfo.initSegmentRequest !== null) {
        contentInfo.initSegmentRequest.canceller.cancel(
          reason != null ? reason : "SegmentQueue init restart"
        );
      }
      if (queuedInitSegment === null) {
        return;
      }
      const canceller = new TaskCanceller(
        "SegmentQueue init segment " + content.adaptation.type
      );
      const unlinkCanceller = contentInfo.currentCanceller === null ? noop_default : canceller.linkToSignal(contentInfo.currentCanceller.signal);
      const { segment, priority } = queuedInitSegment;
      const context = object_assign_default({ segment, nextSegment: void 0 }, content);
      let isComplete = false;
      const request2 = this._segmentFetcher.createRequest(
        context,
        priority,
        {
          onRetry: (err) => {
            this.trigger("requestRetry", { segment, error: err });
          },
          beforeInterrupted: () => {
            log_default.info("SF", "init segment request interrupted temporarly.", {
              segmentId: segment.id
            });
          },
          beforeEnded: () => {
            unlinkCanceller();
            contentInfo.initSegmentRequest = null;
            isComplete = true;
          },
          onChunk: (parse) => {
            var _a2;
            const parsed = parse(void 0);
            assert(parsed.segmentType === "init", "Should have loaded an init segment.");
            this.trigger("parsedInitSegment", object_assign_default({}, parsed, { segment }));
            if (parsed.segmentType === "init") {
              initSegmentInfoRef.setValue((_a2 = parsed.initTimescale) != null ? _a2 : null);
            }
          },
          onAllChunksReceived: () => {
            this.trigger("fullyLoadedSegment", segment);
          }
        },
        canceller.signal
      );
      request2.catch((error) => {
        unlinkCanceller();
        if (!isComplete) {
          isComplete = true;
          this.stop("request err");
          this.trigger("error", error);
        }
      });
      canceller.signal.register(() => {
        contentInfo.initSegmentRequest = null;
        if (isComplete) {
          return;
        }
        isComplete = true;
      });
      contentInfo.initSegmentRequest = { segment, priority, request: request2, canceller };
    }
  };

  // src/core/fetchers/segment/task_prioritizer.ts
  var TaskPrioritizer = class {
    /**
     * @param {Options} prioritizerOptions
     */
    constructor({ prioritySteps }) {
      this._minPendingPriority = null;
      this._waitingQueue = [];
      this._pendingTasks = [];
      this._prioritySteps = prioritySteps;
      if (this._prioritySteps.high >= this._prioritySteps.low) {
        throw new Error(
          "The max high level priority should be given a lowerpriority number than the min low priority."
        );
      }
    }
    /**
     * Create a priorized Promise from a base task.
     *
     * This task will immediately have its priority compared to all the
     * already-running ones created from this class.
     *
     * Only if this number is inferior or equal to the priority of the
     * minimum priority number of all currently-running tasks  will it be
     * immediately started.
     * In the opposite case, we will wait for higher-priority tasks to
     * finish before starting it.
     *
     * Note that while this task is waiting for its turn, it is possible
     * to update its property through the updatePriority method, by providing
     * the task again and its new priority number.
     *
     * @param {Function} taskFn
     * @param {number} priority
     * @param {Object} callbacks
     * @param {Object} cancelSignal
     * @returns {Promise}
     */
    create(taskFn, priority, callbacks, cancelSignal) {
      let newTask;
      return createCancellablePromise(cancelSignal, (resolve, reject) => {
        const trigger = () => {
          if (newTask.hasEnded) {
            return;
          }
          const finishTask = () => {
            unlinkInterrupter();
            this._endTask(newTask);
          };
          const onResolve = (value) => {
            callbacks.beforeEnded();
            finishTask();
            resolve(value);
          };
          const onReject = (err) => {
            finishTask();
            reject(err);
          };
          const interrupter = new TaskCanceller(void 0);
          const unlinkInterrupter = interrupter.linkToSignal(cancelSignal);
          newTask.interrupter = interrupter;
          interrupter.signal.register(() => {
            newTask.interrupter = null;
            if (!cancelSignal.isCancelled()) {
              callbacks.beforeInterrupted();
            }
          });
          this._minPendingPriority = this._minPendingPriority === null ? newTask.priority : Math.min(this._minPendingPriority, newTask.priority);
          this._pendingTasks.push(newTask);
          newTask.taskFn(interrupter.signal).then(onResolve).catch((err) => {
            if (!cancelSignal.isCancelled() && interrupter.isUsed() && err instanceof CancellationError) {
              return;
            }
            onReject(err);
          });
        };
        newTask = {
          hasEnded: false,
          priority,
          trigger,
          taskFn,
          interrupter: null
        };
        if (!this._canBeStartedNow(newTask)) {
          this._waitingQueue.push(newTask);
        } else {
          newTask.trigger();
          if (this._isRunningHighPriorityTasks()) {
            this._interruptCancellableTasks();
          }
        }
        return () => this._endTask(newTask);
      });
    }
    _endTask(task) {
      task.hasEnded = true;
      const waitingQueueIndex = _findTaskIndex(task.taskFn, this._waitingQueue);
      if (waitingQueueIndex >= 0) {
        this._waitingQueue.splice(waitingQueueIndex, 1);
      } else {
        const pendingTasksIndex = _findTaskIndex(task.taskFn, this._pendingTasks);
        if (pendingTasksIndex < 0) {
          return;
        }
        this._pendingTasks.splice(pendingTasksIndex, 1);
        if (this._pendingTasks.length > 0) {
          if (this._minPendingPriority === task.priority) {
            this._minPendingPriority = Math.min(
              ...this._pendingTasks.map((t) => t.priority)
            );
          }
        } else {
          this._minPendingPriority = null;
        }
        this._loopThroughWaitingQueue();
      }
    }
    /**
     * Update the priority of a promise given to the TaskPrioritizer.
     * @param {Object} promise
     * @param {number} priority
     */
    updatePriority(promise, priority) {
      const waitingQueueIndex = _findTaskIndex(promise, this._waitingQueue);
      if (waitingQueueIndex >= 0) {
        const waitingQueueElt = this._waitingQueue[waitingQueueIndex];
        if (waitingQueueElt.priority === priority) {
          return;
        }
        waitingQueueElt.priority = priority;
        if (!this._canBeStartedNow(waitingQueueElt)) {
          return;
        }
        this._findAndRunWaitingQueueTask(waitingQueueIndex);
        if (this._isRunningHighPriorityTasks()) {
          this._interruptCancellableTasks();
        }
        return;
      }
      const pendingTasksIndex = _findTaskIndex(promise, this._pendingTasks);
      if (pendingTasksIndex < 0) {
        log_default.warn("SF", "request to update the priority of a non-existent task");
        return;
      }
      const task = this._pendingTasks[pendingTasksIndex];
      if (task.priority === priority) {
        return;
      }
      const prevPriority = task.priority;
      task.priority = priority;
      if (this._minPendingPriority === null || priority < this._minPendingPriority) {
        this._minPendingPriority = priority;
      } else if (this._minPendingPriority === prevPriority) {
        if (this._pendingTasks.length === 1) {
          this._minPendingPriority = priority;
        } else {
          this._minPendingPriority = Math.min(...this._pendingTasks.map((t) => t.priority));
        }
        this._loopThroughWaitingQueue();
      }
      if (this._isRunningHighPriorityTasks()) {
        this._interruptCancellableTasks();
      }
    }
    /**
     * Browse the current waiting queue and start all task in it that needs to be
     * started: start the ones with the lowest priority value below
     * `_minPendingPriority`.
     *
     * Private properties, such as `_minPendingPriority` are updated accordingly
     * while this method is called.
     */
    _loopThroughWaitingQueue() {
      const minWaitingPriority = this._waitingQueue.reduce((acc, elt) => {
        return acc === null || acc > elt.priority ? elt.priority : acc;
      }, null);
      if (minWaitingPriority === null || this._minPendingPriority !== null && this._minPendingPriority < minWaitingPriority) {
        return;
      }
      for (let i = 0; i < this._waitingQueue.length; i++) {
        const priorityToCheck = this._minPendingPriority === null ? minWaitingPriority : Math.min(this._minPendingPriority, minWaitingPriority);
        const elt = this._waitingQueue[i];
        if (elt.priority <= priorityToCheck) {
          this._findAndRunWaitingQueueTask(i);
          i--;
        }
      }
    }
    /**
     * Interrupt and move back to the waiting queue all pending tasks that are
     * low priority (having a higher priority number than
     * `this._prioritySteps.low`).
     */
    _interruptCancellableTasks() {
      for (const pendingObj of this._pendingTasks) {
        if (pendingObj.priority >= this._prioritySteps.low) {
          this._interruptPendingTask(pendingObj);
          return this._interruptCancellableTasks();
        }
      }
    }
    /**
     * Start task which is at the given index in the waiting queue.
     * The task will be removed from the waiting queue in the process.
     * @param {number} index
     */
    _findAndRunWaitingQueueTask(index) {
      if (index >= this._waitingQueue.length || index < 0) {
        log_default.warn("SF", "Tried to start a non existing task");
        return false;
      }
      const task = this._waitingQueue.splice(index, 1)[0];
      task.trigger();
      return true;
    }
    /**
     * Move back pending task to the waiting queue and interrupt it.
     * @param {object} task
     */
    _interruptPendingTask(task) {
      var _a2;
      const pendingTasksIndex = _findTaskIndex(task.taskFn, this._pendingTasks);
      if (pendingTasksIndex < 0) {
        log_default.warn("SF", "Interrupting a non-existent pending task. Aborting...");
        return;
      }
      this._pendingTasks.splice(pendingTasksIndex, 1);
      this._waitingQueue.push(task);
      if (this._pendingTasks.length === 0) {
        this._minPendingPriority = null;
      } else if (this._minPendingPriority === task.priority) {
        this._minPendingPriority = Math.min(...this._pendingTasks.map((t) => t.priority));
      }
      (_a2 = task.interrupter) == null ? void 0 : _a2.cancel("TaskPrioritizer interrupt");
    }
    /**
     * Return `true` if the given task can be started immediately based on its
     * priority.
     * @param {Object} task
     * @returns {boolean}
     */
    _canBeStartedNow(task) {
      return this._minPendingPriority === null || task.priority <= this._minPendingPriority;
    }
    /**
     * Returns `true` if any running task is considered "high priority".
     * returns `false` otherwise.
     * @returns {boolean}
     */
    _isRunningHighPriorityTasks() {
      return this._minPendingPriority !== null && this._minPendingPriority <= this._prioritySteps.high;
    }
  };
  function _findTaskIndex(taskFn, queue) {
    return arrayFindIndex(queue, (elt) => elt.taskFn === taskFn);
  }

  // src/core/fetchers/segment/segment_queue_creator.ts
  var SegmentQueueCreator = class {
    /**
     * @param {Object} transport
     * @param {Object} cdnPrioritizer
     * @param {Object|null} cmcdDataBuilder
     * @param {Object} options
     */
    constructor(transport, cdnPrioritizer, cmcdDataBuilder, options) {
      const { MIN_CANCELABLE_PRIORITY, MAX_HIGH_PRIORITY_LEVEL } = config_default.getCurrent();
      this._transport = transport;
      this._prioritizer = new TaskPrioritizer({
        prioritySteps: {
          high: MAX_HIGH_PRIORITY_LEVEL,
          low: MIN_CANCELABLE_PRIORITY
        }
      });
      this._cdnPrioritizer = cdnPrioritizer;
      this._backoffOptions = options;
      this._cmcdDataBuilder = cmcdDataBuilder;
    }
    /**
     * Create a `SegmentQueue`, allowing to easily perform segment requests.
     * @param {string} bufferType - The type of buffer concerned (e.g. "audio",
     * "video", etc.)
     * @param {Object} eventListeners
     * @param {Object} isMediaSegmentQueueInterrupted - Wheter the downloading of media
     * segment should be interrupted or not.
     * @returns {Object} - `SegmentQueue`, which is an abstraction allowing to
     * perform a queue of segment requests for a given media type (here defined by
     * `bufferType`) with associated priorities.
     */
    createSegmentQueue(bufferType, eventListeners, isMediaSegmentQueueInterrupted) {
      const requestOptions = getSegmentFetcherRequestOptions(this._backoffOptions);
      const pipelines = this._transport[bufferType];
      const segmentFetcher = createSegmentFetcher({
        bufferType,
        pipeline: pipelines,
        cdnPrioritizer: this._cdnPrioritizer,
        cmcdDataBuilder: this._cmcdDataBuilder,
        eventListeners,
        requestOptions
      });
      const prioritizedSegmentFetcher = applyPrioritizerToSegmentFetcher(
        this._prioritizer,
        segmentFetcher
      );
      return new SegmentQueue(prioritizedSegmentFetcher, isMediaSegmentQueueInterrupted);
    }
  };

  // src/core/fetchers/segment/index.ts
  var segment_default = SegmentQueueCreator;

  // src/core/fetchers/thumbnails/thumbnail_fetcher.ts
  function createThumbnailFetcher(pipeline, cdnPrioritizer) {
    const { loadThumbnail: loadThumbnail2 } = pipeline;
    const pendingRequestsInfo = [];
    return async function fetchThumbnail(thumbnailContext, cancellationSignal) {
      cancellationSignal.register(onCancellation);
      let currRequestInfo;
      const pendingInfo = arrayFind(pendingRequestsInfo, ({ thumbnailContext: pCtxt }) => {
        return pCtxt.period.id === thumbnailContext.period.id && pCtxt.track.id === thumbnailContext.track.id && pCtxt.segment.id === thumbnailContext.segment.id;
      });
      if (pendingInfo !== void 0) {
        log_default.debug("Thumbnails", "Requesting same thumbnail than the pending one", {
          time: thumbnailContext.segment.time
        });
        currRequestInfo = pendingInfo;
        currRequestInfo.referenceCount++;
        let response;
        try {
          response = await currRequestInfo.promise;
        } catch (err) {
          cancellationSignal.deregister(onCancellation);
          throw err;
        }
        cancellationSignal.deregister(onCancellation);
        return response;
      }
      const { segment: thumbnail, track: thumbnailTrack } = thumbnailContext;
      const requestOptions = getThumbnailFetcherRequestOptions({});
      let connectionTimeout;
      if (requestOptions.connectionTimeout === void 0 || requestOptions.connectionTimeout < 0) {
        connectionTimeout = void 0;
      } else {
        connectionTimeout = requestOptions.connectionTimeout;
      }
      const pipelineRequestOptions = {
        timeout: requestOptions.requestTimeout < 0 ? void 0 : requestOptions.requestTimeout,
        connectionTimeout,
        cmcdPayload: void 0
      };
      const requestCanceller = new TaskCanceller("Thumbnail request");
      const fetchPromise = doFetch();
      currRequestInfo = {
        thumbnailContext,
        promise: fetchPromise,
        referenceCount: 1
      };
      pendingRequestsInfo.push(currRequestInfo);
      const clearRequestInfo = () => {
        const currRequestIdx = pendingRequestsInfo.indexOf(currRequestInfo);
        if (currRequestIdx >= 0) {
          pendingRequestsInfo.splice(currRequestIdx, 1);
        }
      };
      try {
        const fetchResult = await fetchPromise;
        clearRequestInfo();
        return fetchResult;
      } catch (err) {
        clearRequestInfo();
        throw err;
      }
      async function doFetch() {
        log_default.debug("Thumbnails", "Beginning thumbnail request", { time: thumbnail.time });
        let res;
        try {
          res = await scheduleRequestWithCdns(
            thumbnailTrack.cdnMetadata,
            cdnPrioritizer,
            callLoaderWithUrl,
            object_assign_default({ onRetry }, requestOptions),
            requestCanceller.signal
          );
          if (cancellationSignal.isCancelled()) {
            return Promise.reject(cancellationSignal.cancellationError);
          }
          log_default.debug("Thumbnails", "Thumbnail request ended with success", {
            time: thumbnail.time
          });
          cancellationSignal.deregister(onCancellation);
        } catch (err) {
          cancellationSignal.deregister(onCancellation);
          if (err instanceof CancellationError) {
            log_default.debug("Thumbnails", "Thumbnail request aborted", { time: thumbnail.time });
            throw err;
          }
          log_default.debug("Thumbnails", "Thumbnail request failed", { time: thumbnail.time });
          throw errorSelector(err);
        }
        try {
          const parsed = pipeline.parseThumbnail(res.responseData, {
            thumbnail,
            thumbnailTrack
          });
          return parsed;
        } catch (error) {
          throw formatError(error, {
            defaultCode: "PIPELINE_PARSE_ERROR",
            defaultReason: "Unknown parsing error"
          });
        }
      }
      function onCancellation() {
        log_default.debug("Thumbnails", "Thumbnail request cancelled", { time: thumbnail.time });
        const requestIdx = pendingRequestsInfo.indexOf(currRequestInfo);
        if (requestIdx < 0) {
          return;
        }
        pendingRequestsInfo[requestIdx].referenceCount--;
        if (pendingRequestsInfo[requestIdx].referenceCount <= 0) {
          requestCanceller.cancel("Thumbnail request aborted");
          pendingRequestsInfo.splice(requestIdx, 1);
        }
      }
      function callLoaderWithUrl(cdnMetadata) {
        return loadThumbnail2(
          cdnMetadata,
          thumbnail,
          pipelineRequestOptions,
          cancellationSignal
        );
      }
      function onRetry(err) {
        const formattedErr = errorSelector(err);
        log_default.warn(
          "Thumbnails",
          "Thumbnail request retry ",
          {
            time: thumbnail.time
          },
          formattedErr
        );
      }
    };
  }
  function getThumbnailFetcherRequestOptions({
    maxRetry,
    requestTimeout,
    connectionTimeout
  }) {
    const {
      DEFAULT_MAX_THUMBNAIL_REQUESTS_RETRY_ON_ERROR,
      DEFAULT_THUMBNAIL_REQUEST_TIMEOUT,
      DEFAULT_THUMBNAIL_CONNECTION_TIMEOUT,
      INITIAL_BACKOFF_DELAY_BASE,
      MAX_BACKOFF_DELAY_BASE
    } = config_default.getCurrent();
    return {
      maxRetry: maxRetry != null ? maxRetry : DEFAULT_MAX_THUMBNAIL_REQUESTS_RETRY_ON_ERROR,
      baseDelay: INITIAL_BACKOFF_DELAY_BASE.REGULAR,
      maxDelay: MAX_BACKOFF_DELAY_BASE.REGULAR,
      requestTimeout: requestTimeout === void 0 ? DEFAULT_THUMBNAIL_REQUEST_TIMEOUT : requestTimeout,
      connectionTimeout: connectionTimeout === void 0 ? DEFAULT_THUMBNAIL_CONNECTION_TIMEOUT : connectionTimeout
    };
  }

  // src/core/entry/core_text_displayer_interface.ts
  var CoreTextDisplayerInterface = class {
    /**
     * @param {string} contentId
     * @param {Object} messageSender
     */
    constructor(contentId, messageSender) {
      this._contentId = contentId;
      this._messageSender = messageSender;
      this._queues = { pushTextData: [], remove: [] };
    }
    /**
     * @see ITextDisplayerInterface
     */
    pushTextData(infos) {
      return new Promise((resolve, reject) => {
        this._messageSender({
          type: "push-text-data" /* PushTextData */,
          contentId: this._contentId,
          value: infos
        });
        this._queues.pushTextData.push({ resolve, reject });
      });
    }
    /**
     * @see ITextDisplayerInterface
     */
    remove(start, end) {
      return new Promise((resolve, reject) => {
        this._messageSender({
          type: "remove-text-data" /* RemoveTextData */,
          contentId: this._contentId,
          value: { start, end }
        });
        this._queues.remove.push({ resolve, reject });
      });
    }
    /**
     * @see ITextDisplayerInterface
     */
    reset() {
      this._messageSender({
        type: "reset-text-displayer" /* ResetTextDisplayer */,
        contentId: this._contentId,
        value: null
      });
      this._resetCurrentQueue("WorkerTextDisplayerInterface reset");
    }
    /**
     * @see ITextDisplayerInterface
     */
    stop(reason) {
      this._messageSender({
        type: "stop-text-displayer" /* StopTextDisplayer */,
        contentId: this._contentId,
        value: null
      });
      this._resetCurrentQueue(reason);
    }
    _resetCurrentQueue(reason) {
      const error = new CancellationError(
        "WorkerTextDisplayerInterface queue",
        reason != null ? reason : "reset"
      );
      this._queues.pushTextData.forEach((elt) => {
        elt.reject(error);
      });
      this._queues.remove.forEach((elt) => {
        elt.reject(error);
      });
    }
    /**
     * @param {Array.<Object>} ranges
     */
    onPushedTrackSuccess(ranges) {
      const element = this._queues.pushTextData.shift();
      if (element === void 0) {
        log_default.error("text", "pushTextData success for inexistant operation");
        return;
      }
      element.resolve(ranges);
    }
    /**
     * @param {unknown} err
     */
    onPushedTrackError(err) {
      const element = this._queues.pushTextData.shift();
      if (element === void 0) {
        log_default.error("text", "pushTextData error for inexistant operation");
        return;
      }
      element.reject(err);
    }
    /**
     * @param {Array.<Object>} ranges
     */
    onRemoveSuccess(ranges) {
      const element = this._queues.remove.shift();
      if (element === void 0) {
        log_default.error("text", "remove success for inexistant operation");
        return;
      }
      element.resolve(ranges);
    }
    /**
     * @param {unknown} err
     */
    onRemoveError(err) {
      const element = this._queues.pushTextData.shift();
      if (element === void 0) {
        log_default.error("text", "pushTextData error for inexistant operation");
        return;
      }
      element.reject(err);
    }
  };

  // src/core/entry/FreezeResolver.ts
  var MINIMUM_BUFFER_GAP_AT_READY_STATE_1_BEFORE_FREEZING = 6;
  var FREEZING_FOR_TOO_LONG_DELAY = 4e3;
  var MINIMUM_TIME_BETWEEN_FREEZE_HANDLING = 6e3;
  var MAXIMUM_SEGMENT_HISTORY_RETENTION_TIME = 6e4;
  var FreezeResolver = class {
    constructor(segmentSinksStore) {
      this._segmentSinksStore = segmentSinksStore;
      this._decipherabilityFreezeStartingTimestamp = null;
      this._ignoreFreezeUntil = null;
      this._lastFlushAttempt = null;
      this._lastSegmentInfo = {
        audio: [],
        video: []
      };
    }
    /**
     * Check that playback is not freezing, and if it is, return a solution that
     * should be attempted to unfreeze it.
     *
     * Returns `null` either when there's no freeze happening or if there's one
     * but there's nothing we should do about it yet.
     *
     * Refer to the returned type's definition for more information.
     *
     * @param {Object} observation - The last playback observation produced, it
     * has to be recent (just triggered for example).
     * @returns {Object|null}
     */
    onNewObservation(observation) {
      var _a2, _b2;
      const now = monotonic_timestamp_default();
      this._addPositionToHistory(observation, now);
      if (this._ignoreFreezeUntil !== null && now < this._ignoreFreezeUntil) {
        return null;
      }
      this._ignoreFreezeUntil = null;
      const {
        UNFREEZING_SEEK_DELAY,
        UNFREEZING_DELTA_POSITION,
        FREEZING_FLUSH_FAILURE_DELAY
      } = config_default.getCurrent();
      const { readyState, rebuffering, freezing, fullyLoaded } = observation;
      const freezingPosition = observation.position.getPolled();
      const bufferGap = normalizeBufferGap(observation.bufferGap);
      const isFrozen = freezing !== null || // When rebuffering or loading the content, `freezing` might be not
      // set as we're actively pausing playback.
      // Yet, rebuffering occurences can also be abnormal, such as when enough
      // buffer is constructed but with a low readyState (those are generally
      // decryption issues).
      readyState === 1 && (bufferGap >= MINIMUM_BUFFER_GAP_AT_READY_STATE_1_BEFORE_FREEZING || fullyLoaded);
      if (!isFrozen) {
        this._decipherabilityFreezeStartingTimestamp = null;
        return null;
      }
      const freezingTs = (_b2 = (_a2 = freezing == null ? void 0 : freezing.timestamp) != null ? _a2 : rebuffering == null ? void 0 : rebuffering.timestamp) != null ? _b2 : null;
      log_default.info("Freeze", "Freeze detected", {
        freezeStart: freezingTs,
        timeFrozen: now - (freezingTs != null ? freezingTs : now)
      });
      const recentFlushAttemptFailed = this._lastFlushAttempt !== null && now - this._lastFlushAttempt.timestamp < FREEZING_FLUSH_FAILURE_DELAY.MAXIMUM && now - this._lastFlushAttempt.timestamp >= FREEZING_FLUSH_FAILURE_DELAY.MINIMUM && Math.abs(freezingPosition - this._lastFlushAttempt.position) < FREEZING_FLUSH_FAILURE_DELAY.POSITION_DELTA;
      if (recentFlushAttemptFailed) {
        const secondUnfreezeStrat = this._getStrategyIfFlushingFails(freezingPosition);
        this._decipherabilityFreezeStartingTimestamp = null;
        this._ignoreFreezeUntil = now + MINIMUM_TIME_BETWEEN_FREEZE_HANDLING;
        return secondUnfreezeStrat;
      }
      const decipherabilityFreezeStrat = this._checkForDecipherabilityRelatedFreeze(
        observation,
        now
      );
      if (decipherabilityFreezeStrat !== null) {
        return decipherabilityFreezeStrat;
      }
      if (freezingTs !== null && now - freezingTs > UNFREEZING_SEEK_DELAY) {
        this._lastFlushAttempt = {
          timestamp: now,
          position: freezingPosition + UNFREEZING_DELTA_POSITION
        };
        log_default.debug("Freeze", "Trying to flush to un-freeze");
        this._decipherabilityFreezeStartingTimestamp = null;
        this._ignoreFreezeUntil = now + MINIMUM_TIME_BETWEEN_FREEZE_HANDLING;
        return {
          type: "flush",
          value: { relativeSeek: UNFREEZING_DELTA_POSITION }
        };
      }
      return null;
    }
    /**
     * Performs decipherability-related checks if it makes sense.
     *
     * If decipherability-related checks have been performed **AND** an
     * un-freezing strategy has been selected by this method, then return
     * an object describing this wanted unfreezing strategy.
     *
     * If this method decides to take no action for now, it returns `null`.
     * @param {Object} observation - playback observation that has just been
     * performed.
     * @param {number} now - Monotonically-raising timestamp for the current
     * time.
     * @returns {Object|null}
     */
    _checkForDecipherabilityRelatedFreeze(observation, now) {
      const { readyState, rebuffering, freezing, fullyLoaded } = observation;
      const bufferGap = normalizeBufferGap(observation.bufferGap);
      const rebufferingForTooLong = rebuffering !== null && now - rebuffering.timestamp > FREEZING_FOR_TOO_LONG_DELAY;
      const { hasUndecipherableData, hasEncryptedData } = haveBuffersUndecipherableData(
        this._segmentSinksStore
      );
      if (hasUndecipherableData === true) {
        log_default.warn("Freeze", "we have undecipherable segments left in the buffer, reloading");
        this._decipherabilityFreezeStartingTimestamp = null;
        this._ignoreFreezeUntil = now + MINIMUM_TIME_BETWEEN_FREEZE_HANDLING;
        return { type: "reload", value: null };
      }
      const frozenForTooLong = freezing !== null && now - freezing.timestamp > FREEZING_FOR_TOO_LONG_DELAY;
      const hasDecipherabilityFreezePotential = (rebufferingForTooLong || frozenForTooLong) && (bufferGap >= MINIMUM_BUFFER_GAP_AT_READY_STATE_1_BEFORE_FREEZING || fullyLoaded) && readyState <= 1;
      if (!hasDecipherabilityFreezePotential) {
        this._decipherabilityFreezeStartingTimestamp = null;
      } else if (this._decipherabilityFreezeStartingTimestamp === null) {
        log_default.debug("Freeze", "Start of a potential decipherability freeze detected");
        this._decipherabilityFreezeStartingTimestamp = now;
      }
      const shouldHandleDecipherabilityFreeze = this._decipherabilityFreezeStartingTimestamp !== null && monotonic_timestamp_default() - this._decipherabilityFreezeStartingTimestamp > FREEZING_FOR_TOO_LONG_DELAY;
      if (shouldHandleDecipherabilityFreeze && hasEncryptedData && hasUndecipherableData === false) {
        log_default.warn(
          "Freeze",
          "we are frozen despite only having decipherable segments left in the buffer, reloading"
        );
        this._decipherabilityFreezeStartingTimestamp = null;
        this._ignoreFreezeUntil = now + MINIMUM_TIME_BETWEEN_FREEZE_HANDLING;
        return { type: "reload", value: null };
      }
      return null;
    }
    /**
     * This method should only be called if a "flush" strategy has recently be
     * taken to try to unfreeze playback yet playback is still frozen.
     *
     * It considers the current played content and returns a more-involved
     * unfreezing strategy (most often reload-related) to try to unfree playback.
     * @param {number} freezingPosition - The playback position at which we're
     * currently frozen.
     * @returns {Object}
     */
    _getStrategyIfFlushingFails(freezingPosition) {
      log_default.warn(
        "Freeze",
        "A recent flush seemed to have no effect on freeze, checking for transitions"
      );
      const toAvoid = [];
      for (const ttype of ["audio", "video"]) {
        const segmentList = this._lastSegmentInfo[ttype];
        if (segmentList.length === 0) {
          continue;
        }
        let currentSegmentEntry = segmentList[segmentList.length - 1];
        if (currentSegmentEntry.segment === null) {
          continue;
        }
        const currentSegment = currentSegmentEntry.segment;
        let previousRepresentationEntry;
        for (let i = segmentList.length - 2; i >= 0; i--) {
          const segment = segmentList[i];
          if (segment.segment === null) {
            previousRepresentationEntry = segment;
            break;
          } else if (segment.segment.infos.representation.uniqueId !== currentSegment.infos.representation.uniqueId && currentSegmentEntry.timestamp - segment.timestamp < 5e3) {
            previousRepresentationEntry = segment;
            break;
          } else if (segment.segment.start === currentSegment.start && // Ignore history entry concerning the same segment more than 3
          // seconds of playback behind - we don't want to compare things
          // that happended too long ago.
          freezingPosition - segment.position < 3e3) {
            currentSegmentEntry = segment;
          }
        }
        if (previousRepresentationEntry === void 0 || previousRepresentationEntry.segment === null) {
          log_default.debug(
            "Freeze",
            "Freeze when beginning to play a content, try avoiding this quality"
          );
          toAvoid.push({
            adaptation: currentSegment.infos.adaptation,
            period: currentSegment.infos.period,
            representation: currentSegment.infos.representation
          });
        } else if (currentSegment.infos.period.id !== previousRepresentationEntry.segment.infos.period.id) {
          log_default.debug("Freeze", "Freeze when switching Period, reloading");
          return { type: "reload", value: null };
        } else if (currentSegment.infos.representation.uniqueId !== previousRepresentationEntry.segment.infos.representation.uniqueId) {
          log_default.warn("Freeze", "Freeze when switching Representation, avoiding", {
            bitrate: currentSegment.infos.representation.bitrate
          });
          toAvoid.push({
            adaptation: currentSegment.infos.adaptation,
            period: currentSegment.infos.period,
            representation: currentSegment.infos.representation
          });
        }
      }
      if (toAvoid.length > 0) {
        return { type: "avoid-representations", value: toAvoid };
      } else {
        log_default.debug("Freeze", "Reloading because flush doesn't work");
        return { type: "reload", value: null };
      }
    }
    /**
     * Add entry to `this._lastSegmentInfo` for the position that is currently
     * played according to the given `observation`.
     *
     * @param {Object} observation
     * @param {number} currentTimestamp
     */
    _addPositionToHistory(observation, currentTimestamp) {
      var _a2, _b2;
      const position = observation.position.getPolled();
      for (const ttype of ["audio", "video"]) {
        const status = this._segmentSinksStore.getStatus(ttype);
        if (status.type === "initialized") {
          for (const segment of status.value.getLastKnownInventory()) {
            if (((_a2 = segment.bufferedStart) != null ? _a2 : segment.start) <= position && ((_b2 = segment.bufferedEnd) != null ? _b2 : segment.end) > position) {
              this._lastSegmentInfo[ttype].push({
                segment,
                position,
                timestamp: currentTimestamp
              });
            }
          }
        } else {
          this._lastSegmentInfo[ttype].push({
            segment: null,
            position,
            timestamp: currentTimestamp
          });
        }
        if (this._lastSegmentInfo[ttype].length > 100) {
          const toRemove = this._lastSegmentInfo[ttype].length - 100;
          this._lastSegmentInfo[ttype].splice(0, toRemove);
        }
        const removalTs = currentTimestamp - MAXIMUM_SEGMENT_HISTORY_RETENTION_TIME;
        let i;
        for (i = 0; i < this._lastSegmentInfo[ttype].length; i++) {
          if (this._lastSegmentInfo[ttype][i].timestamp > removalTs) {
            break;
          }
        }
        if (i > 0) {
          this._lastSegmentInfo[ttype].splice(0, i);
        }
      }
    }
  };
  function haveBuffersUndecipherableData(segmentSinksStore) {
    let hasOnlyDecipherableSegments = true;
    let isClear = true;
    for (const ttype of ["audio", "video"]) {
      const status = segmentSinksStore.getStatus(ttype);
      if (status.type === "initialized") {
        for (const segment of status.value.getLastKnownInventory()) {
          const { representation } = segment.infos;
          if (representation.decipherable === false) {
            return { hasUndecipherableData: true, hasEncryptedData: true };
          } else if (representation.contentProtections !== void 0) {
            isClear = false;
            if (representation.decipherable !== true) {
              hasOnlyDecipherableSegments = false;
            }
          }
        }
      }
    }
    return {
      hasEncryptedData: !isClear,
      hasUndecipherableData: hasOnlyDecipherableSegments ? false : void 0
    };
  }
  function normalizeBufferGap(bufferGap) {
    return bufferGap !== void 0 && isFinite(bufferGap) ? bufferGap : 0;
  }

  // src/core/entry/track_choice_setter.ts
  var TrackChoiceSetter = class {
    constructor() {
      this._refs = /* @__PURE__ */ new Map();
    }
    reset() {
      var _a2, _b2, _c2, _d2, _e2, _f, _g, _h, _i, _j, _k, _l;
      for (const key of this._refs.keys()) {
        (_b2 = (_a2 = this._refs.get(key)) == null ? void 0 : _a2.audio) == null ? void 0 : _b2.trackReference.finish();
        (_d2 = (_c2 = this._refs.get(key)) == null ? void 0 : _c2.audio) == null ? void 0 : _d2.representations.finish();
        (_f = (_e2 = this._refs.get(key)) == null ? void 0 : _e2.video) == null ? void 0 : _f.trackReference.finish();
        (_h = (_g = this._refs.get(key)) == null ? void 0 : _g.video) == null ? void 0 : _h.representations.finish();
        (_j = (_i = this._refs.get(key)) == null ? void 0 : _i.text) == null ? void 0 : _j.trackReference.finish();
        (_l = (_k = this._refs.get(key)) == null ? void 0 : _k.text) == null ? void 0 : _l.representations.finish();
      }
      this._refs = /* @__PURE__ */ new Map();
    }
    addTrackSetter(periodId, bufferType, ref) {
      var _a2, _b2;
      let obj = this._refs.get(periodId);
      if (obj === void 0) {
        obj = {};
        this._refs.set(periodId, obj);
      }
      if (obj[bufferType] !== void 0) {
        log_default.warn("Track", "Track for periodId already declared", { periodId, bufferType });
        (_a2 = obj[bufferType]) == null ? void 0 : _a2.trackReference.finish();
        (_b2 = obj[bufferType]) == null ? void 0 : _b2.representations.finish();
      }
      const val = ref.getValue();
      let representations;
      if (isNullOrUndefined(val)) {
        representations = new reference_default({
          representationIds: [],
          switchingMode: "lazy"
        });
      } else {
        representations = new reference_default(
          val.representations.getValue()
        );
        ref.setValue(
          object_assign_default({}, val, {
            representations
          })
        );
      }
      obj[bufferType] = {
        trackReference: ref,
        representations
      };
    }
    setTrack(periodId, bufferType, choice) {
      var _a2;
      const ref = (_a2 = this._refs.get(periodId)) == null ? void 0 : _a2[bufferType];
      if (ref === void 0) {
        log_default.debug("Track", "Setting track for inexistent periodId", {
          periodId,
          bufferType
        });
        return false;
      }
      if (isNullOrUndefined(choice)) {
        ref.representations = new reference_default({
          representationIds: [],
          switchingMode: "lazy"
        });
        ref.trackReference.setValue(choice);
      } else {
        ref.representations = new reference_default(choice.initialRepresentations);
        ref.trackReference.setValue({
          adaptationId: choice.adaptationId,
          switchingMode: choice.switchingMode,
          representations: ref.representations,
          relativeResumingPosition: choice.relativeResumingPosition
        });
      }
      return true;
    }
    updateRepresentations(periodId, adaptationId, bufferType, choice) {
      var _a2;
      const ref = (_a2 = this._refs.get(periodId)) == null ? void 0 : _a2[bufferType];
      if (ref === void 0) {
        log_default.debug("Track", "Setting track for inexistent periodId", {
          periodId,
          bufferType
        });
        return false;
      }
      const val = ref.trackReference.getValue();
      if (isNullOrUndefined(val) || val.adaptationId !== adaptationId) {
        log_default.debug("Track", "Desynchronized Adaptation id", {
          oldId: val == null ? void 0 : val.adaptationId,
          newId: adaptationId
        });
        return false;
      }
      ref.representations.setValue(choice);
      return true;
    }
    removeTrackSetter(periodId, bufferType) {
      const obj = this._refs.get(periodId);
      const ref = obj == null ? void 0 : obj[bufferType];
      if (obj === void 0 || ref === void 0) {
        log_default.debug("Track", "Removing track setter for inexistent periodId", {
          periodId,
          bufferType
        });
        return false;
      }
      ref.trackReference.finish();
      ref.representations.finish();
      delete obj[bufferType];
      if (Object.keys(obj).length === 0) {
        this._refs.delete(periodId);
      }
      return true;
    }
  };

  // src/core/entry/utils.ts
  function formatErrorForSender(error) {
    const formattedError = formatError(error, {
      defaultCode: "NONE",
      defaultReason: "An unknown error stopped content playback."
    });
    return formattedError.serialize();
  }

  // src/core/entry/content_preparer.ts
  var generateMediaSourceId2 = idGenerator();
  var ContentPreparer = class {
    /**
     * @param {Object} capabilities
     * @param {boolean} capabilities.hasVideo - If `true`, we're playing on an
     * element which has video capabilities.
     * If `false`, we're only able to play audio, optionally with subtitles.
     *
     * Typically this boolean is `true` for `<video>` HTMLElement and `false` for
     * `<audio>` HTMLElement.
     */
    constructor({ hasVideo }) {
      this._currentContent = null;
      this._currentMediaSourceCanceller = new TaskCanceller("ContentPreparer MediaSource");
      this._hasVideo = hasVideo;
      const contentCanceller = new TaskCanceller("ContentPreparer");
      this._contentCanceller = contentCanceller;
    }
    /**
     * Start fetching the wanted content's Manifest and initializing the various
     * modules stored by the `ContentPreparer` linked to that content.
     *
     * The returned Promise resolves with the parsed Manifest when those modules
     * are all ready and you can thus begin to load the content.
     *
     * Reject if it failed to do so.
     * @param {Object} context - Information on the content that should be
     * initialized.
     * @returns {Promise.<Object>}
     */
    initializeNewContent(sendMessage2, context, throttlers) {
      return new Promise((res, rej) => {
        var _a2, _b2;
        this.disposeCurrentContent("new init");
        const contentCanceller = this._contentCanceller;
        const currentMediaSourceCanceller = new TaskCanceller(
          "ContentPreparer MediaSource"
        );
        this._currentMediaSourceCanceller = currentMediaSourceCanceller;
        currentMediaSourceCanceller.linkToSignal(contentCanceller.signal);
        const {
          contentId,
          url,
          hasText,
          transportOptions,
          useMseInWorker,
          enableRepresentationAvoidance,
          transport
        } = context;
        let manifest = null;
        const transportFn = features_default.transports[transport];
        if (typeof transportFn !== "function") {
          rej(
            new Error(
              `transport "${transport}" not supported. Did you add the corresponding feature?`
            )
          );
          return;
        }
        const representationFilter = typeof transportOptions.representationFilter === "string" ? createRepresentationFilterFromFnString(transportOptions.representationFilter) : transportOptions.representationFilter;
        const transportPipelines = transportFn(__spreadProps(__spreadValues({}, transportOptions), {
          representationFilter
        }));
        const cmcdDataBuilder = context.cmcd === void 0 ? null : new cmcd_default(context.cmcd);
        const manifestFetcher = new manifest_default(
          url === void 0 ? void 0 : [url],
          transportPipelines,
          __spreadValues({
            cmcdDataBuilder
          }, context.manifestRetryOptions)
        );
        const representationEstimator = adaptive_default({
          initialBitrates: {
            audio: (_a2 = context.initialAudioBitrate) != null ? _a2 : 0,
            video: (_b2 = context.initialVideoBitrate) != null ? _b2 : 0
          },
          lowLatencyMode: transportOptions.lowLatencyMode,
          throttlers
        });
        const unbindRejectOnCancellation = currentMediaSourceCanceller.signal.register(
          (error) => {
            rej(error);
          }
        );
        const cdnPrioritizer = new CdnPrioritizer(contentCanceller.signal);
        const segmentQueueCreator = new segment_default(
          transportPipelines,
          cdnPrioritizer,
          cmcdDataBuilder,
          context.segmentRetryOptions
        );
        const fetchThumbnailData = createThumbnailFetcher(
          transportPipelines.thumbnails,
          cdnPrioritizer
        );
        const trackChoiceSetter = new TrackChoiceSetter();
        const [mediaSource, segmentSinksStore, coreTextSender] = createMediaSourceInterfaceAndSegmentSinksStore(
          sendMessage2,
          contentId,
          {
            useMseInWorker,
            hasVideo: this._hasVideo,
            hasText
          },
          currentMediaSourceCanceller.signal
        );
        const freezeResolver = new FreezeResolver(segmentSinksStore);
        this._currentContent = {
          cmcdDataBuilder,
          contentId,
          enableRepresentationAvoidance,
          freezeResolver,
          mediaSource,
          manifest: null,
          manifestFetcher,
          representationEstimator,
          segmentSinksStore,
          segmentQueueCreator,
          fetchThumbnailData,
          coreTextSender,
          trackChoiceSetter,
          useMseInWorker
        };
        mediaSource.addEventListener(
          "mediaSourceOpen",
          function() {
            checkIfReadyAndValidate();
          },
          currentMediaSourceCanceller.signal
        );
        contentCanceller.signal.register((err) => {
          manifestFetcher.dispose(err.reason);
        });
        manifestFetcher.addEventListener(
          "warning",
          (err) => {
            sendMessage2({
              type: "warning" /* Warning */,
              contentId,
              value: formatErrorForSender(err)
            });
          },
          contentCanceller.signal
        );
        manifestFetcher.addEventListener(
          "manifestReady",
          (man) => {
            if (manifest !== null) {
              log_default.warn("Core", "Multiple `manifestReady` events, ignoring");
              return;
            }
            manifest = man;
            if (this._currentContent !== null) {
              this._currentContent.manifest = manifest;
            }
            checkIfReadyAndValidate();
          },
          currentMediaSourceCanceller.signal
        );
        manifestFetcher.addEventListener(
          "error",
          (err) => {
            sendMessage2({
              type: "error" /* Error */,
              contentId,
              value: formatErrorForSender(err)
            });
            rej(err);
          },
          contentCanceller.signal
        );
        manifestFetcher.start();
        function checkIfReadyAndValidate() {
          if (manifest === null || mediaSource.readyState === "closed" || currentMediaSourceCanceller.isUsed()) {
            return;
          }
          updateCodecSupportInWorkerMode(manifest);
          manifest.addEventListener(
            "manifestUpdate",
            (updates) => {
              if (manifest === null) {
                return;
              }
              sendMessage2({
                type: "manifest-update" /* ManifestUpdate */,
                contentId,
                value: { manifest, updates }
              });
            },
            contentCanceller.signal
          );
          unbindRejectOnCancellation();
          res(manifest);
        }
      });
    }
    /**
     * Get information on the current content prepared through the
     * `initializeNewContent` method, or `null` if no content is currently
     * prepared.
     * @returns {Object|null}
     */
    getCurrentContent() {
      return this._currentContent;
    }
    /**
     * Schedule an update for the Manifest file,
     *
     * Do nothing if no content is currently prepared.
     * @param {Object} settings - Various settings to configure the ways and
     * moment at which the Manifest will be refreshed.
     */
    scheduleManifestRefresh(settings) {
      var _a2;
      (_a2 = this._currentContent) == null ? void 0 : _a2.manifestFetcher.scheduleManualRefresh(settings);
    }
    /**
     * Change the MediaSource attached for the current content.
     * It is assumed that main thread is already notified that such a reload is
     * happening.
     *
     * The returned Promise resolves when it restarts being ready.
     * @param {Function} sendMessage
     * @returns {Promise}
     */
    reloadMediaSource(sendMessage2) {
      this._currentMediaSourceCanceller.cancel("ContentPreparer MediaSource reload");
      if (this._currentContent === null) {
        return Promise.reject(new Error("CP: No content anymore"));
      }
      this._currentContent.trackChoiceSetter.reset();
      this._currentMediaSourceCanceller = new TaskCanceller("ContentPreparer MediaSource");
      const [mediaSourceInterface, segmentSinksStore, coreTextSender] = createMediaSourceInterfaceAndSegmentSinksStore(
        sendMessage2,
        this._currentContent.contentId,
        {
          useMseInWorker: this._currentContent.useMseInWorker,
          hasVideo: this._hasVideo,
          hasText: this._currentContent.coreTextSender !== null
        },
        this._currentMediaSourceCanceller.signal
      );
      this._currentContent.mediaSource = mediaSourceInterface;
      this._currentContent.segmentSinksStore = segmentSinksStore;
      this._currentContent.freezeResolver = new FreezeResolver(segmentSinksStore);
      this._currentContent.coreTextSender = coreTextSender;
      return new Promise((res, rej) => {
        mediaSourceInterface.addEventListener(
          "mediaSourceOpen",
          function() {
            res();
          },
          this._currentMediaSourceCanceller.signal
        );
        mediaSourceInterface.addEventListener(
          "mediaSourceClose",
          function() {
            rej(new Error("MediaSource ReadyState changed to close during init."));
          },
          this._currentMediaSourceCanceller.signal
        );
        this._currentMediaSourceCanceller.signal.register((error) => {
          rej(error);
        });
      });
    }
    /**
     * Dispose all resources linked to the currently preopared content if one and
     * stop linking it to this `ContentPreparer`.
     * @param {string | undefined} reason - Human-inspectable reason behind the
     * dispose. Used for debugging matters, especially for debug log
     * inspection.
     */
    disposeCurrentContent(reason) {
      this._contentCanceller.cancel(reason);
      this._contentCanceller = new TaskCanceller("ContentPreparer");
    }
  };
  function createMediaSourceInterfaceAndSegmentSinksStore(sendMessage2, contentId, capabilities, cancelSignal) {
    let mediaSourceInterface;
    if (capabilities.useMseInWorker) {
      const mainMediaSource = new MainMediaSourceInterface(generateMediaSourceId2());
      mediaSourceInterface = mainMediaSource;
      let sentMediaSourceLink;
      const handle = mainMediaSource.handle;
      if (handle.type === "handle") {
        sentMediaSourceLink = { type: "handle", value: handle.value };
      } else {
        const url = URL.createObjectURL(handle.value);
        sentMediaSourceLink = { type: "url", value: url };
        cancelSignal.register(() => {
          URL.revokeObjectURL(url);
        });
      }
      sendMessage2(
        {
          type: "attach-media-source" /* AttachMediaSource */,
          contentId,
          value: sentMediaSourceLink,
          mediaSourceId: mediaSourceInterface.id
        },
        [handle.value]
      );
    } else {
      mediaSourceInterface = new WorkerMediaSourceInterface(
        generateMediaSourceId2(),
        contentId,
        sendMessage2
      );
    }
    const textSender = capabilities.hasText ? new CoreTextDisplayerInterface(contentId, sendMessage2) : null;
    const { hasVideo } = capabilities;
    const segmentSinksStore = new segment_sinks_default(
      mediaSourceInterface,
      hasVideo,
      textSender
    );
    cancelSignal.register((err) => {
      segmentSinksStore.disposeAll(err.reason);
      textSender == null ? void 0 : textSender.stop(err.reason);
      mediaSourceInterface.dispose(err.reason);
    });
    return [mediaSourceInterface, segmentSinksStore, textSender];
  }
  function updateCodecSupportInWorkerMode(manifestToUpdate) {
    var _a2, _b2;
    if (isNullOrUndefined(MediaSource_)) {
      return;
    }
    const codecsMap = /* @__PURE__ */ new Map();
    for (const period of manifestToUpdate.periods) {
      const checkedAdaptations = [
        ...(_a2 = period.adaptations.video) != null ? _a2 : [],
        ...(_b2 = period.adaptations.audio) != null ? _b2 : []
      ];
      for (const adaptation of checkedAdaptations) {
        for (const representation of adaptation.representations) {
          const codec = `${representation.mimeType};codecs="${representation.codecs[0]}"`;
          if (codecsMap.has(codec)) {
            representation.isCodecSupportedInWebWorker = codecsMap.get(codec);
          } else {
            const supported = MediaSource_.isTypeSupported(codec);
            representation.isCodecSupportedInWebWorker = supported;
            codecsMap.set(codec, supported);
          }
        }
      }
    }
  }

  // src/core/entry/content_time_boundaries_observer.ts
  var ContentTimeBoundariesObserver = class extends EventEmitter {
    /**
     * @param {Object} manifest
     * @param {Object} playbackObserver
     */
    constructor(manifest, playbackObserver, bufferTypes) {
      super();
      this._canceller = new TaskCanceller("Boundaries Observation");
      this._manifest = manifest;
      this._activeStreams = /* @__PURE__ */ new Map();
      this._allBufferTypes = bufferTypes;
      this._lastCurrentPeriodId = null;
      const maximumPositionCalculator = new MaximumPositionCalculator(manifest);
      this._maximumPositionCalculator = maximumPositionCalculator;
      const cancelSignal = this._canceller.signal;
      queue_microtask_default(() => {
        playbackObserver.listen(
          ({ position }) => {
            const wantedPosition = position.getWanted();
            if (wantedPosition < manifest.getMinimumSafePosition()) {
              const warning = new MediaError(
                "MEDIA_TIME_BEFORE_MANIFEST",
                "The current position is behind the earliest time announced in the Manifest."
              );
              this.trigger("warning", warning);
            } else if (wantedPosition > maximumPositionCalculator.getMaximumAvailablePosition()) {
              const warning = new MediaError(
                "MEDIA_TIME_AFTER_MANIFEST",
                "The current position is after the latest time announced in the Manifest."
              );
              this.trigger("warning", warning);
            }
          },
          { includeLastObservation: false, clearSignal: cancelSignal }
        );
      });
      manifest.addEventListener(
        "manifestUpdate",
        () => {
          this.trigger("endingPositionChange", this._getManifestEndTime());
          if (cancelSignal.isCancelled()) {
            return;
          }
          this._checkEndOfStream();
        },
        cancelSignal
      );
    }
    /**
     * Returns an estimate of the current last position which may be played in
     * the content at the moment.
     * @returns {Object}
     */
    getCurrentEndingTime() {
      return this._getManifestEndTime();
    }
    /**
     * Method to call any time an Adaptation has been selected.
     *
     * That Adaptation switch will be considered as active until the
     * `onPeriodCleared` method has been called for the same `bufferType` and
     * `Period`, or until `dispose` is called.
     * @param {string} bufferType - The type of buffer concerned by the Adaptation
     * switch
     * @param {Object} period - The Period concerned by the Adaptation switch
     * @param {Object|null} adaptation - The Adaptation selected. `null` if the
     * absence of `Adaptation` has been explicitely selected for this Period and
     * buffer type (e.g. no video).
     */
    onAdaptationChange(bufferType, period, adaptation) {
      if (this._manifest.isLastPeriodKnown) {
        const lastPeriod = this._manifest.periods[this._manifest.periods.length - 1];
        if (period.id === (lastPeriod == null ? void 0 : lastPeriod.id)) {
          if (bufferType === "audio" || bufferType === "video") {
            if (bufferType === "audio") {
              this._maximumPositionCalculator.updateLastAudioAdaptation(adaptation);
            } else {
              this._maximumPositionCalculator.updateLastVideoAdaptation(adaptation);
            }
            const endingPosition = this._maximumPositionCalculator.getEndingPosition();
            const newEndingPosition = endingPosition !== void 0 ? { isEnd: true, endingPosition } : {
              isEnd: false,
              endingPosition: this._maximumPositionCalculator.getMaximumAvailablePosition()
            };
            this.trigger("endingPositionChange", newEndingPosition);
          }
        }
      }
      if (this._canceller.isUsed()) {
        return;
      }
      if (adaptation === null) {
        this._addActivelyLoadedPeriod(period, bufferType);
      }
    }
    /**
     * Method to call any time a Representation has been selected.
     *
     * That Representation switch will be considered as active until the
     * `onPeriodCleared` method has been called for the same `bufferType` and
     * `Period`, or until `dispose` is called.
     * @param {string} bufferType - The type of buffer concerned by the
     * Representation switch
     * @param {Object} period - The Period concerned by the Representation switch
     */
    onRepresentationChange(bufferType, period) {
      this._addActivelyLoadedPeriod(period, bufferType);
    }
    /**
     * Method to call any time a Period and type combination is not considered
     * anymore.
     *
     * Calling this method allows to signal that a previous Adaptation and/or
     * Representation change respectively indicated by an `onAdaptationChange` and
     * an `onRepresentationChange` call, are not active anymore.
     * @param {string} bufferType - The type of buffer concerned
     * @param {Object} period - The Period concerned
     */
    onPeriodCleared(bufferType, period) {
      this._removeActivelyLoadedPeriod(period, bufferType);
    }
    /**
     * Method to call when the last chronological segment for a given buffer type
     * is known to have been loaded and is either pushed or in the process of
     * being pushed to the corresponding MSE `SourceBuffer` or equivalent.
     *
     * This method can even be called multiple times in a row as long as the
     * aforementioned condition is true, if it simplify your code's management.
     * @param {string} bufferType
     */
    onLastSegmentFinishedLoading(bufferType) {
      const streamInfo = this._lazilyCreateActiveStreamInfo(bufferType);
      if (!streamInfo.hasFinishedLoadingLastPeriod) {
        streamInfo.hasFinishedLoadingLastPeriod = true;
        this._checkEndOfStream();
      }
    }
    /**
     * Method to call to "cancel" a previous call to
     * `onLastSegmentFinishedLoading`.
     *
     * That is, calling this method indicates that the last chronological segment
     * of a given buffer type is now either not loaded or it is not known.
     *
     * This method can even be called multiple times in a row as long as the
     * aforementioned condition is true, if it simplify your code's management.
     * @param {string} bufferType
     */
    onLastSegmentLoadingResume(bufferType) {
      const streamInfo = this._lazilyCreateActiveStreamInfo(bufferType);
      if (streamInfo.hasFinishedLoadingLastPeriod) {
        streamInfo.hasFinishedLoadingLastPeriod = false;
        this._checkEndOfStream();
      }
    }
    /**
     * Free all resources used by the `ContentTimeBoundariesObserver` and cancels
     * all recurring processes it performs.
     * @param {string | undefined} reason - Human-inspectable reason behind the
     * dispose. Used for debugging matters, especially for debug log
     * inspection.
     */
    dispose(reason) {
      this.removeEventListener();
      this._canceller.cancel(reason != null ? reason : "ContentTimeBoundariesObserver dispose");
    }
    _addActivelyLoadedPeriod(period, bufferType) {
      const streamInfo = this._lazilyCreateActiveStreamInfo(bufferType);
      if (!streamInfo.activePeriods.has(period)) {
        streamInfo.activePeriods.add(period);
        this._checkCurrentPeriod();
      }
    }
    _removeActivelyLoadedPeriod(period, bufferType) {
      const streamInfo = this._activeStreams.get(bufferType);
      if (streamInfo === void 0) {
        return;
      }
      if (streamInfo.activePeriods.has(period)) {
        streamInfo.activePeriods.removeElement(period);
        this._checkCurrentPeriod();
      }
    }
    _checkCurrentPeriod() {
      if (this._allBufferTypes.length === 0) {
        return;
      }
      const streamInfo = this._activeStreams.get(this._allBufferTypes[0]);
      if (streamInfo === void 0) {
        return;
      }
      for (const period of streamInfo.activePeriods.toArray()) {
        let wasFoundInAllTypes = true;
        for (const bufferType of this._allBufferTypes) {
          const streamInfo2 = this._activeStreams.get(bufferType);
          if (streamInfo2 === void 0) {
            return;
          }
          const activePeriods = streamInfo2.activePeriods.toArray();
          const hasPeriod = activePeriods.some((p) => p.id === period.id);
          if (!hasPeriod) {
            wasFoundInAllTypes = false;
            break;
          }
        }
        if (wasFoundInAllTypes) {
          if (this._lastCurrentPeriodId !== period.id) {
            this._lastCurrentPeriodId = period.id;
            this.trigger("periodChange", period);
          }
          return;
        }
      }
    }
    _getManifestEndTime() {
      const endingPosition = this._maximumPositionCalculator.getEndingPosition();
      return endingPosition !== void 0 ? { isEnd: true, endingPosition } : {
        isEnd: false,
        endingPosition: this._maximumPositionCalculator.getMaximumAvailablePosition()
      };
    }
    _lazilyCreateActiveStreamInfo(bufferType) {
      let streamInfo = this._activeStreams.get(bufferType);
      if (streamInfo === void 0) {
        streamInfo = {
          activePeriods: new SortedList((a, b) => a.start - b.start),
          hasFinishedLoadingLastPeriod: false
        };
        this._activeStreams.set(bufferType, streamInfo);
      }
      return streamInfo;
    }
    _checkEndOfStream() {
      if (!this._manifest.isLastPeriodKnown) {
        return;
      }
      const everyBufferTypeLoaded = this._allBufferTypes.every((bt) => {
        const streamInfo = this._activeStreams.get(bt);
        return streamInfo !== void 0 && streamInfo.hasFinishedLoadingLastPeriod;
      });
      if (everyBufferTypeLoaded) {
        this.trigger("endOfStream", null);
      } else {
        this.trigger("resumeStream", null);
      }
    }
  };
  var MaximumPositionCalculator = class {
    /**
     * @param {Object} manifest
     */
    constructor(manifest) {
      this._manifest = manifest;
      this._lastAudioAdaptation = void 0;
      this._lastVideoAdaptation = void 0;
    }
    /**
     * Update the last known audio Adaptation for the last Period.
     * If no Adaptation has been set, it should be set to `null`.
     *
     * Allows to calculate the maximum position more precizely in
     * `getMaximumAvailablePosition` and `getEndingPosition`.
     * @param {Object|null} adaptation
     */
    updateLastAudioAdaptation(adaptation) {
      this._lastAudioAdaptation = adaptation;
    }
    /**
     * Update the last known video Adaptation for the last Period.
     * If no Adaptation has been set, it should be set to `null`.
     *
     * Allows to calculate the maximum position more precizely in
     * `getMaximumAvailablePosition` and `getEndingPosition`.
     * @param {Object|null} adaptation
     */
    updateLastVideoAdaptation(adaptation) {
      this._lastVideoAdaptation = adaptation;
    }
    /**
     * Returns an estimate of the maximum position currently reachable (i.e.
     * segments are available) under the current circumstances.
     * @returns {number}
     */
    getMaximumAvailablePosition() {
      if (this._manifest.isDynamic) {
        return this._manifest.getMaximumSafePosition();
      }
      if (this._lastVideoAdaptation === void 0 || this._lastAudioAdaptation === void 0) {
        return this._manifest.getMaximumSafePosition();
      } else if (this._lastAudioAdaptation === null) {
        if (this._lastVideoAdaptation === null) {
          return this._manifest.getMaximumSafePosition();
        } else {
          const lastVideoPosition = getLastAvailablePositionFromAdaptation(
            this._lastVideoAdaptation
          );
          if (typeof lastVideoPosition !== "number") {
            return this._manifest.getMaximumSafePosition();
          }
          return lastVideoPosition;
        }
      } else if (this._lastVideoAdaptation === null) {
        const lastAudioPosition = getLastAvailablePositionFromAdaptation(
          this._lastAudioAdaptation
        );
        if (typeof lastAudioPosition !== "number") {
          return this._manifest.getMaximumSafePosition();
        }
        return lastAudioPosition;
      } else {
        const lastAudioPosition = getLastAvailablePositionFromAdaptation(
          this._lastAudioAdaptation
        );
        const lastVideoPosition = getLastAvailablePositionFromAdaptation(
          this._lastVideoAdaptation
        );
        if (typeof lastAudioPosition !== "number" || typeof lastVideoPosition !== "number") {
          return this._manifest.getMaximumSafePosition();
        } else {
          return Math.min(lastAudioPosition, lastVideoPosition);
        }
      }
    }
    /**
     * Returns an estimate of the actual ending position once
     * the full content is available.
     * Returns `undefined` if that could not be determined, for various reasons.
     * @returns {number|undefined}
     */
    getEndingPosition() {
      var _a2, _b2;
      if (!this._manifest.isDynamic) {
        return this.getMaximumAvailablePosition();
      }
      if (this._lastVideoAdaptation === void 0 || this._lastAudioAdaptation === void 0) {
        return void 0;
      } else if (this._lastAudioAdaptation === null) {
        if (this._lastVideoAdaptation === null) {
          return void 0;
        } else {
          return (_a2 = getEndingPositionFromAdaptation(this._lastVideoAdaptation)) != null ? _a2 : void 0;
        }
      } else if (this._lastVideoAdaptation === null) {
        return (_b2 = getEndingPositionFromAdaptation(this._lastAudioAdaptation)) != null ? _b2 : void 0;
      } else {
        const lastAudioPosition = getEndingPositionFromAdaptation(
          this._lastAudioAdaptation
        );
        const lastVideoPosition = getEndingPositionFromAdaptation(
          this._lastVideoAdaptation
        );
        if (typeof lastAudioPosition !== "number" || typeof lastVideoPosition !== "number") {
          return void 0;
        } else {
          return Math.min(lastAudioPosition, lastVideoPosition);
        }
      }
    }
  };
  function getLastAvailablePositionFromAdaptation(adaptation) {
    const { representations } = adaptation;
    let min = null;
    let lastIndex;
    for (const representation of representations) {
      if (representation.index !== lastIndex) {
        lastIndex = representation.index;
        const lastPosition = representation.index.getLastAvailablePosition();
        if (lastPosition === void 0) {
          return void 0;
        }
        if (lastPosition !== null) {
          min = isNullOrUndefined(min) ? lastPosition : Math.min(min, lastPosition);
        }
      }
    }
    return min;
  }
  function getEndingPositionFromAdaptation(adaptation) {
    const { representations } = adaptation;
    let min = null;
    let lastIndex;
    for (const representation of representations) {
      if (representation.index !== lastIndex) {
        lastIndex = representation.index;
        const lastPosition = representation.index.getEnd();
        if (lastPosition === void 0) {
          return void 0;
        }
        if (lastPosition !== null) {
          min = isNullOrUndefined(min) ? lastPosition : Math.min(min, lastPosition);
        }
      }
    }
    return min;
  }

  // src/core/entry/create_content_time_boundaries_observer.ts
  function createContentTimeBoundariesObserver(manifest, mediaSource, streamObserver, segmentSinksStore, callbacks, cancelSignal) {
    cancelSignal.register((err) => {
      mediaSource.interruptDurationSetting(err.reason);
    });
    const contentTimeBoundariesObserver = new ContentTimeBoundariesObserver(
      manifest,
      streamObserver,
      segmentSinksStore.getBufferTypes()
    );
    cancelSignal.register((err) => {
      contentTimeBoundariesObserver.dispose(err.reason);
    });
    contentTimeBoundariesObserver.addEventListener(
      "warning",
      (err) => callbacks.onWarning(err)
    );
    contentTimeBoundariesObserver.addEventListener(
      "periodChange",
      (period) => callbacks.onPeriodChanged(period)
    );
    contentTimeBoundariesObserver.addEventListener("endingPositionChange", (evt) => {
      mediaSource.setDuration(evt.endingPosition, evt.isEnd);
    });
    contentTimeBoundariesObserver.addEventListener("endOfStream", () => {
      log_default.debug("mse", "Start applying end-of-stream order.");
      mediaSource.maintainEndOfStream();
    });
    contentTimeBoundariesObserver.addEventListener("resumeStream", () => {
      mediaSource.stopEndOfStream();
    });
    const obj = contentTimeBoundariesObserver.getCurrentEndingTime();
    mediaSource.setDuration(obj.endingPosition, obj.isEnd);
    return contentTimeBoundariesObserver;
  }

  // src/core/entry/get_buffered_data_per_media_buffer.ts
  function getBufferedDataPerMediaBuffer(mediaSourceInterface, textDisplayer) {
    const buffered = {
      audio: null,
      video: null,
      text: null
    };
    if (textDisplayer !== null) {
      buffered.text = textDisplayer.getBufferedRanges();
    }
    if (mediaSourceInterface === null) {
      return buffered;
    }
    const audioBuffer = arrayFind(
      mediaSourceInterface.sourceBuffers,
      (s) => s.type === "audio" /* Audio */
    );
    const videoBuffer = arrayFind(
      mediaSourceInterface.sourceBuffers,
      (s) => s.type === "video" /* Video */
    );
    const audioBuffered = audioBuffer == null ? void 0 : audioBuffer.getBuffered();
    if (audioBuffered !== void 0) {
      buffered.audio = audioBuffered;
    }
    const videoBuffered = videoBuffer == null ? void 0 : videoBuffer.getBuffered();
    if (videoBuffered !== void 0) {
      buffered.video = videoBuffered;
    }
    return buffered;
  }

  // src/core/entry/get_thumbnail_data.ts
  async function getThumbnailData(fetchThumbnails, manifest, periodId, thumbnailTrackId, time) {
    const period = manifest.getPeriod(periodId);
    if (period === void 0) {
      throw new Error("Wanted Period not found.");
    }
    const thumbnailTrack = arrayFind(period.thumbnailTracks, (t) => {
      return t.id === thumbnailTrackId;
    });
    if (thumbnailTrack === void 0) {
      throw new Error("Wanted Period has no thumbnail track.");
    }
    const wantedThumbnail = thumbnailTrack.index.getSegments(time, 1)[0];
    if (wantedThumbnail === void 0) {
      throw new Error("No thumbnail for the given timestamp");
    }
    return fetchThumbnails(
      { segment: wantedThumbnail, track: thumbnailTrack, period },
      new TaskCanceller(void 0).signal
    );
  }

  // src/core/entry/synchronize_sinks_on_observation.ts
  function synchronizeSegmentSinksOnObservation(observation, segmentSinksStore) {
    ["video", "audio", "text"].forEach((tType) => {
      var _a2;
      const segmentSinkStatus = segmentSinksStore.getStatus(tType);
      if (segmentSinkStatus.type === "initialized") {
        segmentSinkStatus.value.synchronizeInventory((_a2 = observation.buffered[tType]) != null ? _a2 : []);
      }
    });
  }

  // src/core/entry/core_entry.ts
  function initializeCoreEntry(setMessageReceiver, sendMessage2) {
    const {
      DEFAULT_WANTED_BUFFER_AHEAD,
      DEFAULT_MAX_VIDEO_BUFFER_SIZE,
      DEFAULT_MAX_BUFFER_AHEAD,
      DEFAULT_MAX_BUFFER_BEHIND
    } = config_default.getCurrent();
    const refs = {
      wantedBufferAhead: new reference_default(DEFAULT_WANTED_BUFFER_AHEAD),
      maxVideoBufferSize: new reference_default(DEFAULT_MAX_VIDEO_BUFFER_SIZE),
      maxBufferAhead: new reference_default(DEFAULT_MAX_BUFFER_AHEAD),
      maxBufferBehind: new reference_default(DEFAULT_MAX_BUFFER_BEHIND),
      limitVideoResolution: new reference_default({
        height: void 0,
        width: void 0,
        pixelRatio: 1
      }),
      throttleVideoBitrate: new reference_default(Infinity)
    };
    let isInitialized = false;
    let contentPreparer = new ContentPreparer({ hasVideo: true });
    let currentContentHandle = null;
    let playbackObservationRef = null;
    setMessageReceiver((e) => {
      var _a2, _b2;
      log_default.debug("Core", "received message", { name: e.data.type });
      const msg = e.data;
      switch (msg.type) {
        case "init" /* Init */:
          {
            assert(!isInitialized);
            isInitialized = true;
            scaleTimestamp(msg.value);
            updateLoggerLevel(
              msg.value.logLevel,
              msg.value.logFormat,
              msg.value.sendBackLogs
            );
            const dashWasmParser2 = features_default.dashParsers.wasm;
            if (dashWasmParser2 !== null && msg.value.dashWasmUrl !== void 0 && dashWasmParser2.isCompatible()) {
              dashWasmParser2.initialize({ wasmUrl: msg.value.dashWasmUrl }).catch((err) => {
                const error = err instanceof Error ? err.toString() : "Unknown Error";
                log_default.error("Core", "Could not initialize DASH_WASM parser", error);
              });
            }
            if (!msg.value.hasVideo) {
              contentPreparer.disposeCurrentContent("Received Init msg");
              contentPreparer = new ContentPreparer({ hasVideo: msg.value.hasVideo });
            }
            sendMessage2({ type: "init-success" /* InitSuccess */, value: null });
          }
          break;
        case "log-level-update" /* LogLevelUpdate */:
          updateLoggerLevel(
            msg.value.logLevel,
            msg.value.logFormat,
            msg.value.sendBackLogs
          );
          break;
        case "prepare" /* PrepareContent */:
          prepareNewContent(sendMessage2, contentPreparer, msg.value, refs);
          break;
        case "start" /* StartPreparedContent */: {
          const preparedContent = contentPreparer.getCurrentContent();
          if (msg.contentId !== (preparedContent == null ? void 0 : preparedContent.contentId)) {
            return;
          }
          currentContentHandle == null ? void 0 : currentContentHandle.stop();
          playbackObservationRef == null ? void 0 : playbackObservationRef.finish();
          const currentContentObservationRef = new reference_default(
            object_assign_default(msg.value.initialObservation, {
              position: new ObservationPosition(...msg.value.initialObservation.position)
            })
          );
          playbackObservationRef = currentContentObservationRef;
          currentContentHandle = loadPreparedContent(
            sendMessage2,
            msg.value,
            contentPreparer,
            currentContentObservationRef,
            refs
          );
          break;
        }
        case "observation" /* PlaybackObservation */: {
          const currentContent = contentPreparer.getCurrentContent();
          if (msg.contentId !== (currentContent == null ? void 0 : currentContent.contentId)) {
            return;
          }
          const observation = msg.value;
          const { buffered } = observation;
          const newBuffered = getBufferedDataPerMediaBuffer(
            currentContent.mediaSource,
            null
          );
          if (newBuffered.audio !== null) {
            buffered.audio = newBuffered.audio;
          }
          if (newBuffered.video !== null) {
            buffered.video = newBuffered.video;
          }
          playbackObservationRef == null ? void 0 : playbackObservationRef.setValue(
            object_assign_default(observation, {
              position: new ObservationPosition(...msg.value.position)
            })
          );
          break;
        }
        case "ref-update" /* ReferenceUpdate */:
          updateCoreReference(msg, refs);
          break;
        case "stop" /* StopContent */:
          if (msg.contentId !== ((_a2 = contentPreparer.getCurrentContent()) == null ? void 0 : _a2.contentId)) {
            return;
          }
          contentPreparer.disposeCurrentContent("StopContent message");
          currentContentHandle == null ? void 0 : currentContentHandle.stop();
          currentContentHandle = null;
          playbackObservationRef == null ? void 0 : playbackObservationRef.finish();
          playbackObservationRef = null;
          break;
        case "ms-reload" /* MediaSourceReload */:
          {
            const preparedContent = contentPreparer.getCurrentContent();
            if (msg.mediaSourceId !== (preparedContent == null ? void 0 : preparedContent.mediaSource.id)) {
              return;
            }
            currentContentHandle == null ? void 0 : currentContentHandle.signalMediaSourceReload();
          }
          break;
        case "sb-success" /* SourceBufferSuccess */: {
          const preparedContent = contentPreparer.getCurrentContent();
          if (msg.mediaSourceId !== (preparedContent == null ? void 0 : preparedContent.mediaSource.id)) {
            return;
          }
          const { sourceBuffers } = preparedContent.mediaSource;
          const sourceBuffer = arrayFind(
            sourceBuffers,
            (s) => s.type === msg.sourceBufferType
          );
          if (sourceBuffer === void 0) {
            log_default.info("Core", "Success for an unknown SourceBuffer", {
              sourceBufferType: msg.sourceBufferType
            });
            return;
          }
          if (sourceBuffer.onOperationSuccess === void 0) {
            log_default.warn(
              "Core",
              "A SourceBufferInterface with MSE performed a cross-thread operation",
              { sourceBufferType: msg.sourceBufferType }
            );
            return;
          }
          sourceBuffer.onOperationSuccess(msg.operationId, msg.value.buffered);
          break;
        }
        case "sb-error" /* SourceBufferError */: {
          const preparedContent = contentPreparer.getCurrentContent();
          if (msg.mediaSourceId !== (preparedContent == null ? void 0 : preparedContent.mediaSource.id)) {
            return;
          }
          const { sourceBuffers } = preparedContent.mediaSource;
          const sourceBuffer = arrayFind(
            sourceBuffers,
            (s) => s.type === msg.sourceBufferType
          );
          if (sourceBuffer === void 0) {
            log_default.info("Core", "Error for an unknown SourceBuffer", {
              sourceBufferType: msg.sourceBufferType
            });
            return;
          }
          if (sourceBuffer.onOperationFailure === void 0) {
            log_default.warn(
              "Core",
              "A SourceBufferInterface with MSE performed a cross-thread operation",
              {
                sourceBufferType: msg.sourceBufferType
              }
            );
            return;
          }
          sourceBuffer.onOperationFailure(msg.operationId, msg.value);
          break;
        }
        case "media-source-ready-state-change" /* MediaSourceReadyStateChange */: {
          const preparedContent = contentPreparer.getCurrentContent();
          if (msg.mediaSourceId !== (preparedContent == null ? void 0 : preparedContent.mediaSource.id)) {
            return;
          }
          if (preparedContent.mediaSource.onMediaSourceReadyStateChanged === void 0) {
            log_default.warn(
              "Core",
              "A MediaSourceInterface with MSE performed a cross-thread operation"
            );
            return;
          }
          preparedContent.mediaSource.onMediaSourceReadyStateChanged(msg.value);
          break;
        }
        case "decipherability-update" /* DecipherabilityStatusUpdate */: {
          if (msg.contentId !== ((_b2 = contentPreparer.getCurrentContent()) == null ? void 0 : _b2.contentId)) {
            return;
          }
          const currentContent = contentPreparer.getCurrentContent();
          if (currentContent === null || currentContent.manifest === null) {
            return;
          }
          const updates = msg.value;
          currentContent.manifest.updateRepresentationsDeciperability((content) => {
            for (const update of updates) {
              if (content.representation.uniqueId === update.representationUniqueId) {
                return update.decipherable;
              }
            }
            return content.representation.decipherable;
          });
          break;
        }
        case "codec-support-update" /* CodecSupportUpdate */: {
          const preparedContent = contentPreparer.getCurrentContent();
          if (preparedContent === null || preparedContent.manifest === null) {
            return;
          }
          const newEvaluatedCodecs = msg.value;
          try {
            const warning = preparedContent.manifest.updateCodecSupport(newEvaluatedCodecs);
            if (warning !== null) {
              sendMessage2({
                type: "warning" /* Warning */,
                contentId: preparedContent.contentId,
                value: formatErrorForSender(warning)
              });
            }
          } catch (err) {
            sendMessage2({
              type: "error" /* Error */,
              contentId: preparedContent.contentId,
              value: formatErrorForSender(err)
            });
          }
          break;
        }
        case "urls-update" /* ContentUrlsUpdate */: {
          const preparedContent = contentPreparer.getCurrentContent();
          if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
            return;
          }
          preparedContent.manifestFetcher.updateContentUrls(
            msg.value.urls,
            msg.value.refreshNow
          );
          break;
        }
        case "track-update" /* TrackUpdate */: {
          const preparedContent = contentPreparer.getCurrentContent();
          if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
            return;
          }
          preparedContent.trackChoiceSetter.setTrack(
            msg.value.periodId,
            msg.value.bufferType,
            msg.value.choice
          );
          break;
        }
        case "rep-update" /* RepresentationUpdate */: {
          const preparedContent = contentPreparer.getCurrentContent();
          if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
            return;
          }
          preparedContent.trackChoiceSetter.updateRepresentations(
            msg.value.periodId,
            msg.value.adaptationId,
            msg.value.bufferType,
            msg.value.choice
          );
          break;
        }
        case "add-text-success" /* PushTextDataSuccess */: {
          const preparedContent = contentPreparer.getCurrentContent();
          if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
            return;
          }
          if (preparedContent.coreTextSender === null) {
            log_default.error("Core", "Added text track but text track aren't enabled");
            return;
          }
          preparedContent.coreTextSender.onPushedTrackSuccess(msg.value.ranges);
          break;
        }
        case "push-text-error" /* PushTextDataError */: {
          const preparedContent = contentPreparer.getCurrentContent();
          if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
            return;
          }
          if (preparedContent.coreTextSender === null) {
            log_default.error("Core", "Added text track but text track aren't enabled");
            return;
          }
          preparedContent.coreTextSender.onPushedTrackError(new Error(msg.value.message));
          break;
        }
        case "remove-text-success" /* RemoveTextDataSuccess */: {
          const preparedContent = contentPreparer.getCurrentContent();
          if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
            return;
          }
          if (preparedContent.coreTextSender === null) {
            log_default.error("Core", "Removed text track but text track aren't enabled");
            return;
          }
          preparedContent.coreTextSender.onRemoveSuccess(msg.value.ranges);
          break;
        }
        case "remove-text-error" /* RemoveTextDataError */: {
          const preparedContent = contentPreparer.getCurrentContent();
          if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
            return;
          }
          if (preparedContent.coreTextSender === null) {
            log_default.error("Core", "Removed text track but text track aren't enabled");
            return;
          }
          preparedContent.coreTextSender.onRemoveError(new Error(msg.value.message));
          break;
        }
        case "pull-segment-sink-store-infos" /* PullSegmentSinkStoreInfos */: {
          sendSegmentSinksStoreInfos(sendMessage2, contentPreparer, msg.value.requestId);
          break;
        }
        case "thumbnail-request" /* ThumbnailDataRequest */: {
          sendThumbnailData(sendMessage2, contentPreparer, msg);
          break;
        }
        case "config-update" /* ConfigUpdate */: {
          config_default.update(msg.value);
          break;
        }
        default:
          assertUnreachable(msg);
      }
    });
  }
  function prepareNewContent(sendMessage2, contentPreparer, contentInitData, refs) {
    contentPreparer.initializeNewContent(sendMessage2, contentInitData, {
      limitResolution: { video: refs.limitVideoResolution },
      throttleBitrate: { video: refs.throttleVideoBitrate }
    }).then(
      (manifest) => {
        sendMessage2({
          type: "manifest-ready" /* ManifestReady */,
          contentId: contentInitData.contentId,
          value: { manifest }
        });
      },
      (err) => {
        sendMessage2({
          type: "error" /* Error */,
          contentId: contentInitData.contentId,
          value: formatErrorForSender(err)
        });
      }
    );
  }
  function updateCoreReference(msg, refs) {
    switch (msg.value.name) {
      case "wantedBufferAhead":
        refs.wantedBufferAhead.setValueIfChanged(msg.value.newVal);
        break;
      case "maxVideoBufferSize":
        refs.maxVideoBufferSize.setValueIfChanged(msg.value.newVal);
        break;
      case "maxBufferBehind":
        refs.maxBufferBehind.setValueIfChanged(msg.value.newVal);
        break;
      case "maxBufferAhead":
        refs.maxBufferAhead.setValueIfChanged(msg.value.newVal);
        break;
      case "limitVideoResolution":
        refs.limitVideoResolution.setValueIfChanged(msg.value.newVal);
        break;
      case "throttleVideoBitrate":
        refs.throttleVideoBitrate.setValueIfChanged(msg.value.newVal);
        break;
      default:
        assertUnreachable(msg.value);
    }
  }
  function loadPreparedContent(sendMessage2, val, contentPreparer, playbackObservationRef, refs) {
    log_default.debug("Core", "Loading pepared content.");
    const contentCanceller = new TaskCanceller("Start Content Worker");
    let currentLoadCanceller = null;
    startLoadingAt(val.initialTime);
    return {
      signalMediaSourceReload: () => {
        return onMediaSourceReload();
      },
      stop: () => {
        contentCanceller.cancel("ContentHandle stop");
      }
    };
    function startLoadingAt(startTime) {
      var _a2;
      currentLoadCanceller == null ? void 0 : currentLoadCanceller.cancel("Reloading content worker");
      currentLoadCanceller = new TaskCanceller("(Re)Loading Content Worker");
      currentLoadCanceller.linkToSignal(contentCanceller.signal);
      const lastSentDiscontinuitiesStore = /* @__PURE__ */ new Map();
      const preparedContent = contentPreparer.getCurrentContent();
      if (preparedContent === null || preparedContent.manifest === null) {
        const error = new OtherError("NONE", "Loading content when none is prepared");
        sendMessage2({
          type: "error" /* Error */,
          contentId: void 0,
          value: formatErrorForSender(error)
        });
        throw error;
      }
      const {
        contentId,
        cmcdDataBuilder,
        enableRepresentationAvoidance,
        manifest,
        mediaSource,
        representationEstimator,
        segmentSinksStore,
        segmentQueueCreator
      } = preparedContent;
      const { drmSystemId, enableFastSwitching, onCodecSwitch } = val;
      playbackObservationRef.onUpdate(
        (observation) => {
          synchronizeSegmentSinksOnObservation(observation, segmentSinksStore);
          const freezeResolution = preparedContent.freezeResolver.onNewObservation(observation);
          if (freezeResolution !== null) {
            handleFreezeResolution(sendMessage2, freezeResolution, {
              contentId,
              manifest,
              handleMediaSourceReload: performMediaSourceReload,
              enableRepresentationAvoidance
            });
          }
        },
        { clearSignal: currentLoadCanceller.signal }
      );
      const initialPeriod = (_a2 = manifest.getPeriodForTime(startTime)) != null ? _a2 : manifest.getNextPeriod(startTime);
      if (initialPeriod === void 0) {
        const error = new MediaError(
          "MEDIA_STARTING_TIME_NOT_FOUND",
          "Wanted starting time not found in the Manifest."
        );
        sendMessage2({
          type: "error" /* Error */,
          contentId,
          value: formatErrorForSender(error)
        });
        throw error;
      }
      const playbackObserver = new CorePlaybackObserver(
        playbackObservationRef,
        contentId,
        sendMessage2,
        currentLoadCanceller.signal
      );
      cmcdDataBuilder == null ? void 0 : cmcdDataBuilder.startMonitoringPlayback(playbackObserver);
      currentLoadCanceller.signal.register(() => {
        cmcdDataBuilder == null ? void 0 : cmcdDataBuilder.stopMonitoringPlayback();
      });
      const contentTimeBoundariesObserver = createContentTimeBoundariesObserver(
        manifest,
        mediaSource,
        playbackObserver,
        segmentSinksStore,
        {
          onWarning: (err) => sendMessage2({
            type: "warning" /* Warning */,
            contentId,
            value: formatErrorForSender(err)
          }),
          onPeriodChanged: (period) => {
            sendMessage2({
              type: "active-period-changed" /* ActivePeriodChanged */,
              contentId,
              value: { periodId: period.id }
            });
          }
        },
        currentLoadCanceller.signal
      );
      stream_default(
        { initialPeriod, manifest },
        playbackObserver,
        representationEstimator,
        segmentSinksStore,
        segmentQueueCreator,
        {
          wantedBufferAhead: refs.wantedBufferAhead,
          maxVideoBufferSize: refs.maxVideoBufferSize,
          maxBufferAhead: refs.maxBufferAhead,
          maxBufferBehind: refs.maxBufferBehind,
          drmSystemId,
          enableFastSwitching,
          onCodecSwitch
        },
        handleStreamOrchestratorCallbacks(),
        currentLoadCanceller.signal
      );
      function handleStreamOrchestratorCallbacks() {
        return {
          needsBufferFlush(payload) {
            sendMessage2({
              type: "needs-buffer-flush" /* NeedsBufferFlush */,
              contentId,
              value: payload
            });
          },
          streamStatusUpdate(value) {
            sendDiscontinuityUpdateIfNeeded(value);
            if (manifest.isLastPeriodKnown && value.period.id === manifest.periods[manifest.periods.length - 1].id) {
              const hasFinishedLoadingLastPeriod = value.hasFinishedLoading || value.isEmptyStream;
              if (hasFinishedLoadingLastPeriod) {
                contentTimeBoundariesObserver.onLastSegmentFinishedLoading(
                  value.bufferType
                );
              } else {
                contentTimeBoundariesObserver.onLastSegmentLoadingResume(value.bufferType);
              }
            }
          },
          needsManifestRefresh() {
            contentPreparer.scheduleManifestRefresh({
              enablePartialRefresh: true,
              canUseUnsafeMode: true
            });
          },
          manifestMightBeOufOfSync() {
            const { OUT_OF_SYNC_MANIFEST_REFRESH_DELAY } = config_default.getCurrent();
            contentPreparer.scheduleManifestRefresh({
              enablePartialRefresh: false,
              canUseUnsafeMode: false,
              delay: OUT_OF_SYNC_MANIFEST_REFRESH_DELAY
            });
          },
          lockedStream(payload) {
            sendMessage2({
              type: "locked-stream" /* LockedStream */,
              contentId,
              value: {
                periodId: payload.period.id,
                bufferType: payload.bufferType
              }
            });
          },
          adaptationChange(value) {
            var _a3, _b2;
            contentTimeBoundariesObserver.onAdaptationChange(
              value.type,
              value.period,
              value.adaptation
            );
            if (currentLoadCanceller === null || currentLoadCanceller.signal.isCancelled()) {
              return;
            }
            sendMessage2({
              type: "adaptation-changed" /* AdaptationChanged */,
              contentId,
              value: {
                adaptationId: (_b2 = (_a3 = value.adaptation) == null ? void 0 : _a3.id) != null ? _b2 : null,
                periodId: value.period.id,
                type: value.type
              }
            });
          },
          representationChange(value) {
            var _a3, _b2;
            contentTimeBoundariesObserver.onRepresentationChange(value.type, value.period);
            if (currentLoadCanceller === null || currentLoadCanceller.signal.isCancelled()) {
              return;
            }
            sendMessage2({
              type: "representation-changed" /* RepresentationChanged */,
              contentId,
              value: {
                adaptationId: value.adaptation.id,
                representationId: (_b2 = (_a3 = value.representation) == null ? void 0 : _a3.id) != null ? _b2 : null,
                periodId: value.period.id,
                type: value.type
              }
            });
          },
          inbandEvent(value) {
            sendMessage2({
              type: "inband-event" /* InbandEvent */,
              contentId,
              value
            });
          },
          warning(value) {
            sendMessage2({
              type: "warning" /* Warning */,
              contentId,
              value: formatErrorForSender(value)
            });
          },
          periodStreamReady(value) {
            if (preparedContent === null) {
              return;
            }
            preparedContent.trackChoiceSetter.addTrackSetter(
              value.period.id,
              value.type,
              value.adaptationRef
            );
            sendMessage2({
              type: "period-stream-ready" /* PeriodStreamReady */,
              contentId,
              value: { periodId: value.period.id, bufferType: value.type }
            });
          },
          periodStreamCleared(value) {
            if (preparedContent === null) {
              return;
            }
            const periodDiscontinuitiesStore = lastSentDiscontinuitiesStore.get(
              value.period
            );
            if (periodDiscontinuitiesStore !== void 0) {
              periodDiscontinuitiesStore.delete(value.type);
              if (periodDiscontinuitiesStore.size === 0) {
                lastSentDiscontinuitiesStore.delete(value.period);
              }
            }
            contentTimeBoundariesObserver.onPeriodCleared(value.type, value.period);
            preparedContent.trackChoiceSetter.removeTrackSetter(
              value.period.id,
              value.type
            );
            sendMessage2({
              type: "period-stream-cleared" /* PeriodStreamCleared */,
              contentId,
              value: { periodId: value.period.id, bufferType: value.type }
            });
          },
          bitrateEstimateChange(payload) {
            var _a3;
            if (preparedContent !== null) {
              (_a3 = preparedContent.cmcdDataBuilder) == null ? void 0 : _a3.updateThroughput(
                payload.type,
                payload.bitrate
              );
            }
            sendMessage2({
              type: "bitrate-estimate-change" /* BitrateEstimateChange */,
              contentId,
              value: {
                bitrate: payload.bitrate,
                bufferType: payload.type
              }
            });
          },
          needsMediaSourceReload(payload) {
            performMediaSourceReload(payload);
          },
          needsDecipherabilityFlush() {
            sendMessage2({
              type: "needs-decipherability-flush" /* NeedsDecipherabilityFlush */,
              contentId,
              value: null
            });
          },
          encryptionDataEncountered(values) {
            for (const value of values) {
              const originalContent = value.content;
              const content = __spreadValues({}, originalContent);
              if (content.manifest instanceof classes_default) {
                content.manifest = content.manifest.getMetadataSnapshot();
              }
              if (content.period instanceof Period) {
                content.period = content.period.getMetadataSnapshot();
              }
              if (content.adaptation instanceof Adaptation) {
                content.adaptation = content.adaptation.getMetadataSnapshot();
              }
              if (content.representation instanceof representation_default) {
                content.representation = content.representation.getMetadataSnapshot();
              }
              sendMessage2({
                type: "encryption-data-encountered" /* EncryptionDataEncountered */,
                contentId,
                value: {
                  keyIds: value.keyIds,
                  values: value.values,
                  content,
                  type: value.type
                }
              });
            }
          },
          error(error) {
            sendMessage2({
              type: "error" /* Error */,
              contentId,
              value: formatErrorForSender(error)
            });
          }
        };
      }
      function sendDiscontinuityUpdateIfNeeded(value) {
        const { imminentDiscontinuity } = value;
        let periodMap = lastSentDiscontinuitiesStore.get(value.period);
        const sentObjInfo = periodMap == null ? void 0 : periodMap.get(value.bufferType);
        if (sentObjInfo !== void 0) {
          if (sentObjInfo.discontinuity === null) {
            if (imminentDiscontinuity === null) {
              return;
            }
          } else if (imminentDiscontinuity !== null && sentObjInfo.discontinuity.start === imminentDiscontinuity.start && sentObjInfo.discontinuity.end === imminentDiscontinuity.end) {
            return;
          }
        }
        if (periodMap === void 0) {
          periodMap = /* @__PURE__ */ new Map();
          lastSentDiscontinuitiesStore.set(value.period, periodMap);
        }
        const msgObj = {
          periodId: value.period.id,
          bufferType: value.bufferType,
          discontinuity: value.imminentDiscontinuity,
          position: value.position
        };
        periodMap.set(value.bufferType, msgObj);
        sendMessage2({
          type: "discontinuity-update" /* DiscontinuityUpdate */,
          contentId,
          value: msgObj
        });
      }
    }
    function performMediaSourceReload(payload) {
      var _a2;
      if (currentLoadCanceller !== null) {
        currentLoadCanceller.cancel("WorkerMain MediaSource reload");
        currentLoadCanceller = null;
      }
      const mediaSourceId = (_a2 = contentPreparer.getCurrentContent()) == null ? void 0 : _a2.mediaSource.id;
      if (mediaSourceId === void 0) {
        log_default.warn("Core", "Cannot reload MediaSource: no MediaSource currently.");
        return;
      }
      log_default.debug("Core", "Reloading MediaSource", {
        timeOffset: payload.timeOffset,
        minimumPosition: payload.minimumPosition,
        maximumPosition: payload.maximumPosition
      });
      sendMessage2(
        {
          type: "reloading-media-source" /* ReloadingMediaSource */,
          mediaSourceId,
          value: payload
        },
        []
      );
      onMediaSourceReload();
    }
    function onMediaSourceReload() {
      var _a2;
      const lastObservation = playbackObservationRef.getValue();
      const newInitialTime = lastObservation.position.getWanted();
      if (currentLoadCanceller !== null) {
        currentLoadCanceller.cancel("MediaSource reload");
        currentLoadCanceller = null;
      }
      const contentId = (_a2 = contentPreparer.getCurrentContent()) == null ? void 0 : _a2.contentId;
      contentPreparer.reloadMediaSource(sendMessage2).then(
        () => {
          log_default.info("Core", "MediaSource Reloaded, loading content again", {
            newInitialTime
          });
          startLoadingAt(newInitialTime);
        },
        (err) => {
          if (TaskCanceller.isCancellationError(err)) {
            log_default.info("Core", "A reloading operation was cancelled");
            return;
          }
          sendMessage2({
            type: "error" /* Error */,
            contentId,
            value: formatErrorForSender(err)
          });
        }
      );
    }
  }
  function updateLoggerLevel(logLevel, logFormat, sendBackLogs) {
    if (!sendBackLogs) {
      log_default.setLevel(logLevel, logFormat);
    } else {
      log_default.setLevel(logLevel, "standard", (levelStr, namespace, logs) => {
        const sentLogs = logs.map((e) => {
          if (e instanceof Error) {
            return formatErrorForSender(e);
          }
          return e;
        });
        postMessage({
          type: "log" /* LogMessage */,
          value: {
            namespace,
            logLevel: levelStr,
            logs: sentLogs
          }
        });
      });
    }
  }
  function sendSegmentSinksStoreInfos(sendMessage2, contentPreparer, requestId) {
    const currentContent = contentPreparer.getCurrentContent();
    if (currentContent === null) {
      return;
    }
    const segmentSinksMetrics = currentContent.segmentSinksStore.getSegmentSinksMetrics();
    sendMessage2({
      type: "segment-sink-store-update" /* SegmentSinkStoreUpdate */,
      contentId: currentContent.contentId,
      value: { segmentSinkMetrics: segmentSinksMetrics, requestId }
    });
  }
  function handleFreezeResolution(sendMessage2, freezeResolution, {
    contentId,
    manifest,
    handleMediaSourceReload,
    enableRepresentationAvoidance
  }) {
    switch (freezeResolution.type) {
      case "reload": {
        log_default.info("Core", "Planning reload due to freeze");
        handleMediaSourceReload({
          timeOffset: 0,
          minimumPosition: 0,
          maximumPosition: Infinity
        });
        break;
      }
      case "flush": {
        log_default.info("Core", "Flushing buffer due to freeze");
        sendMessage2({
          type: "needs-buffer-flush" /* NeedsBufferFlush */,
          contentId,
          value: {
            relativeResumingPosition: freezeResolution.value.relativeSeek,
            relativePosHasBeenDefaulted: false
          }
        });
        break;
      }
      case "avoid-representations": {
        log_default.info("Core", "Planning Representation avoidance due to freeze");
        const content = freezeResolution.value;
        if (enableRepresentationAvoidance) {
          manifest.addRepresentationsToAvoid(content);
        }
        handleMediaSourceReload({
          timeOffset: 0,
          minimumPosition: 0,
          maximumPosition: Infinity
        });
        break;
      }
      default:
        assertUnreachable(freezeResolution);
    }
  }
  function sendThumbnailData(sendMessage2, contentPreparer, msg) {
    const preparedContent = contentPreparer.getCurrentContent();
    const respondWithError = (err) => {
      sendMessage2({
        type: "thumbnail-response" /* ThumbnailDataResponse */,
        contentId: msg.contentId,
        value: {
          status: "error",
          requestId: msg.value.requestId,
          error: formatErrorForSender(err)
        }
      });
    };
    if (preparedContent === null || preparedContent.manifest === null || preparedContent.contentId !== msg.contentId) {
      return respondWithError(new Error("Content changed"));
    }
    getThumbnailData(
      preparedContent.fetchThumbnailData,
      preparedContent.manifest,
      msg.value.periodId,
      msg.value.thumbnailTrackId,
      msg.value.time
    ).then(
      (result) => {
        sendMessage2(
          {
            type: "thumbnail-response" /* ThumbnailDataResponse */,
            contentId: msg.contentId,
            value: {
              status: "success",
              requestId: msg.value.requestId,
              data: result
            }
          },
          [result.data]
        );
      },
      (err) => {
        return respondWithError(err);
      }
    );
  }

  // src/core/entry/index.ts
  var entry_default = initializeCoreEntry;

  // src/experimental/tools/mediaCapabilitiesProber/log.ts
  var logger2 = new Logger();
  var log_default2 = logger2;

  // src/utils/xml-parser.ts
  var openBracket = "<";
  var openBracketCC = "<".charCodeAt(0);
  var closeBracket = ">";
  var closeBracketCC = ">".charCodeAt(0);
  var minusCC = "-".charCodeAt(0);
  var slashCC = "/".charCodeAt(0);
  var exclamationCC = "!".charCodeAt(0);
  var singleQuoteCC = "'".charCodeAt(0);
  var doubleQuoteCC = '"'.charCodeAt(0);
  var openCornerBracketCC = "[".charCodeAt(0);
  var closeCornerBracketCC = "]".charCodeAt(0);
  var nameSpacer = "\r\n	>/= ";
  function parseXml(src, options = {}) {
    var _a2, _b2;
    let pos = (_a2 = options.pos) != null ? _a2 : 0;
    const keepComments = options.keepComments === true;
    const keepWhitespace = options.keepWhitespace === true;
    let out;
    if (options.attrValue !== void 0) {
      options.attrName = (_b2 = options.attrName) != null ? _b2 : "id";
      out = [];
      while ((pos = findElements()) !== -1) {
        pos = src.lastIndexOf("<", pos);
        if (pos !== -1) {
          out.push(parseNode());
        }
        src = src.substring(pos);
        pos = 0;
      }
    } else {
      out = parseChildren("");
    }
    if (options.filter !== void 0) {
      out = filter(out, options.filter);
    }
    return out;
    function parseChildren(tagName) {
      const children = [];
      while (src[pos] !== void 0) {
        if (src.charCodeAt(pos) === openBracketCC) {
          if (src.charCodeAt(pos + 1) === slashCC) {
            const closeStart = pos + 2;
            pos = src.indexOf(closeBracket, pos);
            const closeTag = src.substring(closeStart, pos);
            if (closeTag.indexOf(tagName) === -1) {
              const parsedText = src.substring(0, pos).split("\n");
              throw new Error(
                "Unexpected close tag\nLine: " + (parsedText.length - 1) + "\nColumn: " + (parsedText[parsedText.length - 1].length + 1) + "\nChar: " + src[pos]
              );
            }
            if (pos !== -1) {
              pos += 1;
            }
            return children;
          } else if (src.charCodeAt(pos + 1) === exclamationCC) {
            if (src.charCodeAt(pos + 2) === minusCC) {
              const startCommentPos = pos;
              while (pos !== -1 && !(src.charCodeAt(pos) === closeBracketCC && src.charCodeAt(pos - 1) === minusCC && src.charCodeAt(pos - 2) === minusCC)) {
                pos = src.indexOf(closeBracket, pos + 1);
              }
              if (pos === -1) {
                pos = src.length;
              }
              if (keepComments) {
                children.push(src.substring(startCommentPos, pos + 1));
              }
            } else if (src.charCodeAt(pos + 2) === openCornerBracketCC && src.charCodeAt(pos + 8) === openCornerBracketCC && src.substring(pos + 3, pos + 8).toLowerCase() === "cdata") {
              const cdataEndIndex = src.indexOf("]]>", pos);
              if (cdataEndIndex === -1) {
                children.push(src.substring(pos + 9));
                pos = src.length;
              } else {
                children.push(src.substring(pos + 9, cdataEndIndex));
                pos = cdataEndIndex + 3;
              }
              continue;
            } else {
              const startDoctype = pos + 1;
              pos += 2;
              let encapsuled = false;
              while ((src.charCodeAt(pos) !== closeBracketCC || encapsuled) && src[pos] !== void 0) {
                if (src.charCodeAt(pos) === openCornerBracketCC) {
                  encapsuled = true;
                } else if (encapsuled && src.charCodeAt(pos) === closeCornerBracketCC) {
                  encapsuled = false;
                }
                pos++;
              }
              children.push(src.substring(startDoctype, pos));
            }
            pos++;
            continue;
          }
          const node = parseNode();
          children.push(node);
          if (node.tagName[0] === "?") {
            children.push(...node.children);
            node.children = [];
          }
        } else {
          const text = parseText();
          if (keepWhitespace) {
            if (text.length > 0) {
              children.push(text);
            }
          } else {
            const trimmed = text.trim();
            if (trimmed.length > 0) {
              children.push(trimmed);
            }
          }
          pos++;
        }
      }
      return children;
    }
    function parseText() {
      const start = pos;
      pos = src.indexOf(openBracket, pos) - 1;
      if (pos === -2) {
        pos = src.length;
      }
      return src.slice(start, pos + 1);
    }
    function parseName() {
      const start = pos;
      while (nameSpacer.indexOf(src[pos]) === -1 && src[pos] !== void 0) {
        pos++;
      }
      return src.slice(start, pos);
    }
    function parseNode() {
      const posStart = pos;
      pos++;
      const tagName = parseName();
      const attributes = {};
      let children = [];
      while (src.charCodeAt(pos) !== closeBracketCC && src[pos] !== void 0) {
        const c = src.charCodeAt(pos);
        if (c > 64 && c < 91 || c > 96 && c < 123) {
          const name = parseName();
          let code = src.charCodeAt(pos);
          while (!isNaN(code) && code !== singleQuoteCC && code !== doubleQuoteCC && !(code > 64 && code < 91 || code > 96 && code < 123) && code !== closeBracketCC) {
            pos++;
            code = src.charCodeAt(pos);
          }
          let value;
          if (code === singleQuoteCC || code === doubleQuoteCC) {
            value = parseString2();
          } else {
            value = null;
            pos--;
          }
          attributes[name] = value === null ? null : translateEntities(value);
        }
        pos++;
      }
      if (src.charCodeAt(pos - 1) !== slashCC) {
        pos++;
        children = parseChildren(tagName);
      } else {
        pos++;
      }
      return {
        tagName,
        attributes,
        children,
        posStart,
        posEnd: pos
      };
    }
    function parseString2() {
      const startChar = src[pos];
      const startpos = pos + 1;
      pos = src.indexOf(startChar, startpos);
      return src.slice(startpos, pos);
    }
    function findElements() {
      const r = new RegExp(
        "\\s" + options.attrName + `\\s*=['"]` + options.attrValue + `['"]`
      ).exec(src);
      if (r !== null) {
        return r.index;
      } else {
        return -1;
      }
    }
  }
  function filter(children, f, dept = 0, path = "") {
    let out = [];
    children.forEach(function(child, i) {
      if (typeof child === "object") {
        if (f(child, i, dept, path)) {
          out.push(child);
        }
        if (child.children.length > 0) {
          const kids = filter(
            child.children,
            f,
            dept + 1,
            (isNonEmptyString(path) ? path + "." : "") + i + "." + child.tagName
          );
          out = out.concat(kids);
        }
      }
    });
    return out;
  }
  function toContentString(tDom) {
    if (Array.isArray(tDom)) {
      let out = "";
      tDom.forEach(function(e) {
        out += " " + toContentString(e);
        out = out.trim();
      });
      return out;
    } else if (typeof tDom === "object") {
      return toContentString(tDom.children);
    } else {
      return " " + translateEntities(tDom);
    }
  }
  function translateEntities(str) {
    if (str.indexOf("&") < 0) {
      return str;
    }
    return str.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#x([A-Fa-f0-9]+);/g, (_, code) => {
      return String.fromCharCode(parseInt(code, 16));
    }).replace(/&amp;/g, "&");
  }

  // src/parsers/manifest/utils/index_helpers.ts
  function calculateRepeat(element, nextElement, maxPosition) {
    const { repeatCount } = element;
    if (repeatCount >= 0) {
      return repeatCount;
    }
    let segmentEnd;
    if (!isNullOrUndefined(nextElement)) {
      segmentEnd = nextElement.start;
    } else if (maxPosition !== void 0) {
      segmentEnd = maxPosition;
    } else {
      segmentEnd = Number.MAX_VALUE;
    }
    return Math.ceil((segmentEnd - element.start) / element.duration) - 1;
  }
  function getIndexSegmentEnd(segment, nextSegment, maxPosition) {
    const { start, duration } = segment;
    if (duration <= 0) {
      return start;
    }
    const repeat = calculateRepeat(segment, nextSegment, maxPosition);
    return start + (repeat + 1) * duration;
  }
  function toIndexTime(time, indexOptions) {
    var _a2;
    return time * indexOptions.timescale + ((_a2 = indexOptions.indexTimeOffset) != null ? _a2 : 0);
  }
  function fromIndexTime(time, indexOptions) {
    var _a2;
    return (time - ((_a2 = indexOptions.indexTimeOffset) != null ? _a2 : 0)) / indexOptions.timescale;
  }
  function getTimescaledRange(start, duration, timescale) {
    return [start * timescale, (start + duration) * timescale];
  }
  function getIndexOfLastObjectBefore(timeline, timeTScaled) {
    let low = 0;
    let high = timeline.length;
    while (low < high) {
      const mid = low + high >>> 1;
      if (timeline[mid].start <= timeTScaled) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return low - 1;
  }
  function checkDiscontinuity(index, timeSec, maxPosition) {
    const { timeline } = index;
    const scaledTime = toIndexTime(timeSec, index);
    if (scaledTime < 0) {
      return null;
    }
    const segmentIndex = getIndexOfLastObjectBefore(timeline, scaledTime);
    if (segmentIndex < 0 || segmentIndex >= timeline.length - 1) {
      return null;
    }
    const timelineItem = timeline[segmentIndex];
    if (timelineItem.duration <= 0) {
      return null;
    }
    const nextTimelineItem = timeline[segmentIndex + 1];
    if (nextTimelineItem === void 0) {
      return null;
    }
    const nextStart = nextTimelineItem.start;
    const segmentEnd = getIndexSegmentEnd(timelineItem, nextTimelineItem, maxPosition);
    return scaledTime >= segmentEnd && scaledTime < nextStart ? fromIndexTime(nextStart, index) : null;
  }

  // src/parsers/manifest/dash/common/indexes/get_init_segment.ts
  function getInitSegment(index, isEMSGWhitelisted) {
    var _a2;
    const { initialization } = index;
    const privateInfos = {};
    if (isEMSGWhitelisted !== void 0) {
      privateInfos.isEMSGWhitelisted = isEMSGWhitelisted;
    }
    return {
      id: "init",
      isInit: true,
      time: 0,
      end: 0,
      duration: 0,
      timescale: 1,
      range: !isNullOrUndefined(initialization) ? initialization.range : void 0,
      indexRange: index.indexRange,
      url: (_a2 = initialization == null ? void 0 : initialization.url) != null ? _a2 : null,
      complete: true,
      privateInfos,
      timestampOffset: -(index.indexTimeOffset / index.timescale)
    };
  }

  // src/parsers/manifest/dash/common/indexes/tokens.ts
  function padLeftWithZeros(n, l) {
    const nToString = n.toString();
    if (nToString.length >= l) {
      return nToString;
    }
    const arr = new Array(l + 1).join("0") + nToString;
    return arr.slice(-l);
  }
  function processFormatedToken(replacer) {
    return (_match, _format, widthStr) => {
      const width = isNonEmptyString(widthStr) ? parseInt(widthStr, 10) : 1;
      return padLeftWithZeros(String(replacer), width);
    };
  }
  function constructRepresentationUrl(urlTemplate, representationId, bitrate) {
    return replaceRepresentationDASHTokens(urlTemplate, representationId, bitrate);
  }
  function replaceRepresentationDASHTokens(path, id, bitrate) {
    if (path.indexOf("$") === -1) {
      return path;
    } else {
      return path.replace(/\$\$/g, "$").replace(/\$RepresentationID\$/g, String(id)).replace(
        /\$Bandwidth(%0(\d+)d)?\$/g,
        processFormatedToken(bitrate === void 0 ? 0 : bitrate)
      );
    }
  }
  function createDashUrlDetokenizer(time, nb) {
    return function replaceTokensInUrl(url) {
      if (url.indexOf("$") === -1) {
        return url;
      } else {
        return url.replace(/\$\$/g, "$").replace(/\$Number(%0(\d+)d)?\$/g, (_x, _y, widthStr) => {
          if (nb === void 0) {
            throw new Error("Segment number not defined in a $Number$ scheme");
          }
          return processFormatedToken(nb)(_x, _y, widthStr);
        }).replace(/\$Time(%0(\d+)d)?\$/g, (_x, _y, widthStr) => {
          if (time === void 0) {
            throw new Error("Segment time not defined in a $Time$ scheme");
          }
          return processFormatedToken(time)(_x, _y, widthStr);
        });
      }
    };
  }

  // src/parsers/manifest/dash/common/indexes/get_segments_from_timeline.ts
  function getWantedRepeatIndex(segmentStartTime, segmentDuration, wantedTime) {
    const diff = wantedTime - segmentStartTime;
    return diff > 0 ? Math.floor(diff / segmentDuration) : 0;
  }
  function getSegmentsFromTimeline(index, from, durationWanted, manifestBoundsCalculator, scaledPeriodEnd, isEMSGWhitelisted) {
    var _a2;
    const maximumTime = manifestBoundsCalculator.getEstimatedMaximumPosition(
      (_a2 = index.availabilityTimeOffset) != null ? _a2 : 0
    );
    const wantedMaximum = Math.min(from + durationWanted, maximumTime != null ? maximumTime : Infinity);
    const scaledUp = toIndexTime(from, index);
    const scaledTo = toIndexTime(wantedMaximum, index);
    const { timeline, timescale, segmentUrlTemplate, startNumber, endNumber } = index;
    let currentNumber = startNumber != null ? startNumber : 1;
    const segments = [];
    const timelineLength = timeline.length;
    for (let i = 0; i < timelineLength; i++) {
      const timelineItem = timeline[i];
      const { duration, start, range } = timelineItem;
      let maxRepeatTime;
      if (maximumTime === void 0) {
        maxRepeatTime = scaledPeriodEnd;
      } else {
        maxRepeatTime = Math.min(maximumTime * timescale, scaledPeriodEnd != null ? scaledPeriodEnd : Infinity);
      }
      const repeat = calculateRepeat(timelineItem, timeline[i + 1], maxRepeatTime);
      const complete = index.availabilityTimeComplete !== false || i !== timelineLength - 1 && repeat !== 0;
      let segmentNumberInCurrentRange = getWantedRepeatIndex(start, duration, scaledUp);
      let segmentTime = start + segmentNumberInCurrentRange * duration;
      while (segmentTime < scaledTo && segmentNumberInCurrentRange <= repeat) {
        const segmentNumber = currentNumber + segmentNumberInCurrentRange;
        if (endNumber !== void 0 && segmentNumber > endNumber) {
          break;
        }
        const detokenizedURL = segmentUrlTemplate === null ? null : createDashUrlDetokenizer(segmentTime, segmentNumber)(segmentUrlTemplate);
        let time = segmentTime - index.indexTimeOffset;
        let realDuration = duration;
        if (time < 0) {
          realDuration = duration + time;
          time = 0;
        }
        const segment = {
          id: String(segmentTime),
          time: time / timescale,
          end: (time + realDuration) / timescale,
          duration: realDuration / timescale,
          isInit: false,
          range,
          timescale: 1,
          url: detokenizedURL,
          number: segmentNumber,
          timestampOffset: -(index.indexTimeOffset / timescale),
          complete,
          privateInfos: { isEMSGWhitelisted }
        };
        segments.push(segment);
        segmentNumberInCurrentRange++;
        segmentTime = start + segmentNumberInCurrentRange * duration;
      }
      if (segmentTime >= scaledTo) {
        return segments;
      }
      currentNumber += repeat + 1;
      if (endNumber !== void 0 && currentNumber > endNumber) {
        return segments;
      }
    }
    return segments;
  }

  // src/parsers/manifest/dash/common/indexes/base.ts
  function _addSegmentInfos(index, segmentInfos) {
    if (segmentInfos.timescale !== index.timescale) {
      const { timescale } = index;
      index.timeline.push({
        start: segmentInfos.time / segmentInfos.timescale * timescale,
        duration: segmentInfos.duration / segmentInfos.timescale * timescale,
        repeatCount: segmentInfos.count === void 0 ? 0 : segmentInfos.count,
        range: segmentInfos.range
      });
    } else {
      index.timeline.push({
        start: segmentInfos.time,
        duration: segmentInfos.duration,
        repeatCount: segmentInfos.count === void 0 ? 0 : segmentInfos.count,
        range: segmentInfos.range
      });
    }
    return true;
  }
  var BaseRepresentationIndex = class {
    /**
     * @param {Object} index
     * @param {Object} context
     */
    constructor(index, context) {
      var _a2, _b2, _c2, _d2;
      const {
        periodStart,
        periodEnd,
        representationId,
        representationBitrate,
        isEMSGWhitelisted
      } = context;
      const timescale = (_a2 = index.timescale) != null ? _a2 : 1;
      const presentationTimeOffset = (_b2 = index.presentationTimeOffset) != null ? _b2 : 0;
      const indexTimeOffset = presentationTimeOffset - periodStart * timescale;
      const initializationUrl = ((_c2 = index.initialization) == null ? void 0 : _c2.media) === void 0 ? null : constructRepresentationUrl(
        index.initialization.media,
        representationId,
        representationBitrate
      );
      const segmentUrlTemplate = index.media === void 0 ? null : constructRepresentationUrl(
        index.media,
        representationId,
        representationBitrate
      );
      let range;
      if (index.initialization !== void 0) {
        range = index.initialization.range;
      } else if (index.indexRange !== void 0) {
        range = [0, index.indexRange[0] - 1];
      }
      this._index = {
        indexRange: index.indexRange,
        indexTimeOffset,
        initialization: { url: initializationUrl, range },
        segmentUrlTemplate,
        startNumber: index.startNumber,
        endNumber: index.endNumber,
        timeline: (_d2 = index.timeline) != null ? _d2 : [],
        timescale
      };
      this._manifestBoundsCalculator = context.manifestBoundsCalculator;
      this._scaledPeriodStart = toIndexTime(periodStart, this._index);
      this._scaledPeriodEnd = isNullOrUndefined(periodEnd) ? void 0 : toIndexTime(periodEnd, this._index);
      this._isInitialized = this._index.timeline.length > 0;
      this._isEMSGWhitelisted = isEMSGWhitelisted;
    }
    /**
     * Construct init Segment.
     * @returns {Object}
     */
    getInitSegment() {
      return getInitSegment(this._index, this._isEMSGWhitelisted);
    }
    /**
     * Get the list of segments that are currently available from the `from`
     * position, in seconds, ending `dur` seconds after that position.
     *
     * Note that if not already done, you might need to "initialize" the
     * `BaseRepresentationIndex` first so that the list of available segments
     * is known.
     *
     * @see isInitialized for more information on `BaseRepresentationIndex`
     * initialization.
     * @param {Number} from
     * @param {Number} dur
     * @returns {Array.<Object>}
     */
    getSegments(from, dur) {
      return getSegmentsFromTimeline(
        this._index,
        from,
        dur,
        this._manifestBoundsCalculator,
        this._scaledPeriodEnd,
        this._isEMSGWhitelisted
      );
    }
    /**
     * Returns false as no Segment-Base based index should need to be refreshed.
     * @returns {Boolean}
     */
    shouldRefresh() {
      return false;
    }
    /**
     * Returns first position in index.
     * @returns {Number|null}
     */
    getFirstAvailablePosition() {
      const index = this._index;
      if (index.timeline.length === 0) {
        return null;
      }
      return fromIndexTime(
        Math.max(this._scaledPeriodStart, index.timeline[0].start),
        index
      );
    }
    /**
     * Returns last position in index.
     * @returns {Number|null}
     */
    getLastAvailablePosition() {
      var _a2;
      const { timeline } = this._index;
      if (timeline.length === 0) {
        return null;
      }
      const lastTimelineElement = timeline[timeline.length - 1];
      const lastTime = Math.min(
        getIndexSegmentEnd(lastTimelineElement, null, this._scaledPeriodEnd),
        (_a2 = this._scaledPeriodEnd) != null ? _a2 : Infinity
      );
      return fromIndexTime(lastTime, this._index);
    }
    /**
     * Returns the absolute end in seconds this RepresentationIndex can reach once
     * all segments are available.
     * @returns {number|null|undefined}
     */
    getEnd() {
      return this.getLastAvailablePosition();
    }
    /**
     * Returns:
     *   - `true` if in the given time interval, at least one new segment is
     *     expected to be available in the future.
     *   - `false` either if all segments in that time interval are already
     *     available for download or if none will ever be available for it.
     *   - `undefined` when it is not possible to tell.
     *
     * Always `false` in a `BaseRepresentationIndex` because all segments should
     * be directly available.
     * @returns {boolean}
     */
    awaitSegmentBetween() {
      return false;
    }
    /**
     * Segments in a segmentBase scheme should stay available.
     * @returns {Boolean|undefined}
     */
    isSegmentStillAvailable() {
      return true;
    }
    /**
     * We do not check for discontinuity in SegmentBase-based indexes.
     * @returns {null}
     */
    checkDiscontinuity() {
      return null;
    }
    /**
     * Returns `false` as a `BaseRepresentationIndex` should not be dynamic and as
     * such segments should never fall out-of-sync.
     * @returns {Boolean}
     */
    canBeOutOfSyncError() {
      return false;
    }
    /**
     * Returns `true` as SegmentBase are not dynamic and as such no new segment
     * should become available in the future.
     * @returns {Boolean}
     */
    isStillAwaitingFutureSegments() {
      return false;
    }
    /**
     * No segment in a `BaseRepresentationIndex` are known initially.
     * It is only defined generally in an "index segment" that will thus need to
     * be first loaded and parsed.
     *
     * Once the index segment or equivalent has been parsed, the `initializeIndex`
     * method have to be called with the corresponding segment information so the
     * `BaseRepresentationIndex` can be considered as "initialized" (and so this
     * method can return `true`).
     * Until then this method will return `false` and segments linked to that
     * Representation may be missing.
     * @returns {Boolean}
     */
    isInitialized() {
      return this._isInitialized;
    }
    /**
     * No segment in a `BaseRepresentationIndex` are known initially.
     *
     * It is only defined generally in an "index segment" that will thus need to
     * be first loaded and parsed.
     * Until then, this `BaseRepresentationIndex` is considered as `uninitialized`
     * (@see isInitialized).
     *
     * Once that those information are available, the present
     * `BaseRepresentationIndex` can be "initialized" by adding that parsed
     * segment information through this method.
     * @param {Array.<Object>} indexSegments
     * @returns {Array.<Object>}
     */
    initialize(indexSegments) {
      if (this._isInitialized) {
        return;
      }
      for (let i = 0; i < indexSegments.length; i++) {
        _addSegmentInfos(this._index, indexSegments[i]);
      }
      this._isInitialized = true;
    }
    addPredictedSegments() {
      log_default.warn("dash", "Cannot add predicted segments to a `BaseRepresentationIndex`");
    }
    /**
     * Returns the `duration` of each segment in the context of its Manifest (i.e.
     * as the Manifest anounces them, actual segment duration may be different due
     * to approximations), in seconds.
     *
     * NOTE: we could here do a median or a mean but I chose to be lazy (and
     * more performant) by returning the duration of the first element instead.
     * As `isPrecize` is `false`, the rest of the code should be notified that
     * this is only an approximation.
     * @returns {number}
     */
    getTargetSegmentDuration() {
      const { timeline, timescale } = this._index;
      const firstElementInTimeline = timeline[0];
      if (firstElementInTimeline === void 0) {
        return void 0;
      }
      return {
        duration: firstElementInTimeline.duration / timescale,
        isPrecize: false
      };
    }
    /**
     * Replace in-place this `BaseRepresentationIndex` information by the
     * information from another one.
     * @param {Object} newIndex
     */
    _replace(newIndex) {
      this._index = newIndex._index;
      this._isInitialized = newIndex._isInitialized;
      this._scaledPeriodEnd = newIndex._scaledPeriodEnd;
      this._isEMSGWhitelisted = newIndex._isEMSGWhitelisted;
    }
    _update() {
      log_default.error("dash", "Base RepresentationIndex: Cannot update a SegmentList");
    }
  };

  // src/parsers/manifest/dash/common/indexes/list.ts
  var ListRepresentationIndex = class {
    /**
     * @param {Object} index
     * @param {Object} context
     */
    constructor(index, context) {
      var _a2, _b2, _c2;
      if (index.duration === void 0) {
        throw new Error("Invalid SegmentList: no duration");
      }
      const {
        periodStart,
        periodEnd,
        representationId,
        representationBitrate,
        isEMSGWhitelisted
      } = context;
      this._isEMSGWhitelisted = isEMSGWhitelisted;
      this._periodStart = periodStart;
      this._periodEnd = periodEnd;
      const presentationTimeOffset = (_a2 = index.presentationTimeOffset) != null ? _a2 : 0;
      const timescale = (_b2 = index.timescale) != null ? _b2 : 1;
      const indexTimeOffset = presentationTimeOffset - periodStart * timescale;
      const initializationUrl = ((_c2 = index.initialization) == null ? void 0 : _c2.media) === void 0 ? null : constructRepresentationUrl(
        index.initialization.media,
        representationId,
        representationBitrate
      );
      const list = index.list.map((lItem) => ({
        url: lItem.media === void 0 ? null : constructRepresentationUrl(
          lItem.media,
          representationId,
          representationBitrate
        ),
        mediaRange: lItem.mediaRange
      }));
      this._index = {
        list,
        timescale,
        duration: index.duration,
        indexTimeOffset,
        indexRange: index.indexRange,
        initialization: isNullOrUndefined(index.initialization) ? void 0 : { url: initializationUrl, range: index.initialization.range }
      };
    }
    /**
     * Construct init Segment.
     * @returns {Object}
     */
    getInitSegment() {
      const initSegment = getInitSegment(this._index);
      if (initSegment.privateInfos === void 0) {
        initSegment.privateInfos = {};
      }
      initSegment.privateInfos.isEMSGWhitelisted = this._isEMSGWhitelisted;
      return initSegment;
    }
    /**
     * @param {Number} fromTime
     * @param {Number} dur
     * @returns {Array.<Object>}
     */
    getSegments(fromTime, dur) {
      const index = this._index;
      const { duration, list, timescale } = index;
      const durationInSeconds = duration / timescale;
      const fromTimeInPeriod = fromTime - this._periodStart;
      const [up, to] = getTimescaledRange(fromTimeInPeriod, dur, timescale);
      const length = Math.min(list.length - 1, Math.floor(to / duration));
      const segments = [];
      let i = Math.floor(up / duration);
      while (i <= length) {
        const range = list[i].mediaRange;
        const url = list[i].url;
        const time = i * durationInSeconds + this._periodStart;
        const segment = {
          id: String(i),
          time,
          isInit: false,
          range,
          duration: durationInSeconds,
          timescale: 1,
          end: time + durationInSeconds,
          url,
          timestampOffset: -(index.indexTimeOffset / timescale),
          complete: true,
          privateInfos: { isEMSGWhitelisted: this._isEMSGWhitelisted }
        };
        segments.push(segment);
        i++;
      }
      return segments;
    }
    /**
     * Returns whether the Manifest should be refreshed based on the
     * `ListRepresentationIndex`'s state and the time range the player is
     * currently considering.
     * @param {Number} _fromTime
     * @param {Number} _toTime
     * @returns {Boolean}
     */
    shouldRefresh(_fromTime, _toTime) {
      return false;
    }
    /**
     * Returns first position in this index, in seconds.
     * @returns {Number}
     */
    getFirstAvailablePosition() {
      return this._periodStart;
    }
    /**
     * Returns last position in this index, in seconds.
     * @returns {Number}
     */
    getLastAvailablePosition() {
      var _a2;
      const index = this._index;
      const { duration, list } = index;
      return Math.min(
        list.length * duration / index.timescale + this._periodStart,
        (_a2 = this._periodEnd) != null ? _a2 : Infinity
      );
    }
    /**
     * Returns the absolute end in seconds this RepresentationIndex can reach once
     * all segments are available.
     * @returns {number|null|undefined}
     */
    getEnd() {
      return this.getLastAvailablePosition();
    }
    /**
     * Returns:
     *   - `true` if in the given time interval, at least one new segment is
     *     expected to be available in the future.
     *   - `false` either if all segments in that time interval are already
     *     available for download or if none will ever be available for it.
     *   - `undefined` when it is not possible to tell.
     *
     * Always `false` in a `ListRepresentationIndex` because all segments should
     * be directly available.
     * @returns {boolean}
     */
    awaitSegmentBetween() {
      return false;
    }
    /**
     * Returns true if a Segment returned by this index is still considered
     * available.
     * @returns {Boolean}
     */
    isSegmentStillAvailable() {
      return true;
    }
    /**
     * We do not check for discontinuity in SegmentList-based indexes.
     * @returns {null}
     */
    checkDiscontinuity() {
      return null;
    }
    /**
     * SegmentList should not be updated.
     * @returns {Boolean}
     */
    canBeOutOfSyncError() {
      return false;
    }
    /**
     * @returns {Boolean}
     */
    isStillAwaitingFutureSegments() {
      return false;
    }
    /**
     * @returns {Boolean}
     */
    isInitialized() {
      return true;
    }
    initialize() {
      log_default.error("dash", "A `ListRepresentationIndex` does not need to be initialized");
    }
    addPredictedSegments() {
      log_default.warn("dash", "Cannot add predicted segments to a `ListRepresentationIndex`");
    }
    /**
     * Returns the `duration` of each segment in the context of its Manifest (i.e.
     * as the Manifest anounces them, actual segment duration may be different due
     * to approximations), in seconds.
     *
     * NOTE: we could here do a median or a mean but I chose to be lazy (and
     * more performant) by returning the duration of the first element instead.
     * As `isPrecize` is `false`, the rest of the code should be notified that
     * this is only an approximation.
     * @returns {number}
     */
    getTargetSegmentDuration() {
      const { duration, timescale } = this._index;
      return {
        duration: duration / timescale,
        isPrecize: true
      };
    }
    /**
     * @param {Object} newIndex
     */
    _replace(newIndex) {
      this._index = newIndex._index;
    }
    _update() {
      log_default.error("dash", "A `ListRepresentationIndex` cannot be updated");
    }
  };

  // src/parsers/manifest/dash/common/indexes/utils.ts
  function getSegmentTimeRoundingError(timescale) {
    return config_default.getCurrent().DEFAULT_MAXIMUM_TIME_ROUNDING_ERROR * timescale;
  }

  // src/parsers/manifest/dash/common/indexes/template.ts
  var TemplateRepresentationIndex = class {
    /**
     * @param {Object} index
     * @param {Object} context
     */
    constructor(index, context) {
      var _a2, _b2, _c2;
      const {
        availabilityTimeOffset,
        manifestBoundsCalculator,
        isDynamic,
        periodEnd,
        periodStart,
        representationId,
        representationBitrate,
        isEMSGWhitelisted
      } = context;
      const timescale = (_a2 = index.timescale) != null ? _a2 : 1;
      this._availabilityTimeOffset = availabilityTimeOffset;
      this._manifestBoundsCalculator = manifestBoundsCalculator;
      const presentationTimeOffset = (_b2 = index.presentationTimeOffset) != null ? _b2 : 0;
      const scaledStart = periodStart * timescale;
      const indexTimeOffset = presentationTimeOffset - scaledStart;
      if (index.duration === void 0) {
        throw new Error("Invalid SegmentTemplate: no duration");
      }
      const initializationUrl = ((_c2 = index.initialization) == null ? void 0 : _c2.media) === void 0 ? null : constructRepresentationUrl(
        index.initialization.media,
        representationId,
        representationBitrate
      );
      const segmentUrlTemplate = index.media === void 0 ? null : constructRepresentationUrl(
        index.media,
        representationId,
        representationBitrate
      );
      this._index = {
        duration: index.duration,
        timescale,
        indexRange: index.indexRange,
        indexTimeOffset,
        initialization: isNullOrUndefined(index.initialization) ? void 0 : { url: initializationUrl, range: index.initialization.range },
        url: segmentUrlTemplate,
        presentationTimeOffset,
        startNumber: index.startNumber,
        endNumber: index.endNumber
      };
      this._isDynamic = isDynamic;
      this._periodStart = periodStart;
      this._scaledRelativePeriodEnd = periodEnd === void 0 ? void 0 : (periodEnd - periodStart) * timescale;
      this._isEMSGWhitelisted = isEMSGWhitelisted;
    }
    /**
     * Construct init Segment.
     * @returns {Object}
     */
    getInitSegment() {
      return getInitSegment(this._index, this._isEMSGWhitelisted);
    }
    /**
     * @param {Number} fromTime
     * @param {Number} dur
     * @returns {Array.<Object>}
     */
    getSegments(fromTime, dur) {
      const index = this._index;
      const { duration, startNumber, endNumber, timescale, url } = index;
      const scaledStart = this._periodStart * timescale;
      const scaledEnd = this._scaledRelativePeriodEnd;
      const upFromPeriodStart = fromTime * timescale - scaledStart;
      const toFromPeriodStart = (fromTime + dur) * timescale - scaledStart;
      const firstSegmentStart = this._getFirstSegmentStart();
      const lastSegmentStart = this._getLastSegmentStart();
      if (isNullOrUndefined(firstSegmentStart) || isNullOrUndefined(lastSegmentStart)) {
        return [];
      }
      const startPosition = Math.max(firstSegmentStart, upFromPeriodStart);
      const lastWantedStartPosition = Math.min(lastSegmentStart, toFromPeriodStart);
      if (lastWantedStartPosition + duration <= startPosition) {
        return [];
      }
      const segments = [];
      const numberOffset = startNumber != null ? startNumber : 1;
      let numberIndexedToZero = Math.floor(startPosition / duration);
      for (let timeFromPeriodStart = numberIndexedToZero * duration; timeFromPeriodStart <= lastWantedStartPosition; timeFromPeriodStart += duration) {
        const realNumber = numberIndexedToZero + numberOffset;
        if (endNumber !== void 0 && realNumber > endNumber) {
          return segments;
        }
        const realDuration = !isNullOrUndefined(scaledEnd) && timeFromPeriodStart + duration > scaledEnd ? scaledEnd - timeFromPeriodStart : duration;
        const realTime = timeFromPeriodStart + scaledStart;
        const manifestTime = timeFromPeriodStart + this._index.presentationTimeOffset;
        const detokenizedURL = url === null ? null : createDashUrlDetokenizer(manifestTime, realNumber)(url);
        const args = {
          id: String(realNumber),
          number: realNumber,
          time: realTime / timescale,
          end: (realTime + realDuration) / timescale,
          duration: realDuration / timescale,
          timescale: 1,
          isInit: false,
          scaledDuration: realDuration / timescale,
          url: detokenizedURL,
          timestampOffset: -(index.indexTimeOffset / timescale),
          complete: true,
          privateInfos: {
            isEMSGWhitelisted: this._isEMSGWhitelisted
          }
        };
        segments.push(args);
        numberIndexedToZero++;
      }
      return segments;
    }
    /**
     * Returns first possible position in the index, in seconds.
     * @returns {number|null|undefined}
     */
    getFirstAvailablePosition() {
      const firstSegmentStart = this._getFirstSegmentStart();
      if (isNullOrUndefined(firstSegmentStart)) {
        return firstSegmentStart;
      }
      return firstSegmentStart / this._index.timescale + this._periodStart;
    }
    /**
     * Returns last possible position in the index, in seconds.
     * @returns {number|null}
     */
    getLastAvailablePosition() {
      const lastSegmentStart = this._getLastSegmentStart();
      if (isNullOrUndefined(lastSegmentStart)) {
        return lastSegmentStart;
      }
      const scaledRelativeIndexEnd = this._estimateRelativeScaledEnd();
      const lastSegmentEnd = Math.min(
        lastSegmentStart + this._index.duration,
        scaledRelativeIndexEnd != null ? scaledRelativeIndexEnd : Infinity
      );
      return lastSegmentEnd / this._index.timescale + this._periodStart;
    }
    /**
     * Returns the absolute end in seconds this RepresentationIndex can reach once
     * all segments are available.
     * @returns {number|null|undefined}
     */
    getEnd() {
      if (!this._isDynamic) {
        return this.getLastAvailablePosition();
      }
      const scaledRelativeIndexEnd = this._estimateRelativeScaledEnd();
      if (scaledRelativeIndexEnd === void 0) {
        return void 0;
      }
      const { timescale } = this._index;
      const absoluteScaledIndexEnd = scaledRelativeIndexEnd + this._periodStart * timescale;
      return absoluteScaledIndexEnd / timescale;
    }
    /**
     * Returns:
     *   - `true` if in the given time interval, at least one new segment is
     *     expected to be available in the future.
     *   - `false` either if all segments in that time interval are already
     *     available for download or if none will ever be available for it.
     *   - `undefined` when it is not possible to tell.
     *
     * Always `false` in a `BaseRepresentationIndex` because all segments should
     * be directly available.
     * @returns {boolean}
     */
    awaitSegmentBetween(start, end) {
      assert(start <= end);
      if (!this._isDynamic) {
        return false;
      }
      const { timescale } = this._index;
      const segmentTimeRounding = getSegmentTimeRoundingError(timescale);
      const scaledPeriodStart = this._periodStart * timescale;
      const scaledRelativeStart = start * timescale - scaledPeriodStart;
      const scaledRelativeEnd = end * timescale - scaledPeriodStart;
      const lastSegmentStart = this._getLastSegmentStart();
      if (isNullOrUndefined(lastSegmentStart)) {
        const relativeScaledIndexEnd2 = this._estimateRelativeScaledEnd();
        if (relativeScaledIndexEnd2 === void 0) {
          return scaledRelativeEnd + segmentTimeRounding >= 0;
        }
        return scaledRelativeEnd + segmentTimeRounding >= 0 && scaledRelativeStart < relativeScaledIndexEnd2 - segmentTimeRounding;
      }
      const lastSegmentEnd = lastSegmentStart + this._index.duration;
      const relativeScaledIndexEnd = this._estimateRelativeScaledEnd();
      if (relativeScaledIndexEnd === void 0) {
        return scaledRelativeEnd > lastSegmentEnd - segmentTimeRounding;
      }
      return scaledRelativeEnd > lastSegmentEnd - segmentTimeRounding && scaledRelativeStart < relativeScaledIndexEnd - segmentTimeRounding;
    }
    /**
     * Returns true if, based on the arguments, the index should be refreshed.
     * We never have to refresh a SegmentTemplate-based manifest.
     * @returns {Boolean}
     */
    shouldRefresh() {
      return false;
    }
    /**
     * We cannot check for discontinuity in SegmentTemplate-based indexes.
     * @returns {null}
     */
    checkDiscontinuity() {
      return null;
    }
    /**
     * Returns `true` if the given segment should still be available as of now
     * (not removed since and still request-able).
     * Returns `false` if that's not the case.
     * Returns `undefined` if we do not know whether that's the case or not.
     * @param {Object} segment
     * @returns {boolean|undefined}
     */
    isSegmentStillAvailable(segment) {
      if (segment.isInit) {
        return true;
      }
      const segmentsForTime = this.getSegments(segment.time, 0.1);
      if (segmentsForTime.length === 0) {
        return false;
      }
      return segmentsForTime[0].time === segment.time && segmentsForTime[0].end === segment.end && segmentsForTime[0].number === segment.number;
    }
    /**
     * SegmentTemplate without a SegmentTimeline should not be updated.
     * @returns {Boolean}
     */
    canBeOutOfSyncError() {
      return false;
    }
    /**
     * Returns `false` if the last segments in this index have already been
     * generated so that we can freely go to the next period.
     * Returns `true` if the index is still waiting on future segments to be
     * generated.
     * @returns {Boolean}
     */
    isStillAwaitingFutureSegments() {
      if (!this._isDynamic) {
        return false;
      }
      const scaledRelativeIndexEnd = this._estimateRelativeScaledEnd();
      if (scaledRelativeIndexEnd === void 0) {
        return true;
      }
      const { timescale } = this._index;
      const lastSegmentStart = this._getLastSegmentStart();
      if (isNullOrUndefined(lastSegmentStart)) {
        return true;
      }
      const lastSegmentEnd = lastSegmentStart + this._index.duration;
      const segmentTimeRounding = getSegmentTimeRoundingError(timescale);
      return lastSegmentEnd + segmentTimeRounding < scaledRelativeIndexEnd;
    }
    /**
     * @returns {Boolean}
     */
    isInitialized() {
      return true;
    }
    initialize() {
      log_default.error("dash", "A `TemplateRepresentationIndex` does not need to be initialized");
    }
    addPredictedSegments() {
      log_default.warn("dash", "Cannot add predicted segments to a `TemplateRepresentationIndex`");
    }
    /**
     * Returns the `duration` of each segment in the context of its Manifest (i.e.
     * as the Manifest anounces them, actual segment duration may be different due
     * to approximations), in seconds.
     * @returns {number}
     */
    getTargetSegmentDuration() {
      return {
        duration: this._index.duration / this._index.timescale,
        isPrecize: true
      };
    }
    /**
     * @param {Object} newIndex
     */
    _replace(newIndex) {
      this._index = newIndex._index;
      this._isDynamic = newIndex._isDynamic;
      this._periodStart = newIndex._periodStart;
      this._scaledRelativePeriodEnd = newIndex._scaledRelativePeriodEnd;
      this._manifestBoundsCalculator = newIndex._manifestBoundsCalculator;
    }
    /**
     * @param {Object} newIndex
     */
    _update(newIndex) {
      this._replace(newIndex);
    }
    /**
     * Returns the timescaled start of the first segment that should be available,
     * relatively to the start of the Period.
     * @returns {number | null | undefined}
     */
    _getFirstSegmentStart() {
      var _a2;
      if (!this._isDynamic) {
        return 0;
      }
      if (this._scaledRelativePeriodEnd === 0 || this._scaledRelativePeriodEnd === void 0) {
        const maximumSegmentTime = this._manifestBoundsCalculator.getEstimatedMaximumPosition(
          (_a2 = this._availabilityTimeOffset) != null ? _a2 : 0
        );
        if (maximumSegmentTime !== void 0 && maximumSegmentTime < this._periodStart) {
          return null;
        }
      }
      const { duration, timescale } = this._index;
      const firstPosition = this._manifestBoundsCalculator.getEstimatedMinimumSegmentTime(
        duration / timescale
      );
      if (firstPosition === void 0) {
        return void 0;
      }
      const segmentTime = firstPosition > this._periodStart ? (firstPosition - this._periodStart) * timescale : 0;
      const numberIndexedToZero = Math.floor(segmentTime / duration);
      return numberIndexedToZero * duration;
    }
    /**
     * Returns the timescaled start of the last segment that should be available,
     * relatively to the start of the Period.
     * Returns null if live time is before current period.
     * @returns {number|null|undefined}
     */
    _getLastSegmentStart() {
      var _a2, _b2;
      const { duration, timescale, endNumber, startNumber = 1 } = this._index;
      if (this._isDynamic) {
        const liveEdge = this._manifestBoundsCalculator.getEstimatedLiveEdge();
        if (liveEdge !== void 0 && this._scaledRelativePeriodEnd !== void 0 && this._scaledRelativePeriodEnd < liveEdge - this._periodStart * this._index.timescale) {
          let numberOfSegments = Math.ceil(this._scaledRelativePeriodEnd / duration);
          if (endNumber !== void 0 && endNumber - startNumber + 1 < numberOfSegments) {
            numberOfSegments = endNumber - startNumber + 1;
          }
          return (numberOfSegments - 1) * duration;
        }
        const lastPosition = this._manifestBoundsCalculator.getEstimatedMaximumPosition(
          (_a2 = this._availabilityTimeOffset) != null ? _a2 : 0
        );
        if (lastPosition === void 0) {
          return void 0;
        }
        const scaledLastPosition = (lastPosition - this._periodStart) * timescale;
        if (scaledLastPosition < 0) {
          return null;
        }
        let numberOfSegmentsAvailable = Math.floor(scaledLastPosition / duration);
        if (endNumber !== void 0 && endNumber - startNumber + 1 < numberOfSegmentsAvailable) {
          numberOfSegmentsAvailable = endNumber - startNumber + 1;
        }
        return numberOfSegmentsAvailable <= 0 ? null : (numberOfSegmentsAvailable - 1) * duration;
      } else {
        const maximumTime = (_b2 = this._scaledRelativePeriodEnd) != null ? _b2 : 0;
        let numberOfSegments = Math.ceil(maximumTime / duration);
        if (endNumber !== void 0 && endNumber - startNumber + 1 < numberOfSegments) {
          numberOfSegments = endNumber - startNumber + 1;
        }
        const regularLastSegmentStart = (numberOfSegments - 1) * duration;
        const minimumDuration = config_default.getCurrent().MINIMUM_SEGMENT_SIZE * timescale;
        if (endNumber !== void 0 || maximumTime - regularLastSegmentStart > minimumDuration || numberOfSegments < 2) {
          return regularLastSegmentStart;
        }
        return (numberOfSegments - 2) * duration;
      }
    }
    /**
     * Returns an estimate of the last available position in this
     * `RepresentationIndex` based on attributes such as the Period's end and
     * the `endNumber` attribute.
     * If the estimate cannot be made (e.g. this Period's segments are still being
     * generated and its end is yet unknown), returns `undefined`.
     * @returns {number|undefined}
     */
    _estimateRelativeScaledEnd() {
      var _a2, _b2;
      if (this._index.endNumber !== void 0) {
        const numberOfSegments = this._index.endNumber - ((_a2 = this._index.startNumber) != null ? _a2 : 1) + 1;
        return Math.max(
          Math.min(
            numberOfSegments * this._index.duration,
            (_b2 = this._scaledRelativePeriodEnd) != null ? _b2 : Infinity
          ),
          0
        );
      }
      if (this._scaledRelativePeriodEnd === void 0) {
        return void 0;
      }
      return Math.max(this._scaledRelativePeriodEnd, 0);
    }
  };

  // src/parsers/manifest/utils/clear_timeline_from_position.ts
  function clearTimelineFromPosition(timeline, firstAvailablePosition) {
    let nbEltsRemoved = 0;
    while (timeline.length > 0) {
      const firstElt = timeline[0];
      if (firstElt.start >= firstAvailablePosition) {
        return nbEltsRemoved;
      }
      if (firstElt.repeatCount === -1) {
        return nbEltsRemoved;
      } else if (firstElt.repeatCount === 0) {
        timeline.shift();
        nbEltsRemoved += 1;
      } else {
        const nextElt = timeline[1];
        if (nextElt !== void 0 && nextElt.start <= firstAvailablePosition) {
          timeline.shift();
          nbEltsRemoved += 1;
        } else {
          if (firstElt.duration <= 0) {
            return nbEltsRemoved;
          }
          let nextStart = firstElt.start + firstElt.duration;
          let nextRepeat = 1;
          while (nextStart < firstAvailablePosition && nextRepeat <= firstElt.repeatCount) {
            nextStart += firstElt.duration;
            nextRepeat++;
          }
          if (nextRepeat > firstElt.repeatCount) {
            timeline.shift();
            nbEltsRemoved = firstElt.repeatCount + 1;
          } else {
            const newRepeat = firstElt.repeatCount - nextRepeat;
            firstElt.start = nextStart;
            firstElt.repeatCount = newRepeat;
            nbEltsRemoved += nextRepeat;
            return nbEltsRemoved;
          }
        }
      }
    }
    return nbEltsRemoved;
  }

  // src/parsers/manifest/utils/update_segment_timeline.ts
  function updateSegmentTimeline(oldTimeline, newTimeline) {
    if (oldTimeline.length === 0) {
      oldTimeline.push(...newTimeline);
      return true;
    } else if (newTimeline.length === 0) {
      return false;
    }
    const prevTimelineLength = oldTimeline.length;
    const newIndexStart = newTimeline[0].start;
    const oldLastElt = oldTimeline[prevTimelineLength - 1];
    const oldIndexEnd = getIndexSegmentEnd(oldLastElt, newTimeline[0]);
    if (oldIndexEnd < newIndexStart) {
      throw new MediaError(
        "MANIFEST_UPDATE_ERROR",
        "Cannot perform partial update: not enough data"
      );
    }
    for (let i = prevTimelineLength - 1; i >= 0; i--) {
      const currStart = oldTimeline[i].start;
      if (currStart === newIndexStart) {
        const nbEltsToRemove = prevTimelineLength - i;
        oldTimeline.splice(i, nbEltsToRemove, ...newTimeline);
        return false;
      } else if (currStart < newIndexStart) {
        const currElt = oldTimeline[i];
        if (currElt.start + currElt.duration > newIndexStart) {
          log_default.warn("utils", "Manifest update removed all previous segments");
          oldTimeline.splice(0, prevTimelineLength, ...newTimeline);
          return true;
        } else if (currElt.repeatCount === void 0 || currElt.repeatCount <= 0) {
          if (currElt.repeatCount < 0) {
            currElt.repeatCount = Math.floor((newIndexStart - currElt.start) / currElt.duration) - 1;
          }
          oldTimeline.splice(i + 1, prevTimelineLength - (i + 1), ...newTimeline);
          return false;
        }
        const eltLastTime = currElt.start + currElt.duration * (currElt.repeatCount + 1);
        if (eltLastTime <= newIndexStart) {
          oldTimeline.splice(i + 1, prevTimelineLength - (i + 1), ...newTimeline);
          return false;
        }
        const newCurrRepeat = (newIndexStart - currElt.start) / currElt.duration - 1;
        if (newCurrRepeat % 1 === 0 && currElt.duration === newTimeline[0].duration) {
          const newRepeatCount = newTimeline[0].repeatCount < 0 ? -1 : newTimeline[0].repeatCount + newCurrRepeat + 1;
          oldTimeline.splice(i, prevTimelineLength - i, ...newTimeline);
          oldTimeline[i].start = currElt.start;
          oldTimeline[i].repeatCount = newRepeatCount;
          return false;
        }
        log_default.warn("utils", "Manifest update removed previous segments");
        oldTimeline[i].repeatCount = Math.floor(newCurrRepeat);
        oldTimeline.splice(i + 1, prevTimelineLength - (i + 1), ...newTimeline);
        return false;
      }
    }
    const prevLastElt = oldTimeline[oldTimeline.length - 1];
    const newLastElt = newTimeline[newTimeline.length - 1];
    if (prevLastElt.repeatCount !== void 0 && prevLastElt.repeatCount < 0) {
      if (prevLastElt.start > newLastElt.start) {
        log_default.warn("utils", "The new index is older than the previous one");
        return false;
      } else {
        log_default.warn("utils", 'The new index is "bigger" than the previous one');
        oldTimeline.splice(0, prevTimelineLength, ...newTimeline);
        return true;
      }
    }
    const prevLastTime = prevLastElt.start + prevLastElt.duration * (prevLastElt.repeatCount + 1);
    const newLastTime = newLastElt.start + newLastElt.duration * (newLastElt.repeatCount + 1);
    if (prevLastTime >= newLastTime) {
      log_default.warn("utils", "The new index is older than the previous one");
      return false;
    }
    log_default.warn("utils", 'The new index is "bigger" than the previous one');
    oldTimeline.splice(0, prevTimelineLength, ...newTimeline);
    return true;
  }

  // src/parsers/manifest/dash/common/indexes/timeline/convert_element_to_index_segment.ts
  function convertElementsToIndexSegment(item, previousItem, nextItem) {
    let start = item.start;
    let duration = item.duration;
    const repeatCount = item.repeatCount;
    if (start === void 0) {
      if (previousItem === null) {
        start = 0;
      } else if (!isNullOrUndefined(previousItem.duration)) {
        start = previousItem.start + previousItem.duration * (previousItem.repeatCount + 1);
      }
    }
    if ((duration === void 0 || isNaN(duration)) && nextItem !== null && nextItem.start !== void 0 && !isNaN(nextItem.start) && start !== void 0 && !isNaN(start)) {
      duration = nextItem.start - start;
    }
    if (start !== void 0 && !isNaN(start) && duration !== void 0 && !isNaN(duration) && (repeatCount === void 0 || !isNaN(repeatCount))) {
      return {
        start,
        duration,
        repeatCount: repeatCount === void 0 ? 0 : repeatCount
      };
    }
    log_default.warn("dash", 'A "S" Element could not have been parsed.');
    return null;
  }

  // src/parsers/manifest/dash/common/indexes/timeline/parse_s_element.ts
  function parseSElementNode(root) {
    const parsedS = {};
    for (const attributeName of Object.keys(root.attributes)) {
      const attributeVal = root.attributes[attributeName];
      if (isNullOrUndefined(attributeVal)) {
        continue;
      }
      switch (attributeName) {
        case "t": {
          const start = parseInt(attributeVal, 10);
          if (isNaN(start)) {
            log_default.warn("dash", "invalid t value for <S> element", { val: attributeVal });
          } else {
            parsedS.start = start;
          }
          break;
        }
        case "d": {
          const duration = parseInt(attributeVal, 10);
          if (isNaN(duration)) {
            log_default.warn("dash", "invalid d value for <S> element", { val: attributeVal });
          } else {
            parsedS.duration = duration;
          }
          break;
        }
        case "r": {
          const repeatCount = parseInt(attributeVal, 10);
          if (isNaN(repeatCount)) {
            log_default.warn("dash", "invalid r value for <S> element", { val: attributeVal });
          } else {
            parsedS.repeatCount = repeatCount;
          }
          break;
        }
      }
    }
    return parsedS;
  }

  // src/parsers/manifest/dash/common/indexes/timeline/construct_timeline_from_elements.ts
  function constructTimelineFromElements(elements) {
    const initialTimeline = [];
    for (let i = 0; i < elements.length; i++) {
      initialTimeline.push(parseSElementNode(elements[i]));
    }
    const timeline = [];
    for (let i = 0; i < initialTimeline.length; i++) {
      const item = initialTimeline[i];
      const previousItem = timeline[timeline.length - 1] === void 0 ? null : timeline[timeline.length - 1];
      const nextItem = initialTimeline[i + 1] === void 0 ? null : initialTimeline[i + 1];
      const timelineElement = convertElementsToIndexSegment(item, previousItem, nextItem);
      if (timelineElement !== null) {
        timeline.push(timelineElement);
      }
    }
    return timeline;
  }

  // src/parsers/manifest/dash/common/indexes/timeline/find_first_common_start_time.ts
  function findFirstCommonStartTime(prevTimeline, newElements) {
    if (prevTimeline.length === 0 || newElements.length === 0) {
      return null;
    }
    const prevInitialStart = prevTimeline[0].start;
    const newFirstTAttr = newElements[0].attributes.t;
    const newInitialStart = isNullOrUndefined(newFirstTAttr) ? null : parseInt(newFirstTAttr, 10);
    if (newInitialStart === null || Number.isNaN(newInitialStart)) {
      return null;
    }
    if (prevInitialStart === newInitialStart) {
      return {
        prevSegmentsIdx: 0,
        newElementsIdx: 0,
        repeatNumberInPrevSegments: 0,
        repeatNumberInNewElements: 0
      };
    } else if (prevInitialStart < newInitialStart) {
      let prevElt = prevTimeline[0];
      let prevElementIndex = 0;
      while (true) {
        if (prevElt.repeatCount > 0) {
          const diff = newInitialStart - prevElt.start;
          if (diff % prevElt.duration === 0 && diff / prevElt.duration <= prevElt.repeatCount) {
            const repeatNumberInPrevSegments = diff / prevElt.duration;
            return {
              repeatNumberInPrevSegments,
              prevSegmentsIdx: prevElementIndex,
              newElementsIdx: 0,
              repeatNumberInNewElements: 0
            };
          }
        }
        prevElementIndex++;
        if (prevElementIndex >= prevTimeline.length) {
          return null;
        }
        prevElt = prevTimeline[prevElementIndex];
        if (prevElt.start === newInitialStart) {
          return {
            prevSegmentsIdx: prevElementIndex,
            newElementsIdx: 0,
            repeatNumberInPrevSegments: 0,
            repeatNumberInNewElements: 0
          };
        } else if (prevElt.start > newInitialStart) {
          return null;
        }
      }
    } else {
      let newElementsIdx = 0;
      let newNodeElt = newElements[0];
      let currentTimeOffset = newInitialStart;
      while (true) {
        const dAttr = newNodeElt.attributes.d;
        const duration = isNullOrUndefined(dAttr) ? null : parseInt(dAttr, 10);
        if (duration === null || Number.isNaN(duration)) {
          return null;
        }
        const rAttr = newNodeElt.attributes.r;
        const repeatCount = isNullOrUndefined(rAttr) ? null : parseInt(rAttr, 10);
        if (repeatCount !== null) {
          if (Number.isNaN(repeatCount) || repeatCount < 0) {
            return null;
          }
          if (repeatCount > 0) {
            const diff = prevInitialStart - currentTimeOffset;
            if (diff % duration === 0 && diff / duration <= repeatCount) {
              const repeatNumberInNewElements = diff / duration;
              return {
                repeatNumberInPrevSegments: 0,
                repeatNumberInNewElements,
                prevSegmentsIdx: 0,
                newElementsIdx
              };
            }
          }
          currentTimeOffset += duration * (repeatCount + 1);
        } else {
          currentTimeOffset += duration;
        }
        newElementsIdx++;
        if (newElementsIdx >= newElements.length) {
          return null;
        }
        newNodeElt = newElements[newElementsIdx];
        const tAttr = newNodeElt.attributes.t;
        const time = isNullOrUndefined(tAttr) ? null : parseInt(tAttr, 10);
        if (time !== null) {
          if (Number.isNaN(time)) {
            return null;
          }
          currentTimeOffset = time;
        }
        if (currentTimeOffset === prevInitialStart) {
          return {
            newElementsIdx,
            prevSegmentsIdx: 0,
            repeatNumberInPrevSegments: 0,
            repeatNumberInNewElements: 0
          };
        } else if (currentTimeOffset > newInitialStart) {
          return null;
        }
      }
    }
  }

  // src/parsers/manifest/dash/common/indexes/timeline/construct_timeline_from_previous_timeline.ts
  function constructTimelineFromPreviousTimeline(newElements, prevTimeline) {
    var _a2;
    const commonStartInfo = findFirstCommonStartTime(prevTimeline, newElements);
    if (commonStartInfo === null) {
      log_default.warn("dash", 'Cannot perform "based" update. Common segment not found.');
      return constructTimelineFromElements(newElements);
    }
    const {
      prevSegmentsIdx,
      newElementsIdx,
      repeatNumberInPrevSegments,
      repeatNumberInNewElements
    } = commonStartInfo;
    const numberCommonEltGuess = prevTimeline.length - prevSegmentsIdx;
    const lastCommonEltNewEltsIdx = numberCommonEltGuess + newElementsIdx - 1;
    if (lastCommonEltNewEltsIdx >= newElements.length) {
      log_default.info("dash", 'Cannot perform "based" update. New timeline too short');
      return constructTimelineFromElements(newElements);
    }
    const newTimeline = prevTimeline.slice(prevSegmentsIdx);
    if (repeatNumberInPrevSegments > 0) {
      const commonEltInOldTimeline = newTimeline[0];
      commonEltInOldTimeline.start += commonEltInOldTimeline.duration * repeatNumberInPrevSegments;
      newTimeline[0].repeatCount -= repeatNumberInPrevSegments;
    }
    if (repeatNumberInNewElements > 0 && newElementsIdx !== 0) {
      log_default.info(
        "dash",
        'Cannot perform "based" update. The new timeline has a different form.'
      );
      return constructTimelineFromElements(newElements);
    }
    const prevLastElement = newTimeline[newTimeline.length - 1];
    const newCommonElt = parseSElementNode(newElements[lastCommonEltNewEltsIdx]);
    const newRepeatCountOffseted = ((_a2 = newCommonElt.repeatCount) != null ? _a2 : 0) - repeatNumberInNewElements;
    if (newCommonElt.duration !== prevLastElement.duration || prevLastElement.repeatCount > newRepeatCountOffseted) {
      log_default.info(
        "dash",
        'Cannot perform "based" update. The new timeline has a different form at the beginning.'
      );
      return constructTimelineFromElements(newElements);
    }
    if (newCommonElt.repeatCount !== void 0 && newCommonElt.repeatCount > prevLastElement.repeatCount) {
      prevLastElement.repeatCount = newCommonElt.repeatCount;
    }
    const newEltsToPush = [];
    const items = [];
    for (let i = lastCommonEltNewEltsIdx + 1; i < newElements.length; i++) {
      items.push(parseSElementNode(newElements[i]));
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const previousItem = newEltsToPush[newEltsToPush.length - 1] === void 0 ? prevLastElement : newEltsToPush[newEltsToPush.length - 1];
      const nextItem = items[i + 1] === void 0 ? null : items[i + 1];
      const timelineElement = convertElementsToIndexSegment(item, previousItem, nextItem);
      if (timelineElement !== null) {
        newEltsToPush.push(timelineElement);
      }
    }
    return newTimeline.concat(newEltsToPush);
  }

  // src/parsers/manifest/dash/common/indexes/timeline/timeline_representation_index.ts
  var TimelineRepresentationIndex = class _TimelineRepresentationIndex {
    /**
     * @param {Object} index
     * @param {Object} context
     */
    constructor(index, context) {
      var _a2, _b2, _c2, _d2, _e2;
      if (!_TimelineRepresentationIndex.isTimelineIndexArgument(index)) {
        throw new Error(
          "The given index is not compatible with a TimelineRepresentationIndex."
        );
      }
      const {
        availabilityTimeComplete,
        availabilityTimeOffset,
        manifestBoundsCalculator,
        isDynamic,
        isLastPeriod,
        representationId,
        representationBitrate,
        periodStart,
        periodEnd,
        isEMSGWhitelisted
      } = context;
      const timescale = (_a2 = index.timescale) != null ? _a2 : 1;
      const presentationTimeOffset = (_b2 = index.presentationTimeOffset) != null ? _b2 : 0;
      const scaledStart = periodStart * timescale;
      const indexTimeOffset = presentationTimeOffset - scaledStart;
      this._manifestBoundsCalculator = manifestBoundsCalculator;
      this._isEMSGWhitelisted = isEMSGWhitelisted;
      this._isLastPeriod = isLastPeriod;
      this._lastUpdate = (_c2 = context.receivedTime) != null ? _c2 : monotonic_timestamp_default();
      this._unsafelyBaseOnPreviousIndex = null;
      if (context.unsafelyBaseOnPreviousRepresentation !== null && context.unsafelyBaseOnPreviousRepresentation.index instanceof _TimelineRepresentationIndex) {
        context.unsafelyBaseOnPreviousRepresentation.index._unsafelyBaseOnPreviousIndex = null;
        this._unsafelyBaseOnPreviousIndex = context.unsafelyBaseOnPreviousRepresentation.index;
      }
      this._isDynamic = isDynamic;
      this._parseTimeline = (_d2 = index.timelineParser) != null ? _d2 : null;
      const initializationUrl = ((_e2 = index.initialization) == null ? void 0 : _e2.media) === void 0 ? null : constructRepresentationUrl(
        index.initialization.media,
        representationId,
        representationBitrate
      );
      const segmentUrlTemplate = index.media === void 0 ? null : constructRepresentationUrl(
        index.media,
        representationId,
        representationBitrate
      );
      let actualAvailabilityTimeOffset;
      if (availabilityTimeOffset === void 0 && availabilityTimeComplete === void 0) {
        actualAvailabilityTimeOffset = Infinity;
      } else {
        actualAvailabilityTimeOffset = availabilityTimeOffset != null ? availabilityTimeOffset : 0;
      }
      this._index = {
        availabilityTimeComplete: availabilityTimeComplete != null ? availabilityTimeComplete : true,
        availabilityTimeOffset: actualAvailabilityTimeOffset,
        indexRange: index.indexRange,
        indexTimeOffset,
        initialization: isNullOrUndefined(index.initialization) ? void 0 : {
          url: initializationUrl,
          range: index.initialization.range
        },
        segmentUrlTemplate,
        startNumber: index.startNumber,
        endNumber: index.endNumber,
        timeline: index.timeline === void 0 ? null : updateTimelineFromEndNumber(
          index.timeline,
          index.startNumber,
          index.endNumber
        ),
        timescale
      };
      this._scaledPeriodStart = toIndexTime(periodStart, this._index);
      this._scaledPeriodEnd = periodEnd === void 0 ? void 0 : toIndexTime(periodEnd, this._index);
    }
    /**
     * Construct init Segment.
     * @returns {Object}
     */
    getInitSegment() {
      return getInitSegment(this._index, this._isEMSGWhitelisted);
    }
    /**
     * Asks for segments to download for a given time range.
     * @param {Number} from - Beginning of the time wanted, in seconds
     * @param {Number} duration - duration wanted, in seconds
     * @returns {Array.<Object>}
     */
    getSegments(from, duration) {
      this._refreshTimeline();
      if (this._index.timeline === null) {
        this._index.timeline = this._getTimeline();
      }
      return getSegmentsFromTimeline(
        this._index,
        from,
        duration,
        this._manifestBoundsCalculator,
        this._scaledPeriodEnd,
        this._isEMSGWhitelisted
      );
    }
    /**
     * Returns true if the index should be refreshed.
     * @returns {Boolean}
     */
    shouldRefresh() {
      return false;
    }
    /**
     * Returns the starting time, in seconds, of the earliest segment currently
     * available.
     * Returns null if nothing is in the index
     * @returns {Number|null}
     */
    getFirstAvailablePosition() {
      this._refreshTimeline();
      if (this._index.timeline === null) {
        this._index.timeline = this._getTimeline();
      }
      const timeline = this._index.timeline;
      return timeline.length === 0 ? null : fromIndexTime(Math.max(this._scaledPeriodStart, timeline[0].start), this._index);
    }
    /**
     * Returns the ending time, in seconds, of the last segment currently
     * available.
     * Returns null if nothing is in the index
     * @returns {Number|null}
     */
    getLastAvailablePosition() {
      var _a2;
      this._refreshTimeline();
      if (this._index.timeline === null) {
        this._index.timeline = this._getTimeline();
      }
      const lastReqSegInfo = getLastRequestableSegmentInfo(
        // Needed typecast for TypeScript
        this._index,
        this._manifestBoundsCalculator,
        this._scaledPeriodEnd
      );
      if (lastReqSegInfo === null) {
        return null;
      }
      const lastScaledPosition = Math.min(
        lastReqSegInfo.end,
        (_a2 = this._scaledPeriodEnd) != null ? _a2 : Infinity
      );
      return fromIndexTime(lastScaledPosition, this._index);
    }
    /**
     * Returns the absolute end in seconds this RepresentationIndex can reach once
     * all segments are available.
     * @returns {number|null|undefined}
     */
    getEnd() {
      var _a2;
      if (this._isDynamic && !this._isLastPeriod) {
        return void 0;
      }
      this._refreshTimeline();
      if (this._index.timeline === null) {
        this._index.timeline = this._getTimeline();
      }
      if (this._index.timeline.length <= 0) {
        return null;
      }
      const lastSegment = this._index.timeline[this._index.timeline.length - 1];
      const lastTime = Math.min(
        getIndexSegmentEnd(lastSegment, null, this._scaledPeriodEnd),
        (_a2 = this._scaledPeriodEnd) != null ? _a2 : Infinity
      );
      return fromIndexTime(lastTime, this._index);
    }
    /**
     * Returns:
     *   - `true` if in the given time interval, at least one new segment is
     *     expected to be available in the future.
     *   - `false` either if all segments in that time interval are already
     *     available for download or if none will ever be available for it.
     *   - `undefined` when it is not possible to tell.
     * @param {number} start
     * @param {number} end
     * @returns {boolean|undefined}
     */
    awaitSegmentBetween(start, end) {
      var _a2, _b2;
      assert(start <= end);
      if (!this._isDynamic) {
        return false;
      }
      this._refreshTimeline();
      if (this._index.timeline === null) {
        this._index.timeline = this._getTimeline();
      }
      const { timescale, timeline } = this._index;
      const segmentTimeRounding = getSegmentTimeRoundingError(timescale);
      const scaledWantedEnd = toIndexTime(end, this._index);
      const lastReqSegInfo = getLastRequestableSegmentInfo(
        // Needed typecast for TypeScript
        this._index,
        this._manifestBoundsCalculator,
        this._scaledPeriodEnd
      );
      if (lastReqSegInfo !== null) {
        const lastReqSegmentEnd = Math.min(
          lastReqSegInfo.end,
          (_a2 = this._scaledPeriodEnd) != null ? _a2 : Infinity
        );
        const roundedReqSegmentEnd = lastReqSegmentEnd + segmentTimeRounding;
        if (roundedReqSegmentEnd >= Math.min(scaledWantedEnd, (_b2 = this._scaledPeriodEnd) != null ? _b2 : Infinity)) {
          return false;
        }
      }
      const scaledWantedStart = toIndexTime(start, this._index);
      if (timeline.length > 0 && lastReqSegInfo !== null && !lastReqSegInfo.isLastOfTimeline) {
        const lastSegment = timeline[timeline.length - 1];
        const lastSegmentEnd = getIndexSegmentEnd(lastSegment, null, this._scaledPeriodEnd);
        const roundedLastSegEnd = lastSegmentEnd + segmentTimeRounding;
        if (scaledWantedStart < roundedLastSegEnd + segmentTimeRounding) {
          return true;
        }
      }
      if (!this._isLastPeriod) {
        return false;
      }
      if (this._scaledPeriodEnd === void 0) {
        return scaledWantedEnd + segmentTimeRounding > this._scaledPeriodStart ? void 0 : false;
      }
      return scaledWantedStart - segmentTimeRounding < this._scaledPeriodEnd && scaledWantedEnd + segmentTimeRounding > this._scaledPeriodStart;
    }
    /**
     * Returns true if a Segment returned by this index is still considered
     * available.
     * Returns false if it is not available anymore.
     * Returns undefined if we cannot know whether it is still available or not.
     * @param {Object} segment
     * @returns {Boolean|undefined}
     */
    isSegmentStillAvailable(segment) {
      if (segment.isInit) {
        return true;
      }
      this._refreshTimeline();
      if (this._index.timeline === null) {
        this._index.timeline = this._getTimeline();
      }
      return isSegmentStillAvailable(
        segment,
        // Needed typecast for TypeScript
        this._index,
        this._manifestBoundsCalculator,
        this._scaledPeriodEnd
      );
    }
    /**
     * Checks if the time given is in a discontinuity. That is:
     *   - We're on the upper bound of the current range (end of the range - time
     *     is inferior to the timescale)
     *   - The next range starts after the end of the current range.
     * @param {Number} time
     * @returns {Number|null}
     */
    checkDiscontinuity(time) {
      this._refreshTimeline();
      let timeline = this._index.timeline;
      if (timeline === null) {
        timeline = this._getTimeline();
        this._index.timeline = timeline;
      }
      return checkDiscontinuity(
        {
          timeline,
          timescale: this._index.timescale,
          indexTimeOffset: this._index.indexTimeOffset
        },
        time,
        this._scaledPeriodEnd
      );
    }
    /**
     * @param {Error} error
     * @returns {Boolean}
     */
    canBeOutOfSyncError(error) {
      if (!this._isDynamic) {
        return false;
      }
      return error instanceof NetworkError && error.isHttpError(404);
    }
    /**
     * Replace this RepresentationIndex with one from a new version of the
     * Manifest.
     * @param {Object} newIndex
     */
    _replace(newIndex) {
      this._parseTimeline = newIndex._parseTimeline;
      this._index = newIndex._index;
      this._isDynamic = newIndex._isDynamic;
      this._scaledPeriodStart = newIndex._scaledPeriodStart;
      this._scaledPeriodEnd = newIndex._scaledPeriodEnd;
      this._lastUpdate = newIndex._lastUpdate;
      this._manifestBoundsCalculator = newIndex._manifestBoundsCalculator;
      this._isLastPeriod = newIndex._isLastPeriod;
    }
    /**
     * Update this RepresentationIndex with a shorter version of it coming from a
     * new version of the MPD.
     * @param {Object} newIndex
     */
    _update(newIndex) {
      if (this._index.timeline === null) {
        this._index.timeline = this._getTimeline();
      }
      if (newIndex._index.timeline === null) {
        newIndex._index.timeline = newIndex._getTimeline();
      }
      const hasReplaced = updateSegmentTimeline(
        this._index.timeline,
        newIndex._index.timeline
      );
      if (hasReplaced) {
        this._index.startNumber = newIndex._index.startNumber;
      }
      this._index.availabilityTimeOffset = newIndex._index.availabilityTimeOffset;
      this._index.availabilityTimeComplete = newIndex._index.availabilityTimeComplete;
      this._index.endNumber = newIndex._index.endNumber;
      this._isDynamic = newIndex._isDynamic;
      this._scaledPeriodStart = newIndex._scaledPeriodStart;
      this._scaledPeriodEnd = newIndex._scaledPeriodEnd;
      this._lastUpdate = newIndex._lastUpdate;
      this._isLastPeriod = newIndex._isLastPeriod;
    }
    /**
     * Returns `false` if this RepresentationIndex currently contains its last
     * segment.
     * Returns `true` if it's still pending.
     * @returns {Boolean}
     */
    isStillAwaitingFutureSegments() {
      var _a2;
      if (!this._isDynamic) {
        return false;
      }
      this._refreshTimeline();
      if (this._index.timeline === null) {
        this._index.timeline = this._getTimeline();
      }
      const { timeline } = this._index;
      if (timeline.length === 0) {
        if (this._scaledPeriodEnd !== void 0) {
          const liveEdge = this._manifestBoundsCalculator.getEstimatedLiveEdge();
          if (liveEdge !== void 0 && toIndexTime(liveEdge, this._index) > this._scaledPeriodEnd) {
            return false;
          }
        }
        return this._isLastPeriod;
      }
      const segmentTimeRounding = getSegmentTimeRoundingError(this._index.timescale);
      const lastReqSegInfo = getLastRequestableSegmentInfo(
        // Needed typecast for TypeScript
        this._index,
        this._manifestBoundsCalculator,
        this._scaledPeriodEnd
      );
      if (lastReqSegInfo !== null && !lastReqSegInfo.isLastOfTimeline) {
        const lastReqSegmentEnd = Math.min(
          lastReqSegInfo.end,
          (_a2 = this._scaledPeriodEnd) != null ? _a2 : Infinity
        );
        if (this._scaledPeriodEnd !== void 0 && lastReqSegmentEnd + segmentTimeRounding >= this._scaledPeriodEnd) {
          return false;
        }
        return true;
      }
      if (!this._isLastPeriod) {
        return false;
      }
      if (this._scaledPeriodEnd === void 0) {
        return true;
      }
      const lastSegment = timeline[timeline.length - 1];
      const lastSegmentEnd = getIndexSegmentEnd(lastSegment, null, this._scaledPeriodEnd);
      return lastSegmentEnd + segmentTimeRounding < this._scaledPeriodEnd;
    }
    /**
     * @returns {Boolean}
     */
    isInitialized() {
      return true;
    }
    initialize() {
      log_default.error("dash", "A `TimelineRepresentationIndex` does not need to be initialized");
    }
    addPredictedSegments() {
      log_default.warn("dash", "Cannot add predicted segments to a `TimelineRepresentationIndex`");
    }
    /**
     * Returns the `duration` of each segment in the context of its Manifest (i.e.
     * as the Manifest anounces them, actual segment duration may be different due
     * to approximations), in seconds.
     *
     * NOTE: we could here do a median or a mean but I chose to be lazy (and
     * more performant) by returning the duration of the first element instead.
     * As `isPrecize` is `false`, the rest of the code should be notified that
     * this is only an approximation.
     * @returns {number}
     */
    getTargetSegmentDuration() {
      this._refreshTimeline();
      const { timeline, timescale } = this._index;
      if (timeline === null) {
        return void 0;
      }
      const firstElementInTimeline = timeline[0];
      if (firstElementInTimeline === void 0) {
        return void 0;
      }
      return {
        duration: firstElementInTimeline.duration / timescale,
        isPrecize: false
      };
    }
    /**
     * Returns `true` if the given object can be used as an "index" argument to
     * create a new `TimelineRepresentationIndex`.
     * @param {Object} index
     * @returns {boolean}
     */
    static isTimelineIndexArgument(index) {
      return typeof index.timelineParser === "function" || Array.isArray(index.timeline);
    }
    /**
     * Clean-up timeline to remove segment information which should not be
     * available due to timeshifting.
     */
    _refreshTimeline() {
      var _a2, _b2;
      if (this._index.timeline === null) {
        this._index.timeline = this._getTimeline();
      }
      if (!this._isDynamic) {
        return;
      }
      const firstPosition = this._manifestBoundsCalculator.getEstimatedMinimumSegmentTime(
        ((_b2 = (_a2 = this._index.timeline[0]) == null ? void 0 : _a2.duration) != null ? _b2 : 0) / this._index.timescale
      );
      if (isNullOrUndefined(firstPosition)) {
        return;
      }
      const scaledFirstPosition = toIndexTime(firstPosition, this._index);
      const nbEltsRemoved = clearTimelineFromPosition(
        this._index.timeline,
        scaledFirstPosition
      );
      if (this._index.startNumber !== void 0) {
        this._index.startNumber += nbEltsRemoved;
      } else if (this._index.endNumber !== void 0) {
        this._index.startNumber = nbEltsRemoved + 1;
      }
    }
    /**
     * Allows to generate the "timeline" for this RepresentationIndex.
     * Call this function when the timeline is unknown.
     * This function was added to only perform that task lazily, i.e. only when
     * first needed.
     * After calling it, every now unneeded variable will be freed from memory.
     * This means that calling _getTimeline more than once will just return an
     * empty array.
     *
     * /!\ Please note that this structure should follow the exact same structure
     * than a SegmentTimeline element in the corresponding MPD.
     * This means:
     *   - It should have the same amount of elements in its array than there was
     *     `<S>` elements in the SegmentTimeline.
     *   - Each of those same elements should have the same start time, the same
     *     duration and the same repeat counter than what could be deduced from
     *     the SegmentTimeline.
     * This is needed to be able to run parsing optimization when refreshing the
     * MPD. Not doing so could lead to the RxPlayer not being able to play the
     * stream anymore.
     * @returns {Array.<Object>}
     */
    _getTimeline() {
      if (this._parseTimeline === null) {
        if (this._index.timeline !== null) {
          return this._index.timeline;
        }
        log_default.error("dash", "Timeline already lazily parsed.");
        return [];
      }
      const newElements = this._parseTimeline();
      this._parseTimeline = null;
      const { MIN_DASH_S_ELEMENTS_TO_PARSE_UNSAFELY } = config_default.getCurrent();
      if (this._unsafelyBaseOnPreviousIndex === null || newElements.length < MIN_DASH_S_ELEMENTS_TO_PARSE_UNSAFELY) {
        return updateTimelineFromEndNumber(
          constructTimelineFromElements(newElements),
          this._index.startNumber,
          this._index.endNumber
        );
      }
      let prevTimeline;
      if (this._unsafelyBaseOnPreviousIndex._index.timeline === null) {
        prevTimeline = this._unsafelyBaseOnPreviousIndex._getTimeline();
        this._unsafelyBaseOnPreviousIndex._index.timeline = prevTimeline;
      } else {
        prevTimeline = this._unsafelyBaseOnPreviousIndex._index.timeline;
      }
      this._unsafelyBaseOnPreviousIndex = null;
      return updateTimelineFromEndNumber(
        constructTimelineFromPreviousTimeline(newElements, prevTimeline),
        this._index.startNumber,
        this._index.endNumber
      );
    }
  };
  function updateTimelineFromEndNumber(timeline, startNumber, endNumber) {
    if (endNumber === void 0) {
      return timeline;
    }
    let currNumber = startNumber != null ? startNumber : 1;
    for (let idx = 0; idx < timeline.length; idx++) {
      const seg = timeline[idx];
      currNumber += seg.repeatCount + 1;
      if (currNumber > endNumber) {
        if (currNumber === endNumber + 1) {
          return timeline.slice(0, idx + 1);
        } else {
          const newTimeline = timeline.slice(0, idx);
          const lastElt = __spreadValues({}, seg);
          const beginningNumber = currNumber - seg.repeatCount - 1;
          lastElt.repeatCount = Math.max(0, endNumber - beginningNumber);
          newTimeline.push(lastElt);
          return newTimeline;
        }
      }
    }
    return timeline;
  }
  function isSegmentStillAvailable(segment, index, manifestBoundsCalculator, scaledPeriodEnd) {
    const lastReqSegInfo = getLastRequestableSegmentInfo(
      index,
      manifestBoundsCalculator,
      scaledPeriodEnd
    );
    if (lastReqSegInfo === null) {
      return false;
    }
    for (let i = 0; i < index.timeline.length; i++) {
      if (lastReqSegInfo.timelineIdx < i) {
        return false;
      }
      const tSegment = index.timeline[i];
      const tSegmentTime = (tSegment.start - index.indexTimeOffset) / index.timescale;
      if (tSegmentTime > segment.time) {
        return false;
      } else if (tSegmentTime === segment.time) {
        if (tSegment.range === void 0) {
          return segment.range === void 0;
        }
        return !isNullOrUndefined(segment.range) && tSegment.range[0] === segment.range[0] && tSegment.range[1] === segment.range[1];
      } else {
        if (tSegment.repeatCount >= 0 && tSegment.duration !== void 0) {
          const timeDiff = tSegmentTime - tSegment.start;
          const repeat = timeDiff / tSegment.duration - 1;
          return repeat % 1 === 0 && repeat <= lastReqSegInfo.newRepeatCount;
        }
      }
    }
    return false;
  }
  function getLastRequestableSegmentInfo(index, manifestBoundsCalculator, scaledPeriodEnd) {
    if (index.timeline.length <= 0) {
      return null;
    }
    if (index.availabilityTimeOffset === Infinity) {
      const lastIndex = index.timeline.length - 1;
      const lastElem = index.timeline[lastIndex];
      return {
        isLastOfTimeline: true,
        timelineIdx: lastIndex,
        newRepeatCount: lastElem.repeatCount,
        end: getIndexSegmentEnd(lastElem, null, scaledPeriodEnd)
      };
    }
    const adjustedMaxSeconds = manifestBoundsCalculator.getEstimatedMaximumPosition(
      index.availabilityTimeOffset
    );
    if (adjustedMaxSeconds === void 0) {
      const lastIndex = index.timeline.length - 1;
      const lastElem = index.timeline[lastIndex];
      return {
        isLastOfTimeline: true,
        timelineIdx: lastIndex,
        newRepeatCount: lastElem.repeatCount,
        end: getIndexSegmentEnd(lastElem, null, scaledPeriodEnd)
      };
    }
    for (let i = index.timeline.length - 1; i >= index.timeline.length; i--) {
      const element = index.timeline[i];
      const endOfFirstOccurence = element.start + element.duration;
      if (fromIndexTime(endOfFirstOccurence, index) <= adjustedMaxSeconds) {
        const endTime = getIndexSegmentEnd(element, index.timeline[i + 1], scaledPeriodEnd);
        if (fromIndexTime(endTime, index) <= adjustedMaxSeconds) {
          return {
            isLastOfTimeline: i === index.timeline.length - 1,
            timelineIdx: i,
            newRepeatCount: element.repeatCount,
            end: endOfFirstOccurence
          };
        } else {
          const maxIndexTime = toIndexTime(adjustedMaxSeconds, index);
          const diffToSegStart = maxIndexTime - element.start;
          const nbOfSegs = Math.floor(diffToSegStart / element.duration);
          assert(nbOfSegs >= 1);
          return {
            isLastOfTimeline: false,
            timelineIdx: i,
            newRepeatCount: nbOfSegs - 1,
            end: element.start + nbOfSegs * element.duration
          };
        }
      }
    }
    return null;
  }

  // src/parsers/manifest/dash/common/indexes/timeline/index.ts
  var timeline_default = TimelineRepresentationIndex;

  // src/parsers/manifest/dash/common/content_protection_parser.ts
  var ContentProtectionParser = class {
    constructor() {
      this._refs = /* @__PURE__ */ new Map();
      this._stored = [];
    }
    /**
     * Add new `IContentProtectionIntermediateRepresentation` objects that can
     * be relied on as a reference by later
     * `IContentProtectionIntermediateRepresentation` objects, without the need
     * to actually apply it to a Representation.
     * @param {Object} contentProtections
     */
    addReferences(contentProtections) {
      for (const contentProt of contentProtections) {
        if (contentProt.attributes.refId !== void 0) {
          this._refs.set(contentProt.attributes.refId, contentProt);
        }
      }
    }
    /**
     * Add a new `IContentProtectionIntermediateRepresentation` object that should
     * be parsed with the result linked to the given `IParsedRepresentation`.
     * @param {Object} representation
     * @param {Object} contentProt
     */
    add(representation, contentProt) {
      if (!this._tryParsing(representation, contentProt, false)) {
        this._stored.push([representation, contentProt]);
      }
      if (contentProt.attributes.refId !== void 0) {
        this._refs.set(contentProt.attributes.refId, contentProt);
        this._resolveStoredRefs(false);
      }
    }
    /**
     * It is possible that even after parsing the full MPD,
     */
    finalize() {
      this._resolveStoredRefs(true);
    }
    /**
     * Try to parse all ContentProtection that are currently waiting due to a
     * referenced ContentProtection not being known yet.
     *
     * Return `true` if all ContentProtection references could have been found
     * and `false` if at least one wasn't.
     *
     * The `force` parameter indicate what should be done if a reference linked
     * to a ContentProtection couldn't be resolved: if `false`, we just keep that
     * ContentProtection aside for later, if `true` we parse it right now even if
     * information could be missing.
     *
     * @param {boolean} force
     * @returns {boolean}
     */
    _resolveStoredRefs(force) {
      for (let i = this._stored.length - 1; i >= 0; i--) {
        const [representation, contentProt] = this._stored[i];
        if (this._tryParsing(representation, contentProt, force) || force) {
          this._stored.splice(i, 1);
        }
      }
      return this._stored.length === 0;
    }
    /**
     * Parse the `IContentProtectionIntermediateRepresentation` given and add the
     * corresponding attributes to the given `IParsedRepresentation` when done.
     *
     * Because the `IContentProtectionIntermediateRepresentation` may be
     * referencing another `IContentProtectionIntermediateRepresentation`, this
     * method might not succeed to do so if the referenced
     * `IContentProtectionIntermediateRepresentation` has not yet been encountered.
     *
     * In that last scenario, this method returns `false` and:
     *   - Either `force` is set to `true`, in which case what could be parsed
     *     will still be set on the `IParsedRepresentation`.
     *   - Either `force` is set to `false`, in which case the parsing of this
     *     `IContentProtectionIntermediateRepresentation` is skipped.
     * @param {Object} representation
     * @param {Object} contentProt
     * @param {boolean} force
     * @returns {boolean}
     */
    _tryParsing(representation, contentProt, force) {
      if (contentProt.attributes.ref === void 0) {
        parseContentProtection(representation, contentProt);
        return true;
      }
      const referenced = this._getReferenced(contentProt.attributes.ref);
      if (referenced === void 0) {
        if (force) {
          log_default.warn("dash", "forcing the parsing of a referencing ContentProtection");
          parseContentProtection(representation, contentProt);
        }
        return false;
      }
      contentProt.children.cencPssh.push(...referenced.children.cencPssh);
      if (contentProt.attributes.keyId === void 0 && referenced.attributes.keyId !== void 0) {
        contentProt.attributes.keyId = referenced.attributes.keyId;
      }
      if (contentProt.attributes.schemeIdUri === void 0 && referenced.attributes.schemeIdUri !== void 0) {
        contentProt.attributes.schemeIdUri = referenced.attributes.schemeIdUri;
      }
      if (contentProt.attributes.value === void 0 && referenced.attributes.value !== void 0) {
        contentProt.attributes.value = referenced.attributes.value;
      }
      parseContentProtection(representation, contentProt);
      return true;
    }
    /**
     * Returns an `IContentProtectionIntermediateRepresentation` based on its
     * "refId".
     * Returns `undefined` if it is not known yet.
     *
     * @param {string} refId
     * @returns {Object|undefined}
     */
    _getReferenced(refId) {
      return this._refs.get(refId);
    }
  };
  function parseContentProtection(representation, contentProtectionIr) {
    let systemId;
    if (contentProtectionIr.attributes.schemeIdUri !== void 0 && contentProtectionIr.attributes.schemeIdUri.substring(0, 9) === "urn:uuid:") {
      systemId = contentProtectionIr.attributes.schemeIdUri.substring(9).replace(/-/g, "").toLowerCase();
    }
    if (contentProtectionIr.attributes.keyId !== void 0 && contentProtectionIr.attributes.keyId.length > 0) {
      const kid = contentProtectionIr.attributes.keyId;
      if (representation.contentProtections === void 0) {
        representation.contentProtections = { keyIds: [kid], initData: [] };
      } else if (representation.contentProtections.keyIds === void 0) {
        representation.contentProtections.keyIds = [kid];
      } else {
        representation.contentProtections.keyIds.push(kid);
      }
    }
    if (systemId === void 0) {
      return;
    }
    const { cencPssh } = contentProtectionIr.children;
    const values = [];
    for (const data of cencPssh) {
      values.push({ systemId, data });
    }
    if (values.length === 0) {
      return;
    }
    if (representation.contentProtections === void 0) {
      representation.contentProtections = {
        keyIds: [],
        initData: [{ type: "cenc", values }]
      };
      return;
    }
    const cencInitData = arrayFind(
      representation.contentProtections.initData,
      (i) => i.type === "cenc"
    );
    if (cencInitData === void 0) {
      representation.contentProtections.initData.push({ type: "cenc", values });
    } else {
      cencInitData.values.push(...values);
    }
  }

  // src/parsers/manifest/dash/common/get_clock_offset.ts
  function getClockOffset(serverClock) {
    const httpOffset = Date.parse(serverClock) - monotonic_timestamp_default();
    if (isNaN(httpOffset)) {
      log_default.warn("dash", "Invalid clock received", { clock: serverClock });
      return void 0;
    }
    return httpOffset;
  }

  // src/parsers/manifest/dash/common/get_http_utc-timing_url.ts
  function getHTTPUTCTimingURL(mpdIR) {
    const UTCTimingHTTP = mpdIR.children.utcTimings.filter(
      (utcTiming) => (utcTiming.schemeIdUri === "urn:mpeg:dash:utc:http-iso:2014" || utcTiming.schemeIdUri === "urn:mpeg:dash:utc:http-xsdate:2014") && utcTiming.value !== void 0
    );
    return UTCTimingHTTP.length > 0 ? UTCTimingHTTP[0].value : void 0;
  }

  // src/parsers/manifest/utils/get_last_time_from_adaptation.ts
  function getLastPositionFromAdaptation(adaptation) {
    const { representations } = adaptation;
    let min = null;
    for (const representation of representations) {
      const lastPosition = representation.index.getLastAvailablePosition();
      if (lastPosition === void 0) {
        return void 0;
      }
      if (lastPosition !== null) {
        min = min === null ? lastPosition : Math.min(min, lastPosition);
      }
    }
    if (min === null) {
      return null;
    }
    return min;
  }

  // src/parsers/manifest/utils/get_maximum_positions.ts
  function getMaximumPosition(periods) {
    for (let i = periods.length - 1; i >= 0; i--) {
      const periodAdaptations = periods[i].adaptations;
      const firstAudioAdaptationFromPeriod = periodAdaptations.audio === void 0 ? void 0 : periodAdaptations.audio[0];
      const firstVideoAdaptationFromPeriod = periodAdaptations.video === void 0 ? void 0 : periodAdaptations.video[0];
      if (firstAudioAdaptationFromPeriod !== void 0 || firstVideoAdaptationFromPeriod !== void 0) {
        let maximumAudioPosition = null;
        let maximumVideoPosition = null;
        if (firstAudioAdaptationFromPeriod !== void 0) {
          const lastPosition = getLastPositionFromAdaptation(
            firstAudioAdaptationFromPeriod
          );
          if (lastPosition === void 0) {
            return { safe: void 0, unsafe: void 0 };
          }
          maximumAudioPosition = lastPosition;
        }
        if (firstVideoAdaptationFromPeriod !== void 0) {
          const lastPosition = getLastPositionFromAdaptation(
            firstVideoAdaptationFromPeriod
          );
          if (lastPosition === void 0) {
            return { safe: void 0, unsafe: void 0 };
          }
          maximumVideoPosition = lastPosition;
        }
        if (firstAudioAdaptationFromPeriod !== void 0 && maximumAudioPosition === null || firstVideoAdaptationFromPeriod !== void 0 && maximumVideoPosition === null) {
          log_default.info(
            "utils",
            "found Period with no segment. ",
            "Going to previous one to calculate last position"
          );
          return { safe: void 0, unsafe: void 0 };
        }
        if (maximumVideoPosition !== null) {
          if (maximumAudioPosition !== null) {
            return {
              safe: Math.min(maximumAudioPosition, maximumVideoPosition),
              unsafe: Math.max(maximumAudioPosition, maximumVideoPosition)
            };
          }
          return { safe: maximumVideoPosition, unsafe: maximumVideoPosition };
        }
        if (maximumAudioPosition !== null) {
          return { safe: maximumAudioPosition, unsafe: maximumAudioPosition };
        }
      }
    }
    return { safe: void 0, unsafe: void 0 };
  }

  // src/parsers/manifest/utils/get_first_time_from_adaptation.ts
  function getFirstPositionFromAdaptation(adaptation) {
    const { representations } = adaptation;
    let max = null;
    for (const representation of representations) {
      const firstPosition = representation.index.getFirstAvailablePosition();
      if (firstPosition === void 0) {
        return void 0;
      }
      if (firstPosition !== null) {
        max = max === null ? firstPosition : Math.max(max, firstPosition);
      }
    }
    if (max === null) {
      return null;
    }
    return max;
  }

  // src/parsers/manifest/utils/get_minimum_position.ts
  function getMinimumPosition(periods) {
    for (let i = 0; i <= periods.length - 1; i++) {
      const periodAdaptations = periods[i].adaptations;
      const firstAudioAdaptationFromPeriod = periodAdaptations.audio === void 0 ? void 0 : periodAdaptations.audio[0];
      const firstVideoAdaptationFromPeriod = periodAdaptations.video === void 0 ? void 0 : periodAdaptations.video[0];
      if (firstAudioAdaptationFromPeriod !== void 0 || firstVideoAdaptationFromPeriod !== void 0) {
        let minimumAudioPosition = null;
        let minimumVideoPosition = null;
        if (firstAudioAdaptationFromPeriod !== void 0) {
          const firstPosition = getFirstPositionFromAdaptation(
            firstAudioAdaptationFromPeriod
          );
          if (firstPosition === void 0) {
            return void 0;
          }
          minimumAudioPosition = firstPosition;
        }
        if (firstVideoAdaptationFromPeriod !== void 0) {
          const firstPosition = getFirstPositionFromAdaptation(
            firstVideoAdaptationFromPeriod
          );
          if (firstPosition === void 0) {
            return void 0;
          }
          minimumVideoPosition = firstPosition;
        }
        if (firstAudioAdaptationFromPeriod !== void 0 && minimumAudioPosition === null || firstVideoAdaptationFromPeriod !== void 0 && minimumVideoPosition === null) {
          log_default.info(
            "utils",
            "found Period with no segment. ",
            "Going to next one to calculate first position"
          );
          return void 0;
        }
        if (minimumVideoPosition !== null) {
          if (minimumAudioPosition !== null) {
            return Math.max(minimumAudioPosition, minimumVideoPosition);
          }
          return minimumVideoPosition;
        }
        if (minimumAudioPosition !== null) {
          return minimumAudioPosition;
        }
      }
    }
  }

  // src/parsers/manifest/dash/common/get_minimum_and_maximum_positions.ts
  function getMinimumAndMaximumPositions(periods) {
    if (periods.length === 0) {
      throw new Error("DASH Parser: no period available for a dynamic content");
    }
    const minimumSafePosition = getMinimumPosition(periods);
    const maxPositions = getMaximumPosition(periods);
    return {
      minimumSafePosition,
      maximumSafePosition: maxPositions.safe,
      maximumUnsafePosition: maxPositions.unsafe
    };
  }

  // src/parsers/manifest/dash/common/manifest_bounds_calculator.ts
  var ManifestBoundsCalculator = class {
    /**
     * @param {Object} args
     */
    constructor(args) {
      this._isDynamic = args.isDynamic;
      this._timeShiftBufferDepth = !args.isDynamic || args.timeShiftBufferDepth === void 0 ? null : args.timeShiftBufferDepth;
      this._serverTimestampOffset = args.serverTimestampOffset;
      this._availabilityStartTime = args.availabilityStartTime;
    }
    /**
     * Set the last position and the position time (the value of the RxPlayer's
     * monotonically-raising timestamp at the time that position was true
     * converted into seconds).
     *
     * @example
     * Example if you trust `Date.now()` to give you a reliable offset:
     * ```js
     * const lastPosition = Date.now();
     * const positionTime = getMonotonicTimeStamp() / 1000;
     * manifestBoundsCalculator.setLastPosition(lastPosition, positionTime);
     * ```
     *
     * @param {number} lastPosition
     * @param {number|undefined} positionTime
     */
    setLastPosition(lastPosition, positionTime) {
      this._lastPosition = lastPosition;
      this._positionTime = positionTime;
    }
    /**
     * Returns `true` if the last position and the position time
     * (for dynamic content only) have been comunicated.
     * `false` otherwise.
     * @returns {boolean}
     */
    lastPositionIsKnown() {
      if (this._isDynamic) {
        return this._positionTime !== void 0 && this._lastPosition !== void 0;
      }
      return this._lastPosition !== void 0;
    }
    /**
     * Estimate a minimum bound for the content from the last set segment time
     * and buffer depth.
     * Consider that it is only an estimate, not the real value.
     * @param {number} segmentDuration - In DASH, the buffer depth actually also
     * depend on a corresponding's segment duration (e.g. a segment become
     * unavailable once the `timeShiftBufferDepth` + its duration has elapsed).
     * This argument can thus be set the approximate duration of a segment.
     * @return {number|undefined}
     */
    getEstimatedMinimumSegmentTime(segmentDuration) {
      var _a2;
      if (!this._isDynamic || this._timeShiftBufferDepth === null) {
        return 0;
      }
      const maximumBound = (_a2 = this.getEstimatedLiveEdge()) != null ? _a2 : this.getEstimatedMaximumPosition(0);
      if (maximumBound === void 0) {
        return void 0;
      }
      const minimumBound = maximumBound - (this._timeShiftBufferDepth + segmentDuration);
      return minimumBound;
    }
    /**
     * Estimate the segment time in seconds that corresponds to what could be
     * considered the live edge (or `undefined` for non-live contents).
     *
     * Note that for some contents which just anounce segments in advance, this
     * value might be very different than the maximum position that is
     * requestable.
     * @return {number|undefined}
     */
    getEstimatedLiveEdge() {
      if (!this._isDynamic || this._serverTimestampOffset === void 0) {
        return void 0;
      }
      return (monotonic_timestamp_default() + this._serverTimestampOffset) / 1e3 - this._availabilityStartTime;
    }
    /**
     * Produce a rough estimate of the ending time of the last requestable segment
     * in that content.
     *
     * This value is only an estimate and may be far from reality.
     *
     * The `availabilityTimeOffset` in argument is the corresponding
     * `availabilityTimeOffset` that applies to the current wanted segment, or `0`
     * if none exist. It will be applied on live content to deduce the maximum
     * segment time available.
     */
    getEstimatedMaximumPosition(availabilityTimeOffset) {
      if (!this._isDynamic) {
        return this._lastPosition;
      }
      const liveEdge = this.getEstimatedLiveEdge();
      if (liveEdge !== void 0 && availabilityTimeOffset !== Infinity) {
        return liveEdge + availabilityTimeOffset;
      } else if (this._positionTime !== void 0 && this._lastPosition !== void 0) {
        return Math.max(
          this._lastPosition - this._positionTime + monotonic_timestamp_default() / 1e3,
          0
        );
      }
      return this._lastPosition;
    }
  };

  // src/parsers/manifest/dash/common/parse_availability_start_time.ts
  function parseAvailabilityStartTime(rootAttributes, referenceDateTime) {
    if (rootAttributes.type !== "dynamic") {
      return 0;
    }
    if (isNullOrUndefined(rootAttributes.availabilityStartTime)) {
      return referenceDateTime != null ? referenceDateTime : 0;
    }
    return rootAttributes.availabilityStartTime;
  }

  // src/parsers/manifest/dash/common/flatten_overlapping_periods.ts
  function flattenOverlappingPeriods(parsedPeriods) {
    if (parsedPeriods.length === 0) {
      return [];
    }
    const flattenedPeriods = [parsedPeriods[0]];
    for (let i = 1; i < parsedPeriods.length; i++) {
      const parsedPeriod = parsedPeriods[i];
      let lastFlattenedPeriod = flattenedPeriods[flattenedPeriods.length - 1];
      while (lastFlattenedPeriod.duration === void 0 || lastFlattenedPeriod.start + lastFlattenedPeriod.duration > parsedPeriod.start) {
        log_default.warn("dash", "Updating overlapping Periods.", {
          lastStart: lastFlattenedPeriod == null ? void 0 : lastFlattenedPeriod.start,
          newStart: parsedPeriod.start
        });
        lastFlattenedPeriod.duration = parsedPeriod.start - lastFlattenedPeriod.start;
        lastFlattenedPeriod.end = parsedPeriod.start;
        if (lastFlattenedPeriod.duration > 0) {
          break;
        } else {
          flattenedPeriods.pop();
          if (flattenedPeriods.length === 0) {
            break;
          }
          lastFlattenedPeriod = flattenedPeriods[flattenedPeriods.length - 1];
        }
      }
      flattenedPeriods.push(parsedPeriod);
    }
    return flattenedPeriods;
  }

  // src/parsers/manifest/dash/common/get_periods_time_infos.ts
  function getPeriodsTimeInformation(periodsIR, manifestInfos) {
    const periodsTimeInformation = [];
    periodsIR.forEach((currentPeriod, i) => {
      let periodStart;
      if (!isNullOrUndefined(currentPeriod.attributes.start)) {
        periodStart = currentPeriod.attributes.start;
      } else {
        if (i === 0) {
          periodStart = !manifestInfos.isDynamic || isNullOrUndefined(manifestInfos.availabilityStartTime) ? 0 : manifestInfos.availabilityStartTime;
        } else {
          const prevPeriodInfos = periodsTimeInformation[periodsTimeInformation.length - 1];
          if (!isNullOrUndefined(prevPeriodInfos) && !isNullOrUndefined(prevPeriodInfos.periodEnd)) {
            periodStart = prevPeriodInfos.periodEnd;
          } else {
            throw new Error("Missing start time when parsing periods.");
          }
        }
      }
      let periodDuration;
      const nextPeriod = periodsIR[i + 1];
      if (!isNullOrUndefined(currentPeriod.attributes.duration)) {
        periodDuration = currentPeriod.attributes.duration;
      } else if (i === periodsIR.length - 1) {
        periodDuration = manifestInfos.duration;
      } else if (!isNullOrUndefined(nextPeriod.attributes.start)) {
        periodDuration = nextPeriod.attributes.start - periodStart;
      }
      const periodEnd = !isNullOrUndefined(periodDuration) ? periodStart + periodDuration : void 0;
      periodsTimeInformation.push({ periodStart, periodDuration, periodEnd });
    });
    return periodsTimeInformation;
  }

  // src/parsers/manifest/dash/common/attach_trickmode_track.ts
  function attachTrickModeTrack(adaptations, trickModeTracks) {
    for (const track of trickModeTracks) {
      const { adaptation, trickModeAttachedAdaptationIds } = track;
      for (const trickModeAttachedAdaptationId of trickModeAttachedAdaptationIds) {
        for (const adaptationType of SUPPORTED_ADAPTATIONS_TYPE) {
          const adaptationsByType = adaptations[adaptationType];
          if (adaptationsByType !== void 0) {
            for (const adaptationByType of adaptationsByType) {
              if (adaptationByType.id === trickModeAttachedAdaptationId) {
                if (adaptationByType.trickModeTracks === void 0) {
                  adaptationByType.trickModeTracks = [];
                }
                adaptationByType.trickModeTracks.push(adaptation);
              }
            }
          }
        }
      }
    }
  }
  var attach_trickmode_track_default = attachTrickModeTrack;

  // src/parsers/manifest/dash/common/infer_adaptation_type.ts
  var SUPPORTED_TEXT_TYPES = ["subtitle", "caption"];
  function getThumbnailAdaptationSetInfo(adaptation, representation) {
    var _a2, _b2, _c2, _d2;
    const thumbnailProp = (_d2 = arrayFind(
      (_a2 = adaptation.children.essentialProperties) != null ? _a2 : [],
      (p) => p.schemeIdUri === "http://dashif.org/guidelines/thumbnail_tile" || p.schemeIdUri === "http://dashif.org/thumbnail_tile"
    )) != null ? _d2 : arrayFind(
      (_c2 = (_b2 = representation != null ? representation : adaptation.children.representations[0]) == null ? void 0 : _b2.children.essentialProperties) != null ? _c2 : [],
      (p) => p.schemeIdUri === "http://dashif.org/guidelines/thumbnail_tile" || p.schemeIdUri === "http://dashif.org/thumbnail_tile"
    );
    if (thumbnailProp === void 0) {
      return null;
    }
    const tilesRegex = /(\d+)x(\d+)/;
    if (thumbnailProp === void 0 || thumbnailProp.value === void 0 || !tilesRegex.test(thumbnailProp.value)) {
      log_default.warn("dash", "Invalid thumbnails Representation, no tile-related information");
      return null;
    }
    const match = thumbnailProp.value.match(tilesRegex);
    const horizontalTiles = parseInt(match[1], 10);
    const verticalTiles = parseInt(match[2], 10);
    return {
      horizontalTiles,
      verticalTiles
    };
  }
  function inferAdaptationType(adaptation, representations) {
    if (adaptation.attributes.contentType === "image") {
      if (getThumbnailAdaptationSetInfo(adaptation) !== null) {
        return "thumbnails";
      }
      return void 0;
    }
    const adaptationMimeType = isNonEmptyString(adaptation.attributes.mimeType) ? adaptation.attributes.mimeType : null;
    const adaptationCodecs = isNonEmptyString(adaptation.attributes.codecs) ? adaptation.attributes.codecs : null;
    const adaptationRoles = !isNullOrUndefined(adaptation.children.roles) ? adaptation.children.roles : null;
    function fromMimeType(mimeType, roles) {
      const topLevel = mimeType.split("/")[0];
      if (arrayIncludes(
        SUPPORTED_ADAPTATIONS_TYPE,
        topLevel
      )) {
        return topLevel;
      }
      if (mimeType === "application/ttml+xml") {
        return "text";
      }
      if (mimeType === "application/mp4") {
        if (roles !== null) {
          if (arrayFind(
            roles,
            (role) => role.schemeIdUri === "urn:mpeg:dash:role:2011" && arrayIncludes(SUPPORTED_TEXT_TYPES, role.value)
          ) !== void 0) {
            return "text";
          }
        }
        return void 0;
      }
    }
    function fromCodecs(codecs) {
      switch (codecs.substring(0, 3)) {
        case "avc":
        case "hev":
        case "hvc":
        case "vp8":
        case "vp9":
        case "av1":
          return "video";
        case "vtt":
          return "text";
      }
      switch (codecs.substring(0, 4)) {
        case "mp4a":
          return "audio";
        case "wvtt":
        case "stpp":
          return "text";
      }
    }
    if (adaptationMimeType !== null) {
      const typeFromMimeType = fromMimeType(adaptationMimeType, adaptationRoles);
      if (typeFromMimeType !== void 0) {
        return typeFromMimeType;
      }
    }
    if (adaptationCodecs !== null) {
      const typeFromCodecs = fromCodecs(adaptationCodecs);
      if (typeFromCodecs !== void 0) {
        return typeFromCodecs;
      }
    }
    for (let i = 0; i < representations.length; i++) {
      const representation = representations[i];
      const { mimeType, codecs } = representation.attributes;
      if (mimeType !== void 0) {
        const typeFromMimeType = fromMimeType(mimeType, adaptationRoles);
        if (typeFromMimeType !== void 0) {
          return typeFromMimeType;
        }
      }
      if (codecs !== void 0) {
        const typeFromCodecs = fromCodecs(codecs);
        if (typeFromCodecs !== void 0) {
          return typeFromCodecs;
        }
      }
    }
    return void 0;
  }

  // src/parsers/manifest/dash/common/convert_supplemental_codecs.ts
  var supplementalCodecSeparator = /[, ]+/g;
  function convertSupplementalCodecsToRFC6381(val) {
    if (isNonEmptyString(val)) {
      return val.trim().replace(supplementalCodecSeparator, ", ");
    }
    return "";
  }

  // src/parsers/manifest/dash/common/get_hdr_information.ts
  function getWEBMHDRInformation(codecString) {
    const [cccc, _PP, _LL, DD, _CC, cp, tc, mc] = codecString.split(".");
    if (cccc !== "vp08" && cccc !== "vp09" && cccc !== "vp10") {
      return void 0;
    }
    let colorDepth;
    let eotf;
    let colorSpace;
    if (DD !== void 0 && DD === "10" || DD === "12") {
      colorDepth = parseInt(DD, 10);
    }
    if (tc !== void 0) {
      if (tc === "16") {
        eotf = "pq";
      } else if (tc === "18") {
        eotf = "hlg";
      }
    }
    if (cp !== void 0 && mc !== void 0 && cp === "09" && mc === "09") {
      colorSpace = "rec2020";
    }
    if (colorDepth === void 0 || eotf === void 0) {
      return void 0;
    }
    return { colorDepth, eotf, colorSpace };
  }

  // src/parsers/manifest/dash/common/parse_representation_index.ts
  function parseRepresentationIndex(representation, context) {
    var _a2, _b2, _c2;
    const {
      availabilityTimeOffset,
      manifestBoundsCalculator,
      isDynamic,
      end: periodEnd,
      start: periodStart,
      receivedTime,
      unsafelyBaseOnPreviousRepresentation,
      inbandEventStreams,
      isLastPeriod
    } = context;
    const isEMSGWhitelisted = (inbandEvent) => {
      if (inbandEventStreams === void 0) {
        return false;
      }
      return inbandEventStreams.some(
        ({ schemeIdUri }) => schemeIdUri === inbandEvent.schemeIdUri
      );
    };
    const reprIndexCtxt = {
      availabilityTimeComplete: void 0,
      availabilityTimeOffset,
      unsafelyBaseOnPreviousRepresentation,
      isEMSGWhitelisted,
      isLastPeriod,
      manifestBoundsCalculator,
      isDynamic,
      periodEnd,
      periodStart,
      receivedTime,
      representationBitrate: representation.attributes.bitrate,
      representationId: representation.attributes.id
    };
    let representationIndex;
    if (representation.children.segmentBase !== void 0) {
      const { segmentBase } = representation.children;
      representationIndex = new BaseRepresentationIndex(segmentBase, reprIndexCtxt);
    } else if (representation.children.segmentList !== void 0) {
      const { segmentList } = representation.children;
      representationIndex = new ListRepresentationIndex(segmentList, reprIndexCtxt);
    } else if (representation.children.segmentTemplate !== void 0 || context.parentSegmentTemplates.length > 0) {
      const segmentTemplates = context.parentSegmentTemplates.slice();
      const childSegmentTemplate = representation.children.segmentTemplate;
      if (childSegmentTemplate !== void 0) {
        segmentTemplates.push(childSegmentTemplate);
      }
      const segmentTemplate = object_assign_default(
        {},
        ...segmentTemplates
      );
      if (segmentTemplate.availabilityTimeOffset !== void 0 || context.availabilityTimeOffset !== void 0) {
        reprIndexCtxt.availabilityTimeOffset = ((_a2 = segmentTemplate.availabilityTimeOffset) != null ? _a2 : 0) + ((_b2 = context.availabilityTimeOffset) != null ? _b2 : 0);
      }
      if (segmentTemplate.availabilityTimeComplete !== void 0 || context.availabilityTimeComplete !== void 0) {
        reprIndexCtxt.availabilityTimeComplete = (_c2 = segmentTemplate.availabilityTimeComplete) != null ? _c2 : context.availabilityTimeComplete;
      }
      representationIndex = timeline_default.isTimelineIndexArgument(
        segmentTemplate
      ) ? new timeline_default(segmentTemplate, reprIndexCtxt) : new TemplateRepresentationIndex(segmentTemplate, reprIndexCtxt);
    } else {
      const adaptationChildren = context.adaptation.children;
      if (adaptationChildren.segmentBase !== void 0) {
        const { segmentBase } = adaptationChildren;
        representationIndex = new BaseRepresentationIndex(segmentBase, reprIndexCtxt);
      } else if (adaptationChildren.segmentList !== void 0) {
        const { segmentList } = adaptationChildren;
        representationIndex = new ListRepresentationIndex(segmentList, reprIndexCtxt);
      } else {
        representationIndex = new TemplateRepresentationIndex(
          {
            duration: Number.MAX_VALUE,
            timescale: 1,
            startNumber: 0,
            media: ""
          },
          reprIndexCtxt
        );
      }
    }
    return representationIndex;
  }

  // src/parsers/manifest/dash/common/resolve_base_urls.ts
  function resolveBaseURLs(currentBaseURLs, newBaseUrlsIR) {
    var _a2;
    if (newBaseUrlsIR.length === 0) {
      return currentBaseURLs;
    }
    const newBaseUrls = newBaseUrlsIR.map((ir) => {
      return { url: ir.value };
    });
    if (currentBaseURLs.length === 0) {
      return newBaseUrls;
    }
    const result = [];
    for (let i = 0; i < currentBaseURLs.length; i++) {
      const curBaseUrl = currentBaseURLs[i];
      for (let j = 0; j < newBaseUrls.length; j++) {
        const newBaseUrl = newBaseUrls[j];
        const newUrl = resolveURL(curBaseUrl.url, newBaseUrl.url);
        result.push({
          url: newUrl,
          serviceLocation: (_a2 = newBaseUrl.serviceLocation) != null ? _a2 : curBaseUrl.serviceLocation
        });
      }
    }
    return result;
  }

  // src/parsers/manifest/dash/common/parse_representations.ts
  function combineInbandEventStreams(representation, adaptation) {
    const newSchemeId = [];
    if (representation.children.inbandEventStreams !== void 0) {
      newSchemeId.push(...representation.children.inbandEventStreams);
    }
    if (adaptation.children.inbandEventStreams !== void 0) {
      newSchemeId.push(...adaptation.children.inbandEventStreams);
    }
    if (newSchemeId.length === 0) {
      return void 0;
    }
    return newSchemeId;
  }
  function getHDRInformation({
    adaptationProfiles,
    essentialProperties,
    supplementalProperties,
    manifestProfiles,
    codecs
  }) {
    const profiles = (adaptationProfiles != null ? adaptationProfiles : "") + (manifestProfiles != null ? manifestProfiles : "");
    if (profiles.indexOf("http://dashif.org/guidelines/dash-if-uhd#hevc-hdr-pq10") !== -1) {
      if (codecs === "hvc1.2.4.L153.B0" || codecs === "hev1.2.4.L153.B0") {
        return { colorDepth: 10, eotf: "pq", colorSpace: "rec2020" };
      }
    }
    const transferCharacteristicScheme = arrayFind(
      [...essentialProperties != null ? essentialProperties : [], ...supplementalProperties != null ? supplementalProperties : []],
      (p) => p.schemeIdUri === "urn:mpeg:mpegB:cicp:TransferCharacteristics"
    );
    if (transferCharacteristicScheme !== void 0) {
      switch (transferCharacteristicScheme.value) {
        case "15":
          return void 0;
        // SDR
        case "16":
          return { eotf: "pq" };
        case "18":
          return { eotf: "hlg" };
      }
    }
    if (codecs !== void 0 && /^vp(08|09|10)/.test(codecs)) {
      return getWEBMHDRInformation(codecs);
    }
  }
  function parseRepresentations(representationsIR, adaptation, context) {
    var _a2, _b2, _c2, _d2, _e2, _f, _g;
    const parsedRepresentations = [];
    for (const representation of representationsIR) {
      let representationID = representation.attributes.id !== void 0 ? representation.attributes.id : String(representation.attributes.bitrate) + (representation.attributes.height !== void 0 ? `-${representation.attributes.height}` : "") + (representation.attributes.width !== void 0 ? `-${representation.attributes.width}` : "") + (representation.attributes.mimeType !== void 0 ? `-${representation.attributes.mimeType}` : "") + (representation.attributes.codecs !== void 0 ? `-${representation.attributes.codecs}` : "");
      while (parsedRepresentations.some((r) => r.id === representationID)) {
        representationID += "-dup";
      }
      const unsafelyBaseOnPreviousRepresentation = (_b2 = (_a2 = context.unsafelyBaseOnPreviousAdaptation) == null ? void 0 : _a2.getRepresentation(representationID)) != null ? _b2 : null;
      const inbandEventStreams = combineInbandEventStreams(representation, adaptation);
      const availabilityTimeComplete = (_c2 = representation.attributes.availabilityTimeComplete) != null ? _c2 : context.availabilityTimeComplete;
      let availabilityTimeOffset;
      if (representation.attributes.availabilityTimeOffset !== void 0 || context.availabilityTimeOffset !== void 0) {
        availabilityTimeOffset = ((_d2 = representation.attributes.availabilityTimeOffset) != null ? _d2 : 0) + ((_e2 = context.availabilityTimeOffset) != null ? _e2 : 0);
      }
      const reprIndexCtxt = object_assign_default({}, context, {
        availabilityTimeOffset,
        availabilityTimeComplete,
        unsafelyBaseOnPreviousRepresentation,
        adaptation,
        inbandEventStreams
      });
      const representationIndex = parseRepresentationIndex(representation, reprIndexCtxt);
      let representationBitrate;
      if (representation.attributes.bitrate === void 0) {
        log_default.warn("dash", "No usable bitrate found in the Representation.");
        representationBitrate = 0;
      } else {
        representationBitrate = representation.attributes.bitrate;
      }
      const representationBaseURLs = resolveBaseURLs(
        context.baseURLs,
        representation.children.baseURLs
      );
      const cdnMetadata = representationBaseURLs.length === 0 ? (
        // No BaseURL seems to be associated to this Representation, nor to the MPD,
        // but underlying segments might have one. To indicate that segments should
        // still be available through a CDN without giving any root CDN URL here,
        // we just communicate about an empty `baseUrl`, as documented.
        [{ baseUrl: "", id: void 0 }]
      ) : representationBaseURLs.map((x) => ({
        baseUrl: x.url,
        id: x.serviceLocation
      }));
      const parsedRepresentation = {
        bitrate: representationBitrate,
        cdnMetadata,
        index: representationIndex,
        id: representationID
      };
      if (representation.children.supplementalProperties !== void 0 && arrayFind(
        representation.children.supplementalProperties,
        (r) => r.schemeIdUri === "tag:dolby.com,2018:dash:EC3_ExtensionType:2018" && r.value === "JOC"
      ) !== void 0) {
        parsedRepresentation.isSpatialAudio = true;
      }
      let codecs;
      if (representation.attributes.codecs !== void 0) {
        codecs = representation.attributes.codecs;
      } else if (adaptation.attributes.codecs !== void 0) {
        codecs = adaptation.attributes.codecs;
      }
      if (codecs !== void 0) {
        codecs = codecs === "mp4a.40.02" ? "mp4a.40.2" : codecs;
        parsedRepresentation.codecs = codecs;
      }
      let supplementalCodecs;
      if (representation.attributes.supplementalCodecs !== void 0) {
        supplementalCodecs = representation.attributes.supplementalCodecs;
      } else if (adaptation.attributes.supplementalCodecs !== void 0) {
        supplementalCodecs = adaptation.attributes.supplementalCodecs;
      }
      if (supplementalCodecs !== void 0) {
        parsedRepresentation.supplementalCodecs = convertSupplementalCodecsToRFC6381(supplementalCodecs);
      }
      if (representation.attributes.frameRate !== void 0) {
        parsedRepresentation.frameRate = representation.attributes.frameRate;
      } else if (adaptation.attributes.frameRate !== void 0) {
        parsedRepresentation.frameRate = adaptation.attributes.frameRate;
      }
      if (representation.attributes.height !== void 0) {
        parsedRepresentation.height = representation.attributes.height;
      } else if (adaptation.attributes.height !== void 0) {
        parsedRepresentation.height = adaptation.attributes.height;
      }
      if (representation.attributes.mimeType !== void 0) {
        parsedRepresentation.mimeType = representation.attributes.mimeType;
      } else if (adaptation.attributes.mimeType !== void 0) {
        parsedRepresentation.mimeType = adaptation.attributes.mimeType;
      }
      if (representation.attributes.width !== void 0) {
        parsedRepresentation.width = representation.attributes.width;
      } else if (adaptation.attributes.width !== void 0) {
        parsedRepresentation.width = adaptation.attributes.width;
      }
      {
        const contentProtIrArr = [
          ...(_f = adaptation.children.contentProtections) != null ? _f : [],
          ...(_g = representation.children.contentProtections) != null ? _g : []
        ];
        for (const contentProtIr of contentProtIrArr) {
          context.contentProtectionParser.add(parsedRepresentation, contentProtIr);
        }
      }
      parsedRepresentation.hdrInfo = getHDRInformation({
        adaptationProfiles: adaptation.attributes.profiles,
        supplementalProperties: adaptation.children.supplementalProperties,
        essentialProperties: adaptation.children.essentialProperties,
        manifestProfiles: context.manifestProfiles,
        codecs
      });
      parsedRepresentations.push(parsedRepresentation);
    }
    return parsedRepresentations;
  }

  // src/parsers/manifest/dash/common/parse_adaptation_sets.ts
  function isVisuallyImpaired(accessibility) {
    if (accessibility === void 0) {
      return false;
    }
    const isVisuallyImpairedAudioDvbDash = accessibility.schemeIdUri === "urn:tva:metadata:cs:AudioPurposeCS:2007" && accessibility.value === "1";
    const isVisuallyImpairedDashIf = accessibility.schemeIdUri === "urn:mpeg:dash:role:2011" && accessibility.value === "description";
    return isVisuallyImpairedAudioDvbDash || isVisuallyImpairedDashIf;
  }
  function isCaptionning(accessibilities, roles) {
    if (accessibilities !== void 0) {
      const hasDvbClosedCaptionSignaling = accessibilities.some(
        (accessibility) => accessibility.schemeIdUri === "urn:tva:metadata:cs:AudioPurposeCS:2007" && accessibility.value === "2"
      );
      if (hasDvbClosedCaptionSignaling) {
        return true;
      }
    }
    if (roles !== void 0) {
      const hasDashCaptionSinaling = roles.some(
        (role) => role.schemeIdUri === "urn:mpeg:dash:role:2011" && role.value === "caption"
      );
      if (hasDashCaptionSinaling) {
        return true;
      }
    }
    return false;
  }
  function hasSignLanguageInterpretation(accessibility) {
    if (accessibility === void 0) {
      return false;
    }
    return accessibility.schemeIdUri === "urn:mpeg:dash:role:2011" && accessibility.value === "sign";
  }
  function getAdaptationID(adaptation, infos) {
    if (isNonEmptyString(adaptation.attributes.id)) {
      return adaptation.attributes.id;
    }
    const {
      isClosedCaption,
      isForcedSubtitle,
      isAudioDescription,
      isSignInterpreted,
      isTrickModeTrack,
      type
    } = infos;
    let idString = type;
    if (isNonEmptyString(adaptation.attributes.language)) {
      idString += `-${adaptation.attributes.language}`;
    }
    if (isClosedCaption === true) {
      idString += "-cc";
    }
    if (isForcedSubtitle === true) {
      idString += "-cc";
    }
    if (isAudioDescription === true) {
      idString += "-ad";
    }
    if (isSignInterpreted === true) {
      idString += "-si";
    }
    if (isTrickModeTrack) {
      idString += "-trickMode";
    }
    if (isNonEmptyString(adaptation.attributes.contentType)) {
      idString += `-${adaptation.attributes.contentType}`;
    }
    if (isNonEmptyString(adaptation.attributes.codecs)) {
      idString += `-${adaptation.attributes.codecs}`;
    }
    if (isNonEmptyString(adaptation.attributes.mimeType)) {
      idString += `-${adaptation.attributes.mimeType}`;
    }
    if (adaptation.attributes.frameRate !== void 0) {
      idString += `-${String(adaptation.attributes.frameRate)}`;
    }
    return idString;
  }
  function getAdaptationSetSwitchingIDs(adaptation) {
    if (!isNullOrUndefined(adaptation.children.supplementalProperties)) {
      const { supplementalProperties } = adaptation.children;
      for (const supplementalProperty of supplementalProperties) {
        if (supplementalProperty.schemeIdUri === "urn:mpeg:dash:adaptation-set-switching:2016" && !isNullOrUndefined(supplementalProperty.value)) {
          return supplementalProperty.value.split(",").map((id) => id.trim()).filter((id) => isNonEmptyString(id));
        }
      }
    }
    return [];
  }
  function parseAdaptationSets(adaptationsIR, context) {
    var _a2, _b2, _c2, _d2, _e2, _f, _g;
    const parsedAdaptations = { video: [], audio: [], text: [] };
    const parsedThumbnailTracks = [];
    const trickModeAdaptations = [];
    const adaptationSwitchingInfos = {};
    const parsedAdaptationsIDs = [];
    for (let adaptationIdx = 0; adaptationIdx < adaptationsIR.length; adaptationIdx++) {
      const adaptation = adaptationsIR[adaptationIdx];
      const adaptationChildren = adaptation.children;
      const { essentialProperties, roles, label } = adaptationChildren;
      const isMainAdaptation = Array.isArray(roles) && roles.some((role) => role.value === "main") && roles.some((role) => role.schemeIdUri === "urn:mpeg:dash:role:2011");
      const representationsIR = adaptation.children.representations;
      const availabilityTimeComplete = (_a2 = adaptation.attributes.availabilityTimeComplete) != null ? _a2 : context.availabilityTimeComplete;
      let availabilityTimeOffset;
      if (adaptation.attributes.availabilityTimeOffset !== void 0 || context.availabilityTimeOffset !== void 0) {
        availabilityTimeOffset = ((_b2 = adaptation.attributes.availabilityTimeOffset) != null ? _b2 : 0) + ((_c2 = context.availabilityTimeOffset) != null ? _c2 : 0);
      }
      const type = inferAdaptationType(adaptation, representationsIR);
      if (type === void 0) {
        continue;
      }
      const priority = (_d2 = adaptation.attributes.selectionPriority) != null ? _d2 : 1;
      const originalID = adaptation.attributes.id;
      const adaptationSetSwitchingIDs = getAdaptationSetSwitchingIDs(adaptation);
      const parentSegmentTemplates = [];
      if (context.segmentTemplate !== void 0) {
        parentSegmentTemplates.push(context.segmentTemplate);
      }
      if (adaptation.children.segmentTemplate !== void 0) {
        parentSegmentTemplates.push(adaptation.children.segmentTemplate);
      }
      const reprCtxt = {
        availabilityTimeComplete,
        availabilityTimeOffset,
        baseURLs: resolveBaseURLs(context.baseURLs, adaptationChildren.baseURLs),
        contentProtectionParser: context.contentProtectionParser,
        manifestBoundsCalculator: context.manifestBoundsCalculator,
        end: context.end,
        isDynamic: context.isDynamic,
        isLastPeriod: context.isLastPeriod,
        manifestProfiles: context.manifestProfiles,
        parentSegmentTemplates,
        receivedTime: context.receivedTime,
        start: context.start,
        unsafelyBaseOnPreviousAdaptation: null
      };
      const trickModeProperty = Array.isArray(essentialProperties) ? arrayFind(essentialProperties, (scheme) => {
        return scheme.schemeIdUri === "http://dashif.org/guidelines/trickmode";
      }) : void 0;
      const trickModeAttachedAdaptationIds = (_e2 = trickModeProperty == null ? void 0 : trickModeProperty.value) == null ? void 0 : _e2.split(" ");
      const isTrickModeTrack = trickModeAttachedAdaptationIds !== void 0;
      const { accessibilities } = adaptationChildren;
      let isDub;
      if (roles !== void 0 && roles.some((role) => role.value === "dub")) {
        isDub = true;
      }
      let isClosedCaption;
      if (type !== "text") {
        isClosedCaption = false;
      } else {
        isClosedCaption = isCaptionning(accessibilities, roles);
      }
      let isForcedSubtitle;
      if (type === "text" && roles !== void 0 && roles.some(
        (role) => role.value === "forced-subtitle" || role.value === "forced_subtitle"
      )) {
        isForcedSubtitle = true;
      }
      let isAudioDescription;
      if (type !== "audio") {
        isAudioDescription = false;
      } else if (accessibilities !== void 0) {
        isAudioDescription = accessibilities.some(isVisuallyImpaired);
      }
      let isSignInterpreted;
      if (type !== "video") {
        isSignInterpreted = false;
      } else if (accessibilities !== void 0) {
        isSignInterpreted = accessibilities.some(hasSignLanguageInterpretation);
      }
      let adaptationID = getAdaptationID(adaptation, {
        isAudioDescription,
        isForcedSubtitle,
        isClosedCaption,
        isSignInterpreted,
        isTrickModeTrack,
        type
      });
      while (arrayIncludes(parsedAdaptationsIDs, adaptationID)) {
        adaptationID += "-dup";
      }
      const newID = adaptationID;
      parsedAdaptationsIDs.push(adaptationID);
      reprCtxt.unsafelyBaseOnPreviousAdaptation = (_g = (_f = context.unsafelyBaseOnPreviousPeriod) == null ? void 0 : _f.getAdaptation(adaptationID)) != null ? _g : null;
      const representations = parseRepresentations(representationsIR, adaptation, reprCtxt);
      if (type === "thumbnails") {
        const track = createThumbnailTracks(adaptation, representations);
        if (track !== null) {
          parsedThumbnailTracks.push(...track);
        }
        continue;
      }
      const parsedAdaptationSet = {
        id: adaptationID,
        representations,
        type,
        isTrickModeTrack
      };
      if (!isNullOrUndefined(adaptation.attributes.language)) {
        parsedAdaptationSet.language = adaptation.attributes.language;
      }
      if (!isNullOrUndefined(isClosedCaption)) {
        parsedAdaptationSet.closedCaption = isClosedCaption;
      }
      if (!isNullOrUndefined(isAudioDescription)) {
        parsedAdaptationSet.audioDescription = isAudioDescription;
      }
      if (isDub === true) {
        parsedAdaptationSet.isDub = true;
      }
      if (isForcedSubtitle !== void 0) {
        parsedAdaptationSet.forcedSubtitles = isForcedSubtitle;
      }
      if (isSignInterpreted === true) {
        parsedAdaptationSet.isSignInterpreted = true;
      }
      if (label !== void 0) {
        parsedAdaptationSet.label = label;
      }
      if (trickModeAttachedAdaptationIds !== void 0) {
        trickModeAdaptations.push({
          adaptation: parsedAdaptationSet,
          trickModeAttachedAdaptationIds
        });
      } else {
        let mergedIntoIdx = -1;
        for (const id of adaptationSetSwitchingIDs) {
          const switchingInfos = adaptationSwitchingInfos[id];
          if (switchingInfos !== void 0 && switchingInfos.newID !== newID && arrayIncludes(switchingInfos.adaptationSetSwitchingIDs, originalID)) {
            mergedIntoIdx = arrayFindIndex(parsedAdaptations[type], (a) => a[0].id === id);
            const mergedInto = parsedAdaptations[type][mergedIntoIdx];
            if (mergedInto !== void 0 && mergedInto[0].audioDescription === parsedAdaptationSet.audioDescription && mergedInto[0].closedCaption === parsedAdaptationSet.closedCaption && mergedInto[0].language === parsedAdaptationSet.language) {
              log_default.info("dash", 'merging "switchable" AdaptationSets', { originalID, id });
              mergedInto[0].representations.push(...parsedAdaptationSet.representations);
              mergedInto[1] = {
                priority: Math.max(priority, mergedInto[1].priority),
                isMainAdaptation: isMainAdaptation || mergedInto[1].isMainAdaptation,
                indexInMpd: Math.min(adaptationIdx, mergedInto[1].indexInMpd)
              };
              break;
            }
          }
        }
        if (mergedIntoIdx < 0) {
          parsedAdaptations[type].push([
            parsedAdaptationSet,
            { priority, isMainAdaptation, indexInMpd: adaptationIdx }
          ]);
        }
      }
      if (!isNullOrUndefined(originalID) && isNullOrUndefined(adaptationSwitchingInfos[originalID])) {
        adaptationSwitchingInfos[originalID] = {
          newID,
          adaptationSetSwitchingIDs
        };
      }
    }
    const adaptationsPerType = SUPPORTED_ADAPTATIONS_TYPE.reduce(
      (acc, adaptationType) => {
        const adaptationsParsedForType = parsedAdaptations[adaptationType];
        if (adaptationsParsedForType.length > 0) {
          adaptationsParsedForType.sort(compareAdaptations);
          acc[adaptationType] = adaptationsParsedForType.map(
            ([parsedAdaptation]) => parsedAdaptation
          );
        }
        return acc;
      },
      {}
    );
    parsedAdaptations.video.sort(compareAdaptations);
    attach_trickmode_track_default(adaptationsPerType, trickModeAdaptations);
    return {
      adaptations: adaptationsPerType,
      thumbnailTracks: parsedThumbnailTracks
    };
  }
  function createThumbnailTracks(adaptation, representations) {
    var _a2, _b2;
    const tracks = [];
    for (let i = 0; i < representations.length; i++) {
      const representation = representations[i];
      if (representation !== void 0) {
        if (representation.mimeType === void 0) {
          log_default.warn("dash", "Invalid thumbnails Representation, no mime-type");
          continue;
        }
        const tileInfo = getThumbnailAdaptationSetInfo(
          adaptation,
          adaptation.children.representations[i]
        );
        if (tileInfo === null) {
          continue;
        }
        if (representation.height === void 0) {
          log_default.warn("dash", "Invalid thumbnails Representation, no height information");
          continue;
        }
        if (representation.width === void 0) {
          log_default.warn("dash", "Invalid thumbnails Representation, no width information");
          continue;
        }
        const start = (_a2 = representation.index.getFirstAvailablePosition()) != null ? _a2 : void 0;
        const end = (_b2 = representation.index.getEnd()) != null ? _b2 : void 0;
        let segmentDuration;
        const targetDuration = representation.index.getTargetSegmentDuration();
        if (targetDuration !== void 0 && targetDuration.isPrecize) {
          segmentDuration = targetDuration.duration;
        } else {
          log_default.warn("dash", "Cannot produce duration estimate for thumbnail track");
        }
        tracks.push({
          id: representation.id,
          cdnMetadata: representation.cdnMetadata,
          index: representation.index,
          mimeType: representation.mimeType,
          height: representation.height,
          width: representation.width,
          horizontalTiles: tileInfo.horizontalTiles,
          verticalTiles: tileInfo.verticalTiles,
          start,
          end,
          tileDuration: segmentDuration === void 0 ? void 0 : segmentDuration / (tileInfo.horizontalTiles * tileInfo.verticalTiles)
        });
      }
    }
    return tracks;
  }
  function compareAdaptations(a, b) {
    const priorityDiff = b[1].priority - a[1].priority;
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    if (a[1].isMainAdaptation !== b[1].isMainAdaptation) {
      return a[1].isMainAdaptation ? -1 : 1;
    }
    return a[1].indexInMpd - b[1].indexInMpd;
  }

  // src/parsers/manifest/dash/common/parse_periods.ts
  var generatePeriodID = idGenerator();
  function parsePeriods(periodsIR, context) {
    var _a2, _b2, _c2, _d2, _e2;
    const parsedPeriods = [];
    const periodsTimeInformation = getPeriodsTimeInformation(periodsIR, context);
    if (periodsTimeInformation.length !== periodsIR.length) {
      throw new Error("MPD parsing error: the time information are incoherent.");
    }
    const { isDynamic, manifestBoundsCalculator } = context;
    if (!isDynamic && !isNullOrUndefined(context.duration)) {
      manifestBoundsCalculator.setLastPosition(context.duration);
    }
    for (let i = periodsIR.length - 1; i >= 0; i--) {
      const isLastPeriod = i === periodsIR.length - 1;
      const periodIR = periodsIR[i];
      const xlinkInfos = context.xlinkInfos.get(periodIR);
      const periodBaseURLs = resolveBaseURLs(context.baseURLs, periodIR.children.baseURLs);
      const { periodStart, periodDuration, periodEnd } = periodsTimeInformation[i];
      let periodID;
      if (isNullOrUndefined(periodIR.attributes.id)) {
        periodID = "gen-dash-period-" + generatePeriodID();
        log_default.warn("dash", "No usable id found in the Period. Generating one.", {
          periodId: periodID
        });
      } else {
        periodID = periodIR.attributes.id;
      }
      while (parsedPeriods.some((p) => p.id === periodID)) {
        periodID += "-dup";
      }
      const receivedTime = xlinkInfos !== void 0 ? xlinkInfos.receivedTime : context.receivedTime;
      const unsafelyBaseOnPreviousPeriod = (_b2 = (_a2 = context.unsafelyBaseOnPreviousManifest) == null ? void 0 : _a2.getPeriod(periodID)) != null ? _b2 : null;
      const availabilityTimeComplete = periodIR.attributes.availabilityTimeComplete;
      const availabilityTimeOffset = periodIR.attributes.availabilityTimeOffset;
      const { manifestProfiles, contentProtectionParser } = context;
      const { segmentTemplate } = periodIR.children;
      contentProtectionParser.addReferences((_c2 = periodIR.children.contentProtections) != null ? _c2 : []);
      const adapCtxt = {
        availabilityTimeComplete,
        availabilityTimeOffset,
        baseURLs: periodBaseURLs,
        contentProtectionParser,
        manifestBoundsCalculator,
        end: periodEnd,
        isDynamic,
        isLastPeriod,
        manifestProfiles,
        receivedTime,
        segmentTemplate,
        start: periodStart,
        unsafelyBaseOnPreviousPeriod
      };
      const { adaptations, thumbnailTracks } = parseAdaptationSets(
        periodIR.children.adaptations,
        adapCtxt
      );
      const namespaces = ((_d2 = context.xmlNamespaces) != null ? _d2 : []).concat(
        (_e2 = periodIR.attributes.namespaces) != null ? _e2 : []
      );
      const streamEvents = generateStreamEvents(
        periodIR.children.eventStreams,
        periodStart,
        namespaces
      );
      const parsedPeriod = {
        id: periodID,
        start: periodStart,
        end: periodEnd,
        duration: periodDuration,
        thumbnailTracks,
        adaptations,
        streamEvents
      };
      parsedPeriods.unshift(parsedPeriod);
      if (!manifestBoundsCalculator.lastPositionIsKnown()) {
        const lastPosition = getMaximumLastPosition(adaptations);
        if (!isDynamic) {
          if (typeof lastPosition === "number") {
            manifestBoundsCalculator.setLastPosition(lastPosition);
          }
        } else {
          if (typeof lastPosition === "number") {
            const positionTime = monotonic_timestamp_default() / 1e3;
            manifestBoundsCalculator.setLastPosition(lastPosition, positionTime);
          } else {
            const guessedLastPositionFromClock = guessLastPositionFromClock(
              context,
              periodStart
            );
            if (guessedLastPositionFromClock !== void 0) {
              const [guessedLastPosition, guessedPositionTime] = guessedLastPositionFromClock;
              manifestBoundsCalculator.setLastPosition(
                guessedLastPosition,
                guessedPositionTime
              );
            }
          }
        }
      }
    }
    if (context.isDynamic && !manifestBoundsCalculator.lastPositionIsKnown()) {
      const guessedLastPositionFromClock = guessLastPositionFromClock(context, 0);
      if (guessedLastPositionFromClock !== void 0) {
        const [lastPosition, positionTime] = guessedLastPositionFromClock;
        manifestBoundsCalculator.setLastPosition(lastPosition, positionTime);
      }
    }
    return flattenOverlappingPeriods(parsedPeriods);
  }
  function guessLastPositionFromClock(context, minimumTime) {
    if (!isNullOrUndefined(context.clockOffset)) {
      const lastPosition = context.clockOffset / 1e3 - context.availabilityStartTime;
      const positionTime = monotonic_timestamp_default() / 1e3;
      const timeInSec = positionTime + lastPosition;
      if (timeInSec >= minimumTime) {
        return [timeInSec, positionTime];
      }
    } else {
      const now = Date.now() / 1e3;
      if (now >= minimumTime) {
        log_default.warn(
          "dash",
          "no clock synchronization mechanism found. Using the system clock instead."
        );
        const lastPosition = now - context.availabilityStartTime;
        const positionTime = monotonic_timestamp_default() / 1e3;
        return [lastPosition, positionTime];
      }
    }
    return void 0;
  }
  function getMaximumLastPosition(adaptationsPerType) {
    let maxEncounteredPosition = null;
    let allIndexAreEmpty = true;
    const adaptationsVal = object_values_default(adaptationsPerType).filter(
      (ada) => !isNullOrUndefined(ada)
    );
    const allAdaptations = flatMap(
      adaptationsVal,
      (adaptationsForType) => adaptationsForType
    );
    for (const adaptation of allAdaptations) {
      const representations = adaptation.representations;
      for (const representation of representations) {
        const position = representation.index.getLastAvailablePosition();
        if (position !== null) {
          allIndexAreEmpty = false;
          if (typeof position === "number") {
            maxEncounteredPosition = isNullOrUndefined(maxEncounteredPosition) ? position : Math.max(maxEncounteredPosition, position);
          }
        }
      }
    }
    if (!isNullOrUndefined(maxEncounteredPosition)) {
      return maxEncounteredPosition;
    } else if (allIndexAreEmpty) {
      return null;
    }
    return void 0;
  }
  function generateStreamEvents(baseIr, periodStart, xmlNamespaces) {
    var _a2, _b2;
    const res = [];
    for (const eventStreamIr of baseIr) {
      const { schemeIdUri = "", timescale = 1 } = eventStreamIr.attributes;
      const allNamespaces = xmlNamespaces.concat((_a2 = eventStreamIr.attributes.namespaces) != null ? _a2 : []);
      for (const eventIr of eventStreamIr.children.events) {
        if (eventIr.eventStreamData !== void 0) {
          const start = ((_b2 = eventIr.presentationTime) != null ? _b2 : 0) / timescale + periodStart;
          const end = eventIr.duration === void 0 ? void 0 : start + eventIr.duration / timescale;
          let element;
          let xmlData;
          try {
            xmlData = {
              namespaces: allNamespaces,
              data: typeof eventIr.eventStreamData === "string" ? eventIr.eventStreamData : utf8ToStr(new Uint8Array(eventIr.eventStreamData))
            };
          } catch (err) {
            log_default.error(
              "dash",
              "Error while parsing event-stream:",
              err instanceof Error ? err.message : "Unknown error"
            );
          }
          res.push({
            start,
            end,
            id: eventIr.id,
            data: {
              type: "dash-event-stream",
              value: { schemeIdUri, timescale, element, xmlData }
            }
          });
        }
      }
    }
    return res;
  }

  // src/parsers/manifest/dash/common/parse_mpd.ts
  function parseMpdIr(mpdIR, args, warnings, hasLoadedClock, xlinkInfos = /* @__PURE__ */ new WeakMap()) {
    const { children: rootChildren, attributes: rootAttributes } = mpdIR;
    if (isNullOrUndefined(args.externalClockOffset)) {
      const isDynamic = rootAttributes.type === "dynamic";
      const directTiming = arrayFind(rootChildren.utcTimings, (utcTiming) => {
        return utcTiming.schemeIdUri === "urn:mpeg:dash:utc:direct:2014" && !isNullOrUndefined(utcTiming.value);
      });
      const clockOffsetFromDirectUTCTiming = !isNullOrUndefined(directTiming) && !isNullOrUndefined(directTiming.value) ? getClockOffset(directTiming.value) : void 0;
      const clockOffset = !isNullOrUndefined(clockOffsetFromDirectUTCTiming) && !isNaN(clockOffsetFromDirectUTCTiming) ? clockOffsetFromDirectUTCTiming : void 0;
      if (!isNullOrUndefined(clockOffset) && hasLoadedClock !== true) {
        args.externalClockOffset = clockOffset;
      } else if (isDynamic && hasLoadedClock !== true) {
        const UTCTimingHTTPURL = getHTTPUTCTimingURL(mpdIR);
        if (!isNullOrUndefined(UTCTimingHTTPURL) && UTCTimingHTTPURL.length > 0) {
          return {
            type: "needs-clock",
            value: {
              url: UTCTimingHTTPURL,
              continue: function continueParsingMPD(responseDataClock) {
                if (!responseDataClock.success) {
                  warnings.push(responseDataClock.error);
                  log_default.warn(
                    "dash",
                    "Error on fetching the clock ressource",
                    responseDataClock.error
                  );
                  return parseMpdIr(mpdIR, args, warnings, true);
                }
                args.externalClockOffset = getClockOffset(responseDataClock.data);
                return parseMpdIr(mpdIR, args, warnings, true);
              }
            }
          };
        }
      }
    }
    const xlinksToLoad = [];
    for (let i = 0; i < rootChildren.periods.length; i++) {
      const { xlinkHref, xlinkActuate } = rootChildren.periods[i].attributes;
      if (!isNullOrUndefined(xlinkHref) && xlinkActuate === "onLoad") {
        xlinksToLoad.push({ index: i, ressource: xlinkHref });
      }
    }
    if (xlinksToLoad.length === 0) {
      return parseCompleteIntermediateRepresentation(mpdIR, args, warnings, xlinkInfos);
    }
    return {
      type: "needs-xlinks",
      value: {
        xlinksUrls: xlinksToLoad.map(({ ressource }) => ressource),
        continue: function continueParsingMPD(loadedRessources) {
          if (loadedRessources.length !== xlinksToLoad.length) {
            throw new Error("DASH parser: wrong number of loaded ressources.");
          }
          for (let i = loadedRessources.length - 1; i >= 0; i--) {
            const index = xlinksToLoad[i].index;
            const {
              parsed: periodsIR,
              warnings: parsingWarnings,
              receivedTime,
              sendingTime,
              url
            } = loadedRessources[i];
            if (parsingWarnings.length > 0) {
              warnings.push(...parsingWarnings);
            }
            for (const periodIR of periodsIR) {
              xlinkInfos.set(periodIR, { receivedTime, sendingTime, url });
            }
            rootChildren.periods.splice(index, 1, ...periodsIR);
          }
          return parseMpdIr(mpdIR, args, warnings, hasLoadedClock, xlinkInfos);
        }
      }
    };
  }
  function parseCompleteIntermediateRepresentation(mpdIR, args, warnings, xlinkInfos) {
    var _a2, _b2, _c2, _d2, _e2;
    const { children: rootChildren, attributes: rootAttributes } = mpdIR;
    const isDynamic = rootAttributes.type === "dynamic";
    const initialBaseUrl = args.url !== void 0 ? [{ url: args.url.substring(0, getFilenameIndexInUrl(args.url)) }] : [];
    const mpdBaseUrls = resolveBaseURLs(initialBaseUrl, rootChildren.baseURLs);
    const availabilityStartTime = parseAvailabilityStartTime(
      rootAttributes,
      args.referenceDateTime
    );
    const timeShiftBufferDepth = rootAttributes.timeShiftBufferDepth;
    const maxSegmentDuration = rootAttributes.maxSegmentDuration;
    const { externalClockOffset: clockOffset, unsafelyBaseOnPreviousManifest } = args;
    const { externalClockOffset } = args;
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      availabilityStartTime,
      isDynamic,
      timeShiftBufferDepth,
      serverTimestampOffset: externalClockOffset
    });
    const contentProtectionParser = new ContentProtectionParser();
    contentProtectionParser.addReferences((_a2 = rootChildren.contentProtections) != null ? _a2 : []);
    const manifestInfos = {
      availabilityStartTime,
      baseURLs: mpdBaseUrls,
      clockOffset,
      contentProtectionParser,
      duration: rootAttributes.duration,
      isDynamic,
      manifestBoundsCalculator,
      manifestProfiles: mpdIR.attributes.profiles,
      receivedTime: args.manifestReceivedTime,
      unsafelyBaseOnPreviousManifest,
      xlinkInfos,
      xmlNamespaces: mpdIR.attributes.namespaces
    };
    const parsedPeriods = parsePeriods(rootChildren.periods, manifestInfos);
    contentProtectionParser.finalize();
    const mediaPresentationDuration = rootAttributes.duration;
    let lifetime;
    let minimumTime;
    let timeshiftDepth = null;
    let maximumTimeData;
    if (rootAttributes.minimumUpdatePeriod !== void 0 && rootAttributes.minimumUpdatePeriod >= 0) {
      lifetime = rootAttributes.minimumUpdatePeriod === 0 ? config_default.getCurrent().DASH_FALLBACK_LIFETIME_WHEN_MINIMUM_UPDATE_PERIOD_EQUAL_0 : rootAttributes.minimumUpdatePeriod;
    }
    const { minimumSafePosition, maximumSafePosition, maximumUnsafePosition } = getMinimumAndMaximumPositions(parsedPeriods);
    const now = monotonic_timestamp_default();
    if (!isDynamic) {
      minimumTime = minimumSafePosition;
      if (minimumTime === void 0) {
        minimumTime = (_c2 = (_b2 = parsedPeriods[0]) == null ? void 0 : _b2.start) != null ? _c2 : 0;
      }
      let finalMaximumSafePosition = mediaPresentationDuration != null ? mediaPresentationDuration : Infinity;
      if (parsedPeriods[parsedPeriods.length - 1] !== void 0) {
        const lastPeriod = parsedPeriods[parsedPeriods.length - 1];
        const lastPeriodEnd = (_d2 = lastPeriod.end) != null ? _d2 : lastPeriod.duration !== void 0 ? lastPeriod.start + lastPeriod.duration : void 0;
        if (lastPeriodEnd !== void 0 && lastPeriodEnd < finalMaximumSafePosition) {
          finalMaximumSafePosition = lastPeriodEnd;
        }
      }
      if (maximumSafePosition !== void 0 && maximumSafePosition < finalMaximumSafePosition) {
        finalMaximumSafePosition = maximumSafePosition;
      }
      maximumTimeData = {
        isLinear: false,
        maximumSafePosition: finalMaximumSafePosition,
        livePosition: void 0,
        time: now
      };
    } else {
      let finalMaximumSafePosition;
      if (maximumSafePosition !== void 0) {
        finalMaximumSafePosition = maximumSafePosition;
      } else {
        if (externalClockOffset === void 0) {
          log_default.warn("dash", "use system clock to define maximum position");
          finalMaximumSafePosition = Date.now() / 1e3 - availabilityStartTime;
        } else {
          const serverTime = monotonic_timestamp_default() + externalClockOffset;
          finalMaximumSafePosition = serverTime / 1e3 - availabilityStartTime;
        }
      }
      let livePosition = manifestBoundsCalculator.getEstimatedLiveEdge();
      if (livePosition === void 0) {
        if (maximumUnsafePosition !== void 0) {
          livePosition = maximumUnsafePosition;
        } else {
          livePosition = finalMaximumSafePosition;
        }
      }
      maximumTimeData = {
        isLinear: true,
        maximumSafePosition: finalMaximumSafePosition,
        livePosition,
        time: now
      };
      minimumTime = minimumSafePosition;
      timeshiftDepth = timeShiftBufferDepth != null ? timeShiftBufferDepth : null;
      if (timeshiftDepth !== null) {
        timeshiftDepth += maxSegmentDuration != null ? maxSegmentDuration : 0;
      }
      if (timeshiftDepth !== null && minimumTime !== void 0 && livePosition - minimumTime > timeshiftDepth) {
        timeshiftDepth = livePosition - minimumTime;
      }
    }
    const isLastPeriodKnown = !isDynamic || mpdIR.attributes.minimumUpdatePeriod === void 0 && (((_e2 = parsedPeriods[parsedPeriods.length - 1]) == null ? void 0 : _e2.end) !== void 0 || mpdIR.attributes.duration !== void 0);
    const parsedMPD = {
      availabilityStartTime,
      clockOffset: args.externalClockOffset,
      isDynamic,
      isLive: isDynamic,
      isLastPeriodKnown,
      periods: parsedPeriods,
      publishTime: rootAttributes.publishTime,
      suggestedPresentationDelay: rootAttributes.suggestedPresentationDelay,
      transportType: "dash",
      timeBounds: {
        minimumSafePosition: minimumTime,
        timeshiftDepth,
        maximumTimeData
      },
      lifetime,
      uris: isNullOrUndefined(args.url) ? rootChildren.locations : [args.url, ...rootChildren.locations]
    };
    return { type: "done", value: { parsed: parsedMPD, warnings } };
  }

  // src/parsers/manifest/dash/common/index.ts
  var common_default = parseMpdIr;

  // src/parsers/manifest/dash/js-parser/node_parsers/utils.ts
  var iso8601Duration = /^P(([\d.]*)Y)?(([\d.]*)M)?(([\d.]*)D)?T?(([\d.]*)H)?(([\d.]*)M)?(([\d.]*)S)?/;
  var rangeRe = /([0-9]+)-([0-9]+)/;
  function parseBoolean(val, displayName) {
    if (val === "true") {
      return [true, null];
    }
    if (val === "false") {
      return [false, null];
    }
    const error = new MPDError(
      `\`${displayName}\` property is not a boolean value but "${val}"`
    );
    return [false, error];
  }
  function parseMPDInteger(val, displayName) {
    const toInt = parseInt(val, 10);
    if (isNaN(toInt)) {
      const error = new MPDError(
        `\`${displayName}\` property is not an integer value but "${val}"`
      );
      return [null, error];
    }
    return [toInt, null];
  }
  function parseMPDFloat(val, displayName) {
    if (val === "INF") {
      return [Infinity, null];
    }
    const toInt = parseFloat(val);
    if (isNaN(toInt)) {
      const error = new MPDError(`\`${displayName}\` property is invalid: "${val}"`);
      return [null, error];
    }
    return [toInt, null];
  }
  function parseIntOrBoolean(val, displayName) {
    if (val === "true") {
      return [true, null];
    }
    if (val === "false") {
      return [false, null];
    }
    const toInt = parseInt(val, 10);
    if (isNaN(toInt)) {
      const error = new MPDError(
        `\`${displayName}\` property is not a boolean nor an integer but "${val}"`
      );
      return [null, error];
    }
    return [toInt, null];
  }
  function parseDateTime(val, displayName) {
    const parsed = Date.parse(val);
    if (isNaN(parsed)) {
      const error = new MPDError(
        `\`${displayName}\` is in an invalid date format: "${val}"`
      );
      return [null, error];
    }
    return [new Date(Date.parse(val)).getTime() / 1e3, null];
  }
  function parseDuration(val, displayName) {
    if (!isNonEmptyString(val)) {
      const error = new MPDError(`\`${displayName}\` property is empty`);
      return [0, error];
    }
    const match = iso8601Duration.exec(val);
    if (match === null) {
      const error = new MPDError(
        `\`${displayName}\` property has an unrecognized format "${val}"`
      );
      return [null, error];
    }
    const duration = parseFloat(isNonEmptyString(match[2]) ? match[2] : "0") * 365 * 24 * 60 * 60 + parseFloat(isNonEmptyString(match[4]) ? match[4] : "0") * 30 * 24 * 60 * 60 + parseFloat(isNonEmptyString(match[6]) ? match[6] : "0") * 24 * 60 * 60 + parseFloat(isNonEmptyString(match[8]) ? match[8] : "0") * 60 * 60 + parseFloat(isNonEmptyString(match[10]) ? match[10] : "0") * 60 + parseFloat(isNonEmptyString(match[12]) ? match[12] : "0");
    return [duration, null];
  }
  function parseByteRange(val, displayName) {
    const match = rangeRe.exec(val);
    if (match === null) {
      const error = new MPDError(
        `\`${displayName}\` property has an unrecognized format "${val}"`
      );
      return [null, error];
    } else {
      return [[+match[1], +match[2]], null];
    }
  }
  function parseBase64(val, displayName) {
    try {
      return [base64ToBytes(val), null];
    } catch (_) {
      const error = new MPDError(
        `\`${displayName}\` is not a valid base64 string: "${val}"`
      );
      return [null, error];
    }
  }
  function parseMaybeDividedNumber(val, displayName) {
    const matches = /^(\d+)\/(\d+)$/.exec(val);
    if (matches !== null) {
      return [+matches[1] / +matches[2], null];
    }
    return parseMPDFloat(val, displayName);
  }
  function parseScheme(root) {
    let schemeIdUri;
    let value;
    for (const attributeName of Object.keys(root.attributes)) {
      const attributeVal = root.attributes[attributeName];
      if (isNullOrUndefined(attributeVal)) {
        continue;
      }
      switch (attributeName) {
        case "schemeIdUri":
          schemeIdUri = attributeVal;
          break;
        case "value":
          value = attributeVal;
          break;
      }
    }
    return { schemeIdUri, value };
  }
  function ValueParser(dest, warnings) {
    return function(val, {
      asKey,
      parser,
      dashName
    }) {
      const [parsingResult, parsingError] = parser(val, dashName);
      if (parsingError !== null) {
        log_default.warn("dash", "failed to parse DASH value:", parsingError.message, {
          dashName
        });
        warnings.push(parsingError);
      }
      if (parsingResult !== null) {
        dest[asKey] = parsingResult;
      }
    };
  }
  var MPDError = class _MPDError extends Error {
    /**
     * @param {string} message
     */
    constructor(message) {
      super(message);
      Object.setPrototypeOf(this, _MPDError.prototype);
      this.name = "MPDError";
    }
  };
  function textContent(children) {
    return toContentString(children);
  }

  // src/parsers/manifest/dash/js-parser/node_parsers/BaseURL.ts
  function parseBaseURL(root) {
    const value = typeof root === "string" ? root : textContent(root.children);
    const warnings = [];
    if (value === null || value.length === 0) {
      return [void 0, warnings];
    }
    return [{ value }, warnings];
  }

  // src/parsers/manifest/dash/js-parser/node_parsers/ContentProtection.ts
  function parseContentProtectionChildren(contentProtectionChildren) {
    const warnings = [];
    const cencPssh = [];
    for (let i = 0; i < contentProtectionChildren.length; i++) {
      const currentElement = contentProtectionChildren[i];
      if (typeof currentElement !== "string" && currentElement.tagName === "cenc:pssh") {
        const content = textContent(currentElement.children);
        if (content !== null && content.length > 0) {
          const [toUint8Array2, error] = parseBase64(content, "cenc:pssh");
          if (error !== null) {
            log_default.warn("dash", "Content protection parsing failure", error.message);
            warnings.push(error);
          }
          if (toUint8Array2 !== null) {
            cencPssh.push(toUint8Array2);
          }
        }
      }
    }
    return [{ cencPssh }, warnings];
  }
  function parseContentProtectionAttributes(root) {
    const ret = {};
    for (const attributeName of Object.keys(root.attributes)) {
      const attributeVal = root.attributes[attributeName];
      if (isNullOrUndefined(attributeVal)) {
        continue;
      }
      switch (attributeName) {
        case "schemeIdUri":
          ret.schemeIdUri = attributeVal;
          break;
        case "value":
          ret.value = attributeVal;
          break;
        case "cenc:default_KID":
          ret.keyId = hexToBytes(attributeVal.replace(/-/g, ""));
          break;
        case "ref":
          ret.ref = attributeVal;
          break;
        case "refId":
          ret.refId = attributeVal;
          break;
      }
    }
    return ret;
  }
  function parseContentProtection2(contentProtectionElement) {
    const [children, childrenWarnings] = parseContentProtectionChildren(
      contentProtectionElement.children
    );
    const attributes = parseContentProtectionAttributes(contentProtectionElement);
    return [{ children, attributes }, childrenWarnings];
  }

  // src/parsers/manifest/dash/js-parser/node_parsers/ContentComponent.ts
  function parseContentComponent(root) {
    const ret = {};
    for (const attributeName of Object.keys(root.attributes)) {
      const attributeVal = root.attributes[attributeName];
      if (isNullOrUndefined(attributeVal)) {
        continue;
      }
      switch (attributeName) {
        case "id":
          ret.id = attributeVal;
          break;
        case "lang":
          ret.language = attributeVal;
          break;
        case "contentType":
          ret.contentType = attributeVal;
          break;
        case "par":
          ret.par = attributeVal;
          break;
      }
    }
    return ret;
  }

  // src/parsers/manifest/dash/js-parser/node_parsers/Initialization.ts
  function parseInitialization(root) {
    const parsedInitialization = {};
    const warnings = [];
    const parseValue = ValueParser(parsedInitialization, warnings);
    for (const attributeName of Object.keys(root.attributes)) {
      const attributeVal = root.attributes[attributeName];
      if (isNullOrUndefined(attributeVal)) {
        continue;
      }
      switch (attributeName) {
        case "range":
          parseValue(attributeVal, {
            asKey: "range",
            parser: parseByteRange,
            dashName: "range"
          });
          break;
        case "sourceURL":
          parsedInitialization.media = attributeVal;
          break;
      }
    }
    return [parsedInitialization, warnings];
  }

  // src/parsers/manifest/dash/js-parser/node_parsers/SegmentBase.ts
  function parseSegmentBase(root) {
    const attributes = {};
    let warnings = [];
    const parseValue = ValueParser(attributes, warnings);
    const segmentBaseChildren = root.children;
    for (let i = 0; i < segmentBaseChildren.length; i++) {
      const currentNode = segmentBaseChildren[i];
      if (typeof currentNode !== "string") {
        if (currentNode.tagName === "Initialization") {
          const [initialization, initializationWarnings] = parseInitialization(currentNode);
          attributes.initialization = initialization;
          warnings = warnings.concat(initializationWarnings);
        }
      }
    }
    for (const attributeName of Object.keys(root.attributes)) {
      const attributeVal = root.attributes[attributeName];
      if (isNullOrUndefined(attributeVal)) {
        continue;
      }
      switch (attributeName) {
        case "timescale":
          parseValue(attributeVal, {
            asKey: "timescale",
            parser: parseMPDInteger,
            dashName: "timescale"
          });
          break;
        case "presentationTimeOffset":
          parseValue(attributeVal, {
            asKey: "presentationTimeOffset",
            parser: parseMPDFloat,
            dashName: "presentationTimeOffset"
          });
          break;
        case "indexRange":
          parseValue(attributeVal, {
            asKey: "indexRange",
            parser: parseByteRange,
            dashName: "indexRange"
          });
          break;
        case "indexRangeExact":
          parseValue(attributeVal, {
            asKey: "indexRangeExact",
            parser: parseBoolean,
            dashName: "indexRangeExact"
          });
          break;
        case "availabilityTimeOffset":
          parseValue(attributeVal, {
            asKey: "availabilityTimeOffset",
            parser: parseMPDFloat,
            dashName: "availabilityTimeOffset"
          });
          break;
        case "availabilityTimeComplete":
          parseValue(attributeVal, {
            asKey: "availabilityTimeComplete",
            parser: parseBoolean,
            dashName: "availabilityTimeComplete"
          });
          break;
        case "duration":
          parseValue(attributeVal, {
            asKey: "duration",
            parser: parseMPDInteger,
            dashName: "duration"
          });
          break;
        case "startNumber":
          parseValue(attributeVal, {
            asKey: "startNumber",
            parser: parseMPDInteger,
            dashName: "startNumber"
          });
          break;
        case "endNumber":
          parseValue(attributeVal, {
            asKey: "endNumber",
            parser: parseMPDInteger,
            dashName: "endNumber"
          });
          break;
      }
    }
    return [attributes, warnings];
  }

  // src/parsers/manifest/dash/js-parser/node_parsers/SegmentURL.ts
  function parseSegmentURL(root) {
    const parsedSegmentURL = {};
    const warnings = [];
    const parseValue = ValueParser(parsedSegmentURL, warnings);
    for (const attributeName of Object.keys(root.attributes)) {
      const attributeVal = root.attributes[attributeName];
      if (isNullOrUndefined(attributeVal)) {
        continue;
      }
      switch (attributeName) {
        case "media":
          parsedSegmentURL.media = attributeVal;
          break;
        case "indexRange":
          parseValue(attributeVal, {
            asKey: "indexRange",
            parser: parseByteRange,
            dashName: "indexRange"
          });
          break;
        case "index":
          parsedSegmentURL.index = attributeVal;
          break;
        case "mediaRange":
          parseValue(attributeVal, {
            asKey: "mediaRange",
            parser: parseByteRange,
            dashName: "mediaRange"
          });
          break;
      }
    }
    return [parsedSegmentURL, warnings];
  }

  // src/parsers/manifest/dash/js-parser/node_parsers/SegmentList.ts
  function parseSegmentList(root) {
    const [base, baseWarnings] = parseSegmentBase(root);
    let warnings = baseWarnings;
    const list = [];
    const segmentListChildren = root.children;
    for (let i = 0; i < segmentListChildren.length; i++) {
      const currentNode = segmentListChildren[i];
      if (typeof currentNode === "string") {
        continue;
      }
      if (currentNode.tagName === "SegmentURL") {
        const [segmentURL, segmentURLWarnings] = parseSegmentURL(currentNode);
        list.push(segmentURL);
        warnings = warnings.concat(segmentURLWarnings);
      }
    }
    const ret = object_assign_default(base, { list });
    return [ret, warnings];
  }

  // src/parsers/manifest/dash/js-parser/node_parsers/SegmentTimeline.ts
  function createSegmentTimelineParser(root) {
    const result = root.children;
    return function() {
      for (let i = result.length - 1; i >= 0; i--) {
        const item = result[i];
        if (typeof item === "string" || item.tagName !== "S") {
          result.splice(i, 1);
        }
      }
      return result;
    };
  }

  // src/parsers/manifest/dash/js-parser/node_parsers/SegmentTemplate.ts
  function parseSegmentTemplate(root) {
    const [base, segmentBaseWarnings] = parseSegmentBase(root);
    const warnings = segmentBaseWarnings;
    let timelineParser;
    for (let i = 0; i < root.children.length; i++) {
      const currentNode = root.children[i];
      if (typeof currentNode !== "string" && currentNode.tagName === "SegmentTimeline") {
        timelineParser = createSegmentTimelineParser(currentNode);
      }
    }
    const ret = object_assign_default({}, base, {
      duration: base.duration,
      timelineParser
    });
    const parseValue = ValueParser(ret, warnings);
    for (const attributeName of Object.keys(root.attributes)) {
      const attributeVal = root.attributes[attributeName];
      if (isNullOrUndefined(attributeVal)) {
        continue;
      }
      switch (attributeName) {
        case "initialization":
          if (isNullOrUndefined(ret.initialization)) {
            ret.initialization = { media: attributeVal };
          }
          break;
        case "index":
          ret.index = attributeVal;
          break;
        case "availabilityTimeOffset":
          parseValue(attributeVal, {
            asKey: "availabilityTimeOffset",
            parser: parseMPDFloat,
            dashName: "availabilityTimeOffset"
          });
          break;
        case "availabilityTimeComplete":
          parseValue(attributeVal, {
            asKey: "availabilityTimeComplete",
            parser: parseBoolean,
            dashName: "availabilityTimeComplete"
          });
          break;
        case "media":
          ret.media = attributeVal;
          break;
        case "bitstreamSwitching":
          parseValue(attributeVal, {
            asKey: "bitstreamSwitching",
            parser: parseBoolean,
            dashName: "bitstreamSwitching"
          });
          break;
      }
    }
    return [ret, warnings];
  }

  // src/parsers/manifest/dash/js-parser/node_parsers/Representation.ts
  function parseRepresentationChildren(representationChildren) {
    const children = {
      baseURLs: []
    };
    const contentProtections = [];
    let warnings = [];
    for (let i = 0; i < representationChildren.length; i++) {
      const currentElement = representationChildren[i];
      if (typeof currentElement === "string") {
        continue;
      }
      switch (currentElement.tagName) {
        case "BaseURL": {
          const [baseURLObj, baseURLWarnings] = parseBaseURL(currentElement);
          if (baseURLObj !== void 0) {
            children.baseURLs.push(baseURLObj);
          }
          warnings = warnings.concat(baseURLWarnings);
          break;
        }
        case "InbandEventStream":
          if (children.inbandEventStreams === void 0) {
            children.inbandEventStreams = [];
          }
          children.inbandEventStreams.push(parseScheme(currentElement));
          break;
        case "SegmentBase": {
          const [segmentBase, segmentBaseWarnings] = parseSegmentBase(currentElement);
          children.segmentBase = segmentBase;
          if (segmentBaseWarnings.length > 0) {
            warnings = warnings.concat(segmentBaseWarnings);
          }
          break;
        }
        case "SegmentList": {
          const [segmentList, segmentListWarnings] = parseSegmentList(currentElement);
          warnings = warnings.concat(segmentListWarnings);
          children.segmentList = segmentList;
          break;
        }
        case "SegmentTemplate": {
          const [segmentTemplate, segmentTemplateWarnings] = parseSegmentTemplate(currentElement);
          warnings = warnings.concat(segmentTemplateWarnings);
          children.segmentTemplate = segmentTemplate;
          break;
        }
        case "ContentProtection": {
          const [contentProtection, contentProtectionWarnings] = parseContentProtection2(currentElement);
          if (contentProtectionWarnings.length > 0) {
            warnings = warnings.concat(contentProtectionWarnings);
          }
          if (contentProtection !== void 0) {
            contentProtections.push(contentProtection);
          }
          break;
        }
        case "EssentialProperty":
          if (isNullOrUndefined(children.essentialProperties)) {
            children.essentialProperties = [parseScheme(currentElement)];
          } else {
            children.essentialProperties.push(parseScheme(currentElement));
          }
          break;
        case "SupplementalProperty":
          if (isNullOrUndefined(children.supplementalProperties)) {
            children.supplementalProperties = [parseScheme(currentElement)];
          } else {
            children.supplementalProperties.push(parseScheme(currentElement));
          }
          break;
      }
    }
    if (contentProtections.length > 0) {
      children.contentProtections = contentProtections;
    }
    return [children, warnings];
  }
  function parseRepresentationAttributes(root) {
    const attributes = {};
    const warnings = [];
    const parseValue = ValueParser(attributes, warnings);
    for (const attributeName of Object.keys(root.attributes)) {
      const attributeVal = root.attributes[attributeName];
      if (isNullOrUndefined(attributeVal)) {
        continue;
      }
      switch (attributeName) {
        case "audioSamplingRate":
          attributes.audioSamplingRate = attributeVal;
          break;
        case "bandwidth":
          parseValue(attributeVal, {
            asKey: "bitrate",
            parser: parseMPDInteger,
            dashName: "bandwidth"
          });
          break;
        case "codecs":
          attributes.codecs = attributeVal;
          break;
        case "codingDependency":
          parseValue(attributeVal, {
            asKey: "codingDependency",
            parser: parseBoolean,
            dashName: "codingDependency"
          });
          break;
        case "frameRate":
          parseValue(attributeVal, {
            asKey: "frameRate",
            parser: parseMaybeDividedNumber,
            dashName: "frameRate"
          });
          break;
        case "height":
          parseValue(attributeVal, {
            asKey: "height",
            parser: parseMPDInteger,
            dashName: "height"
          });
          break;
        case "id":
          attributes.id = attributeVal;
          break;
        case "maxPlayoutRate":
          parseValue(attributeVal, {
            asKey: "maxPlayoutRate",
            parser: parseMPDFloat,
            dashName: "maxPlayoutRate"
          });
          break;
        case "maximumSAPPeriod":
          parseValue(attributeVal, {
            asKey: "maximumSAPPeriod",
            parser: parseMPDFloat,
            dashName: "maximumSAPPeriod"
          });
          break;
        case "mimeType":
          attributes.mimeType = attributeVal;
          break;
        case "profiles":
          attributes.profiles = attributeVal;
          break;
        case "qualityRanking":
          parseValue(attributeVal, {
            asKey: "qualityRanking",
            parser: parseMPDInteger,
            dashName: "qualityRanking"
          });
          break;
        case "scte214:supplementalCodecs":
          attributes.supplementalCodecs = attributeVal;
          break;
        case "segmentProfiles":
          attributes.segmentProfiles = attributeVal;
          break;
        case "width":
          parseValue(attributeVal, {
            asKey: "width",
            parser: parseMPDInteger,
            dashName: "width"
          });
          break;
        case "availabilityTimeOffset":
          parseValue(attributeVal, {
            asKey: "availabilityTimeOffset",
            parser: parseMPDFloat,
            dashName: "availabilityTimeOffset"
          });
          break;
        case "availabilityTimeComplete":
          parseValue(attributeVal, {
            asKey: "availabilityTimeComplete",
            parser: parseBoolean,
            dashName: "availabilityTimeComplete"
          });
          break;
      }
    }
    if (attributes.bitrate === void 0) {
      warnings.push(new MPDError("No bitrate found on a Representation"));
    }
    return [attributes, warnings];
  }
  function createRepresentationIntermediateRepresentation(representationElement) {
    const [children, childrenWarnings] = parseRepresentationChildren(
      representationElement.children
    );
    const [attributes, attrsWarnings] = parseRepresentationAttributes(representationElement);
    const warnings = childrenWarnings.concat(attrsWarnings);
    return [{ children, attributes }, warnings];
  }

  // src/parsers/manifest/dash/js-parser/node_parsers/AdaptationSet.ts
  function parseAdaptationSetChildren(adaptationSetChildren) {
    const children = {
      baseURLs: [],
      representations: []
    };
    const contentProtections = [];
    let warnings = [];
    for (let i = 0; i < adaptationSetChildren.length; i++) {
      const currentNode = adaptationSetChildren[i];
      if (typeof currentNode === "string") {
        continue;
      }
      switch (currentNode.tagName) {
        case "Accessibility":
          if (children.accessibilities === void 0) {
            children.accessibilities = [parseScheme(currentNode)];
          } else {
            children.accessibilities.push(parseScheme(currentNode));
          }
          break;
        case "BaseURL": {
          const [baseURLObj, baseURLWarnings] = parseBaseURL(currentNode);
          if (baseURLObj !== void 0) {
            children.baseURLs.push(baseURLObj);
          }
          if (baseURLWarnings.length > 0) {
            warnings = warnings.concat(baseURLWarnings);
          }
          break;
        }
        case "ContentComponent":
          children.contentComponent = parseContentComponent(currentNode);
          break;
        case "EssentialProperty":
          if (isNullOrUndefined(children.essentialProperties)) {
            children.essentialProperties = [parseScheme(currentNode)];
          } else {
            children.essentialProperties.push(parseScheme(currentNode));
          }
          break;
        case "InbandEventStream":
          if (children.inbandEventStreams === void 0) {
            children.inbandEventStreams = [];
          }
          children.inbandEventStreams.push(parseScheme(currentNode));
          break;
        case "Label": {
          const label = textContent(currentNode.children);
          if (label !== null && label !== void 0) {
            children.label = label;
          }
          break;
        }
        case "Representation": {
          const [representation, representationWarnings] = createRepresentationIntermediateRepresentation(currentNode);
          children.representations.push(representation);
          if (representationWarnings.length > 0) {
            warnings = warnings.concat(representationWarnings);
          }
          break;
        }
        case "Role":
          if (isNullOrUndefined(children.roles)) {
            children.roles = [parseScheme(currentNode)];
          } else {
            children.roles.push(parseScheme(currentNode));
          }
          break;
        case "SupplementalProperty":
          if (isNullOrUndefined(children.supplementalProperties)) {
            children.supplementalProperties = [parseScheme(currentNode)];
          } else {
            children.supplementalProperties.push(parseScheme(currentNode));
          }
          break;
        case "SegmentBase": {
          const [segmentBase, segmentBaseWarnings] = parseSegmentBase(currentNode);
          children.segmentBase = segmentBase;
          if (segmentBaseWarnings.length > 0) {
            warnings = warnings.concat(segmentBaseWarnings);
          }
          break;
        }
        case "SegmentList": {
          const [segmentList, segmentListWarnings] = parseSegmentList(currentNode);
          children.segmentList = segmentList;
          if (segmentListWarnings.length > 0) {
            warnings = warnings.concat(segmentListWarnings);
          }
          break;
        }
        case "SegmentTemplate": {
          const [segmentTemplate, segmentTemplateWarnings] = parseSegmentTemplate(currentNode);
          children.segmentTemplate = segmentTemplate;
          if (segmentTemplateWarnings.length > 0) {
            warnings = warnings.concat(segmentTemplateWarnings);
          }
          break;
        }
        case "ContentProtection": {
          const [contentProtection, contentProtectionWarnings] = parseContentProtection2(currentNode);
          if (contentProtectionWarnings.length > 0) {
            warnings = warnings.concat(contentProtectionWarnings);
          }
          if (contentProtection !== void 0) {
            contentProtections.push(contentProtection);
          }
          break;
        }
      }
    }
    if (contentProtections.length > 0) {
      children.contentProtections = contentProtections;
    }
    return [children, warnings];
  }
  function parseAdaptationSetAttributes(root) {
    const parsedAdaptation = {};
    const warnings = [];
    const parseValue = ValueParser(parsedAdaptation, warnings);
    for (const attributeName of Object.keys(root.attributes)) {
      const attributeVal = root.attributes[attributeName];
      if (isNullOrUndefined(attributeVal)) {
        continue;
      }
      switch (attributeName) {
        case "id":
          parsedAdaptation.id = attributeVal;
          break;
        case "group":
          parseValue(attributeVal, {
            asKey: "group",
            parser: parseMPDInteger,
            dashName: "group"
          });
          break;
        case "lang":
          parsedAdaptation.language = attributeVal;
          break;
        case "contentType":
          parsedAdaptation.contentType = attributeVal;
          break;
        case "par":
          parsedAdaptation.par = attributeVal;
          break;
        case "minBandwidth":
          parseValue(attributeVal, {
            asKey: "minBitrate",
            parser: parseMPDInteger,
            dashName: "minBandwidth"
          });
          break;
        case "maxBandwidth":
          parseValue(attributeVal, {
            asKey: "maxBitrate",
            parser: parseMPDInteger,
            dashName: "maxBandwidth"
          });
          break;
        case "minWidth":
          parseValue(attributeVal, {
            asKey: "minWidth",
            parser: parseMPDInteger,
            dashName: "minWidth"
          });
          break;
        case "maxWidth":
          parseValue(attributeVal, {
            asKey: "maxWidth",
            parser: parseMPDInteger,
            dashName: "maxWidth"
          });
          break;
        case "minHeight":
          parseValue(attributeVal, {
            asKey: "minHeight",
            parser: parseMPDInteger,
            dashName: "minHeight"
          });
          break;
        case "maxHeight":
          parseValue(attributeVal, {
            asKey: "maxHeight",
            parser: parseMPDInteger,
            dashName: "maxHeight"
          });
          break;
        case "minFrameRate":
          parseValue(attributeVal, {
            asKey: "minFrameRate",
            parser: parseMaybeDividedNumber,
            dashName: "minFrameRate"
          });
          break;
        case "maxFrameRate":
          parseValue(attributeVal, {
            asKey: "maxFrameRate",
            parser: parseMaybeDividedNumber,
            dashName: "maxFrameRate"
          });
          break;
        case "selectionPriority":
          parseValue(attributeVal, {
            asKey: "selectionPriority",
            parser: parseMPDInteger,
            dashName: "selectionPriority"
          });
          break;
        case "segmentAlignment":
          parseValue(attributeVal, {
            asKey: "segmentAlignment",
            parser: parseIntOrBoolean,
            dashName: "segmentAlignment"
          });
          break;
        case "subsegmentAlignment":
          parseValue(attributeVal, {
            asKey: "subsegmentAlignment",
            parser: parseIntOrBoolean,
            dashName: "subsegmentAlignment"
          });
          break;
        case "bitstreamSwitching":
          parseValue(attributeVal, {
            asKey: "bitstreamSwitching",
            parser: parseBoolean,
            dashName: "bitstreamSwitching"
          });
          break;
        case "audioSamplingRate":
          parsedAdaptation.audioSamplingRate = attributeVal;
          break;
        case "codecs":
          parsedAdaptation.codecs = attributeVal;
          break;
        case "scte214:supplementalCodecs":
          parsedAdaptation.supplementalCodecs = attributeVal;
          break;
        case "codingDependency":
          parseValue(attributeVal, {
            asKey: "codingDependency",
            parser: parseBoolean,
            dashName: "codingDependency"
          });
          break;
        case "frameRate":
          parseValue(attributeVal, {
            asKey: "frameRate",
            parser: parseMaybeDividedNumber,
            dashName: "frameRate"
          });
          break;
        case "height":
          parseValue(attributeVal, {
            asKey: "height",
            parser: parseMPDInteger,
            dashName: "height"
          });
          break;
        case "maxPlayoutRate":
          parseValue(attributeVal, {
            asKey: "maxPlayoutRate",
            parser: parseMPDFloat,
            dashName: "maxPlayoutRate"
          });
          break;
        case "maximumSAPPeriod":
          parseValue(attributeVal, {
            asKey: "maximumSAPPeriod",
            parser: parseMPDFloat,
            dashName: "maximumSAPPeriod"
          });
          break;
        case "mimeType":
          parsedAdaptation.mimeType = attributeVal;
          break;
        case "profiles":
          parsedAdaptation.profiles = attributeVal;
          break;
        case "segmentProfiles":
          parsedAdaptation.segmentProfiles = attributeVal;
          break;
        case "width":
          parseValue(attributeVal, {
            asKey: "width",
            parser: parseMPDInteger,
            dashName: "width"
          });
          break;
        case "availabilityTimeOffset":
          parseValue(attributeVal, {
            asKey: "availabilityTimeOffset",
            parser: parseMPDFloat,
            dashName: "availabilityTimeOffset"
          });
          break;
        case "availabilityTimeComplete":
          parseValue(attributeVal, {
            asKey: "availabilityTimeComplete",
            parser: parseBoolean,
            dashName: "availabilityTimeComplete"
          });
          break;
      }
    }
    return [parsedAdaptation, warnings];
  }
  function createAdaptationSetIntermediateRepresentation(adaptationSetElement) {
    const childNodes = adaptationSetElement.children;
    const [children, childrenWarnings] = parseAdaptationSetChildren(childNodes);
    const [attributes, attrsWarnings] = parseAdaptationSetAttributes(adaptationSetElement);
    const warnings = childrenWarnings.concat(attrsWarnings);
    return [{ children, attributes }, warnings];
  }

  // src/parsers/manifest/dash/js-parser/node_parsers/EventStream.ts
  function parseEventStreamAttributes(root) {
    const res = {};
    const warnings = [];
    const parseValue = ValueParser(res, warnings);
    for (const attributeName of Object.keys(root.attributes)) {
      const attributeVal = root.attributes[attributeName];
      if (isNullOrUndefined(attributeVal)) {
        continue;
      }
      switch (attributeName) {
        case "schemeIdUri":
          res.schemeIdUri = attributeVal;
          break;
        case "value":
          res.value = attributeVal;
          break;
        case "timescale":
          parseValue(attributeVal, {
            asKey: "timescale",
            parser: parseMPDInteger,
            dashName: "timescale"
          });
          break;
        default:
          if (startsWith(attributeName, "xmlns:")) {
            if (res.namespaces === void 0) {
              res.namespaces = [];
            }
            res.namespaces.push({
              key: attributeName.substring(6),
              value: attributeVal
            });
          }
          break;
      }
    }
    return [res, warnings];
  }
  function createEventStreamIntermediateRepresentation(root, fullMpd) {
    const [attributes, warnings] = parseEventStreamAttributes(root);
    const events = [];
    for (const child of root.children) {
      if (typeof child !== "string" && child.tagName === "Event") {
        const data = {};
        if (!isNullOrUndefined(child.attributes.id)) {
          data.id = child.attributes.id;
        }
        if (!isNullOrUndefined(child.attributes.presentationTime)) {
          const [val, parsedWarning] = parseMPDInteger(
            child.attributes.presentationTime,
            "presentationTime"
          );
          if (parsedWarning !== null) {
            warnings.push(parsedWarning);
          }
          if (val !== null) {
            data.presentationTime = val;
          }
        }
        if (!isNullOrUndefined(child.attributes.duration)) {
          const [val, parsedWarning] = parseMPDInteger(
            child.attributes.duration,
            "duration"
          );
          if (parsedWarning !== null) {
            warnings.push(parsedWarning);
          }
          if (val !== null) {
            data.duration = val;
          }
        }
        if (child.posStart < child.posEnd) {
          const eventStr = fullMpd.substring(child.posStart, child.posEnd);
          data.eventStreamData = eventStr;
        }
        events.push(data);
      }
    }
    return [{ children: { events }, attributes }, warnings];
  }

  // src/parsers/manifest/dash/js-parser/node_parsers/Period.ts
  function parsePeriodChildren(periodChildren, fullMpd) {
    const baseURLs = [];
    const adaptations = [];
    let segmentTemplate;
    const contentProtections = [];
    let warnings = [];
    const eventStreams = [];
    for (let i = 0; i < periodChildren.length; i++) {
      const currentElement = periodChildren[i];
      if (typeof currentElement === "string") {
        continue;
      }
      switch (currentElement.tagName) {
        case "BaseURL": {
          const [baseURLObj, baseURLWarnings] = parseBaseURL(currentElement);
          if (baseURLObj !== void 0) {
            baseURLs.push(baseURLObj);
          }
          warnings = warnings.concat(baseURLWarnings);
          break;
        }
        case "AdaptationSet": {
          const [adaptation, adaptationWarnings] = createAdaptationSetIntermediateRepresentation(currentElement);
          adaptations.push(adaptation);
          warnings = warnings.concat(adaptationWarnings);
          break;
        }
        case "EventStream": {
          const [eventStream, eventStreamWarnings] = createEventStreamIntermediateRepresentation(currentElement, fullMpd);
          eventStreams.push(eventStream);
          warnings = warnings.concat(eventStreamWarnings);
          break;
        }
        case "SegmentTemplate": {
          const [parsedSegmentTemplate, segmentTemplateWarnings] = parseSegmentTemplate(currentElement);
          segmentTemplate = parsedSegmentTemplate;
          if (segmentTemplateWarnings.length > 0) {
            warnings = warnings.concat(segmentTemplateWarnings);
          }
          break;
        }
        case "ContentProtection": {
          const [contentProtection, contentProtectionWarnings] = parseContentProtection2(currentElement);
          if (contentProtectionWarnings.length > 0) {
            warnings = warnings.concat(contentProtectionWarnings);
          }
          if (contentProtection !== void 0) {
            contentProtections.push(contentProtection);
          }
          break;
        }
      }
    }
    return [
      { baseURLs, adaptations, eventStreams, segmentTemplate, contentProtections },
      warnings
    ];
  }
  function parsePeriodAttributes(root) {
    const res = {};
    const warnings = [];
    const parseValue = ValueParser(res, warnings);
    for (const attributeName of Object.keys(root.attributes)) {
      const attributeVal = root.attributes[attributeName];
      if (isNullOrUndefined(attributeVal)) {
        continue;
      }
      switch (attributeName) {
        case "id":
          res.id = attributeVal;
          break;
        case "start":
          parseValue(attributeVal, {
            asKey: "start",
            parser: parseDuration,
            dashName: "start"
          });
          break;
        case "duration":
          parseValue(attributeVal, {
            asKey: "duration",
            parser: parseDuration,
            dashName: "duration"
          });
          break;
        case "bitstreamSwitching":
          parseValue(attributeVal, {
            asKey: "bitstreamSwitching",
            parser: parseBoolean,
            dashName: "bitstreamSwitching"
          });
          break;
        case "xlink:href":
          res.xlinkHref = attributeVal;
          break;
        case "xlink:actuate":
          res.xlinkActuate = attributeVal;
          break;
        default:
          if (startsWith(attributeName, "xmlns:")) {
            if (res.namespaces === void 0) {
              res.namespaces = [];
            }
            res.namespaces.push({
              key: attributeName.substring(6),
              value: attributeVal
            });
          }
          break;
      }
    }
    return [res, warnings];
  }
  function createPeriodIntermediateRepresentation(periodElement, fullMpd) {
    const [children, childrenWarnings] = parsePeriodChildren(
      periodElement.children,
      fullMpd
    );
    const [attributes, attrsWarnings] = parsePeriodAttributes(periodElement);
    const warnings = childrenWarnings.concat(attrsWarnings);
    return [{ children, attributes }, warnings];
  }

  // src/parsers/manifest/dash/js-parser/node_parsers/MPD.ts
  function parseMPDChildren(mpdChildren, fullMpd) {
    const baseURLs = [];
    const locations = [];
    const periods = [];
    const utcTimings = [];
    const contentProtections = [];
    let warnings = [];
    for (let i = 0; i < mpdChildren.length; i++) {
      const currentNode = mpdChildren[i];
      if (typeof currentNode === "string") {
        continue;
      }
      switch (currentNode.tagName) {
        case "BaseURL": {
          const [baseURLObj, baseURLWarnings] = parseBaseURL(currentNode);
          if (baseURLObj !== void 0) {
            baseURLs.push(baseURLObj);
          }
          warnings = warnings.concat(baseURLWarnings);
          break;
        }
        case "Location":
          locations.push(textContent(currentNode.children));
          break;
        case "Period": {
          const [period, periodWarnings] = createPeriodIntermediateRepresentation(
            currentNode,
            fullMpd
          );
          periods.push(period);
          warnings = warnings.concat(periodWarnings);
          break;
        }
        case "UTCTiming": {
          const utcTiming = parseScheme(currentNode);
          utcTimings.push(utcTiming);
          break;
        }
        case "ContentProtection": {
          const [contentProtection, contentProtectionWarnings] = parseContentProtection2(currentNode);
          if (contentProtectionWarnings.length > 0) {
            warnings = warnings.concat(contentProtectionWarnings);
          }
          if (contentProtection !== void 0) {
            contentProtections.push(contentProtection);
          }
          break;
        }
      }
    }
    return [{ baseURLs, locations, periods, utcTimings, contentProtections }, warnings];
  }
  function parseMPDAttributes(root) {
    const res = {};
    const warnings = [];
    const parseValue = ValueParser(res, warnings);
    for (const attributeName of Object.keys(root.attributes)) {
      const attributeVal = root.attributes[attributeName];
      if (isNullOrUndefined(attributeVal)) {
        continue;
      }
      switch (attributeName) {
        case "id":
          res.id = attributeVal;
          break;
        case "profiles":
          res.profiles = attributeVal;
          break;
        case "type":
          res.type = attributeVal;
          break;
        case "availabilityStartTime":
          parseValue(attributeVal, {
            asKey: "availabilityStartTime",
            parser: parseDateTime,
            dashName: "availabilityStartTime"
          });
          break;
        case "availabilityEndTime":
          parseValue(attributeVal, {
            asKey: "availabilityEndTime",
            parser: parseDateTime,
            dashName: "availabilityEndTime"
          });
          break;
        case "publishTime":
          parseValue(attributeVal, {
            asKey: "publishTime",
            parser: parseDateTime,
            dashName: "publishTime"
          });
          break;
        case "mediaPresentationDuration":
          parseValue(attributeVal, {
            asKey: "duration",
            parser: parseDuration,
            dashName: "mediaPresentationDuration"
          });
          break;
        case "minimumUpdatePeriod":
          parseValue(attributeVal, {
            asKey: "minimumUpdatePeriod",
            parser: parseDuration,
            dashName: "minimumUpdatePeriod"
          });
          break;
        case "minBufferTime":
          parseValue(attributeVal, {
            asKey: "minBufferTime",
            parser: parseDuration,
            dashName: "minBufferTime"
          });
          break;
        case "timeShiftBufferDepth":
          parseValue(attributeVal, {
            asKey: "timeShiftBufferDepth",
            parser: parseDuration,
            dashName: "timeShiftBufferDepth"
          });
          break;
        case "suggestedPresentationDelay":
          parseValue(attributeVal, {
            asKey: "suggestedPresentationDelay",
            parser: parseDuration,
            dashName: "suggestedPresentationDelay"
          });
          break;
        case "maxSegmentDuration":
          parseValue(attributeVal, {
            asKey: "maxSegmentDuration",
            parser: parseDuration,
            dashName: "maxSegmentDuration"
          });
          break;
        case "maxSubsegmentDuration":
          parseValue(attributeVal, {
            asKey: "maxSubsegmentDuration",
            parser: parseDuration,
            dashName: "maxSubsegmentDuration"
          });
          break;
        default:
          if (startsWith(attributeName, "xmlns:")) {
            if (res.namespaces === void 0) {
              res.namespaces = [];
            }
            res.namespaces.push({
              key: attributeName.substring(6),
              value: attributeVal
            });
          }
          break;
      }
    }
    return [res, warnings];
  }
  function createMPDIntermediateRepresentation(root, fullMpd) {
    const [children, childrenWarnings] = parseMPDChildren(root.children, fullMpd);
    const [attributes, attrsWarnings] = parseMPDAttributes(root);
    const warnings = childrenWarnings.concat(attrsWarnings);
    return [{ children, attributes }, warnings];
  }

  // src/parsers/manifest/dash/js-parser/parse_from_xml_string.ts
  function parseFromString(xml, args) {
    const root = parseXml(xml);
    const lastChild = root[root.length - 1];
    if (lastChild === void 0 || typeof lastChild === "string" || lastChild.tagName !== "MPD") {
      throw new Error("DASH Parser: document root should be MPD");
    }
    const [mpdIR, warnings] = createMPDIntermediateRepresentation(lastChild, xml);
    const ret = common_default(mpdIR, args, warnings);
    return processReturn(ret);
    function processReturn(initialRes) {
      if (initialRes.type === "done") {
        return initialRes;
      } else if (initialRes.type === "needs-clock") {
        return {
          type: "needs-resources",
          value: {
            urls: [initialRes.value.url],
            format: "string",
            continue(loadedClock) {
              if (loadedClock.length !== 1) {
                throw new Error("DASH parser: wrong number of loaded ressources.");
              }
              const newRet = initialRes.value.continue(loadedClock[0].responseData);
              return processReturn(newRet);
            }
          }
        };
      } else if (initialRes.type === "needs-xlinks") {
        return {
          type: "needs-resources",
          value: {
            urls: initialRes.value.xlinksUrls,
            format: "string",
            continue(loadedXlinks) {
              const resourceInfos = [];
              for (let i = 0; i < loadedXlinks.length; i++) {
                const {
                  responseData: xlinkResp,
                  receivedTime,
                  sendingTime,
                  url
                } = loadedXlinks[i];
                if (!xlinkResp.success) {
                  throw xlinkResp.error;
                }
                const wrappedData = "<root>" + xlinkResp.data + "</root>";
                const dataAsXML = parseXml(wrappedData);
                const innerParsed = dataAsXML[dataAsXML.length - 1];
                if (innerParsed === void 0 || typeof innerParsed === "string") {
                  throw new Error("DASH parser: Invalid external ressources");
                }
                const periods = innerParsed.children;
                const periodsIR = [];
                const periodsIRWarnings = [];
                for (let j = 0; j < periods.length; j++) {
                  const period = periods[j];
                  if (typeof period === "string" || period.tagName !== "Period") {
                    continue;
                  }
                  const [periodIR, periodWarnings] = createPeriodIntermediateRepresentation(
                    period,
                    wrappedData
                  );
                  periodsIRWarnings.push(...periodWarnings);
                  periodsIR.push(periodIR);
                }
                resourceInfos.push({
                  url,
                  receivedTime,
                  sendingTime,
                  parsed: periodsIR,
                  warnings: periodsIRWarnings
                });
              }
              const newRet = initialRes.value.continue(resourceInfos);
              return processReturn(newRet);
            }
          }
        };
      } else {
        assertUnreachable(initialRes);
      }
    }
  }

  // src/parsers/manifest/dash/js-parser/index.ts
  var js_parser_default = parseFromString;

  // src/compat/has_webassembly.ts
  var hasWebassembly = typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function";
  var has_webassembly_default = hasWebassembly;

  // src/parsers/manifest/dash/wasm-parser/ts/utils.ts
  function parseString(textDecoder, buffer, ptr, len) {
    const arr = new Uint8Array(buffer, ptr, len);
    return textDecoder.decode(arr);
  }
  function parseFloatOrBool(val) {
    if (val === Infinity) {
      return true;
    }
    if (val === -Infinity) {
      return false;
    }
    return val;
  }

  // src/parsers/manifest/dash/wasm-parser/ts/generators/BaseURL.ts
  function generateBaseUrlAttrParser(baseUrlAttrs, linearMemory) {
    const textDecoder = new TextDecoder();
    return function onMPDAttribute(attr, ptr, len) {
      if (attr === 64 /* Text */) {
        baseUrlAttrs.value = parseString(textDecoder, linearMemory.buffer, ptr, len);
      }
    };
  }

  // src/parsers/manifest/dash/wasm-parser/ts/generators/ContentProtection.ts
  function generateContentProtectionAttrParser(cp, linearMemory) {
    const cpAttrs = cp.attributes;
    const cpChildren = cp.children;
    const textDecoder = new TextDecoder();
    return function onContentProtectionAttribute(attr, ptr, len) {
      switch (attr) {
        case 16 /* SchemeIdUri */:
          cpAttrs.schemeIdUri = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 13 /* ContentProtectionValue */:
          cpAttrs.value = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 14 /* ContentProtectionKeyId */: {
          const kid = parseString(textDecoder, linearMemory.buffer, ptr, len);
          cpAttrs.keyId = hexToBytes(kid.replace(/-/g, ""));
          break;
        }
        case 15 /* ContentProtectionCencPSSH */:
          try {
            const b64 = parseString(textDecoder, linearMemory.buffer, ptr, len);
            cpChildren.cencPssh.push(base64ToBytes(b64));
          } catch (_) {
          }
          break;
        case 78 /* ContentProtectionRef */:
          cpAttrs.ref = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 79 /* ContentProtectionRefId */:
          cpAttrs.refId = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
      }
    };
  }

  // src/parsers/manifest/dash/wasm-parser/ts/generators/ContentComponent.ts
  function generateContentComponentAttrParser(ccAttrs, linearMemory) {
    const textDecoder = new TextDecoder();
    return function onMPDAttribute(attr, ptr, len) {
      switch (attr) {
        case 0 /* Id */:
          ccAttrs.id = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 60 /* Language */:
          ccAttrs.language = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 61 /* ContentType */:
          ccAttrs.contentType = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 62 /* Par */:
          ccAttrs.par = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
      }
    };
  }

  // src/parsers/manifest/dash/wasm-parser/ts/generators/Label.ts
  function generateLabelElementParser(adaptationSet, linearMemory) {
    const textDecoder = new TextDecoder();
    return function onMPDAttribute(attr, ptr, len) {
      if (attr === 64 /* Text */) {
        adaptationSet.label = parseString(textDecoder, linearMemory.buffer, ptr, len);
      }
    };
  }

  // src/parsers/manifest/dash/wasm-parser/ts/generators/Scheme.ts
  function generateSchemeAttrParser(schemeAttrs, linearMemory) {
    const textDecoder = new TextDecoder();
    return function onMPDAttribute(attr, ptr, len) {
      switch (attr) {
        case 16 /* SchemeIdUri */:
          schemeAttrs.schemeIdUri = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 17 /* SchemeValue */:
          schemeAttrs.value = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
      }
    };
  }

  // src/parsers/manifest/dash/wasm-parser/ts/generators/SegmentBase.ts
  function generateSegmentBaseAttrParser(segmentBaseAttrs, linearMemory) {
    const textDecoder = new TextDecoder();
    return function onSegmentBaseAttribute(attr, ptr, len) {
      switch (attr) {
        case 29 /* InitializationRange */: {
          const dataView = new DataView(linearMemory.buffer);
          if (segmentBaseAttrs.initialization === void 0) {
            segmentBaseAttrs.initialization = {};
          }
          segmentBaseAttrs.initialization.range = [
            dataView.getFloat64(ptr, true),
            dataView.getFloat64(ptr + 8, true)
          ];
          break;
        }
        case 67 /* InitializationMedia */:
          if (segmentBaseAttrs.initialization === void 0) {
            segmentBaseAttrs.initialization = {};
          }
          segmentBaseAttrs.initialization.media = parseString(
            textDecoder,
            linearMemory.buffer,
            ptr,
            len
          );
          break;
        case 43 /* AvailabilityTimeOffset */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentBaseAttrs.availabilityTimeOffset = dataView.getFloat64(ptr, true);
          break;
        }
        case 22 /* AvailabilityTimeComplete */: {
          segmentBaseAttrs.availabilityTimeComplete = new DataView(linearMemory.buffer).getUint8(0) === 0;
          break;
        }
        case 24 /* PresentationTimeOffset */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentBaseAttrs.presentationTimeOffset = dataView.getFloat64(ptr, true);
          break;
        }
        case 27 /* TimeScale */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentBaseAttrs.timescale = dataView.getFloat64(ptr, true);
          break;
        }
        case 31 /* IndexRange */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentBaseAttrs.indexRange = [
            dataView.getFloat64(ptr, true),
            dataView.getFloat64(ptr + 8, true)
          ];
          break;
        }
        case 23 /* IndexRangeExact */: {
          segmentBaseAttrs.indexRangeExact = new DataView(linearMemory.buffer).getUint8(0) === 0;
          break;
        }
        case 1 /* Duration */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentBaseAttrs.duration = dataView.getFloat64(ptr, true);
          break;
        }
        case 20 /* StartNumber */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentBaseAttrs.startNumber = dataView.getFloat64(ptr, true);
          break;
        }
        case 76 /* EndNumber */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentBaseAttrs.endNumber = dataView.getFloat64(ptr, true);
          break;
        }
      }
    };
  }

  // src/parsers/manifest/dash/wasm-parser/ts/generators/SegmentUrl.ts
  function generateSegmentUrlAttrParser(segmentUrlAttrs, linearMemory) {
    const textDecoder = new TextDecoder();
    return function onSegmentUrlAttribute(attr, ptr, len) {
      switch (attr) {
        case 28 /* Index */:
          segmentUrlAttrs.index = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 31 /* IndexRange */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentUrlAttrs.indexRange = [
            dataView.getFloat64(ptr, true),
            dataView.getFloat64(ptr + 8, true)
          ];
          break;
        }
        case 30 /* Media */:
          segmentUrlAttrs.media = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 18 /* MediaRange */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentUrlAttrs.mediaRange = [
            dataView.getFloat64(ptr, true),
            dataView.getFloat64(ptr + 8, true)
          ];
          break;
        }
      }
    };
  }

  // src/parsers/manifest/dash/wasm-parser/ts/generators/SegmentList.ts
  function generateSegmentListChildrenParser(segListChildren, linearMemory, parsersStack) {
    return function onRootChildren(nodeId) {
      switch (nodeId) {
        case 20 /* SegmentUrl */: {
          const segmentObj = {};
          if (segListChildren.list === void 0) {
            segListChildren.list = [];
          }
          segListChildren.list.push(segmentObj);
          const attrParser = generateSegmentUrlAttrParser(segmentObj, linearMemory);
          parsersStack.pushParsers(nodeId, noop_default, attrParser);
          break;
        }
        default:
          parsersStack.pushParsers(nodeId, noop_default, noop_default);
          break;
      }
    };
  }

  // src/parsers/manifest/dash/wasm-parser/ts/generators/SegmentTemplate.ts
  function generateSegmentTemplateAttrParser(segmentTemplateAttrs, linearMemory) {
    const textDecoder = new TextDecoder();
    return function onSegmentTemplateAttribute(attr, ptr, len) {
      switch (attr) {
        case 19 /* SegmentTimeline */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentTemplateAttrs.timeline = [];
          let base = ptr;
          for (let i = 0; i < len / 24; i++) {
            segmentTemplateAttrs.timeline.push({
              start: dataView.getFloat64(base, true),
              duration: dataView.getFloat64(base + 8, true),
              repeatCount: dataView.getFloat64(base + 16, true)
            });
            base += 24;
          }
          break;
        }
        case 67 /* InitializationMedia */:
          segmentTemplateAttrs.initialization = {
            media: parseString(textDecoder, linearMemory.buffer, ptr, len)
          };
          break;
        case 28 /* Index */:
          segmentTemplateAttrs.index = parseString(
            textDecoder,
            linearMemory.buffer,
            ptr,
            len
          );
          break;
        case 43 /* AvailabilityTimeOffset */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentTemplateAttrs.availabilityTimeOffset = dataView.getFloat64(ptr, true);
          break;
        }
        case 22 /* AvailabilityTimeComplete */: {
          segmentTemplateAttrs.availabilityTimeComplete = new DataView(linearMemory.buffer).getUint8(0) === 0;
          break;
        }
        case 24 /* PresentationTimeOffset */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentTemplateAttrs.presentationTimeOffset = dataView.getFloat64(ptr, true);
          break;
        }
        case 27 /* TimeScale */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentTemplateAttrs.timescale = dataView.getFloat64(ptr, true);
          break;
        }
        case 31 /* IndexRange */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentTemplateAttrs.indexRange = [
            dataView.getFloat64(ptr, true),
            dataView.getFloat64(ptr + 8, true)
          ];
          break;
        }
        case 23 /* IndexRangeExact */: {
          segmentTemplateAttrs.indexRangeExact = new DataView(linearMemory.buffer).getUint8(0) === 0;
          break;
        }
        case 30 /* Media */:
          segmentTemplateAttrs.media = parseString(
            textDecoder,
            linearMemory.buffer,
            ptr,
            len
          );
          break;
        case 32 /* BitstreamSwitching */: {
          segmentTemplateAttrs.bitstreamSwitching = new DataView(linearMemory.buffer).getUint8(0) === 0;
          break;
        }
        case 1 /* Duration */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentTemplateAttrs.duration = dataView.getFloat64(ptr, true);
          break;
        }
        case 20 /* StartNumber */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentTemplateAttrs.startNumber = dataView.getFloat64(ptr, true);
          break;
        }
        case 76 /* EndNumber */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentTemplateAttrs.endNumber = dataView.getFloat64(ptr, true);
          break;
        }
      }
    };
  }

  // src/parsers/manifest/dash/wasm-parser/ts/generators/Representation.ts
  function generateRepresentationChildrenParser(childrenObj, linearMemory, parsersStack) {
    return function onRootChildren(nodeId) {
      switch (nodeId) {
        case 15 /* BaseURL */: {
          const baseUrl = { value: "", attributes: {} };
          childrenObj.baseURLs.push(baseUrl);
          parsersStack.pushParsers(
            nodeId,
            noop_default,
            generateBaseUrlAttrParser(baseUrl, linearMemory)
          );
          break;
        }
        case 10 /* ContentProtection */: {
          const contentProtection = {
            children: { cencPssh: [] },
            attributes: {}
          };
          if (childrenObj.contentProtections === void 0) {
            childrenObj.contentProtections = [];
          }
          childrenObj.contentProtections.push(contentProtection);
          const contentProtAttrParser = generateContentProtectionAttrParser(
            contentProtection,
            linearMemory
          );
          parsersStack.pushParsers(nodeId, noop_default, contentProtAttrParser);
          break;
        }
        case 19 /* InbandEventStream */: {
          const inbandEvent = {};
          if (childrenObj.inbandEventStreams === void 0) {
            childrenObj.inbandEventStreams = [];
          }
          childrenObj.inbandEventStreams.push(inbandEvent);
          parsersStack.pushParsers(
            nodeId,
            noop_default,
            generateSchemeAttrParser(inbandEvent, linearMemory)
          );
          break;
        }
        case 11 /* EssentialProperty */: {
          const essentialProperty = {};
          if (childrenObj.essentialProperties === void 0) {
            childrenObj.essentialProperties = [];
          }
          childrenObj.essentialProperties.push(essentialProperty);
          const attributeParser = generateSchemeAttrParser(essentialProperty, linearMemory);
          parsersStack.pushParsers(nodeId, noop_default, attributeParser);
          break;
        }
        case 13 /* SupplementalProperty */: {
          const supplementalProperty = {};
          if (childrenObj.supplementalProperties === void 0) {
            childrenObj.supplementalProperties = [];
          }
          childrenObj.supplementalProperties.push(supplementalProperty);
          const attributeParser = generateSchemeAttrParser(
            supplementalProperty,
            linearMemory
          );
          parsersStack.pushParsers(nodeId, noop_default, attributeParser);
          break;
        }
        case 17 /* SegmentBase */: {
          const segmentBaseObj = {};
          childrenObj.segmentBase = segmentBaseObj;
          const attributeParser = generateSegmentBaseAttrParser(
            segmentBaseObj,
            linearMemory
          );
          parsersStack.pushParsers(nodeId, noop_default, attributeParser);
          break;
        }
        case 18 /* SegmentList */: {
          const segmentListObj = {
            list: []
          };
          childrenObj.segmentList = segmentListObj;
          const childrenParser = generateSegmentListChildrenParser(
            segmentListObj,
            linearMemory,
            parsersStack
          );
          const attributeParser = generateSegmentBaseAttrParser(
            segmentListObj,
            linearMemory
          );
          parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
          break;
        }
        case 16 /* SegmentTemplate */: {
          const stObj = {};
          childrenObj.segmentTemplate = stObj;
          parsersStack.pushParsers(
            nodeId,
            noop_default,
            // SegmentTimeline as treated like an attribute
            generateSegmentTemplateAttrParser(stObj, linearMemory)
          );
          break;
        }
        default:
          parsersStack.pushParsers(nodeId, noop_default, noop_default);
          break;
      }
    };
  }
  function generateRepresentationAttrParser(representationAttrs, linearMemory) {
    const textDecoder = new TextDecoder();
    return function onRepresentationAttribute(attr, ptr, len) {
      const dataView = new DataView(linearMemory.buffer);
      switch (attr) {
        case 0 /* Id */:
          representationAttrs.id = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 3 /* AudioSamplingRate */:
          representationAttrs.audioSamplingRate = parseString(
            textDecoder,
            linearMemory.buffer,
            ptr,
            len
          );
          break;
        case 63 /* Bitrate */:
          representationAttrs.bitrate = dataView.getFloat64(ptr, true);
          break;
        case 4 /* Codecs */:
          representationAttrs.codecs = parseString(
            textDecoder,
            linearMemory.buffer,
            ptr,
            len
          );
          break;
        case 77 /* SupplementalCodecs */:
          representationAttrs.supplementalCodecs = parseString(
            textDecoder,
            linearMemory.buffer,
            ptr,
            len
          );
          break;
        case 5 /* CodingDependency */:
          representationAttrs.codingDependency = new DataView(linearMemory.buffer).getUint8(0) === 0;
          break;
        case 6 /* FrameRate */:
          representationAttrs.frameRate = dataView.getFloat64(ptr, true);
          break;
        case 7 /* Height */:
          representationAttrs.height = dataView.getFloat64(ptr, true);
          break;
        case 8 /* Width */:
          representationAttrs.width = dataView.getFloat64(ptr, true);
          break;
        case 9 /* MaxPlayoutRate */:
          representationAttrs.maxPlayoutRate = dataView.getFloat64(ptr, true);
          break;
        case 10 /* MaxSAPPeriod */:
          representationAttrs.maximumSAPPeriod = dataView.getFloat64(ptr, true);
          break;
        case 11 /* MimeType */:
          representationAttrs.mimeType = parseString(
            textDecoder,
            linearMemory.buffer,
            ptr,
            len
          );
          break;
        case 2 /* Profiles */:
          representationAttrs.profiles = parseString(
            textDecoder,
            linearMemory.buffer,
            ptr,
            len
          );
          break;
        case 65 /* QualityRanking */:
          representationAttrs.qualityRanking = dataView.getFloat64(ptr, true);
          break;
        case 12 /* SegmentProfiles */:
          representationAttrs.segmentProfiles = parseString(
            textDecoder,
            linearMemory.buffer,
            ptr,
            len
          );
          break;
        case 43 /* AvailabilityTimeOffset */:
          representationAttrs.availabilityTimeOffset = dataView.getFloat64(ptr, true);
          break;
        case 22 /* AvailabilityTimeComplete */:
          representationAttrs.availabilityTimeComplete = dataView.getUint8(0) === 0;
          break;
      }
    };
  }

  // src/parsers/manifest/dash/wasm-parser/ts/generators/AdaptationSet.ts
  function generateAdaptationSetChildrenParser(adaptationSetChildren, linearMemory, parsersStack) {
    return function onRootChildren(nodeId) {
      switch (nodeId) {
        case 8 /* Accessibility */: {
          const accessibility = {};
          if (adaptationSetChildren.accessibilities === void 0) {
            adaptationSetChildren.accessibilities = [];
          }
          adaptationSetChildren.accessibilities.push(accessibility);
          const schemeAttrParser = generateSchemeAttrParser(accessibility, linearMemory);
          parsersStack.pushParsers(nodeId, noop_default, schemeAttrParser);
          break;
        }
        case 15 /* BaseURL */: {
          const baseUrl = { value: "", attributes: {} };
          adaptationSetChildren.baseURLs.push(baseUrl);
          const attributeParser = generateBaseUrlAttrParser(baseUrl, linearMemory);
          parsersStack.pushParsers(nodeId, noop_default, attributeParser);
          break;
        }
        case 9 /* ContentComponent */: {
          const contentComponent = {};
          adaptationSetChildren.contentComponent = contentComponent;
          parsersStack.pushParsers(
            nodeId,
            noop_default,
            generateContentComponentAttrParser(contentComponent, linearMemory)
          );
          break;
        }
        case 10 /* ContentProtection */: {
          const contentProtection = {
            children: { cencPssh: [] },
            attributes: {}
          };
          if (adaptationSetChildren.contentProtections === void 0) {
            adaptationSetChildren.contentProtections = [];
          }
          adaptationSetChildren.contentProtections.push(contentProtection);
          const contentProtAttrParser = generateContentProtectionAttrParser(
            contentProtection,
            linearMemory
          );
          parsersStack.pushParsers(nodeId, noop_default, contentProtAttrParser);
          break;
        }
        case 11 /* EssentialProperty */: {
          const essentialProperty = {};
          if (adaptationSetChildren.essentialProperties === void 0) {
            adaptationSetChildren.essentialProperties = [];
          }
          adaptationSetChildren.essentialProperties.push(essentialProperty);
          const childrenParser = noop_default;
          const attributeParser = generateSchemeAttrParser(essentialProperty, linearMemory);
          parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
          break;
        }
        case 19 /* InbandEventStream */: {
          const inbandEvent = {};
          if (adaptationSetChildren.inbandEventStreams === void 0) {
            adaptationSetChildren.inbandEventStreams = [];
          }
          adaptationSetChildren.inbandEventStreams.push(inbandEvent);
          const childrenParser = noop_default;
          const attributeParser = generateSchemeAttrParser(inbandEvent, linearMemory);
          parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
          break;
        }
        case 7 /* Representation */: {
          const representationObj = {
            children: { baseURLs: [] },
            attributes: {}
          };
          adaptationSetChildren.representations.push(representationObj);
          const childrenParser = generateRepresentationChildrenParser(
            representationObj.children,
            linearMemory,
            parsersStack
          );
          const attributeParser = generateRepresentationAttrParser(
            representationObj.attributes,
            linearMemory
          );
          parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
          break;
        }
        case 12 /* Role */: {
          const role = {};
          if (adaptationSetChildren.roles === void 0) {
            adaptationSetChildren.roles = [];
          }
          adaptationSetChildren.roles.push(role);
          const attributeParser = generateSchemeAttrParser(role, linearMemory);
          parsersStack.pushParsers(nodeId, noop_default, attributeParser);
          break;
        }
        case 13 /* SupplementalProperty */: {
          const supplementalProperty = {};
          if (adaptationSetChildren.supplementalProperties === void 0) {
            adaptationSetChildren.supplementalProperties = [];
          }
          adaptationSetChildren.supplementalProperties.push(supplementalProperty);
          const attributeParser = generateSchemeAttrParser(
            supplementalProperty,
            linearMemory
          );
          parsersStack.pushParsers(nodeId, noop_default, attributeParser);
          break;
        }
        case 17 /* SegmentBase */: {
          const segmentBaseObj = {};
          adaptationSetChildren.segmentBase = segmentBaseObj;
          const attributeParser = generateSegmentBaseAttrParser(
            segmentBaseObj,
            linearMemory
          );
          parsersStack.pushParsers(nodeId, noop_default, attributeParser);
          break;
        }
        case 18 /* SegmentList */: {
          const segmentListObj = {
            list: []
          };
          adaptationSetChildren.segmentList = segmentListObj;
          const childrenParser = generateSegmentListChildrenParser(
            segmentListObj,
            linearMemory,
            parsersStack
          );
          const attributeParser = generateSegmentBaseAttrParser(
            segmentListObj,
            linearMemory
          );
          parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
          break;
        }
        case 16 /* SegmentTemplate */: {
          const stObj = {};
          adaptationSetChildren.segmentTemplate = stObj;
          parsersStack.pushParsers(
            nodeId,
            noop_default,
            // SegmentTimeline as treated like an attribute
            generateSegmentTemplateAttrParser(stObj, linearMemory)
          );
          break;
        }
        case 21 /* Label */: {
          parsersStack.pushParsers(
            nodeId,
            noop_default,
            // Label as treated like an attribute
            generateLabelElementParser(adaptationSetChildren, linearMemory)
          );
          break;
        }
        default:
          parsersStack.pushParsers(nodeId, noop_default, noop_default);
          break;
      }
    };
  }
  function generateAdaptationSetAttrParser(adaptationAttrs, linearMemory) {
    const textDecoder = new TextDecoder();
    return function onAdaptationSetAttribute(attr, ptr, len) {
      const dataView = new DataView(linearMemory.buffer);
      switch (attr) {
        case 0 /* Id */:
          adaptationAttrs.id = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 48 /* Group */:
          adaptationAttrs.group = dataView.getFloat64(ptr, true);
          break;
        case 60 /* Language */:
          adaptationAttrs.language = parseString(
            textDecoder,
            linearMemory.buffer,
            ptr,
            len
          );
          break;
        case 61 /* ContentType */:
          adaptationAttrs.contentType = parseString(
            textDecoder,
            linearMemory.buffer,
            ptr,
            len
          );
          break;
        case 62 /* Par */:
          adaptationAttrs.par = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 53 /* MinBandwidth */:
          adaptationAttrs.minBitrate = dataView.getFloat64(ptr, true);
          break;
        case 49 /* MaxBandwidth */:
          adaptationAttrs.maxBitrate = dataView.getFloat64(ptr, true);
          break;
        case 56 /* MinWidth */:
          adaptationAttrs.minWidth = dataView.getFloat64(ptr, true);
          break;
        case 52 /* MaxWidth */:
          adaptationAttrs.maxWidth = dataView.getFloat64(ptr, true);
          break;
        case 55 /* MinHeight */:
          adaptationAttrs.minHeight = dataView.getFloat64(ptr, true);
          break;
        case 51 /* MaxHeight */:
          adaptationAttrs.maxHeight = dataView.getFloat64(ptr, true);
          break;
        case 54 /* MinFrameRate */:
          adaptationAttrs.minFrameRate = dataView.getFloat64(ptr, true);
          break;
        case 50 /* MaxFrameRate */:
          adaptationAttrs.maxFrameRate = dataView.getFloat64(ptr, true);
          break;
        case 57 /* SelectionPriority */:
          adaptationAttrs.selectionPriority = dataView.getFloat64(ptr, true);
          break;
        case 58 /* SegmentAlignment */:
          adaptationAttrs.segmentAlignment = parseFloatOrBool(
            dataView.getFloat64(ptr, true)
          );
          break;
        case 59 /* SubsegmentAlignment */:
          adaptationAttrs.subsegmentAlignment = parseFloatOrBool(
            dataView.getFloat64(ptr, true)
          );
          break;
        case 32 /* BitstreamSwitching */:
          adaptationAttrs.bitstreamSwitching = dataView.getFloat64(ptr, true) !== 0;
          break;
        case 3 /* AudioSamplingRate */:
          adaptationAttrs.audioSamplingRate = parseString(
            textDecoder,
            linearMemory.buffer,
            ptr,
            len
          );
          break;
        case 4 /* Codecs */:
          adaptationAttrs.codecs = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 77 /* SupplementalCodecs */:
          adaptationAttrs.supplementalCodecs = parseString(
            textDecoder,
            linearMemory.buffer,
            ptr,
            len
          );
          break;
        case 2 /* Profiles */:
          adaptationAttrs.profiles = parseString(
            textDecoder,
            linearMemory.buffer,
            ptr,
            len
          );
          break;
        case 12 /* SegmentProfiles */:
          adaptationAttrs.segmentProfiles = parseString(
            textDecoder,
            linearMemory.buffer,
            ptr,
            len
          );
          break;
        case 11 /* MimeType */:
          adaptationAttrs.mimeType = parseString(
            textDecoder,
            linearMemory.buffer,
            ptr,
            len
          );
          break;
        case 5 /* CodingDependency */:
          adaptationAttrs.codingDependency = dataView.getFloat64(ptr, true) !== 0;
          break;
        case 6 /* FrameRate */:
          adaptationAttrs.frameRate = dataView.getFloat64(ptr, true);
          break;
        case 7 /* Height */:
          adaptationAttrs.height = dataView.getFloat64(ptr, true);
          break;
        case 8 /* Width */:
          adaptationAttrs.width = dataView.getFloat64(ptr, true);
          break;
        case 9 /* MaxPlayoutRate */:
          adaptationAttrs.maxPlayoutRate = dataView.getFloat64(ptr, true);
          break;
        case 10 /* MaxSAPPeriod */:
          adaptationAttrs.maximumSAPPeriod = dataView.getFloat64(ptr, true);
          break;
        case 43 /* AvailabilityTimeOffset */:
          adaptationAttrs.availabilityTimeOffset = dataView.getFloat64(ptr, true);
          break;
        case 22 /* AvailabilityTimeComplete */:
          adaptationAttrs.availabilityTimeComplete = dataView.getUint8(0) === 0;
          break;
      }
    };
  }

  // src/parsers/manifest/dash/wasm-parser/ts/generators/EventStream.ts
  function generateEventStreamChildrenParser(childrenObj, linearMemory, parsersStack, fullMpd) {
    return function onRootChildren(nodeId) {
      switch (nodeId) {
        case 6 /* EventStreamElt */: {
          const event = {};
          childrenObj.events.push(event);
          const attrParser = generateEventAttrParser(event, linearMemory, fullMpd);
          parsersStack.pushParsers(nodeId, noop_default, attrParser);
          break;
        }
        default:
          parsersStack.pushParsers(nodeId, noop_default, noop_default);
          break;
      }
    };
  }
  function generateEventStreamAttrParser(esAttrs, linearMemory) {
    const textDecoder = new TextDecoder();
    return function onEventStreamAttribute(attr, ptr, len) {
      const dataView = new DataView(linearMemory.buffer);
      switch (attr) {
        case 16 /* SchemeIdUri */:
          esAttrs.schemeIdUri = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 17 /* SchemeValue */:
          esAttrs.value = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 27 /* TimeScale */:
          esAttrs.timescale = dataView.getFloat64(ptr, true);
          break;
        case 70 /* Namespace */: {
          const xmlNs = { key: "", value: "" };
          let offset = ptr;
          const keySize = dataView.getUint32(offset);
          offset += 4;
          xmlNs.key = parseString(textDecoder, linearMemory.buffer, offset, keySize);
          offset += keySize;
          const valSize = dataView.getUint32(offset);
          offset += 4;
          xmlNs.value = parseString(textDecoder, linearMemory.buffer, offset, valSize);
          if (esAttrs.namespaces === void 0) {
            esAttrs.namespaces = [xmlNs];
          } else {
            esAttrs.namespaces.push(xmlNs);
          }
          break;
        }
      }
    };
  }
  function generateEventAttrParser(eventAttr, linearMemory, fullMpd) {
    const textDecoder = new TextDecoder();
    return function onEventStreamAttribute(attr, ptr, len) {
      const dataView = new DataView(linearMemory.buffer);
      switch (attr) {
        case 25 /* EventPresentationTime */:
          eventAttr.presentationTime = dataView.getFloat64(ptr, true);
          break;
        case 1 /* Duration */:
          eventAttr.duration = dataView.getFloat64(ptr, true);
          break;
        case 0 /* Id */:
          eventAttr.id = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 69 /* EventStreamEltRange */: {
          const rangeStart = dataView.getFloat64(ptr, true);
          const rangeEnd = dataView.getFloat64(ptr + 8, true);
          eventAttr.eventStreamData = fullMpd.slice(rangeStart, rangeEnd);
          break;
        }
      }
    };
  }

  // src/parsers/manifest/dash/wasm-parser/ts/generators/Period.ts
  function generatePeriodChildrenParser(periodChildren, linearMemory, parsersStack, fullMpd) {
    return function onRootChildren(nodeId) {
      switch (nodeId) {
        case 4 /* AdaptationSet */: {
          const adaptationObj = {
            children: { baseURLs: [], representations: [] },
            attributes: {}
          };
          periodChildren.adaptations.push(adaptationObj);
          const childrenParser = generateAdaptationSetChildrenParser(
            adaptationObj.children,
            linearMemory,
            parsersStack
          );
          const attributeParser = generateAdaptationSetAttrParser(
            adaptationObj.attributes,
            linearMemory
          );
          parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
          break;
        }
        case 15 /* BaseURL */: {
          const baseUrl = { value: "", attributes: {} };
          periodChildren.baseURLs.push(baseUrl);
          const childrenParser = noop_default;
          const attributeParser = generateBaseUrlAttrParser(baseUrl, linearMemory);
          parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
          break;
        }
        case 5 /* EventStream */: {
          const eventStream = {
            children: { events: [] },
            attributes: {}
          };
          periodChildren.eventStreams.push(eventStream);
          const childrenParser = generateEventStreamChildrenParser(
            eventStream.children,
            linearMemory,
            parsersStack,
            fullMpd
          );
          const attrParser = generateEventStreamAttrParser(
            eventStream.attributes,
            linearMemory
          );
          parsersStack.pushParsers(nodeId, childrenParser, attrParser);
          break;
        }
        case 16 /* SegmentTemplate */: {
          const stObj = {};
          periodChildren.segmentTemplate = stObj;
          parsersStack.pushParsers(
            nodeId,
            noop_default,
            // SegmentTimeline as treated like an attribute
            generateSegmentTemplateAttrParser(stObj, linearMemory)
          );
          break;
        }
        case 10 /* ContentProtection */: {
          const contentProtection = {
            children: { cencPssh: [] },
            attributes: {}
          };
          if (periodChildren.contentProtections === void 0) {
            periodChildren.contentProtections = [];
          }
          periodChildren.contentProtections.push(contentProtection);
          const contentProtAttrParser = generateContentProtectionAttrParser(
            contentProtection,
            linearMemory
          );
          parsersStack.pushParsers(nodeId, noop_default, contentProtAttrParser);
          break;
        }
        default:
          parsersStack.pushParsers(nodeId, noop_default, noop_default);
          break;
      }
    };
  }
  function generatePeriodAttrParser(periodAttrs, linearMemory) {
    const textDecoder = new TextDecoder();
    return function onPeriodAttribute(attr, ptr, len) {
      switch (attr) {
        case 0 /* Id */:
          periodAttrs.id = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 45 /* Start */:
          periodAttrs.start = new DataView(linearMemory.buffer).getFloat64(ptr, true);
          break;
        case 1 /* Duration */:
          periodAttrs.duration = new DataView(linearMemory.buffer).getFloat64(ptr, true);
          break;
        case 32 /* BitstreamSwitching */:
          periodAttrs.bitstreamSwitching = new DataView(linearMemory.buffer).getUint8(0) === 0;
          break;
        case 46 /* XLinkHref */:
          periodAttrs.xlinkHref = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 47 /* XLinkActuate */:
          periodAttrs.xlinkActuate = parseString(
            textDecoder,
            linearMemory.buffer,
            ptr,
            len
          );
          break;
        case 43 /* AvailabilityTimeOffset */:
          periodAttrs.availabilityTimeOffset = new DataView(linearMemory.buffer).getFloat64(
            ptr,
            true
          );
          break;
        case 22 /* AvailabilityTimeComplete */:
          periodAttrs.availabilityTimeComplete = new DataView(linearMemory.buffer).getUint8(0) === 0;
          break;
        case 70 /* Namespace */: {
          const xmlNs = { key: "", value: "" };
          const dataView = new DataView(linearMemory.buffer);
          let offset = ptr;
          const keySize = dataView.getUint32(offset);
          offset += 4;
          xmlNs.key = parseString(textDecoder, linearMemory.buffer, offset, keySize);
          offset += keySize;
          const valSize = dataView.getUint32(offset);
          offset += 4;
          xmlNs.value = parseString(textDecoder, linearMemory.buffer, offset, valSize);
          if (periodAttrs.namespaces === void 0) {
            periodAttrs.namespaces = [xmlNs];
          } else {
            periodAttrs.namespaces.push(xmlNs);
          }
          break;
        }
      }
    };
  }

  // src/parsers/manifest/dash/wasm-parser/ts/generators/MPD.ts
  function generateMPDChildrenParser(mpdChildren, linearMemory, parsersStack, fullMpd) {
    return function onRootChildren(nodeId) {
      switch (nodeId) {
        case 15 /* BaseURL */: {
          const baseUrl = { value: "", attributes: {} };
          mpdChildren.baseURLs.push(baseUrl);
          const childrenParser = noop_default;
          const attributeParser = generateBaseUrlAttrParser(baseUrl, linearMemory);
          parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
          break;
        }
        case 2 /* Period */: {
          const period = {
            children: { adaptations: [], baseURLs: [], eventStreams: [] },
            attributes: {}
          };
          mpdChildren.periods.push(period);
          const childrenParser = generatePeriodChildrenParser(
            period.children,
            linearMemory,
            parsersStack,
            fullMpd
          );
          const attributeParser = generatePeriodAttrParser(period.attributes, linearMemory);
          parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
          break;
        }
        case 3 /* UtcTiming */: {
          const utcTiming = {};
          mpdChildren.utcTimings.push(utcTiming);
          const childrenParser = noop_default;
          const attributeParser = generateSchemeAttrParser(utcTiming, linearMemory);
          parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
          break;
        }
        case 10 /* ContentProtection */: {
          const contentProtection = {
            children: { cencPssh: [] },
            attributes: {}
          };
          if (mpdChildren.contentProtections === void 0) {
            mpdChildren.contentProtections = [];
          }
          mpdChildren.contentProtections.push(contentProtection);
          const contentProtAttrParser = generateContentProtectionAttrParser(
            contentProtection,
            linearMemory
          );
          parsersStack.pushParsers(nodeId, noop_default, contentProtAttrParser);
          break;
        }
        default:
          parsersStack.pushParsers(nodeId, noop_default, noop_default);
          break;
      }
    };
  }
  function generateMPDAttrParser(mpdChildren, mpdAttrs, linearMemory) {
    let dataView;
    const textDecoder = new TextDecoder();
    return function onMPDAttribute(attr, ptr, len) {
      switch (attr) {
        case 0 /* Id */:
          mpdAttrs.id = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 2 /* Profiles */:
          mpdAttrs.profiles = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 33 /* Type */:
          mpdAttrs.type = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 34 /* AvailabilityStartTime */: {
          const startTime = parseString(textDecoder, linearMemory.buffer, ptr, len);
          mpdAttrs.availabilityStartTime = new Date(startTime).getTime() / 1e3;
          break;
        }
        case 35 /* AvailabilityEndTime */: {
          const endTime = parseString(textDecoder, linearMemory.buffer, ptr, len);
          mpdAttrs.availabilityEndTime = new Date(endTime).getTime() / 1e3;
          break;
        }
        case 36 /* PublishTime */: {
          const publishTime = parseString(textDecoder, linearMemory.buffer, ptr, len);
          mpdAttrs.publishTime = new Date(publishTime).getTime() / 1e3;
          break;
        }
        case 68 /* MediaPresentationDuration */:
          dataView = new DataView(linearMemory.buffer);
          mpdAttrs.duration = dataView.getFloat64(ptr, true);
          break;
        case 37 /* MinimumUpdatePeriod */:
          dataView = new DataView(linearMemory.buffer);
          mpdAttrs.minimumUpdatePeriod = dataView.getFloat64(ptr, true);
          break;
        case 38 /* MinBufferTime */:
          dataView = new DataView(linearMemory.buffer);
          mpdAttrs.minBufferTime = dataView.getFloat64(ptr, true);
          break;
        case 39 /* TimeShiftBufferDepth */:
          dataView = new DataView(linearMemory.buffer);
          mpdAttrs.timeShiftBufferDepth = dataView.getFloat64(ptr, true);
          break;
        case 40 /* SuggestedPresentationDelay */:
          dataView = new DataView(linearMemory.buffer);
          mpdAttrs.suggestedPresentationDelay = dataView.getFloat64(ptr, true);
          break;
        case 41 /* MaxSegmentDuration */:
          dataView = new DataView(linearMemory.buffer);
          mpdAttrs.maxSegmentDuration = dataView.getFloat64(ptr, true);
          break;
        case 42 /* MaxSubsegmentDuration */:
          dataView = new DataView(linearMemory.buffer);
          mpdAttrs.maxSubsegmentDuration = dataView.getFloat64(ptr, true);
          break;
        case 66 /* Location */: {
          const location = parseString(textDecoder, linearMemory.buffer, ptr, len);
          mpdChildren.locations.push(location);
          break;
        }
        case 70 /* Namespace */: {
          const xmlNs = { key: "", value: "" };
          dataView = new DataView(linearMemory.buffer);
          let offset = ptr;
          const keySize = dataView.getUint32(offset);
          offset += 4;
          xmlNs.key = parseString(textDecoder, linearMemory.buffer, offset, keySize);
          offset += keySize;
          const valSize = dataView.getUint32(offset);
          offset += 4;
          xmlNs.value = parseString(textDecoder, linearMemory.buffer, offset, valSize);
          if (mpdAttrs.namespaces === void 0) {
            mpdAttrs.namespaces = [xmlNs];
          } else {
            mpdAttrs.namespaces.push(xmlNs);
          }
          break;
        }
      }
    };
  }

  // src/parsers/manifest/dash/wasm-parser/ts/generators/root.ts
  function generateRootChildrenParser(rootObj, linearMemory, parsersStack, fullMpd) {
    return function onRootChildren(nodeId) {
      switch (nodeId) {
        case 1 /* MPD */: {
          rootObj.mpd = {
            children: {
              baseURLs: [],
              locations: [],
              periods: [],
              utcTimings: []
            },
            attributes: {}
          };
          const childrenParser = generateMPDChildrenParser(
            rootObj.mpd.children,
            linearMemory,
            parsersStack,
            fullMpd
          );
          const attributeParser = generateMPDAttrParser(
            rootObj.mpd.children,
            rootObj.mpd.attributes,
            linearMemory
          );
          parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
          break;
        }
        default:
          parsersStack.pushParsers(nodeId, noop_default, noop_default);
          break;
      }
    };
  }

  // src/parsers/manifest/dash/wasm-parser/ts/generators/XLink.ts
  function generateXLinkChildrenParser(xlinkObj, linearMemory, parsersStack, fullMpd) {
    return function onRootChildren(nodeId) {
      switch (nodeId) {
        case 2 /* Period */: {
          const period = {
            children: { adaptations: [], baseURLs: [], eventStreams: [] },
            attributes: {}
          };
          xlinkObj.periods.push(period);
          const childrenParser = generatePeriodChildrenParser(
            period.children,
            linearMemory,
            parsersStack,
            fullMpd
          );
          const attributeParser = generatePeriodAttrParser(period.attributes, linearMemory);
          parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
          break;
        }
        default:
          parsersStack.pushParsers(nodeId, noop_default, noop_default);
          break;
      }
    };
  }

  // src/parsers/manifest/dash/wasm-parser/ts/parsers_stack.ts
  var ParsersStack = class {
    constructor() {
      this._currentNodeId = null;
      this.childrenParser = noop_default;
      this.attributeParser = noop_default;
      this._stack = [{ nodeId: null, children: noop_default, attribute: noop_default }];
    }
    pushParsers(nodeId, childrenParser, attrParser) {
      this._currentNodeId = nodeId;
      this.childrenParser = childrenParser;
      this.attributeParser = attrParser;
      this._stack.push({
        nodeId,
        attribute: attrParser,
        children: childrenParser
      });
    }
    popIfCurrent(idToPop) {
      if (this._currentNodeId !== idToPop) {
        return;
      }
      this._stack.pop();
      const { nodeId, children, attribute } = this._stack[this._stack.length - 1];
      this._currentNodeId = nodeId;
      this.attributeParser = attribute;
      this.childrenParser = children;
    }
    reset() {
      this.childrenParser = noop_default;
      this.attributeParser = noop_default;
      this._stack = [{ nodeId: null, children: noop_default, attribute: noop_default }];
    }
  };

  // src/parsers/manifest/dash/wasm-parser/ts/dash-wasm-parser.ts
  var MAX_READ_SIZE = 15e3;
  var DashWasmParser = class {
    /**
     * Create a new `DashWasmParser`.
     */
    constructor() {
      this._parsersStack = new ParsersStack();
      this._instance = null;
      this._mpdData = null;
      this._linearMemory = null;
      this.status = "uninitialized";
      this._initProm = null;
      this._warnings = [];
      this._isParsing = false;
    }
    /**
     * Returns Promise that will resolve when the initialization has ended (either
     * with success, in which cases the Promise resolves, either with failure, in
     * which case it rejects the corresponding error).
     *
     * This is actually the exact same Promise than the one returned by the first
     * `initialize` call.
     *
     * If that method was never called, returns a rejecting Promise.
     * @returns {Promise}
     */
    waitForInitialization() {
      var _a2;
      return (_a2 = this._initProm) != null ? _a2 : Promise.reject("No initialization performed yet.");
    }
    async initialize(opts) {
      if (this.status !== "uninitialized") {
        return Promise.reject(new Error("DashWasmParser already initialized."));
      } else if (!this.isCompatible()) {
        this.status = "failure";
        return Promise.reject(new Error("Target not compatible with WebAssembly."));
      }
      this.status = "initializing";
      const parsersStack = this._parsersStack;
      const textDecoder = new TextDecoder();
      const self2 = this;
      const imports = {
        env: {
          memoryBase: 0,
          tableBase: 0,
          memory: new WebAssembly.Memory({ initial: 10 }),
          table: new WebAssembly.Table({ initial: 1, element: "anyfunc" }),
          onTagOpen,
          onCustomEvent,
          onAttribute,
          readNext,
          onTagClose
        }
      };
      let objectUrl = null;
      let fetchedWasm;
      if (typeof opts.wasmUrl === "string") {
        fetchedWasm = fetch(opts.wasmUrl);
      } else {
        objectUrl = URL.createObjectURL(
          new Blob([opts.wasmUrl], { type: "application/wasm" })
        );
        fetchedWasm = fetch(objectUrl);
      }
      const streamingProm = typeof WebAssembly.instantiateStreaming === "function" ? WebAssembly.instantiateStreaming(fetchedWasm, imports) : Promise.reject("`WebAssembly.instantiateStreaming` API not available");
      this._initProm = streamingProm.catch(async (e) => {
        if (objectUrl !== null) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
        log_default.warn(
          "dash",
          "Unable to call `instantiateStreaming` on WASM",
          e instanceof Error ? e : ""
        );
        const res = await fetchedWasm;
        if (res.status < 200 || res.status >= 300) {
          throw new Error("WebAssembly request failed. status: " + String(res.status));
        }
        const resAb = await res.arrayBuffer();
        return WebAssembly.instantiate(resAb, imports);
      }).then((instanceWasm) => {
        if (objectUrl !== null) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
        this._instance = instanceWasm;
        this._linearMemory = this._instance.instance.exports.memory;
        this.status = "initialized";
      }).catch((err) => {
        const message = err instanceof Error ? err.toString() : "Unknown error";
        log_default.warn("dash", "Could not create DASH-WASM parser:", message);
        this.status = "failure";
        throw err;
      });
      return this._initProm;
      function onTagOpen(tag) {
        return parsersStack.childrenParser(tag);
      }
      function onTagClose(tag) {
        return parsersStack.popIfCurrent(tag);
      }
      function onAttribute(attr, ptr, len) {
        return parsersStack.attributeParser(attr, ptr, len);
      }
      function onCustomEvent(evt, ptr, len) {
        const linearMemory = self2._linearMemory;
        const arr = new Uint8Array(linearMemory.buffer, ptr, len);
        if (evt === 1 /* Error */) {
          const decoded = textDecoder.decode(arr);
          log_default.warn("dash", "WASM Error Event:", decoded);
          self2._warnings.push(new Error(decoded));
        } else if (evt === 0 /* Log */) {
          const decoded = textDecoder.decode(arr);
          log_default.warn("dash", "WASM Log Event:", decoded);
        }
      }
      function readNext(ptr, wantedSize) {
        if (self2._mpdData === null) {
          throw new Error("DashWasmParser Error: No MPD to read.");
        }
        const linearMemory = self2._linearMemory;
        const { mpd, cursor } = self2._mpdData;
        const sizeToRead = Math.min(wantedSize, MAX_READ_SIZE, mpd.byteLength - cursor);
        const arr = new Uint8Array(linearMemory.buffer, ptr, sizeToRead);
        arr.set(new Uint8Array(mpd, cursor, sizeToRead));
        self2._mpdData.cursor += sizeToRead;
        return sizeToRead;
      }
    }
    /**
     * @param {Document} manifest - Original manifest as returned by the server
     * @param {Object} args
     * @returns {Object}
     */
    runWasmParser(mpd, args) {
      const [mpdIR, warnings] = this._parseMpd(mpd);
      if (mpdIR === null) {
        throw new Error("DASH Parser: Unknown error while parsing the MPD");
      }
      const ret = common_default(mpdIR, args, warnings);
      return this._processParserReturnValue(ret);
    }
    /**
     * Return `true` if the current plaform is compatible with WebAssembly and the
     * TextDecoder interface (for faster UTF-8 parsing), which are needed features
     * for the `DashWasmParser`.
     * @returns {boolean}
     */
    isCompatible() {
      return has_webassembly_default && typeof global_scope_default.TextDecoder === "function";
    }
    _parseMpd(mpd) {
      var _a2;
      if (this._instance === null) {
        throw new Error("DashWasmParser not initialized");
      }
      if (this._isParsing) {
        throw new Error("Parsing operation already pending.");
      }
      this._isParsing = true;
      this._mpdData = { mpd, cursor: 0 };
      const rootObj = {};
      const linearMemory = this._linearMemory;
      const rootChildrenParser = generateRootChildrenParser(
        rootObj,
        linearMemory,
        this._parsersStack,
        mpd
      );
      this._parsersStack.pushParsers(null, rootChildrenParser, noop_default);
      this._warnings = [];
      try {
        this._instance.instance.exports.parse();
      } catch (err) {
        this._parsersStack.reset();
        this._warnings = [];
        this._isParsing = false;
        throw err;
      }
      const parsed = (_a2 = rootObj.mpd) != null ? _a2 : null;
      const warnings = this._warnings;
      this._parsersStack.reset();
      this._warnings = [];
      this._isParsing = false;
      return [parsed, warnings];
    }
    _parseXlink(xlinkData) {
      if (this._instance === null) {
        throw new Error("DashWasmParser not initialized");
      }
      if (this._isParsing) {
        throw new Error("Parsing operation already pending.");
      }
      this._isParsing = true;
      this._mpdData = { mpd: xlinkData, cursor: 0 };
      const rootObj = {
        periods: []
      };
      const linearMemory = this._linearMemory;
      const xlinkParser = generateXLinkChildrenParser(
        rootObj,
        linearMemory,
        this._parsersStack,
        xlinkData
      );
      this._parsersStack.pushParsers(null, xlinkParser, noop_default);
      this._warnings = [];
      try {
        this._instance.instance.exports.parse();
      } catch (err) {
        this._parsersStack.reset();
        this._warnings = [];
        this._isParsing = false;
        throw err;
      }
      const { periods } = rootObj;
      const warnings = this._warnings;
      this._parsersStack.reset();
      this._warnings = [];
      this._isParsing = false;
      return [periods, warnings];
    }
    /**
     * Handle `parseMpdIr` return values, asking for resources if they are needed
     * and pre-processing them before continuing parsing.
     *
     * @param {Object} initialRes
     * @returns {Object}
     */
    _processParserReturnValue(initialRes) {
      if (initialRes.type === "done") {
        return initialRes;
      } else if (initialRes.type === "needs-clock") {
        const continueParsingMPD = (loadedClock) => {
          if (loadedClock.length !== 1) {
            throw new Error("DASH parser: wrong number of loaded ressources.");
          }
          const newRet = initialRes.value.continue(loadedClock[0].responseData);
          return this._processParserReturnValue(newRet);
        };
        return {
          type: "needs-resources",
          value: {
            urls: [initialRes.value.url],
            format: "string",
            continue: continueParsingMPD
          }
        };
      } else if (initialRes.type === "needs-xlinks") {
        const continueParsingMPD = (loadedXlinks) => {
          const resourceInfos = [];
          for (let i = 0; i < loadedXlinks.length; i++) {
            const {
              responseData: xlinkResp,
              receivedTime,
              sendingTime,
              url
            } = loadedXlinks[i];
            if (!xlinkResp.success) {
              throw xlinkResp.error;
            }
            const [periodsIr, periodsIRWarnings] = this._parseXlink(xlinkResp.data);
            resourceInfos.push({
              url,
              receivedTime,
              sendingTime,
              parsed: periodsIr,
              warnings: periodsIRWarnings
            });
          }
          const newRet = initialRes.value.continue(resourceInfos);
          return this._processParserReturnValue(newRet);
        };
        return {
          type: "needs-resources",
          value: {
            urls: initialRes.value.xlinksUrls,
            format: "arraybuffer",
            continue: continueParsingMPD
          }
        };
      } else {
        assertUnreachable(initialRes);
      }
    }
  };

  // src/parsers/manifest/dash/wasm-parser/index.ts
  var wasm_parser_default = DashWasmParser;

  // src/transports/utils/add_query_string.ts
  function addQueryString(baseUrl, supplementaryQueryStringData) {
    if (supplementaryQueryStringData.length === 0) {
      return baseUrl;
    }
    let queryStringStartingChar;
    let urlFragment = "";
    const indexOfFragment = baseUrl.indexOf("#");
    let baseUrlWithoutFragment = baseUrl;
    if (indexOfFragment >= 0) {
      urlFragment = baseUrl.substring(indexOfFragment);
      baseUrlWithoutFragment = baseUrl.substring(0, indexOfFragment);
    }
    const indexOfQueryString = baseUrlWithoutFragment.indexOf("?");
    if (indexOfQueryString === -1) {
      queryStringStartingChar = "?";
    } else if (indexOfQueryString + 1 === baseUrlWithoutFragment.length) {
      queryStringStartingChar = "";
    } else {
      queryStringStartingChar = "&";
    }
    let url = baseUrlWithoutFragment + queryStringStartingChar;
    for (let i = 0; i < supplementaryQueryStringData.length; i++) {
      const queryStringElt = supplementaryQueryStringData[i];
      if (queryStringElt[1] === null) {
        url += queryStringElt[0];
      } else {
        url += `${queryStringElt[0]}=${queryStringElt[1]}`;
      }
      if (i < supplementaryQueryStringData.length - 1) {
        url += "&";
      }
    }
    if (urlFragment.length > 0) {
      url += urlFragment;
    }
    return url;
  }

  // src/transports/utils/call_custom_manifest_loader.ts
  function callCustomManifestLoader(customManifestLoader, fallbackManifestLoader) {
    return (url, loaderOptions, cancelSignal) => {
      return new Promise((res, rej) => {
        const timeAPIsDelta = Date.now() - monotonic_timestamp_default();
        let hasFinished = false;
        const resolve = (_args) => {
          if (hasFinished || cancelSignal.isCancelled()) {
            return;
          }
          hasFinished = true;
          cancelSignal.deregister(abortCustomLoader);
          const receivedTime = _args.receivingTime !== void 0 ? _args.receivingTime - timeAPIsDelta : void 0;
          const sendingTime = _args.sendingTime !== void 0 ? _args.sendingTime - timeAPIsDelta : void 0;
          res({
            responseData: _args.data,
            size: _args.size,
            requestDuration: _args.duration,
            url: _args.url,
            receivedTime,
            sendingTime
          });
        };
        const reject = (err) => {
          var _a2, _b2;
          if (hasFinished || cancelSignal.isCancelled()) {
            return;
          }
          hasFinished = true;
          cancelSignal.deregister(abortCustomLoader);
          const castedErr = err;
          const message = (_a2 = castedErr == null ? void 0 : castedErr.message) != null ? _a2 : "Unknown error when fetching the Manifest through a custom manifestLoader.";
          const emittedErr = new CustomLoaderError(
            message,
            (_b2 = castedErr == null ? void 0 : castedErr.canRetry) != null ? _b2 : false,
            castedErr == null ? void 0 : castedErr.xhr
          );
          rej(emittedErr);
        };
        const fallback = () => {
          if (hasFinished || cancelSignal.isCancelled()) {
            return;
          }
          hasFinished = true;
          cancelSignal.deregister(abortCustomLoader);
          fallbackManifestLoader(url, loaderOptions, cancelSignal).then(res, rej);
        };
        const callbacks = { reject, resolve, fallback };
        const abort = customManifestLoader(
          { url, timeout: loaderOptions.timeout, cmcdPayload: loaderOptions.cmcdPayload },
          callbacks
        );
        cancelSignal.register(abortCustomLoader);
        function abortCustomLoader(err) {
          if (hasFinished) {
            return;
          }
          hasFinished = true;
          if (typeof abort === "function") {
            abort();
          }
          rej(err);
        }
      });
    };
  }

  // src/transports/utils/generate_manifest_loader.ts
  function generateRegularManifestLoader(preferredType) {
    return function regularManifestLoader(initialUrl, loaderOptions, cancelSignal) {
      var _a2, _b2;
      if (initialUrl === void 0) {
        throw new Error("Cannot perform HTTP(s) request. URL not known");
      }
      const url = ((_a2 = loaderOptions.cmcdPayload) == null ? void 0 : _a2.type) === "query" ? addQueryString(initialUrl, loaderOptions.cmcdPayload.value) : initialUrl;
      const cmcdHeaders = ((_b2 = loaderOptions.cmcdPayload) == null ? void 0 : _b2.type) === "headers" ? loaderOptions.cmcdPayload.value : void 0;
      switch (preferredType) {
        case "arraybuffer":
          return request_default({
            url,
            headers: cmcdHeaders,
            responseType: "arraybuffer",
            timeout: loaderOptions.timeout,
            connectionTimeout: loaderOptions.connectionTimeout,
            cancelSignal
          });
        case "text":
          return request_default({
            url,
            headers: cmcdHeaders,
            responseType: "text",
            timeout: loaderOptions.timeout,
            connectionTimeout: loaderOptions.connectionTimeout,
            cancelSignal
          });
        case "document":
          return request_default({
            url,
            headers: cmcdHeaders,
            responseType: "document",
            timeout: loaderOptions.timeout,
            connectionTimeout: loaderOptions.connectionTimeout,
            cancelSignal
          });
        default:
          assertUnreachable(preferredType);
      }
    };
  }
  function generateManifestLoader({ customManifestLoader }, preferredType, integrityCheck) {
    const regularManifestLoader = generateRegularManifestLoader(preferredType);
    const actualLoader = typeof customManifestLoader !== "function" ? regularManifestLoader : callCustomManifestLoader(customManifestLoader, regularManifestLoader);
    return integrityCheck !== null ? integrityCheck(actualLoader) : actualLoader;
  }

  // src/transports/utils/check_isobmff_integrity.ts
  function checkISOBMFFIntegrity(buffer, isInitSegment) {
    if (isInitSegment) {
      const ftypIndex = findCompleteBox(
        buffer,
        1718909296
        /* ftyp */
      );
      if (ftypIndex < 0) {
        throw new OtherError("INTEGRITY_ERROR", "Incomplete `ftyp` box");
      }
      const moovIndex = findCompleteBox(
        buffer,
        1836019574
        /* moov */
      );
      if (moovIndex < 0) {
        throw new OtherError("INTEGRITY_ERROR", "Incomplete `moov` box");
      }
    } else {
      const moofIndex = findCompleteBox(
        buffer,
        1836019558
        /* moof */
      );
      if (moofIndex < 0) {
        throw new OtherError("INTEGRITY_ERROR", "Incomplete `moof` box");
      }
      const mdatIndex = findCompleteBox(
        buffer,
        1835295092
        /* mdat */
      );
      if (mdatIndex < 0) {
        throw new OtherError("INTEGRITY_ERROR", "Incomplete `mdat` box");
      }
    }
  }

  // src/transports/utils/infer_segment_container.ts
  function inferSegmentContainer(adaptationType, mimeType) {
    if (adaptationType === "audio" || adaptationType === "video") {
      if (mimeType === "video/mp4" || mimeType === "audio/mp4") {
        return "mp4";
      }
      if (mimeType === "video/webm" || mimeType === "audio/webm") {
        return "webm";
      }
      return void 0;
    } else if (adaptationType === "text") {
      return mimeType === "application/mp4" ? "mp4" : void 0;
    }
    return void 0;
  }

  // src/transports/dash/integrity_checks.ts
  function addSegmentIntegrityChecks(segmentLoader) {
    return (url, context, loaderOptions, initialCancelSignal, callbacks) => {
      return new Promise((resolve, reject) => {
        const requestCanceller = new TaskCanceller("Segment integrity checks");
        const unlinkCanceller = requestCanceller.linkToSignal(initialCancelSignal);
        requestCanceller.signal.register(reject);
        segmentLoader(url, context, loaderOptions, requestCanceller.signal, __spreadProps(__spreadValues({}, callbacks), {
          onNewChunk(data) {
            try {
              throwOnIntegrityError(data);
              callbacks.onNewChunk(data);
            } catch (err) {
              cleanUpCancellers();
              requestCanceller.cancel("Integrity check failed");
              reject(err);
            }
          }
        })).then(
          (info) => {
            cleanUpCancellers();
            if (requestCanceller.isUsed()) {
              return;
            }
            if (info.resultType === "segment-loaded") {
              try {
                throwOnIntegrityError(info.resultData.responseData);
              } catch (err) {
                reject(err);
                return;
              }
            }
            resolve(info);
          },
          (err) => {
            cleanUpCancellers();
            reject(err);
          }
        );
        function cleanUpCancellers() {
          requestCanceller.signal.deregister(reject);
          unlinkCanceller();
        }
      });
      function throwOnIntegrityError(data) {
        if (!(data instanceof ArrayBuffer) && !(data instanceof Uint8Array) || inferSegmentContainer(context.type, context.mimeType) !== "mp4") {
          return;
        }
        checkISOBMFFIntegrity(new Uint8Array(data), context.segment.isInit);
      }
    };
  }
  function addManifestIntegrityChecks(manifestLoader) {
    return async (url, options, initialCancelSignal) => {
      const res = await manifestLoader(url, options, initialCancelSignal);
      throwOnIntegrityError(res.responseData);
      return res;
      function throwOnIntegrityError(data) {
        if (typeof data === "string") {
          let currOffset = data.length - 1;
          const expectedStrings = ["</", "MPD", ">"];
          for (let i = expectedStrings.length - 1; i >= 0; i--) {
            const currentExpectedStr = expectedStrings[i];
            while (isCharXmlWhiteSpace(data[currOffset])) {
              currOffset--;
            }
            for (let j = currentExpectedStr.length - 1; j >= 0; j--) {
              if (data[currOffset] !== currentExpectedStr[j]) {
                throw new Error("INTEGRITY_ERROR MPD does not end with </MPD>");
              } else {
                currOffset--;
              }
            }
          }
        } else if (data instanceof ArrayBuffer) {
          let currOffset = data.byteLength - 1;
          const dv = new DataView(data);
          const expectedCharGroups = [[60, 47], [77, 80, 68], [62]];
          for (let i = expectedCharGroups.length - 1; i >= 0; i--) {
            const currentExpectedCharGroup = expectedCharGroups[i];
            while (isUtf8XmlWhiteSpace(dv.getUint8(currOffset))) {
              currOffset--;
            }
            for (let j = currentExpectedCharGroup.length - 1; j >= 0; j--) {
              if (dv.getUint8(currOffset) !== currentExpectedCharGroup[j]) {
                throw new Error("INTEGRITY_ERROR MPD does not end with </MPD>");
              } else {
                currOffset--;
              }
            }
          }
        } else if (!isNullOrUndefined(global_scope_default.Document) && data instanceof global_scope_default.Document) {
          if (data.documentElement.nodeName !== "MPD") {
            throw new OtherError("INTEGRITY_ERROR", "MPD does not end with </MPD>");
          }
        }
      }
    };
  }
  function isCharXmlWhiteSpace(char) {
    return char === " " || char === "	" || char === "\r" || char === "\n";
  }
  function isUtf8XmlWhiteSpace(char) {
    return char === 32 || char === 9 || char === 13 || char === 10;
  }

  // src/transports/dash/manifest_parser.ts
  function generateManifestParser(options) {
    const { referenceDateTime } = options;
    const serverTimeOffset = options.serverSyncInfos !== void 0 ? options.serverSyncInfos.serverTimestamp - options.serverSyncInfos.clientTime : void 0;
    return function manifestParser(manifestData, parserOptions, onWarnings, cancelSignal, scheduleRequest) {
      var _a2;
      const { responseData } = manifestData;
      const argClockOffset = parserOptions.externalClockOffset;
      const url = (_a2 = manifestData.url) != null ? _a2 : parserOptions.originalUrl;
      const externalClockOffset = serverTimeOffset != null ? serverTimeOffset : argClockOffset;
      const unsafelyBaseOnPreviousManifest = parserOptions.unsafeMode ? parserOptions.previousManifest : null;
      const dashParserOpts = {
        unsafelyBaseOnPreviousManifest,
        url,
        referenceDateTime,
        externalClockOffset
      };
      const parsers = features_default.dashParsers;
      if (parsers.wasm === null || parsers.wasm.status === "uninitialized" || parsers.wasm.status === "failure") {
        log_default.debug("dash", "WASM MPD Parser not initialized. Running JS one.");
        return runDefaultJsParser();
      } else {
        const manifestAB = getManifestAsArrayBuffer(responseData);
        if (!doesXmlSeemsUtf8Encoded(manifestAB)) {
          log_default.info(
            "dash",
            "MPD doesn't seem to be UTF-8-encoded. Running JS parser instead of the WASM one."
          );
          return runDefaultJsParser();
        }
        if (parsers.wasm.status === "initialized") {
          log_default.debug("dash", "Running WASM MPD Parser.");
          const parsed = parsers.wasm.runWasmParser(manifestAB, dashParserOpts);
          return processMpdParserResponse(parsed);
        } else {
          log_default.debug("dash", "Awaiting WASM initialization before parsing the MPD.");
          const initProm = parsers.wasm.waitForInitialization().catch(() => {
          });
          return initProm.then(() => {
            if (parsers.wasm === null || parsers.wasm.status !== "initialized") {
              log_default.warn(
                "dash",
                "WASM MPD parser initialization failed. Running JS parser instead"
              );
              return runDefaultJsParser();
            }
            log_default.debug("dash", "Running WASM MPD Parser.");
            const parsed = parsers.wasm.runWasmParser(manifestAB, dashParserOpts);
            return processMpdParserResponse(parsed);
          });
        }
      }
      function runDefaultJsParser() {
        if (parsers.js !== null) {
          const manifestStr = getManifestAsString(responseData);
          const parsedManifest = parsers.js(manifestStr, dashParserOpts);
          return processMpdParserResponse(parsedManifest);
        } else {
          throw new Error("No MPD parser is imported");
        }
      }
      function processMpdParserResponse(parserResponse) {
        if (parserResponse.type === "done") {
          if (parserResponse.value.warnings.length > 0) {
            onWarnings(parserResponse.value.warnings);
          }
          if (cancelSignal.isCancelled()) {
            return Promise.reject(cancelSignal.cancellationError);
          }
          const manifest = new classes_default(parserResponse.value.parsed, options);
          return { manifest, url };
        }
        const { value } = parserResponse;
        const externalResources = value.urls.map((resourceUrl) => {
          return scheduleRequest(() => {
            const defaultTimeout = config_default.getCurrent().DEFAULT_REQUEST_TIMEOUT;
            const defaultConnectionTimeout = config_default.getCurrent().DEFAULT_CONNECTION_TIMEOUT;
            return value.format === "string" ? request_default({
              url: resourceUrl,
              responseType: "text",
              timeout: defaultTimeout,
              connectionTimeout: defaultConnectionTimeout,
              cancelSignal
            }) : request_default({
              url: resourceUrl,
              responseType: "arraybuffer",
              timeout: defaultTimeout,
              connectionTimeout: defaultConnectionTimeout,
              cancelSignal
            });
          }).then(
            (res) => {
              if (value.format === "string") {
                if (typeof res.responseData !== "string") {
                  throw new Error("External DASH resources should have been a string");
                }
                return object_assign_default(res, {
                  responseData: {
                    success: true,
                    data: res.responseData
                  }
                });
              } else {
                if (!(res.responseData instanceof ArrayBuffer)) {
                  throw new Error("External DASH resources should have been ArrayBuffers");
                }
                return object_assign_default(res, {
                  responseData: {
                    success: true,
                    data: res.responseData
                  }
                });
              }
            },
            (err) => {
              const error = formatError(err, {
                defaultCode: "PIPELINE_PARSE_ERROR",
                defaultReason: "An unknown error occured when parsing ressources."
              });
              return object_assign_default(
                {},
                {
                  size: void 0,
                  requestDuration: void 0,
                  responseData: {
                    success: false,
                    error
                  }
                }
              );
            }
          );
        });
        return Promise.all(externalResources).then((loadedResources) => {
          if (value.format === "string") {
            assertLoadedResourcesFormatString(loadedResources);
            return processMpdParserResponse(value.continue(loadedResources));
          } else {
            assertLoadedResourcesFormatArrayBuffer(loadedResources);
            return processMpdParserResponse(value.continue(loadedResources));
          }
        });
      }
    };
  }
  function assertLoadedResourcesFormatString(loadedResources) {
    if (define_ENVIRONMENT_default.CURRENT_ENV === define_ENVIRONMENT_default.PRODUCTION) {
      return;
    }
    loadedResources.forEach((loadedResource) => {
      const { responseData } = loadedResource;
      if (responseData.success && typeof responseData.data === "string") {
        return;
      } else if (!responseData.success) {
        return;
      }
      throw new Error("Invalid data given to the LoadedRessource");
    });
  }
  function assertLoadedResourcesFormatArrayBuffer(loadedResources) {
    if (define_ENVIRONMENT_default.CURRENT_ENV === define_ENVIRONMENT_default.PRODUCTION) {
      return;
    }
    loadedResources.forEach((loadedResource) => {
      const { responseData } = loadedResource;
      if (responseData.success && responseData.data instanceof ArrayBuffer) {
        return;
      } else if (!responseData.success) {
        return;
      }
      throw new Error("Invalid data given to the LoadedRessource");
    });
  }
  function getManifestAsString(manifestSrc) {
    if (manifestSrc instanceof ArrayBuffer) {
      return utf8ToStr(new Uint8Array(manifestSrc));
    } else if (typeof manifestSrc === "string") {
      return manifestSrc;
    } else if (!isNullOrUndefined(global_scope_default.Document) && manifestSrc instanceof global_scope_default.Document) {
      return manifestSrc.documentElement.outerHTML;
    } else {
      throw new Error("DASH Manifest Parser: Unrecognized Manifest format");
    }
  }
  function getManifestAsArrayBuffer(manifestSrc) {
    if (manifestSrc instanceof ArrayBuffer) {
      return manifestSrc;
    } else if (typeof manifestSrc === "string") {
      return strToUtf8(manifestSrc).buffer;
    } else if (!isNullOrUndefined(global_scope_default.Document) && manifestSrc instanceof global_scope_default.Document) {
      return strToUtf8(manifestSrc.documentElement.innerHTML).buffer;
    } else {
      throw new Error("DASH Manifest Parser: Unrecognized Manifest format");
    }
  }
  function doesXmlSeemsUtf8Encoded(xmlData) {
    const dv = new DataView(xmlData);
    if (dv.getUint16(0) === 61371 && dv.getUint8(2) === 191) {
      return true;
    } else if (dv.getUint16(0) === 65279 || dv.getUint16(0) === 65534) {
      return false;
    }
    return true;
  }

  // src/transports/utils/byte_range.ts
  function byteRange([start, end]) {
    return end === Infinity ? `bytes=${start}-` : `bytes=${start}-${end}`;
  }

  // src/transports/dash/construct_segment_url.ts
  function constructSegmentUrl(wantedCdn, segment) {
    if (wantedCdn === null) {
      return null;
    }
    if (segment.url === null) {
      return wantedCdn.baseUrl;
    }
    return resolveURL(wantedCdn.baseUrl, segment.url);
  }

  // src/transports/dash/init_segment_loader.ts
  function initSegmentLoader(initialUrl, segment, options, cancelSignal, callbacks) {
    var _a2, _b2;
    let url = initialUrl;
    if (((_a2 = options.cmcdPayload) == null ? void 0 : _a2.type) === "query") {
      url = addQueryString(url, options.cmcdPayload.value);
    }
    const cmcdHeaders = ((_b2 = options.cmcdPayload) == null ? void 0 : _b2.type) === "headers" ? options.cmcdPayload.value : void 0;
    if (segment.range === void 0) {
      return request_default({
        url,
        responseType: "arraybuffer",
        headers: cmcdHeaders,
        timeout: options.timeout,
        connectionTimeout: options.connectionTimeout,
        cancelSignal,
        onProgress: callbacks.onProgress
      }).then((data) => ({ resultType: "segment-loaded", resultData: data }));
    }
    if (segment.indexRange === void 0) {
      return request_default({
        url,
        headers: __spreadProps(__spreadValues({}, cmcdHeaders), {
          Range: byteRange(segment.range)
        }),
        responseType: "arraybuffer",
        timeout: options.timeout,
        connectionTimeout: options.connectionTimeout,
        cancelSignal,
        onProgress: callbacks.onProgress
      }).then((data) => ({ resultType: "segment-loaded", resultData: data }));
    }
    if (segment.range[1] + 1 === segment.indexRange[0]) {
      return request_default({
        url,
        headers: __spreadProps(__spreadValues({}, cmcdHeaders), {
          Range: byteRange([segment.range[0], segment.indexRange[1]])
        }),
        responseType: "arraybuffer",
        timeout: options.timeout,
        connectionTimeout: options.connectionTimeout,
        cancelSignal,
        onProgress: callbacks.onProgress
      }).then((data) => ({ resultType: "segment-loaded", resultData: data }));
    }
    const rangeRequest$ = request_default({
      url,
      headers: __spreadProps(__spreadValues({}, cmcdHeaders), {
        Range: byteRange(segment.range)
      }),
      responseType: "arraybuffer",
      timeout: options.timeout,
      connectionTimeout: options.connectionTimeout,
      cancelSignal,
      onProgress: callbacks.onProgress
    });
    const indexRequest$ = request_default({
      url,
      headers: __spreadProps(__spreadValues({}, cmcdHeaders), {
        Range: byteRange(segment.indexRange)
      }),
      responseType: "arraybuffer",
      timeout: options.timeout,
      connectionTimeout: options.connectionTimeout,
      cancelSignal,
      onProgress: callbacks.onProgress
    });
    return Promise.all([rangeRequest$, indexRequest$]).then(([initData, indexData]) => {
      const data = concat(
        new Uint8Array(initData.responseData),
        new Uint8Array(indexData.responseData)
      );
      const sendingTime = Math.min(initData.sendingTime, indexData.sendingTime);
      const receivedTime = Math.max(initData.receivedTime, indexData.receivedTime);
      return {
        resultType: "segment-loaded",
        resultData: {
          url,
          responseData: data,
          size: initData.size + indexData.size,
          requestDuration: receivedTime - sendingTime,
          sendingTime,
          receivedTime
        }
      };
    });
  }

  // src/transports/dash/load_chunked_segment_data.ts
  async function loadChunkedSegmentData(url, requestOptions, callbacks, cancelSignal) {
    let partialChunk = null;
    function onData(info) {
      const chunk = new Uint8Array(info.chunk);
      const concatenated = partialChunk !== null ? concat(partialChunk, chunk) : chunk;
      const res2 = extractCompleteChunks(concatenated);
      const completeChunks = res2[0];
      partialChunk = res2[1];
      if (completeChunks !== null) {
        completeChunks.forEach((completedChunk) => {
          callbacks.onNewChunk(completedChunk);
        });
        if (cancelSignal.isCancelled()) {
          return;
        }
      }
      callbacks.onProgress({
        duration: info.duration,
        size: info.size,
        totalSize: info.totalSize
      });
      if (cancelSignal.isCancelled()) {
        return;
      }
    }
    const res = await fetchRequest({
      url,
      headers: requestOptions.headers,
      onData,
      timeout: requestOptions.timeout,
      connectionTimeout: requestOptions.connectionTimeout,
      cancelSignal
    });
    return {
      resultType: "chunk-complete",
      resultData: res
    };
  }

  // src/transports/dash/segment_loader.ts
  async function regularSegmentLoader(initialUrl, context, lowLatencyMode, options, callbacks, cancelSignal) {
    var _a2, _b2;
    if (context.segment.isInit) {
      return initSegmentLoader(
        initialUrl,
        context.segment,
        options,
        cancelSignal,
        callbacks
      );
    }
    const url = ((_a2 = options.cmcdPayload) == null ? void 0 : _a2.type) === "query" ? addQueryString(initialUrl, options.cmcdPayload.value) : initialUrl;
    const cmcdHeaders = ((_b2 = options.cmcdPayload) == null ? void 0 : _b2.type) === "headers" ? options.cmcdPayload.value : void 0;
    const { segment } = context;
    let headers;
    if (segment.range !== void 0) {
      headers = __spreadProps(__spreadValues({}, cmcdHeaders), {
        Range: byteRange(segment.range)
      });
    } else if (cmcdHeaders !== void 0) {
      headers = cmcdHeaders;
    }
    const containerType = inferSegmentContainer(context.type, context.mimeType);
    if (lowLatencyMode && (containerType === "mp4" || containerType === void 0)) {
      if (fetchIsSupported()) {
        return loadChunkedSegmentData(
          url,
          {
            headers,
            timeout: options.timeout,
            connectionTimeout: options.connectionTimeout
          },
          callbacks,
          cancelSignal
        );
      } else {
        warnOnce(
          "DASH: Your browser does not have the fetch API. You will have a higher chance of rebuffering when playing close to the live edge"
        );
      }
    }
    const data = await request_default({
      url,
      responseType: "arraybuffer",
      headers,
      timeout: options.timeout,
      connectionTimeout: options.connectionTimeout,
      cancelSignal,
      onProgress: callbacks.onProgress
    });
    return { resultType: "segment-loaded", resultData: data };
  }
  function generateSegmentLoader({
    lowLatencyMode,
    segmentLoader: customSegmentLoader,
    checkMediaSegmentIntegrity
  }) {
    return checkMediaSegmentIntegrity !== true ? segmentLoader : addSegmentIntegrityChecks(segmentLoader);
    function segmentLoader(wantedCdn, context, options, cancelSignal, callbacks) {
      const url = constructSegmentUrl(wantedCdn, context.segment);
      if (url === null) {
        return Promise.resolve({
          resultType: "segment-created",
          resultData: null
        });
      }
      if (lowLatencyMode || customSegmentLoader === void 0) {
        return regularSegmentLoader(
          url,
          context,
          lowLatencyMode,
          options,
          callbacks,
          cancelSignal
        );
      }
      return new Promise((res, rej) => {
        let hasFinished = false;
        const resolve = (_args) => {
          if (hasFinished || cancelSignal.isCancelled()) {
            return;
          }
          hasFinished = true;
          cancelSignal.deregister(abortCustomLoader);
          let data;
          if (_args.data instanceof Uint8Array) {
            if (_args.data.buffer instanceof ArrayBuffer) {
              data = _args.data;
            } else {
              data = _args.data.slice();
            }
          } else {
            data = _args.data;
          }
          res({
            resultType: "segment-loaded",
            resultData: {
              responseData: data,
              size: _args.size,
              requestDuration: _args.duration
            }
          });
        };
        const reject = (err) => {
          var _a2, _b2;
          if (hasFinished || cancelSignal.isCancelled()) {
            return;
          }
          hasFinished = true;
          cancelSignal.deregister(abortCustomLoader);
          const castedErr = err;
          const message = (_a2 = castedErr == null ? void 0 : castedErr.message) != null ? _a2 : "Unknown error when fetching a DASH segment through a custom segmentLoader.";
          const emittedErr = new CustomLoaderError(
            message,
            (_b2 = castedErr == null ? void 0 : castedErr.canRetry) != null ? _b2 : false,
            castedErr == null ? void 0 : castedErr.xhr
          );
          rej(emittedErr);
        };
        const progress = (_args) => {
          if (hasFinished || cancelSignal.isCancelled()) {
            return;
          }
          callbacks.onProgress({
            duration: _args.duration,
            size: _args.size,
            totalSize: _args.totalSize
          });
        };
        const fallback = () => {
          if (hasFinished || cancelSignal.isCancelled()) {
            return;
          }
          hasFinished = true;
          cancelSignal.deregister(abortCustomLoader);
          regularSegmentLoader(
            url,
            context,
            lowLatencyMode,
            options,
            callbacks,
            cancelSignal
          ).then(res, rej);
        };
        const customCallbacks = { reject, resolve, progress, fallback };
        let byteRanges;
        if (context.segment.range !== void 0) {
          byteRanges = [context.segment.range];
          if (context.segment.indexRange !== void 0) {
            byteRanges.push(context.segment.indexRange);
          }
        }
        const args = {
          isInit: context.segment.isInit,
          timeout: options.timeout,
          byteRanges,
          trackType: context.type,
          url,
          cmcdPayload: options.cmcdPayload
        };
        const abort = customSegmentLoader(args, customCallbacks);
        cancelSignal.register(abortCustomLoader);
        function abortCustomLoader(err) {
          if (hasFinished) {
            return;
          }
          hasFinished = true;
          if (typeof abort === "function") {
            abort();
          }
          rej(err);
        }
      });
    }
  }

  // src/parsers/containers/matroska/utils.ts
  var SEGMENT_ID = 408125543;
  var INFO_ID = 357149030;
  var TIMECODESCALE_ID = 2807729;
  var DURATION_ID = 17545;
  var CUES_ID = 475249515;
  var CUE_POINT_ID = 187;
  var CUE_TIME_ID = 179;
  var CUE_TRACK_POSITIONS_ID = 183;
  var CUE_CLUSTER_POSITIONS_ID = 241;
  function findNextElement(elementID, parents, buffer, [initialOffset, maxOffset]) {
    let currentOffset = initialOffset;
    while (currentOffset < maxOffset) {
      const parsedID = getEBMLID(buffer, currentOffset);
      if (parsedID === null) {
        return null;
      }
      const { value: ebmlTagID, length: ebmlTagLength } = parsedID;
      const sizeOffset = currentOffset + ebmlTagLength;
      const parsedValue = getEBMLValue(buffer, sizeOffset);
      if (parsedValue === null) {
        return null;
      }
      const { length: valueLengthLength, value: valueLength } = parsedValue;
      const valueOffset = sizeOffset + valueLengthLength;
      const valueEndOffset = valueOffset + valueLength;
      if (ebmlTagID === elementID) {
        return [valueOffset, valueEndOffset];
      } else if (parents.length > 0) {
        for (let i = 0; i < parents.length; i++) {
          if (ebmlTagID === parents[i]) {
            const newParents = parents.slice(i + 1, parents.length);
            return findNextElement(elementID, newParents, buffer, [
              valueOffset,
              valueEndOffset
            ]);
          }
        }
      }
      currentOffset = valueEndOffset;
    }
    return null;
  }
  function getTimeCodeScale(buffer, initialOffset) {
    const timeCodeScaleOffsets = findNextElement(
      TIMECODESCALE_ID,
      [SEGMENT_ID, INFO_ID],
      buffer,
      [initialOffset, buffer.length]
    );
    if (timeCodeScaleOffsets === null) {
      return null;
    }
    const length = timeCodeScaleOffsets[1] - timeCodeScaleOffsets[0];
    return 1e9 / bytesToNumber(buffer, timeCodeScaleOffsets[0], length);
  }
  function getDuration(buffer, initialOffset) {
    const timeCodeScaleOffsets = findNextElement(
      DURATION_ID,
      [SEGMENT_ID, INFO_ID],
      buffer,
      [initialOffset, buffer.length]
    );
    if (timeCodeScaleOffsets === null) {
      return null;
    }
    const length = timeCodeScaleOffsets[1] - timeCodeScaleOffsets[0];
    if (length === 4) {
      return get_IEEE754_32Bits(buffer, timeCodeScaleOffsets[0]);
    } else if (length === 8) {
      return get_IEEE754_64Bits(buffer, timeCodeScaleOffsets[0]);
    }
    return null;
  }
  function getSegmentsFromCues(buffer, initialOffset) {
    const segmentRange = findNextElement(SEGMENT_ID, [], buffer, [
      initialOffset,
      buffer.length
    ]);
    if (segmentRange === null) {
      return null;
    }
    const [segmentRangeStart, segmentRangeEnd] = segmentRange;
    const timescale = getTimeCodeScale(buffer, segmentRangeStart);
    if (timescale === null) {
      return null;
    }
    const duration = getDuration(buffer, segmentRangeStart);
    if (duration === null) {
      return null;
    }
    const cuesRange = findNextElement(CUES_ID, [], buffer, [
      segmentRangeStart,
      segmentRangeEnd
    ]);
    if (cuesRange === null) {
      return null;
    }
    const rawInfos = [];
    let currentOffset = cuesRange[0];
    while (currentOffset < cuesRange[1]) {
      const cuePointRange = findNextElement(CUE_POINT_ID, [], buffer, [
        currentOffset,
        cuesRange[1]
      ]);
      if (cuePointRange === null) {
        break;
      }
      const cueTimeRange = findNextElement(CUE_TIME_ID, [], buffer, [
        cuePointRange[0],
        cuePointRange[1]
      ]);
      if (cueTimeRange === null) {
        return null;
      }
      const time = bytesToNumber(
        buffer,
        cueTimeRange[0],
        cueTimeRange[1] - cueTimeRange[0]
      );
      const cueOffsetRange = findNextElement(
        CUE_CLUSTER_POSITIONS_ID,
        [CUE_TRACK_POSITIONS_ID],
        buffer,
        [cuePointRange[0], cuePointRange[1]]
      );
      if (cueOffsetRange === null) {
        return null;
      }
      const rangeStart = bytesToNumber(buffer, cueOffsetRange[0], cueOffsetRange[1] - cueOffsetRange[0]) + segmentRangeStart;
      rawInfos.push({ time, rangeStart });
      currentOffset = cuePointRange[1];
    }
    const segments = [];
    for (let i = 0; i < rawInfos.length; i++) {
      const currentSegment = rawInfos[i];
      if (i === rawInfos.length - 1) {
        segments.push({
          time: currentSegment.time,
          timescale,
          duration: i === 0 ? duration : duration - currentSegment.time,
          range: [currentSegment.rangeStart, Infinity]
        });
      } else {
        segments.push({
          time: currentSegment.time,
          timescale,
          duration: rawInfos[i + 1].time - currentSegment.time,
          range: [currentSegment.rangeStart, rawInfos[i + 1].rangeStart - 1]
        });
      }
    }
    return segments;
  }
  function getLength(buffer, offset) {
    for (let length = 1; length <= 8; length++) {
      if (buffer[offset] >= Math.pow(2, 8 - length)) {
        return length;
      }
    }
    return void 0;
  }
  function getEBMLID(buffer, offset) {
    const length = getLength(buffer, offset);
    if (length === void 0) {
      log_default.warn("webm", "unrepresentable length");
      return null;
    }
    if (offset + length > buffer.length) {
      log_default.warn("webm", "impossible length", {
        offset,
        length,
        bufferLength: buffer.length
      });
      return null;
    }
    let value = 0;
    for (let i = 0; i < length; i++) {
      value = buffer[offset + i] * Math.pow(2, (length - i - 1) * 8) + value;
    }
    return { length, value };
  }
  function getEBMLValue(buffer, offset) {
    const length = getLength(buffer, offset);
    if (length === void 0) {
      log_default.warn("webm", "unrepresentable length");
      return null;
    }
    if (offset + length > buffer.length) {
      log_default.warn("webm", "impossible length", {
        offset,
        length,
        bufferLength: buffer.length
      });
      return null;
    }
    let value = (buffer[offset] & (1 << 8 - length) - 1) * Math.pow(2, (length - 1) * 8);
    for (let i = 1; i < length; i++) {
      value = buffer[offset + i] * Math.pow(2, (length - i - 1) * 8) + value;
    }
    return { length, value };
  }
  function get_IEEE754_32Bits(buffer, offset) {
    return new DataView(buffer.buffer).getFloat32(offset);
  }
  function get_IEEE754_64Bits(buffer, offset) {
    return new DataView(buffer.buffer).getFloat64(offset);
  }
  function bytesToNumber(buffer, offset, length) {
    let value = 0;
    for (let i = 0; i < length; i++) {
      value = buffer[offset + i] * Math.pow(2, (length - i - 1) * 8) + value;
    }
    return value;
  }

  // src/transports/utils/get_isobmff_timing_infos.ts
  function getISOBMFFTimingInfos(buffer, isChunked, segment, initTimescale) {
    const baseDecodeTime = getTrackFragmentDecodeTime(buffer);
    if (baseDecodeTime === void 0 || initTimescale === void 0) {
      return null;
    }
    let startTime = segment.timestampOffset !== void 0 ? baseDecodeTime + segment.timestampOffset * initTimescale : baseDecodeTime;
    let trunDuration = getDurationFromTrun(buffer);
    if (startTime < 0) {
      if (trunDuration !== void 0) {
        trunDuration += startTime;
      }
      startTime = 0;
    }
    if (isChunked || !segment.complete) {
      if (trunDuration === void 0) {
        log_default.warn(
          "dash",
          "Chunked segments should indicate a duration through their trun boxes"
        );
      }
      return {
        time: startTime / initTimescale,
        duration: trunDuration !== void 0 ? trunDuration / initTimescale : void 0
      };
    }
    let duration;
    const segmentDuration = segment.duration * initTimescale;
    const maxDecodeTimeDelta = Math.min(initTimescale * 0.9, segmentDuration / 4);
    if (trunDuration !== void 0 && Math.abs(trunDuration - segmentDuration) <= maxDecodeTimeDelta) {
      duration = trunDuration;
    }
    return {
      time: startTime / initTimescale,
      duration: duration !== void 0 ? duration / initTimescale : duration
    };
  }

  // src/transports/dash/get_events_out_of_emsgs.ts
  function manifestNeedsToBeRefreshed(emsgs, manifestPublishTime) {
    if (emsgs.length <= 0) {
      return false;
    }
    const len = emsgs.length;
    for (let i = 0; i < len; i++) {
      const manifestRefreshEventFromEMSGs = emsgs[i];
      const currentManifestPublishTime = manifestPublishTime;
      const { messageData } = manifestRefreshEventFromEMSGs;
      const strPublishTime = utf8ToStr(messageData);
      const eventManifestPublishTime = Date.parse(strPublishTime);
      if (currentManifestPublishTime === void 0 || eventManifestPublishTime === void 0 || isNaN(eventManifestPublishTime) || // DASH-if 4.3 tells (4.5.2.1) :
      // "The media presentation time beyond the event time (indicated
      // time by presentation_time_delta) is correctly described only
      // by MPDs with publish time greater than indicated value in the
      // message_data field."
      //
      // Here, if the current manifest has its publish time inferior or
      // identical to the event manifest publish time, then the manifest needs
      // to be updated
      eventManifestPublishTime >= currentManifestPublishTime) {
        return true;
      }
    }
    return false;
  }
  function getEventsOutOfEMSGs(parsedEMSGs, manifestPublishTime) {
    if (parsedEMSGs.length === 0) {
      return void 0;
    }
    const { manifestRefreshEventsFromEMSGs, EMSGs } = parsedEMSGs.reduce(
      (acc, val) => {
        if (val.schemeIdUri === "urn:mpeg:dash:event:2012" && // TODO support value 2 and 3
        val.value === "1") {
          if (acc.manifestRefreshEventsFromEMSGs === void 0) {
            acc.manifestRefreshEventsFromEMSGs = [];
          }
          acc.manifestRefreshEventsFromEMSGs.push(val);
        } else {
          if (acc.EMSGs === void 0) {
            acc.EMSGs = [];
          }
          acc.EMSGs.push(val);
        }
        return acc;
      },
      {
        manifestRefreshEventsFromEMSGs: void 0,
        EMSGs: void 0
      }
    );
    const inbandEvents = EMSGs == null ? void 0 : EMSGs.map((evt) => ({
      type: "emsg",
      value: evt
    }));
    const needsManifestRefresh = manifestPublishTime === void 0 || manifestRefreshEventsFromEMSGs === void 0 ? false : manifestNeedsToBeRefreshed(manifestRefreshEventsFromEMSGs, manifestPublishTime);
    return { inbandEvents, needsManifestRefresh };
  }

  // src/transports/dash/segment_parser.ts
  function generateAudioVideoSegmentParser({
    __priv_patchLastSegmentInSidx
  }) {
    return function audioVideoSegmentParser(loadedSegment, context, initTimescale) {
      var _a2, _b2;
      const { segment, periodStart, periodEnd } = context;
      const { data, isChunked } = loadedSegment;
      const appendWindow = [periodStart, periodEnd];
      if (data === null) {
        if (segment.isInit) {
          return {
            segmentType: "init",
            initializationData: null,
            initializationDataSize: 0,
            protectionData: [],
            initTimescale: void 0
          };
        }
        return {
          segmentType: "media",
          chunkData: null,
          chunkSize: 0,
          chunkInfos: null,
          chunkOffset: 0,
          protectionData: [],
          appendWindow
        };
      }
      const chunkData = toUint8Array(data);
      const containerType = inferSegmentContainer(context.type, context.mimeType);
      const seemsToBeMP4 = containerType === "mp4" || containerType === void 0;
      const protectionData = [];
      if (seemsToBeMP4) {
        const psshInfo = takePSSHOut(chunkData);
        let keyId;
        if (segment.isInit) {
          keyId = (_a2 = getKeyIdFromInitSegment(chunkData)) != null ? _a2 : void 0;
        }
        if (psshInfo.length > 0 || keyId !== void 0) {
          protectionData.push({
            initDataType: "cenc",
            keyId,
            initData: psshInfo
          });
        }
      }
      if (!segment.isInit) {
        const chunkInfos = seemsToBeMP4 ? getISOBMFFTimingInfos(chunkData, isChunked, segment, initTimescale) : null;
        const chunkOffset = (_b2 = segment.timestampOffset) != null ? _b2 : 0;
        if (seemsToBeMP4) {
          const parsedEMSGs = parseEmsgBoxes(chunkData);
          if (parsedEMSGs !== void 0) {
            const whitelistedEMSGs = parsedEMSGs.filter((evt) => {
              if (segment.privateInfos === void 0 || segment.privateInfos.isEMSGWhitelisted === void 0) {
                return false;
              }
              return segment.privateInfos.isEMSGWhitelisted(evt);
            });
            const events = getEventsOutOfEMSGs(
              whitelistedEMSGs,
              context.manifestPublishTime
            );
            if (events !== void 0) {
              const { needsManifestRefresh, inbandEvents } = events;
              return {
                segmentType: "media",
                chunkData,
                chunkSize: chunkData.length,
                chunkInfos,
                chunkOffset,
                appendWindow,
                inbandEvents,
                protectionData,
                needsManifestRefresh
              };
            }
          }
        }
        return {
          segmentType: "media",
          chunkData,
          chunkSize: chunkData.length,
          chunkInfos,
          chunkOffset,
          protectionData,
          appendWindow
        };
      }
      const { indexRange } = segment;
      let segmentList;
      if (containerType === "webm") {
        segmentList = getSegmentsFromCues(chunkData, 0);
      } else if (seemsToBeMP4) {
        segmentList = getSegmentsFromSidx(
          chunkData,
          Array.isArray(indexRange) ? indexRange[0] : 0
        );
        if (__priv_patchLastSegmentInSidx === true && segmentList !== null && segmentList.length > 0) {
          const lastSegment = segmentList[segmentList.length - 1];
          if (Array.isArray(lastSegment.range)) {
            lastSegment.range[1] = Infinity;
          }
        }
      }
      let timescale;
      if (seemsToBeMP4) {
        timescale = getMDHDTimescale(chunkData);
      } else if (containerType === "webm") {
        timescale = getTimeCodeScale(chunkData, 0);
      }
      const parsedTimescale = isNullOrUndefined(timescale) ? void 0 : timescale;
      return {
        segmentType: "init",
        initializationData: chunkData,
        initializationDataSize: chunkData.length,
        protectionData,
        initTimescale: parsedTimescale,
        segmentList: segmentList != null ? segmentList : void 0
      };
    };
  }

  // src/transports/dash/text_loader.ts
  function generateTextTrackLoader({
    lowLatencyMode,
    checkMediaSegmentIntegrity
  }) {
    return checkMediaSegmentIntegrity !== true ? textTrackLoader : addSegmentIntegrityChecks(textTrackLoader);
    async function textTrackLoader(wantedCdn, context, options, cancelSignal, callbacks) {
      var _a2, _b2;
      const { segment } = context;
      const initialUrl = constructSegmentUrl(wantedCdn, segment);
      if (initialUrl === null) {
        return Promise.resolve({
          resultType: "segment-created",
          resultData: null
        });
      }
      if (segment.isInit) {
        return initSegmentLoader(initialUrl, segment, options, cancelSignal, callbacks);
      }
      const url = ((_a2 = options.cmcdPayload) == null ? void 0 : _a2.type) === "query" ? addQueryString(initialUrl, options.cmcdPayload.value) : initialUrl;
      const cmcdHeaders = ((_b2 = options.cmcdPayload) == null ? void 0 : _b2.type) === "headers" ? options.cmcdPayload.value : void 0;
      let headers;
      if (segment.range !== void 0) {
        headers = __spreadProps(__spreadValues({}, cmcdHeaders), {
          Range: byteRange(segment.range)
        });
      } else if (cmcdHeaders !== void 0) {
        headers = cmcdHeaders;
      }
      const containerType = inferSegmentContainer(context.type, context.mimeType);
      const seemsToBeMP4 = containerType === "mp4" || containerType === void 0;
      if (lowLatencyMode && seemsToBeMP4) {
        if (fetchIsSupported()) {
          return loadChunkedSegmentData(
            url,
            {
              headers,
              timeout: options.timeout,
              connectionTimeout: options.connectionTimeout
            },
            callbacks,
            cancelSignal
          );
        } else {
          warnOnce(
            "DASH: Your browser does not have the fetch API. You will have a higher chance of rebuffering when playing close to the live edge"
          );
        }
      }
      let data;
      if (seemsToBeMP4) {
        data = await request_default({
          url,
          responseType: "arraybuffer",
          headers,
          timeout: options.timeout,
          connectionTimeout: options.connectionTimeout,
          onProgress: callbacks.onProgress,
          cancelSignal
        });
      } else {
        data = await request_default({
          url,
          responseType: "text",
          headers,
          timeout: options.timeout,
          connectionTimeout: options.connectionTimeout,
          onProgress: callbacks.onProgress,
          cancelSignal
        });
      }
      return { resultType: "segment-loaded", resultData: data };
    }
  }

  // src/transports/utils/parse_text_track.ts
  function getISOBMFFTextTrackFormat(codecs) {
    if (codecs === void 0) {
      throw new Error("Cannot parse subtitles: unknown format");
    }
    switch (codecs.toLowerCase()) {
      case "stpp":
      // stpp === TTML in MP4
      case "stpp.ttml":
      case "stpp.ttml.im1t":
        return "ttml";
      case "wvtt":
        return "vtt";
    }
    throw new Error(
      `The codec used for the subtitles "${codecs}" is not managed yet.`
    );
  }
  function getPlainTextTrackFormat(codecs, mimeType) {
    switch (mimeType) {
      case "application/ttml+xml":
        return "ttml";
      case "application/x-sami":
      case "application/smil":
        return "sami";
      case "text/vtt":
        return "vtt";
    }
    if (codecs !== void 0) {
      const codeLC = codecs.toLowerCase();
      if (codeLC === "srt") {
        return "srt";
      }
    }
    throw new Error(`could not find a text-track parser for the type ${mimeType != null ? mimeType : ""}`);
  }
  function getISOBMFFEmbeddedTextTrackData({
    segment,
    language,
    codecs
  }, chunkBytes, initTimescale, chunkInfos, isChunked) {
    if (segment.isInit) {
      return null;
    }
    let startTime;
    let endTime;
    if (chunkInfos === null) {
      if (!isChunked) {
        log_default.warn("utils", "Unavailable time data for current text track.");
      } else {
        startTime = segment.time;
        endTime = segment.end;
      }
    } else {
      startTime = chunkInfos.time;
      if (chunkInfos.duration !== void 0) {
        endTime = startTime + chunkInfos.duration;
      } else if (!isChunked && segment.complete) {
        endTime = startTime + segment.duration;
      }
    }
    const type = getISOBMFFTextTrackFormat(codecs);
    const mdat = getMDAT(chunkBytes);
    const mdatStr = mdat !== null ? utf8ToStr(mdat) : "";
    if (codecs === "wvtt" && !startsWith(mdatStr, "WEBVTT") && !startsWith(mdatStr, "\xFE\xFFWEBVTT")) {
      return {
        data: chunkBytes,
        type: "mp4vtt",
        language,
        start: startTime,
        end: endTime,
        initTimescale: initTimescale != null ? initTimescale : null
      };
    }
    return {
      data: mdatStr,
      type,
      language,
      start: startTime,
      end: endTime,
      initTimescale: initTimescale != null ? initTimescale : null
    };
  }
  function getPlainTextTrackData(context, textTrackData, initTimescale, isChunked) {
    const { segment } = context;
    if (segment.isInit) {
      return null;
    }
    let start;
    let end;
    if (isChunked) {
      log_default.warn("utils", "Unavailable time data for current text track.");
    } else {
      start = segment.time;
      if (segment.complete) {
        end = segment.time + segment.duration;
      }
    }
    const type = getPlainTextTrackFormat(context.codecs, context.mimeType);
    return {
      data: textTrackData,
      type,
      language: context.language,
      start,
      end,
      initTimescale: initTimescale != null ? initTimescale : null
    };
  }

  // src/transports/dash/text_parser.ts
  function parseISOBMFFEmbeddedTextTrack(data, isChunked, context, initTimescale, __priv_patchLastSegmentInSidx) {
    var _a2;
    const { segment } = context;
    const { isInit, indexRange } = segment;
    let chunkBytes;
    if (typeof data === "string") {
      chunkBytes = strToUtf8(data);
    } else if (data instanceof Uint8Array) {
      chunkBytes = data;
    } else {
      chunkBytes = new Uint8Array(data);
    }
    if (isInit) {
      const segmentList = getSegmentsFromSidx(
        chunkBytes,
        Array.isArray(indexRange) ? indexRange[0] : 0
      );
      if (__priv_patchLastSegmentInSidx === true && segmentList !== null && segmentList.length > 0) {
        const lastSegment = segmentList[segmentList.length - 1];
        if (Array.isArray(lastSegment.range)) {
          lastSegment.range[1] = Infinity;
        }
      }
      const mdhdTimescale = getMDHDTimescale(chunkBytes);
      return {
        segmentType: "init",
        initializationData: null,
        initializationDataSize: 0,
        protectionData: [],
        initTimescale: mdhdTimescale,
        segmentList: segmentList != null ? segmentList : void 0
      };
    }
    const chunkInfos = getISOBMFFTimingInfos(chunkBytes, isChunked, segment, initTimescale);
    const chunkData = getISOBMFFEmbeddedTextTrackData(
      context,
      chunkBytes,
      initTimescale,
      chunkInfos,
      isChunked
    );
    const chunkOffset = (_a2 = segment.timestampOffset) != null ? _a2 : 0;
    return {
      segmentType: "media",
      chunkData,
      chunkSize: chunkBytes.length,
      chunkInfos,
      chunkOffset,
      protectionData: [],
      appendWindow: [context.periodStart, context.periodEnd]
    };
  }
  function parsePlainTextTrack(data, initTimescale, isChunked, context) {
    const { periodStart, periodEnd, segment } = context;
    const { timestampOffset = 0 } = segment;
    if (segment.isInit) {
      return {
        segmentType: "init",
        initializationData: null,
        initializationDataSize: 0,
        protectionData: [],
        initTimescale: void 0
      };
    }
    let textTrackData;
    let chunkSize;
    if (typeof data !== "string") {
      const bytesData = data instanceof Uint8Array ? data : new Uint8Array(data);
      textTrackData = utf8ToStr(bytesData);
      chunkSize = bytesData.length;
    } else {
      textTrackData = data;
    }
    const chunkData = getPlainTextTrackData(
      context,
      textTrackData,
      initTimescale,
      isChunked
    );
    return {
      segmentType: "media",
      chunkData,
      chunkSize,
      chunkInfos: null,
      chunkOffset: timestampOffset,
      protectionData: [],
      appendWindow: [periodStart, periodEnd]
    };
  }
  function generateTextTrackParser({
    __priv_patchLastSegmentInSidx
  }) {
    return function textTrackParser(loadedSegment, context, initTimescale) {
      var _a2;
      const { periodStart, periodEnd, segment } = context;
      const { data, isChunked } = loadedSegment;
      if (data === null) {
        return segment.isInit ? {
          segmentType: "init",
          initializationData: null,
          initializationDataSize: 0,
          protectionData: [],
          initTimescale: void 0
        } : {
          segmentType: "media",
          chunkData: null,
          chunkSize: 0,
          chunkInfos: null,
          chunkOffset: (_a2 = segment.timestampOffset) != null ? _a2 : 0,
          protectionData: [],
          appendWindow: [periodStart, periodEnd]
        };
      }
      const containerType = inferSegmentContainer(context.type, context.mimeType);
      if (containerType === "webm") {
        throw new Error("Text tracks with a WEBM container are not yet handled.");
      } else if (containerType === "mp4") {
        return parseISOBMFFEmbeddedTextTrack(
          data,
          isChunked,
          context,
          initTimescale,
          __priv_patchLastSegmentInSidx
        );
      } else {
        return parsePlainTextTrack(data, initTimescale, isChunked, context);
      }
    };
  }

  // src/transports/dash/thumbnails.ts
  async function loadThumbnail(wantedCdn, thumbnail, options, cancelSignal) {
    var _a2, _b2;
    const initialUrl = constructSegmentUrl(wantedCdn, thumbnail);
    if (initialUrl === null) {
      return Promise.reject(new Error("Cannot load thumbnail: no URL"));
    }
    const url = ((_a2 = options.cmcdPayload) == null ? void 0 : _a2.type) === "query" ? addQueryString(initialUrl, options.cmcdPayload.value) : initialUrl;
    const cmcdHeaders = ((_b2 = options.cmcdPayload) == null ? void 0 : _b2.type) === "headers" ? options.cmcdPayload.value : void 0;
    let headers;
    if (thumbnail.range !== void 0) {
      headers = __spreadProps(__spreadValues({}, cmcdHeaders), {
        Range: byteRange(thumbnail.range)
      });
    } else if (cmcdHeaders !== void 0) {
      headers = cmcdHeaders;
    }
    return request({
      url,
      responseType: "arraybuffer",
      headers,
      timeout: options.timeout,
      connectionTimeout: options.connectionTimeout,
      cancelSignal
    });
  }
  function parseThumbnail(data, context) {
    var _a2;
    const { thumbnailTrack, thumbnail: wantedThumbnail } = context;
    const height = thumbnailTrack.height / thumbnailTrack.verticalTiles;
    const width = thumbnailTrack.width / thumbnailTrack.horizontalTiles;
    const thumbnails = [];
    const tileDuration = (_a2 = thumbnailTrack.tileDuration) != null ? _a2 : (wantedThumbnail.end - wantedThumbnail.time) / (thumbnailTrack.horizontalTiles * thumbnailTrack.verticalTiles);
    let start = wantedThumbnail.time;
    for (let row = 0; row < thumbnailTrack.verticalTiles; row++) {
      for (let column = 0; column < thumbnailTrack.horizontalTiles; column++) {
        thumbnails.push({
          start,
          end: start + tileDuration,
          offsetX: Math.round(column * width),
          offsetY: Math.round(row * height),
          height: Math.floor(height),
          width: Math.floor(width)
        });
        start += tileDuration;
      }
    }
    return {
      mimeType: thumbnailTrack.mimeType,
      data,
      thumbnails
    };
  }

  // src/transports/dash/pipelines.ts
  function pipelines_default(options) {
    const manifestLoader = generateManifestLoader(
      { customManifestLoader: options.manifestLoader },
      mightUseDashWasmFeature() ? "text" : "arraybuffer",
      options.checkManifestIntegrity === true ? addManifestIntegrityChecks : null
    );
    const manifestParser = generateManifestParser(options);
    const segmentLoader = generateSegmentLoader(options);
    const audioVideoSegmentParser = generateAudioVideoSegmentParser(options);
    const textTrackLoader = generateTextTrackLoader(options);
    const textTrackParser = generateTextTrackParser(options);
    return {
      transportName: "dash",
      manifest: { loadManifest: manifestLoader, parseManifest: manifestParser },
      audio: {
        loadSegment: segmentLoader,
        parseSegment: audioVideoSegmentParser
      },
      video: {
        loadSegment: segmentLoader,
        parseSegment: audioVideoSegmentParser
      },
      text: { loadSegment: textTrackLoader, parseSegment: textTrackParser },
      thumbnails: {
        loadThumbnail,
        parseThumbnail
      }
    };
  }
  function mightUseDashWasmFeature() {
    return features_default.dashParsers.wasm !== null && (features_default.dashParsers.wasm.status === "initialized" || features_default.dashParsers.wasm.status === "initializing");
  }

  // src/transports/dash/index.ts
  var dash_default = pipelines_default;

  // src/worker_entry_point.ts
  var dashWasmParser = new wasm_parser_default();
  features_default.dashParsers.wasm = dashWasmParser;
  features_default.dashParsers.js = js_parser_default;
  features_default.transports.dash = dash_default;
  global_scope_default.onmessageerror = (_msg) => {
    log_default2.error("Core", "Error when receiving message from main thread.");
  };
  entry_default((handler) => {
    onmessage = handler;
  }, sendMessage);
  function sendMessage(msg, transferables) {
    updateMessageFormat(msg);
    if (msg.type !== "log" /* LogMessage */) {
      log_default2.debug("M<--C", "Sending message from worker", { name: msg.type });
    }
    if (transferables === void 0) {
      postMessage(msg);
    } else {
      postMessage(
        msg,
        transferables
      );
    }
  }
  function updateMessageFormat(msg) {
    if (msg.type === "manifest-ready" /* ManifestReady */ || msg.type === "manifest-update" /* ManifestUpdate */) {
      if (msg.value.manifest instanceof classes_default) {
        msg.value.manifest = msg.value.manifest.getMetadataSnapshot();
        if (msg.type === "manifest-update" /* ManifestUpdate */) {
          msg.value.manifest.periods = [];
        }
      } else {
        log_default2.warn("Core", "the Manifest instance should be communicated to `sendMessage`.");
      }
    }
  }
})();
