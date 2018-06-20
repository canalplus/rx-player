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

import {
  concat as observableConcat,
  interval as observableInterval,
  merge as observableMerge,
  Observable,
  of as observableOf,
  Subject,
} from "rxjs";
import {
  mapTo,
  startWith,
  switchMapTo,
  takeUntil,
} from "rxjs/operators";
import { events } from "../../../compat";
import config from "../../../config";
import log from "../../../log";
import { IOverlayTrackSegmentData } from "../../../transports/types";
import AbstractSourceBuffer from "../abstract_source_buffer";
import TimedDataBufferManager from "../buffer_manager";
import parseOverlayToElements from "./parsers";

const {
  onEnded$,
  onSeeked$,
  onSeeking$,
} = events;

const {
  MAXIMUM_OVERLAY_TRACK_UPDATE_INTERVAL,
} = config;

/**
 * Generate the clock at which the overlay should be checked for update.
 * @param {HTMLMediaElement} videoElement
 * @returns {Observable}
 */
function generateClock(videoElement : HTMLMediaElement) : Observable<boolean> {
  const seeking$ = onSeeking$(videoElement);
  const seeked$ = onSeeked$(videoElement);
  const ended$ = onEnded$(videoElement);

  const manualRefresh$ = observableMerge(seeked$, ended$);
  const autoRefresh$ = observableInterval(MAXIMUM_OVERLAY_TRACK_UPDATE_INTERVAL)
    .pipe(startWith(null));

  // TODO Better way to express that
  return manualRefresh$.pipe(
    startWith(null),
    switchMapTo(
      observableConcat(
        autoRefresh$.pipe(
          mapTo(true),
          takeUntil(seeking$)
        ),
        observableOf(false)
      )
    )
  );
}

/**
 * @param {Element} element
 * @param {Element|null} [child]
 */
function safelyRemoveChild(element : Element, child : Element|null) {
  if (child) {
    try {
      element.removeChild(child);
    } catch (e) {
      log.warn("Can't remove overlay track: not in the element.");
    }
  }
}

export interface IOverlayBufferElement {
  start : number;
  end : number;
  element : HTMLElement;
}

/**
 * Source buffer to display Overlays in the given HTML element.
 * @class OverlayTrackSourceBuffer
 */
export default class OverlayTrackSourceBuffer
  extends AbstractSourceBuffer<IOverlayTrackSegmentData>
{
  private _videoElement : HTMLMediaElement;
  private _destroy$ : Subject<void>;
  private _overlayTrackElement : HTMLElement;

  private _buffer : TimedDataBufferManager<HTMLElement>;
  private _currentElement : HTMLElement|null;

  /**
   * @param {HTMLMediaElement} videoElement
   * @param {HTMLElement} overlayTrackElement
   */
  constructor(
    videoElement : HTMLMediaElement,
    overlayTrackElement : HTMLElement
  ) {
    log.debug("creating overlay track source buffer");
    super();
    this._videoElement = videoElement;
    this._overlayTrackElement = overlayTrackElement;
    this._destroy$ = new Subject();
    this._buffer = new TimedDataBufferManager<HTMLElement>();
    this._currentElement = null;

    generateClock(this._videoElement).pipe(takeUntil(this._destroy$))
      .subscribe((shouldDisplay) => {
        if (!shouldDisplay) {
          return;
        }

        // to spread the time error, we divide the regular chosen interval.
        // As the clock is also based on real video events, we cannot just
        // divide by two the regular interval.
        const time = Math.max(this._videoElement.currentTime -
          MAXIMUM_OVERLAY_TRACK_UPDATE_INTERVAL / 3000, 0);
        const overlay = this._buffer.get(time);
        if (!overlay) {
          safelyRemoveChild(overlayTrackElement, this._currentElement);
          this._currentElement = null;
          return;
        } else if (this._currentElement === overlay.data) {
          return;
        }
        safelyRemoveChild(overlayTrackElement, this._currentElement);
        this._currentElement = overlay.data;
        overlayTrackElement.appendChild(this._currentElement);
      });
  }

  /**
   * Append overlay data.
   * @param {Object} data
   */
  _append(data : IOverlayTrackSegmentData) : void {
    log.debug("appending new overlay data", data);
    const {
      timescale,
      start: timescaledStart,
      end: timescaledEnd,
      data: overlayData,
      type,
      timeOffset,
    } = data;
    if (timescaledEnd && timescaledEnd - timescaledStart <= 0) {
      // this is accepted for error resilience, just skip that case.
      /* tslint:disable:max-line-length */
      log.warn("Invalid overlay data appended: the start time is inferior or equal to the end time.");
      /* tslint:enable:max-line-length */
      return;
    }

    const startTime = timescaledStart / timescale;
    const endTime = timescaledEnd != null ?
      timescaledEnd / timescale : undefined;

    const overlays = parseOverlayToElements(type, overlayData, timeOffset);
    const start = startTime;
    const end = endTime != null ? endTime : overlays[overlays.length - 1].end;

    // TODO define "element" as "data" from the beginning?
    const formattedData = overlays.map((cue) => ({
      start: cue.start,
      end: cue.end,
      data: cue.element,
    }));
    this._buffer.insert(formattedData, start, end);
    this.buffered.insert(start, end);
  }

  /**
   * @param {Number} from
   * @param {Number} to
   */
  _remove(from : number, to : number) : void {
    log.debug("removing overlay data", from, to);
    this._buffer.remove(from, to);
    this.buffered.remove(from, to);
  }

  /**
   * Free up ressources from this sourceBuffer
   */
  _abort() : void {
    log.debug("aborting overlay source buffer");
    this._destroy$.next();
    this._destroy$.complete();
    safelyRemoveChild(this._overlayTrackElement, this._currentElement);
  }
}
