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
   * Default audio track configuration, if none is set by the user.
   * Here in french for legacy reasons.
   */
  DEFAULT_AUDIO_TRACK: {
    language: "fra",
    audioDescription: false,
  },

  /**
   * Default text track configuration, if none is set by the user.
   */
  DEFAULT_TEXT_TRACK: null,

  /*
   * Default buffer goal in seconds
   */
  DEFAULT_WANTED_BUFFER_AHEAD: 30,

  /*
   * Default max buffer size ahead of the current position in seconds.
   * Set to Infinity for no limit.
   */
  DEFAULT_MAX_BUFFER_AHEAD: Infinity,

  /*
   * Default max buffer size ahead of the current position in seconds.
   * Set to Infinity for no limit.
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
   */
  DEFAULT_INITIAL_BITRATES: {
    audio: 0,
    video: 0,
    other: 0, // tracks which are not audio/video
  },

  /**
   * Default bitrate ceil initially set to dictate the maximum bitrate the
   * ABR manager can automatically switch to.
   *
   * If no track is found with a quality inferior or equal to the
   * bitrate there, the lowest bitrate will be taken instead.
   *
   * Set to Infinity to discard any limit in the ABR strategy.
   */
  DEFAULT_MAX_BITRATES: {
    audio: Infinity,
    video: Infinity,
    other: Infinity, // tracks which are not audio/video
  },

  /**
   * buffer threshold ratio used as a lower bound
   * margin to find the suitable representation
   */
  DEFAULT_ADAPTIVE_BUFFER_THRESHOLD: 0.3,

  /**
   * Delay after which, if the page is hidden, the user is considered inactive
   * on the current video. Allow to enforce specific optimizations when the
   * page is not shown.
   * @see DEFAULT_THROTTLE_WHEN_HIDDEN
   */
  INACTIVITY_DELAY: 60 * 1000,

  /**
   * If true, if the player is in a "hidden" state for a delay specified by the
   * INACTIVITY DELAY config property, we throttle automatically to the video
   * representation with the lowest bitrate.
   */
  DEFAULT_THROTTLE_WHEN_HIDDEN: true,

  /**
   * If true, the video representations you can switch to in adaptive mode
   * are limited by the video element's width.
   */
  DEFAULT_LIMIT_VIDEO_WIDTH: true,

  /**
   * Default initial live gap considered if no presentation delay has been
   * suggested, in seconds.
   *
   * TODO this is never used, as every transport techno has a default
   * suggested presentation delay.
   */
  DEFAULT_LIVE_GAP: 15,

  /**
   * Default value for a manifest's suggested presentation delay if not
   * specified in the manifest.
   *
   * TODO this should not be in a manifest as it does not reflect what is
   * given server-side.
   */
  DEFAULT_SUGGESTED_PRESENTATION_DELAY: {
    SMOOTH: 20,
    DASH: 15,
  },

  /**
   * Maximum time, in seconds, the player should automatically skip when stalled
   * because of a discontinuity in the downloaded range.
   */
  DISCONTINUITY_THRESHOLD: 1,

  /**
   * Time before the end of a video (in seconds) at which the player should
   * automatically stop.
   * It happens often that the video gets stuck 100 to 300 ms before the end,
   * especially on IE11 and Edge
   */
  END_OF_PLAY: 0.5,

  /**
   * Ratio used to know if an already loaded segment should be re-buffered.
   * We re-load the given segment if the current one times that ratio is
   * inferior to the new one.
   */
  BITRATE_REBUFFERING_RATIO: 1.5,

  /**
   * Those are used when a "QuotaExceededError" error is received after
   * appending a new segment in the source buffer.
   *
   * This error can arise when the browser's buffer is considered full.
   * In this case, the player goes into manual garbage collection (GC) mode.
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
   * @type Number
   */
  DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR: 4,

  // time changes interval in milliseconds
  SAMPLING_INTERVAL_MEDIASOURCE: 1000,
  SAMPLING_INTERVAL_NO_MEDIASOURCE: 500,

  /**
   * Minimum number of bytes sampled before we trust the estimate.
   * If we have not sampled much data, our estimate may not be accurate
   * enough to trust.
   * If bytesSampled_ is less than minTotalBytes_, we use defaultEstimate_.
   * This specific value is based on experimentation.
   * @type {Number}
   */
  ABR_MINIMUM_TOTAL_BYTES: 128e3,

  /**
   * Minimum number of bytes, under which samples are discarded.
   * Our models do not include latency information, so connection startup time
   * (time to first byte) is considered part of the download time.
   * Because of this, we should ignore very small downloads which would cause our
   * estimate to be too low.
   * This specific value is based on experimentation.
   * @type {Number}
   */
  ABR_MINIMUM_CHUNK_SIZE: 16e3,

  /**
   * If a SourceBuffer has less than this amount of seconds ahead of the current
   * position in its buffer, the ABR manager will go into starvation mode.
   *
   * Under this mode, the time the next important request take will be checked
   * multiple times to detect when/if it takes too much time.
   * If the request is considered too long, the bitrate will be hastily
   * re-calculated from this single request.
   * @type {Number}
   */
  ABR_STARVATION_GAP: 5,
};
