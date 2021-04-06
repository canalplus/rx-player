/**
 * Configuration file for the whole player.
 * Feel free to tweak those values if you know what you're doing.
 *
 * Please not that you will need to re-build the whole project to take these
 * modifications into account.
 *
 * @type {Object}
 */
const DEFAULT_CONFIG = {
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
     * Strategy to adopt when manually switching of audio adaptation.
     * Can be either:
     *    - "seamless": transitions are smooth but could be not immediate.
     *    - "direct": that strategy will perform a very small seek that result
     *    most of the time by a flush of the current buffered data, by doing
     *    that we allow quicker transition between audio track, but we could
     *    see appear a RELOADING or a SEEKING state.
     */
  DEFAULT_AUDIO_TRACK_SWITCHING_MODE: "seamless" as "seamless" |
                                                      "direct",

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
    trackSwitch: { audio: -0.7,
                   video: -0.1,
                   other: 0 },
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
  DEFAULT_CODEC_SWITCHING_BEHAVIOR: "continue" as "continue" |
                                                    "reload",

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

    /* eslint-disable @typescript-eslint/consistent-type-assertions */
    /**
     * Maximum possible buffer ahead for each type of buffer, to avoid too much
     * memory usage when playing for a long time.
     * Equal to Infinity if not defined here.
     * @type {Object}
     */
  MAXIMUM_MAX_BUFFER_AHEAD: {
    text: 5 * 60 * 60,
  } as Partial<Record<"audio"|"video"|"image"|"text", number>>,
    /* eslint-enable @typescript-eslint/consistent-type-assertions */

    /* eslint-disable @typescript-eslint/consistent-type-assertions */
    /**
     * Maximum possible buffer behind for each type of buffer, to avoid too much
     * memory usage when playing for a long time.
     * Equal to Infinity if not defined here.
     * @type {Object}
     */
  MAXIMUM_MAX_BUFFER_BEHIND: {
    text: 5 * 60 * 60,
  } as Partial<Record<"audio"|"video"|"image"|"text", number>>,
    /* eslint-enable @typescript-eslint/consistent-type-assertions */

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

    /* eslint-disable @typescript-eslint/consistent-type-assertions */
    /**
     * Default bitrate floor initially set to dictate the minimum bitrate the
     * adaptive logic can automatically switch to.
     *
     * If no track is found with a quality superior or equal to the
     * bitrate there, the lowest bitrate will be taken instead.
     *
     * Set to Infinity to discard any limit in the ABR strategy.
     * @type {Object}
     */
  DEFAULT_MIN_BITRATES: {
    audio: 0, // only "audio" segments
    video: 0, // only "video" segments
    other: 0, // tracks which are not audio/video
                       // Though those are generally at a single bitrate, so no
                       // adaptive mechanism is triggered for them.
  } as Record<"audio"|"video"|"other", number>,
    /* eslint-enable @typescript-eslint/consistent-type-assertions */

    /* eslint-disable @typescript-eslint/consistent-type-assertions */
    /**
     * Default bitrate ceil initially set to dictate the maximum bitrate the
     * adaptive logic can automatically switch to.
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
    /* eslint-enable @typescript-eslint/consistent-type-assertions */

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
    LOW_LATENCY: 3.5,
  },

    /**
     * Maximum time, in seconds, the player should automatically skip when stalled
     * because of a current hole in the buffer.
     * Bear in mind that this might seek over not-yet-downloaded/pushed segments.
     * @type {Number}
     */
  BUFFER_DISCONTINUITY_THRESHOLD: 0.2,

    /**
     * When encountering small discontinuities, the RxPlayer may want, in specific
     * conditions, ignore those and let the browser seek over them iself (this
     * allows for example to avoid conflicts when both the browser and the
     * RxPlayer want to seek at a different position, sometimes leading to a
     * seeking loop).
     * In this case, we however still want to seek it ourselves if the browser
     * doesn't take the opportunity soon enough.
     *
     * This value specifies a delay after which a discontinuity ignored by the
     * RxPlayer is finally considered.
     * We want to maintain high enough to be sure the browser will not seek yet
     * small enough so this (arguably rare) situation won't lead to too much
     * waiting time.
     */
  FORCE_DISCONTINUITY_SEEK_DELAY: 2000,

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
     *     separate counter is used (see DEFAULT_MAX_REQUESTS_RETRY_ON_OFFLINE).
     * @type Number
     */
  DEFAULT_MAX_MANIFEST_REQUEST_RETRY: 4,

    /**
     * The default number of times a segment request will be re-performed when
     * on error which justify a retry.
     *
     * Note that some errors do not use this counter:
     *   - if the error is not due to the xhr, no retry will be peformed
     *   - if the error is an HTTP error code, but not a 500-smthg or a 404, no
     *     retry will be performed.
     *   - if it has a high chance of being due to the user being offline, a
     *     separate counter is used (see DEFAULT_MAX_REQUESTS_RETRY_ON_OFFLINE).
     * @type Number
     */
  DEFAULT_MAX_REQUESTS_RETRY_ON_ERROR: 4,

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
  DEFAULT_MAX_REQUESTS_RETRY_ON_OFFLINE: Infinity,

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
    LOW_LATENCY: 0.72,
  },

    /**
     * Factor with which is multiplied the bandwidth estimate when the ABR is not
     * in starvation mode.
     * @type {Object}
     */
  ABR_REGULAR_FACTOR: {
    DEFAULT: 0.8,
    LOW_LATENCY: 0.8,
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
     * the player was rebuffering due to a low readyState.
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
     * Maximum number of seconds in the buffer based on which a "rebuffering"
     * strategy will be considered:
     * The player will pause playback to get enough time building a sufficient
     * buffer. This mostly happen when seeking in an unbuffered part or when not
     * enough buffer is ahead of the current position.
     * @type {Number}
     */
  REBUFFERING_GAP: {
    DEFAULT: 0.5,
    LOW_LATENCY: 0.2,
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
  UNFREEZING_SEEK_DELAY: 6000,

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
  UNFREEZING_DELTA_POSITION: 0.001,

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
  MINIMUM_SEGMENT_SIZE: 0.005,

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
  SEGMENT_PRIORITIES_STEPS : [ 2,   // 1st Step (priority number = 0):  < 2
                               4,   // 2nd Step (priority number = 1):  2-4
                               8,   // 3rd Step (priority number = 2):  4-8
                               12,  // 4th Step (priority number = 3):  8-12
                               18,  // 5th Step (priority number = 4):  12-18
                               25], // 6th Step (priority number = 5):  18-25
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
  MAX_HIGH_PRIORITY_LEVEL: 1, // priority number 1 and lower is high priority

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
  MIN_CANCELABLE_PRIORITY: 3, // priority number 3 onward can be cancelled

    /**
     * Robustnesses used in the {audio,video}Capabilities of the
     * MediaKeySystemConfiguration (DRM).
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
    /* eslint-disable @typescript-eslint/consistent-type-assertions */
  EME_KEY_SYSTEMS: {
    clearkey:  [ "webkit-org.w3.clearkey",
                 "org.w3.clearkey" ],
    widevine:  [ "com.widevine.alpha" ],
    playready: [ "com.microsoft.playready",
                 "com.chromecast.playready",
                 "com.youtube.playready" ],
    fairplay: [ "com.apple.fps.1_0" ],
  } as Partial<Record<string, string[]>>,
    /* eslint-enable @typescript-eslint/consistent-type-assertions */

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
  EME_MAX_STORED_PERSISTENT_SESSION_INFORMATION: 1000,

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
  FORCED_ENDED_THRESHOLD: 0.0008,

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
    video: { before: 5, after: 5 },
    audio: { before: 2, after: 2.5 },
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
    audio: 10,
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
  DEFAULT_MAXIMUM_TIME_ROUNDING_ERROR: 1 / 1000,

  /**
   * RxPlayer's media buffers have a linked history registering recent events
   * that happened on those.
   * The reason is to implement various heuristics in case of weird browser
   * behavior.
   *
   * The `BUFFERED_HISTORY_RETENTION_TIME` is the minimum age an entry of
   * that history can have before being removed from the history.
   */
  BUFFERED_HISTORY_RETENTION_TIME: 60000,

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
  UPTO_CURRENT_POSITION_CLEANUP : 5,
};

export type IDefaultConfig = typeof DEFAULT_CONFIG;
export default DEFAULT_CONFIG;
