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
 * /!\ This file is feature-switchable.
 * It always should be imported through the `features` object.
 */

import type { IMediaElement } from "../../compat/browser_compatibility_types";
import clearElementSrc from "../../compat/clear_element_src";
import type { MediaError } from "../../errors";
import log from "../../log";
import type { IMediaElementMonitor } from "../../media_element_monitor";
import type { IKeySystemOption, IPlayerError } from "../../public_types";
import assert from "../../utils/assert";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import noop from "../../utils/noop";
import type { IReadOnlySharedReference } from "../../utils/reference";
import type { CancellationSignal } from "../../utils/task_canceller";
import TaskCanceller from "../../utils/task_canceller";
import { ContentInitializer } from "./types";
import type { IInitialTimeOptions } from "./utils/get_initial_time";
import getLoadedReference from "./utils/get_loaded_reference";
import performInitialSeekAndPlay from "./utils/initial_seek_and_play";
import initializeContentDecryption from "./utils/initialize_content_decryption";
import RebufferingController from "./utils/rebuffering_controller";
import listenToMediaError from "./utils/throw_on_media_error";

/**
 * `ContentIntializer` which will load contents by putting their URL in the
 * `src` attribute of the given HTMLMediaElement.
 *
 * Because such contents are mainly loaded by the browser, those (called
 * "directfile" contents in the RxPlayer) needs a simpler logic in-JS when
 * compared to a content that relies on the MSE API.
 *
 * @class DirectFileContentInitializer
 */
export default class DirectFileContentInitializer extends ContentInitializer {
  /**
   * Initial options given to the `DirectFileContentInitializer`.
   */
  private _settings: IDirectFileOptions;
  /**
   * Allows to abort and clean everything the `DirectFileContentInitializer` is
   * doing.
   */
  private _initCanceller: TaskCanceller;

  /**
   * Creates a new `DirectFileContentInitializer` linked to the given settings.
   * @param {Object} settings
   */
  constructor(settings: IDirectFileOptions) {
    super();
    this._settings = settings;
    this._initCanceller = new TaskCanceller("Directfile Init");
  }

  /**
   * "Prepare" content so it can later be played by calling `start`.
   */
  public prepare(): void {
    return; // Directfile contents do not have any preparation
  }

  /**
   * Start playback of the content linked to this `DirectFileContentInitializer`
   * on the given `HTMLMediaElement` and its associated `MediaElementMonitor`.
   * @param {HTMLMediaElement} mediaElement - HTMLMediaElement on which the
   * content will be played.
   * @param {Object} mediaElementMonitor - Object regularly emitting playback
   * information.
   */
  public start(
    mediaElement: IMediaElement,
    mediaElementMonitor: IMediaElementMonitor,
  ): void {
    const cancelSignal = this._initCanceller.signal;
    const { keySystems, speed, url } = this._settings;

    clearElementSrc(mediaElement);

    // Set the autoplay attribute on the mediaElement.
    // On Apple devices, the native HLS player needs autoplay to be set
    // in order to start buffering,which is required for our API's autoplay to work.
    setAutoplay(mediaElement, this._settings.autoPlay, cancelSignal);

    const { statusRef: drmInitRef } = initializeContentDecryption(
      mediaElement,
      keySystems,
      {
        onError: (err) => this._onFatalError(err),
        onWarning: (err: IPlayerError) => this.trigger("warning", err),
        onBlackListProtectionData: noop,
        onKeyIdsCompatibilityUpdate: noop,
      },
      cancelSignal,
    );

    /** Translate errors coming from the media element into RxPlayer errors. */
    listenToMediaError(
      mediaElement,
      (error: MediaError) => this._onFatalError(error),
      cancelSignal,
    );

    /**
     * Class trying to avoid various stalling situations, emitting "stalled"
     * events when it cannot, as well as "unstalled" events when it get out of one.
     */
    const rebufferingController = new RebufferingController(
      mediaElementMonitor,
      null,
      speed,
    );
    rebufferingController.addEventListener("stalled", (evt) =>
      this.trigger("stalled", evt),
    );
    rebufferingController.addEventListener("unstalled", () =>
      this.trigger("unstalled", null),
    );
    rebufferingController.addEventListener("warning", (err) =>
      this.trigger("warning", err),
    );
    cancelSignal.register((err) => {
      rebufferingController.destroy(err.reason);
    });
    rebufferingController.start();

    drmInitRef.onUpdate(
      (evt, stopListeningToDrmUpdates) => {
        if (evt.initializationState.type === "uninitialized") {
          return; // nothing done yet
        }
        stopListeningToDrmUpdates();

        // Start everything! (Just put the URL in the element's src).
        log.info("Init", "Setting URL to HTMLMediaElement", { url });
        mediaElement.src = url;
        cancelSignal.register(() => {
          log.info("Init", "Removing directfile src from media element", {
            src: mediaElement.src,
          });
          clearElementSrc(mediaElement);
        });

        if (evt.initializationState.type === "awaiting-media-link") {
          evt.initializationState.value.isMediaLinked.setValue(true);
          drmInitRef.onUpdate(
            (newDrmStatus, stopListeningToDrmUpdatesAgain) => {
              if (newDrmStatus.initializationState.type === "initialized") {
                stopListeningToDrmUpdatesAgain();
                this._seekAndPlay(mediaElement, mediaElementMonitor);
              }
            },
            { emitCurrentValue: true, clearSignal: cancelSignal },
          );
        } else {
          assert(evt.initializationState.type === "initialized");
          this._seekAndPlay(mediaElement, mediaElementMonitor);
        }
      },
      { emitCurrentValue: true, clearSignal: cancelSignal },
    );
  }

