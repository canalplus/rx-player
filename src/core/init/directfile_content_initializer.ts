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

import { clearElementSrc } from "../../compat";
import { MediaError } from "../../errors";
import log from "../../log";
import {
  IKeySystemOption,
  IPlayerError,
} from "../../public_types";
import createSharedReference, {
  IReadOnlySharedReference,
} from "../../utils/reference";
import TaskCanceller from "../../utils/task_canceller";
import { PlaybackObserver } from "../api";
import { ContentInitializer } from "./types";
import { IInitialTimeOptions } from "./utils/get_initial_time";
import getLoadedReference from "./utils/get_loaded_reference";
import performInitialSeekAndPlay from "./utils/initial_seek_and_play";
import initializeContentDecryption from "./utils/initialize_content_decryption";
import RebufferingController from "./utils/rebuffering_controller";
import listenToMediaError from "./utils/throw_on_media_error";

export default class DirectFileContentInitializer extends ContentInitializer {
  private _settings : IDirectFileOptions;
  private _initCanceller : TaskCanceller;

  constructor(settings : IDirectFileOptions) {
    super();
    this._settings = settings;
    this._initCanceller = new TaskCanceller();
  }

  public prepare(): void {
    return; // Directfile contents do not have any preparation
  }

  public start(
    mediaElement : HTMLMediaElement,
    playbackObserver : PlaybackObserver
  ): void {
    const cancelSignal = this._initCanceller.signal;
    const { keySystems, speed, url } = this._settings;

    clearElementSrc(mediaElement);

    if (url == null) {
      throw new Error("No URL for a DirectFile content");
    }

    const decryptionRef = createSharedReference(null);
    decryptionRef.finish();
    const drmInitRef =
      initializeContentDecryption(mediaElement, keySystems, decryptionRef, {
        onError: (err) =>  this._onFatalError(err),
        onWarning: (err : IPlayerError) => this.trigger("warning", err),
      }, cancelSignal);

    /** Translate errors coming from the media element into RxPlayer errors. */
    listenToMediaError(mediaElement,
                       (error : MediaError) => this._onFatalError(error),
                       cancelSignal);

    /**
     * Class trying to avoid various stalling situations, emitting "stalled"
     * events when it cannot, as well as "unstalled" events when it get out of one.
     */
    const rebufferingController = new RebufferingController(playbackObserver,
                                                            null,
                                                            null,
                                                            speed);
    rebufferingController.addEventListener("stalled", (evt) =>
      this.trigger("stalled", evt));
    rebufferingController.addEventListener("unstalled", () =>
      this.trigger("unstalled", null));
    rebufferingController.addEventListener("warning", (err) =>
      this.trigger("warning", err));
    cancelSignal.register(() => {
      rebufferingController.destroy();
    });
    rebufferingController.start();

    drmInitRef.onUpdate((evt, stopListeningToDrmUpdates) => {
      if (evt.initializationState.type === "uninitialized") {
        return;
      }
      stopListeningToDrmUpdates();

      // Start everything! (Just put the URL in the element's src).
      log.info("Setting URL to HTMLMediaElement", url);
      mediaElement.src = url;
      cancelSignal.register(() => {
        clearElementSrc(mediaElement);
      });
      if (evt.initializationState.type === "awaiting-media-link") {
        evt.initializationState.value.isMediaLinked.setValue(true);
        drmInitRef.onUpdate((newDrmStatus, stopListeningToDrmUpdatesAgain) => {
          if (newDrmStatus.initializationState.type === "initialized") {
            stopListeningToDrmUpdatesAgain();
            this._seekAndPlay(mediaElement, playbackObserver);
            return;
          }
        }, { emitCurrentValue: true, clearSignal: cancelSignal });
      } else {
        this._seekAndPlay(mediaElement, playbackObserver);
        return;
      }
    }, { emitCurrentValue: true, clearSignal: cancelSignal });
  }

  public updateContentUrls(_urls : string[] | undefined, _refreshNow : boolean) : void {
    throw new Error("Cannot update content URL of directfile contents");
  }

  public dispose(): void {
    this._initCanceller.cancel();
  }

  private _onFatalError(err : unknown) {
    this._initCanceller.cancel();
    this.trigger("error", err);
  }

  private _seekAndPlay(
    mediaElement : HTMLMediaElement,
    playbackObserver : PlaybackObserver
  ) {
    const cancelSignal = this._initCanceller.signal;
    const { autoPlay, startAt } = this._settings;
    const initialTime = () => {
      log.debug("Init: Calculating initial time");
      const initTime = getDirectFileInitialTime(mediaElement, startAt);
      log.debug("Init: Initial time calculated:", initTime);
      return initTime;
    };
    performInitialSeekAndPlay(
      mediaElement,
      playbackObserver,
      initialTime,
      autoPlay,
      (err) => this.trigger("warning", err),
      cancelSignal
    ).autoPlayResult
      .then(() =>
        getLoadedReference(playbackObserver, mediaElement, true, cancelSignal)
          .onUpdate((isLoaded, stopListening) => {
            if (isLoaded) {
              stopListening();
              this.trigger("loaded", { segmentBuffersStore: null });
            }
          }, { emitCurrentValue: true, clearSignal: cancelSignal }))
      .catch((err) => {
        if (!cancelSignal.isCancelled()) {
          this._onFatalError(err);
        }
      });
  }
}

/**
 * calculate initial time as a position in seconds.
 * @param {HTMLMediaElement} mediaElement
 * @param {Object|undefined} startAt
 * @returns {number}
 */
function getDirectFileInitialTime(
  mediaElement : HTMLMediaElement,
  startAt? : IInitialTimeOptions
) : number {
  if (startAt == null) {
    return 0;
  }

  if (startAt.position != null) {
    return startAt.position;
  } else if (startAt.wallClockTime != null) {
    return startAt.wallClockTime;
  } else if (startAt.fromFirstPosition != null) {
    return startAt.fromFirstPosition;
  }

  const duration = mediaElement.duration;
  if (duration == null || !isFinite(duration)) {
    log.warn("startAt.fromLastPosition set but no known duration, " +
             "beginning at 0.");
    return 0;
  }

  if (typeof startAt.fromLastPosition === "number") {
    return Math.max(0, duration + startAt.fromLastPosition);
  } else if (startAt.percentage != null) {
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

// Argument used by `initializeDirectfileContent`
export interface IDirectFileOptions {
  autoPlay : boolean;
  keySystems : IKeySystemOption[];
  speed : IReadOnlySharedReference<number>;
  startAt? : IInitialTimeOptions | undefined;
  url? : string | undefined;
}
