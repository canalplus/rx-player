/**
 * Configuration file for the whole player.
 * Feel free to tweak those values if you know what you're doing.
 *
 * Please not that you will need to re-build the whole project to take these
 * modifications into account.
 *
 * @type {Object}
 */
declare const DEFAULT_CONFIG: {
    /**
     * Default time interval after which a request will timeout, in ms.
     * @type {Number}
     */
    DEFAULT_REQUEST_TIMEOUT: number;
    /**
     * Default connection time after which a request will timeout, in ms.
     * @type {Number}
     */
    DEFAULT_CONNECTION_TIMEOUT: number;
    /**
     * Can be either:
     *   - "native": Subtitles are all displayed in a <track> element
     *   - "html": Subtitles are all displayed in a <div> separated from the video
     *     element. Can be useful to display richer TTML subtitles, for example.
     * @type {Object|null}
     */
    DEFAULT_TEXT_TRACK_MODE: "native" | "html";
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
    DEFAULT_ENABLE_FAST_SWITCHING: boolean;
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
        bitrateSwitch: number;
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
        trackSwitch: {
            audio: number;
            video: number;
            other: number;
        };
    };
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
    DEFAULT_CODEC_SWITCHING_BEHAVIOR: "reload" | "continue";
    /**
     * If set to true, video through loadVideo will auto play by default
     * @type {Boolean}
     */
    DEFAULT_AUTO_PLAY: boolean;
    /**
     * Default buffer goal in seconds.
     * Once enough content has been downloaded to fill the buffer up to
     * ``current position + DEFAULT_WANTED_BUFFER_AHEAD", we will stop downloading
     * content.
     * @type {Number}
     */
    DEFAULT_WANTED_BUFFER_AHEAD: number;
    /**
     * Default max buffer size ahead of the current position in seconds.
     * The buffer _after_ this limit will be garbage collected.
     * Set to Infinity for no limit.
     * @type {Number}
     */
    DEFAULT_MAX_BUFFER_AHEAD: number;
    /**
     * Default max buffer size ahead of the current position in seconds.
     * The buffer _before_ this limit will be garbage collected.
     * Set to Infinity for no limit.
     * @type {Number}
     */
    DEFAULT_MAX_BUFFER_BEHIND: number;
    /**
     * Default video buffer memory limit in kilobytes.
     * Once enough video content has been downloaded to fill the buffer up to
     * DEFAULT_MAX_VIDEO_BUFFER_SIZE , we will stop downloading
     * content.
     * @type {Number}
     */
    DEFAULT_MAX_VIDEO_BUFFER_SIZE: number;
    /**
     * Maximum possible buffer ahead for each type of buffer, to avoid too much
     * memory usage when playing for a long time.
     * Equal to Infinity if not defined here.
     * @type {Object}
     */
    MAXIMUM_MAX_BUFFER_AHEAD: Partial<Record<"audio" | "video" | "text", number>>;
    /**
     * Minimum possible buffer ahead for each type of buffer, to avoid Garbage
     * Collecting too much data when it would have adverse effects.
     * Equal to `0` if not defined here.
     * @type {Object}
     */
    MINIMUM_MAX_BUFFER_AHEAD: Partial<Record<"audio" | "video" | "image" | "text", number>>;
    /**
     * Maximum possible buffer behind for each type of buffer, to avoid too much
     * memory usage when playing for a long time.
     * Equal to Infinity if not defined here.
     * @type {Object}
     */
    MAXIMUM_MAX_BUFFER_BEHIND: Partial<Record<"audio" | "video" | "text", number>>;
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
    DEFAULT_BASE_BANDWIDTH: number;
    /**
     * Delay after which, if the page is hidden, the user is considered inactive
     * on the current video.
     *
     * Allow to enforce specific optimizations when the page is not shown.
     * @see DEFAULT_THROTTLE_WHEN_HIDDEN
     * @type {Number}
     */
    INACTIVITY_DELAY: number;
    /**
     * If true, if the video is considered in a "hidden" state for a delay specified by
     * the INACTIVITY DELAY config property, we throttle automatically to the video
     * representation with the lowest bitrate.
     * @type {Boolean}
     */
    DEFAULT_THROTTLE_VIDEO_BITRATE_WHEN_HIDDEN: boolean;
    /**
     * Default video resolution limit behavior.
     *
     * This option allows for example to throttle the video resolution so it
     * does not exceed the screen resolution.
     *
     * Here set to "none" by default to disable throttling.
     * @type {Boolean}
     */
    DEFAULT_VIDEO_RESOLUTION_LIMIT: "none";
    /**
     * Default initial live gap considered if no presentation delay has been
     * suggested, in seconds.
     * @type {Number}
     */
    DEFAULT_LIVE_GAP: {
        DEFAULT: number;
        LOW_LATENCY: number;
    };
    /**
     * Maximum time, in seconds, the player should automatically skip when stalled
     * because of a current hole in the buffer.
     * Bear in mind that this might seek over not-yet-downloaded/pushed segments.
     * @type {Number}
     */
    BUFFER_DISCONTINUITY_THRESHOLD: number;
    /**
     * Ratio used to know if an already loaded segment should be re-buffered.
     * We re-load the given segment if the current one times that ratio is
     * inferior to the new one.
     * @type {Number}
     */
    BITRATE_REBUFFERING_RATIO: number;
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
    DEFAULT_MAX_MANIFEST_REQUEST_RETRY: number;
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
    DEFAULT_CDN_DOWNGRADE_TIME: number;
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
    DEFAULT_MAX_REQUESTS_RETRY_ON_ERROR: number;
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
        REGULAR: number;
        LOW_LATENCY: number;
    };
    /**
     * Maximum backoff delay when a segment / manifest download fails, in
     * milliseconds.
     *
     * Please note that this delay is not exact, as it will be fuzzed.
     * @type {Number}
     */
    MAX_BACKOFF_DELAY_BASE: {
        REGULAR: number;
        LOW_LATENCY: number;
    };
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
    SAMPLING_INTERVAL_MEDIASOURCE: number;
    /**
     * Same than SAMPLING_INTERVAL_MEDIASOURCE but for lowLatency mode.
     * @type {Number}
     */
    SAMPLING_INTERVAL_LOW_LATENCY: number;
    /**
     * Same than SAMPLING_INTERVAL_MEDIASOURCE but for the directfile API.
     * @type {Number}
     */
    SAMPLING_INTERVAL_NO_MEDIASOURCE: number;
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
    ABR_ENTER_BUFFER_BASED_ALGO: number;
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
    ABR_EXIT_BUFFER_BASED_ALGO: number;
    /**
     * Minimum number of bytes sampled before we trust the estimate.
     * If we have not sampled much data, our estimate may not be accurate
     * enough to trust.
     * If the total of bytes sampled is less than this value, we use a
     * default estimate.
     * This specific value is based on experimentations.
     * @type {Number}
     */
    ABR_MINIMUM_TOTAL_BYTES: number;
    /**
     * Minimum number of bytes, under which samples are discarded.
     * Our models do not include latency information, so connection startup time
     * (time to first byte) is considered part of the download time.
     * Because of this, we should ignore very small downloads which would cause
     * our estimate to be too low.
     * This specific value is based on experimentation.
     * @type {Number}
     */
    ABR_MINIMUM_CHUNK_SIZE: number;
    /**
     * Factor with which is multiplied the bandwidth estimate when the ABR is in
     * starvation mode.
     * @type {Object}
     */
    ABR_STARVATION_FACTOR: {
        DEFAULT: number;
        LOW_LATENCY: number;
    };
    /**
     * Factor with which is multiplied the bandwidth estimate when the ABR is not
     * in starvation mode.
     * @type {Object}
     */
    ABR_REGULAR_FACTOR: {
        DEFAULT: number;
        LOW_LATENCY: number;
    };
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
        DEFAULT: number;
        LOW_LATENCY: number;
    };
    OUT_OF_STARVATION_GAP: {
        DEFAULT: number;
        LOW_LATENCY: number;
    };
    /**
     * This is a security to avoid going into starvation mode when the content is
     * ending (@see ABR_STARVATION_GAP).
     * Basically, we subtract that value from the global duration of the content
     * and we never enter "starvation mode" if the currently available buffer
     * (which equals to the current position + the available buffer ahead of it)
     * is equal or higher than this value.
     * @type {Number}
     */
    ABR_STARVATION_DURATION_DELTA: number;
    /**
     * Half-life, in seconds for a fastly-evolving exponential weighted moving
     * average.
     * The lower it is, the faster the ABR logic will react to the bandwidth
     * falling quickly.
     * Should be kept to a lower number than ABR_SLOW_EMA for coherency reasons.
     * @type {Number}
     */
    ABR_FAST_EMA: number;
    /**
     * Half-life, in seconds for a slowly-evolving exponential weighted moving
     * average.
     * The lower it is, the faster the ABR logic is going to react to recent
     * bandwidth variation, on the higher and on the lower side.
     * Should be kept to a higher number than ABR_FAST_EMA for coherency reasons.
     * @type {Number}
     */
    ABR_SLOW_EMA: number;
    /**
     * Number of seconds ahead in the buffer after which playback will resume when
     * seeking on an unbuffered part of the content.
     * @type {Number}
     */
    RESUME_GAP_AFTER_SEEKING: {
        DEFAULT: number;
        LOW_LATENCY: number;
    };
    /**
     * Number of seconds ahead in the buffer after which playback will resume when
     * the player was rebuffering due to a low readyState.
     * @type {Number}
     */
    RESUME_GAP_AFTER_NOT_ENOUGH_DATA: {
        DEFAULT: number;
        LOW_LATENCY: number;
    };
    /**
     * Number of seconds ahead in the buffer after which playback will resume
     * after the player went through a buffering step.
     * @type {Number}
     */
    RESUME_GAP_AFTER_BUFFERING: {
        DEFAULT: number;
        LOW_LATENCY: number;
    };
    /**
     * Maximum number of seconds in the buffer based on which a "rebuffering"
     * strategy will be considered:
     * The player will pause playback to get enough time building a sufficient
     * buffer. This mostly happen when seeking in an unbuffered part or when not
     * enough buffer is ahead of the current position.
     * @type {Number}
     */
    REBUFFERING_GAP: {
        DEFAULT: number;
        LOW_LATENCY: number;
    };
    /**
     * Amount of time (in seconds) with data ahead of the current position, at
     * which we always consider the browser to be able to play.
     *
     * If the media element has this amount of data in advance or more but
     * playback cannot begin, the player will consider it "freezing".
     */
    MINIMUM_BUFFER_AMOUNT_BEFORE_FREEZING: number;
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
    UNFREEZING_SEEK_DELAY: number;
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
    FREEZING_STALLED_DELAY: number;
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
    UNFREEZING_DELTA_POSITION: number;
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
    SEGMENT_SYNCHRONIZATION_DELAY: number;
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
    MISSING_DATA_TRIGGER_SYNC_DELAY: number;
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
    MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT: number;
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
    MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE: number;
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
    MAX_MANIFEST_BUFFERED_DURATION_DIFFERENCE: number;
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
    MINIMUM_SEGMENT_SIZE: number;
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
        START: number;
        END: number;
    };
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
    MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL: number;
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
    TEXT_TRACK_SIZE_CHECKS_INTERVAL: number;
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
        audio: number;
        video: number;
        other: number;
    };
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
    SEGMENT_PRIORITIES_STEPS: number[];
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
    MAX_HIGH_PRIORITY_LEVEL: number;
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
    MIN_CANCELABLE_PRIORITY: number;
    /**
     * Codecs used in the videoCapabilities of the MediaKeySystemConfiguration
     * (DRM).
     *
     * Defined in order of importance (first will be tested first etc.)
     * @type {Array.<string>}
     */
    EME_DEFAULT_VIDEO_CODECS: string[];
    /**
     * Codecs used in the audioCapabilities of the MediaKeySystemConfiguration
     * (DRM).
     *
     * Defined in order of importance (first will be tested first etc.)
     * @type {Array.<string>}
     */
    EME_DEFAULT_AUDIO_CODECS: string[];
    /**
     * Robustnesses used in the {audio,video}Capabilities of the
     * MediaKeySystemConfiguration (DRM).
     *
     * Only used for widevine keysystems.
     *
     * Defined in order of importance (first will be tested first etc.)
     * @type {Array.<string>}
     */
    EME_DEFAULT_WIDEVINE_ROBUSTNESSES: string[];
    /**
     * Robustnesses used in the {audio,video}Capabilities of the
     * MediaKeySystemConfiguration (DRM).
     *
     * Only used for "com.microsoft.playready.recommendation" keysystems.
     *
     * Defined in order of importance (first will be tested first etc.)
     * @type {Array.<string>}
     */
    EME_DEFAULT_PLAYREADY_RECOMMENDATION_ROBUSTNESSES: string[];
    /**
     * Link canonical key systems names to their respective reverse domain name,
     * used in the EME APIs.
     * This allows to have a simpler API, where users just need to set "widevine"
     * or "playready" as a keySystem.
     * @type {Object}
     */
    EME_KEY_SYSTEMS: Partial<Record<string, string[]>>;
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
    MAX_CONSECUTIVE_MANIFEST_PARSING_IN_UNSAFE_MODE: number;
    /**
     * Minimum time spent parsing the Manifest before we can authorize parsing
     * it in an "unsafeMode", to speed-up the process with a little risk.
     * Please note that this parsing time also sometimes includes idle time such
     * as when the parser is waiting for a request to finish.
     */
    MIN_MANIFEST_PARSING_TIME_TO_ENTER_UNSAFE_MODE: number;
    /**
     * Minimum amount of <S> elements in a DASH MPD's <SegmentTimeline> element
     * necessary to begin parsing the current SegmentTimeline element in an
     * unsafe manner (meaning: with risks of de-synchronization).
     * This is only done when the "unsafeMode" parsing mode is enabled.
     */
    MIN_DASH_S_ELEMENTS_TO_PARSE_UNSAFELY: number;
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
    OUT_OF_SYNC_MANIFEST_REFRESH_DELAY: number;
    /**
     * When a partial Manifest update (that is an update with a partial sub-set
     * of the Manifest) fails, we will perform an update with the whole Manifest
     * instead.
     * To not overload the client - as parsing a Manifest can be resource heavy -
     * we set a minimum delay to wait before doing the corresponding request.
     * @type {Number}
     */
    FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY: number;
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
    DASH_FALLBACK_LIFETIME_WHEN_MINIMUM_UPDATE_PERIOD_EQUAL_0: number;
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
    EME_DEFAULT_MAX_SIMULTANEOUS_MEDIA_KEY_SESSIONS: number;
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
    EME_MAX_STORED_PERSISTENT_SESSION_INFORMATION: number;
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
    EME_WAITING_DELAY_LOADED_SESSION_EMPTY_KEYSTATUSES: number;
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
    FORCED_ENDED_THRESHOLD: number;
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
        video: {
            before: number;
            after: number;
        };
        audio: {
            before: number;
            after: number;
        };
        text: {
            before: number;
            after: number;
        };
    };
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
    SOURCE_BUFFER_FLUSHING_INTERVAL: number;
    /**
     * Any already-pushed segment starting before or at the current position +
     * CONTENT_REPLACEMENT_PADDING won't be replaced by new segments.
     *
     * This allows to avoid overwriting segments that are currently being decoded
     * as we encountered many decoding issues when doing so.
     * @type {Number} - in seconds
     */
    CONTENT_REPLACEMENT_PADDING: number;
    /**
     * For video and audio segments, determines two thresholds below which :
     * - The segment is considered as loaded from cache
     * - The segment may be loaded from cache depending on the previous request
     */
    CACHE_LOAD_DURATION_THRESHOLDS: {
        video: number;
        audio: number;
    };
    /** Interval we will use to poll for checking if an event shall be emitted */
    STREAM_EVENT_EMITTER_POLL_INTERVAL: number;
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
    DEFAULT_MAXIMUM_TIME_ROUNDING_ERROR: number;
    /**
     * RxPlayer's media buffers have a linked history registering recent events
     * that happened on those.
     * The reason is to implement various heuristics in case of weird browser
     * behavior.
     *
     * The `BUFFERED_HISTORY_RETENTION_TIME` is the minimum age an entry of
     * that history can have before being removed from the history.
     */
    BUFFERED_HISTORY_RETENTION_TIME: number;
    /**
     * RxPlayer's media buffers have a linked history registering recent events
     * that happened on those.
     * The reason is to implement various heuristics in case of weird browser
     * behavior.
     *
     * The `BUFFERED_HISTORY_RETENTION_TIME` is the maximum number of entries
     * there can be in that history.
     */
    BUFFERED_HISTORY_MAXIMUM_ENTRIES: number;
    /**
     * Minimum buffer in seconds ahead relative to current time
     * we should be able to download, even in cases of saturated memory.
     */
    MIN_BUFFER_AHEAD: number;
    /**
     * Distance in seconds behind the current position
     * the player will free up to in the case we agressively free up memory
     * It is set to avoid playback issues
     */
    UPTO_CURRENT_POSITION_CLEANUP: number;
    /**
     * Default "switching mode" used when locking video Representations.
     * That is, which behavior the RxPlayer should have by default when
     * explicitely and manually switching from a previous set of video
     * Representations to a new one.
     */
    DEFAULT_VIDEO_REPRESENTATIONS_SWITCHING_MODE: "seamless";
    /**
     * Default "switching mode" used when locking audio Representations.
     * That is, which behavior the RxPlayer should have by default when
     * explicitely and manually switching from a previous set of audio
     * Representations to a new one.
     */
    DEFAULT_AUDIO_REPRESENTATIONS_SWITCHING_MODE: "seamless";
    /**
     * Default "switching mode" used when switching between video tracks.
     * That is, which behavior the RxPlayer should have by default when
     * explicitely and manually switching from a previous video track to a new
     * one.
     */
    DEFAULT_VIDEO_TRACK_SWITCHING_MODE: "reload";
    /**
     * Default "switching mode" used when switching between audio tracks.
     * That is, which behavior the RxPlayer should have by default when
     * explicitely and manually switching from a previous audio track to a new
     * one.
     */
    DEFAULT_AUDIO_TRACK_SWITCHING_MODE: "seamless";
};
export type IDefaultConfig = typeof DEFAULT_CONFIG;
export default DEFAULT_CONFIG;