  /**
   * Update URL this `ContentIntializer` depends on.
   * @param {Array.<string>|undefined} _urls
   * @param {boolean} _refreshNow
   */
  public updateContentUrls(_urls: string[] | undefined, _refreshNow: boolean): void {
    throw new Error("Cannot update content URL of directfile contents");
  }

  /**
   * Stop content and free all resources linked to this `ContentIntializer`.
   * @param {string | undefined} reason - Human-inspectable reason behind the
   * dispose. Used for debugging matters, especially for debug log
   * inspection.
   */
  public dispose(reason: string | undefined): void {
    this._initCanceller.cancel(reason ?? "Directfile Init dispose");
  }

  /**
   * Logic performed when a fatal error was triggered.
   * @param {*} err - The fatal error in question.
   */
  private _onFatalError(err: unknown): void {
    this._initCanceller.cancel("Directfile Init err");
    this.trigger("error", err);
  }

  /**
   * Perform the initial seek (to begin playback at an initially-calculated
   * position based on settings) and auto-play if needed when loaded.
   * @param {HTMLMediaElement} mediaElement
   * @param {Object} mediaElementMonitor
   */
  private _seekAndPlay(
    mediaElement: IMediaElement,
    mediaElementMonitor: IMediaElementMonitor,
  ): void {
    const cancelSignal = this._initCanceller.signal;
    const { autoPlay, startAt } = this._settings;
    const initialTime = () => {
      log.debug("Init", "Calculating initial time");
      const initTime = getDirectFileInitialTime(mediaElement, startAt);
      log.debug("Init", "Initial time calculated", { initialTime: initTime });
      return initTime;
    };
    performInitialSeekAndPlay(
      {
        mediaElement,
        mediaElementMonitor,
        startTime: initialTime,
        mustAutoPlay: autoPlay,
        onWarning: (err) => this.trigger("warning", err),
        isDirectfile: true,
      },
      cancelSignal,
    )
      .autoPlayResult.then(() =>
        getLoadedReference(mediaElementMonitor, true, cancelSignal).onUpdate(
          (isLoaded, stopListening) => {
            if (isLoaded) {
              stopListening();
              this.trigger("loaded", {
                getSegmentSinkMetrics: null,
                getThumbnailData: () =>
                  Promise.reject(
                    new Error("Thumbnail data not available with directfile contents"),
                  ),
              });
            }
          },
          { emitCurrentValue: true, clearSignal: cancelSignal },
        ),
      )
      .catch((err) => {
        if (!cancelSignal.isCancelled()) {
          this._onFatalError(err);
        }
      });
  }
}

/**
 * Set autoplay value on the mediaElement.
 *
 * @param {HTMLElement} mediaElement - The media element whose `autoplay`
 * attribute will be modified.
 * @param {CancellationSignal} cancellationSignal - The signal that, when triggered,
 * restores the `autoplay` attribute to its original value.
 */
export function setAutoplay(
  mediaElement: IMediaElement,
  autoplay: boolean,
  cancellationSignal: CancellationSignal,
) {
  if (!autoplay) {
    // If autoplay option is set to false, don't touch to `autoplay`
    // videoElement attribute.
    return;
  }
  const autoplayPreviousValue = mediaElement.autoplay;
  mediaElement.autoplay = autoplay;
  cancellationSignal.register(() => {
    /**
     * Restore the `autoplay` attribute to its previous value.
     * This ensures that the media element's state is the same as it was before
     * calling `RxPlayer.loadVideo` in the application.
     */
    mediaElement.autoplay = autoplayPreviousValue;
  });
}

/**
 * calculate initial time as a position in seconds.
 * @param {HTMLMediaElement} mediaElement
 * @param {Object|undefined} [startAt]
 * @returns {number}
 */
function getDirectFileInitialTime(
  mediaElement: IMediaElement,
  startAt?: IInitialTimeOptions,
): number | undefined {
  if (isNullOrUndefined(startAt)) {
    return 0;
  }

  if (!isNullOrUndefined(startAt.position)) {
    return startAt.position;
  } else if (!isNullOrUndefined(startAt.wallClockTime)) {
    return startAt.wallClockTime;
  } else if (!isNullOrUndefined(startAt.fromFirstPosition)) {
    return startAt.fromFirstPosition;
  }

  const duration = mediaElement.duration;
  if (typeof startAt.fromLastPosition === "number") {
    if (!isNullOrUndefined(duration) && isFinite(duration)) {
      return Math.max(0, duration + startAt.fromLastPosition);
    }

    if (mediaElement.seekable.length > 0) {
      const lastSegmentEnd = mediaElement.seekable.end(mediaElement.seekable.length - 1);
      if (isFinite(lastSegmentEnd)) {
        return Math.max(0, lastSegmentEnd + startAt.fromLastPosition);
      }
    }
    log.warn(
      "Init",
      "startAt.fromLastPosition set but duration is not known, " +
        "it may be too soon to seek",
    );
    return undefined;
  } else if (typeof startAt.fromLivePosition === "number") {
    const livePosition =
      mediaElement.seekable.length > 0 ? mediaElement.seekable.end(0) : duration;
    if (isNullOrUndefined(livePosition)) {
      log.warn(
        "Init",
        "startAt.fromLivePosition set but live position is not known, " +
          "beginning at 0.",
      );
      return 0;
    }
    return Math.max(0, livePosition + startAt.fromLivePosition);
  } else if (!isNullOrUndefined(startAt.percentage)) {
    if (isNullOrUndefined(duration) || !isFinite(duration)) {
      log.warn(
        "Init",
        "startAt.percentage set but duration is not known, " + "beginning at 0.",
      );
      return 0;
    }
    const { percentage } = startAt;
    if (percentage >= 100) {
      return duration;
    } else if (percentage <= 0) {
      return 0;
    }
    const ratio = +percentage / 100;
    return duration * ratio;
  }

  return 0;
}

/** Options used by the `DirectFileContentInitializer` */
export interface IDirectFileOptions {
  /** If `true` we will play right after the content is considered "loaded". */
  autoPlay: boolean;
  /**
   * Encryption-related settings. Can be left as an empty array if the content
   * isn't encrypted.
   */
  keySystems: IKeySystemOption[];
  /** Communicate the playback rate wanted by the user. */
  speed: IReadOnlySharedReference<number>;
  /** Optional initial position to start at. */
  startAt?: IInitialTimeOptions | undefined;
  /** URL that should be played. */
  url: string;
}
