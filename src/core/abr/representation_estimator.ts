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
  combineLatest as observableCombineLatest,
  defer as observableDefer,
  merge as observableMerge,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  filter,
  ignoreElements,
  map,
  startWith,
  switchMap,
  tap,
  withLatestFrom,
} from "rxjs/operators";
import log from "../../log";
import {
  Adaptation,
  ISegment,
  Representation,
} from "../../manifest";
import { getLeftSizeOfRange } from "../../utils/ranges";
import BandwidthEstimator from "./bandwidth_estimator";
import BufferBasedChooser from "./buffer_based_chooser";
import generateCachedSegmentDetector from "./cached_segment_detector";
import filterByBitrate from "./filter_by_bitrate";
import filterByWidth from "./filter_by_width";
import fromBitrateCeil from "./from_bitrate_ceil";
import NetworkAnalyzer from "./network_analyzer";
import PendingRequestsStore from "./pending_requests_store";
import RepresentationScoreCalculator from "./representation_score_calculator";

// Adaptive BitRate estimate object
export interface IABREstimate {
  bitrate: undefined|number; // If defined, the currently calculated bitrate
  manual: boolean; // True if the representation choice was manually dictated
                   // by the user
  representation: Representation; // The chosen representation
  urgent : boolean; // True if current downloads should be canceled to
                    // download the one of the chosen Representation
                    // immediately
                    // False if we can chose to wait for the current
                    // download(s) to finish before switching.
  knownStableBitrate?: number; // Last "maintanable" bitrate
}

export interface IRepresentationEstimatorClockTick {
  bufferGap : number; // time to the end of the buffer, in seconds
  currentTime : number; // current position, in seconds
  speed : number; // current playback rate
  duration : number; // whole duration of the content
}

interface IABRMetricValue { duration: number;
                            size: number;
                            content: { representation: Representation;
                                       adaptation: Adaptation;
                                       segment: ISegment; }; }

export interface IABRMetric { type : "metrics";
                              value : IABRMetricValue; }

export interface IABRRepresentationChange { type: "representationChange";
                                            value: { representation : Representation |
                                                                      null; }; }

interface IProgressEventValue {
  duration : number; // current duration for the request, in ms
  id: string; // unique ID for the request
  size : number; // current downloaded size, in bytes
  timestamp : number; // timestamp of the progress event since unix epoch, in ms
  totalSize : number; // total size to download, in bytes
}

export type IABRRequest = IProgressRequest |
                          IBeginRequest |
                          IEndRequest;

interface IProgressRequest { type: "progress";
                             value: IProgressEventValue; }

interface IBeginRequest { type: "requestBegin";
                          value: { id: string;
                                   time: number;
                                   duration: number;
                                   requestTimestamp: number; }; }

interface IEndRequest { type: "requestEnd";
                        value: { id: string }; }

export interface IABRFilters { bitrate?: number;
                               width?: number; }

// Event emitted each time a segment is added
interface IBufferEventAddedSegment {
  type : "added-segment";
  value : { buffered : TimeRanges;
            content : { representation : Representation }; };
}

// Buffer events needed by the ABRManager
export type IABRBufferEvents = IBufferEventAddedSegment |
                               IABRMetric |
                               IABRRepresentationChange |
                               IBeginRequest |
                               IProgressRequest |
                               IEndRequest;

export interface IRepresentationEstimatorThrottlers {
  limitWidth$?: Observable<number>; // Emit maximum useful width
  throttle$?: Observable<number>; // Emit temporary bandwidth throttle
  throttleBitrate$?: Observable<number>; // Emit temporary bandwidth throttle
}

export interface IRepresentationEstimatorArguments {
  bandwidthEstimator : BandwidthEstimator; // Calculate bandwidth
  bufferEvents$ : Observable<IABRBufferEvents>; // Emit events from the buffer
  clock$ : Observable<IRepresentationEstimatorClockTick>; // current playback situation
  filters$ : Observable<IABRFilters>; // Filter possible choices
  initialBitrate?: number; // The initial wanted bitrate
  lowLatencyMode: boolean; // Some settings can depend on wether you're playing a
                           // low-latency content. Set it to `true` if you're playing
                           // such content.
  manualBitrate$ : Observable<number>; // Force bitrate to a given value
  maxAutoBitrate$ : Observable<number>; // Set a maximum value for the
                                        // adaptative bitrate
  representations : Representation[]; // List of Representations to choose from
}

/**
 * Filter representations given through filters options.
 * @param {Array.<Representation>} representations
 * @param {Object} filters - Filter Object.
 * _Can_ contain each of the following properties:
 *   - bitrate {Number} - max bitrate authorized (included).
 *   - width {Number} - max width authorized (included).
 * @returns {Array.<Representation>}
 */
function getFilteredRepresentations(
  representations : Representation[],
  filters : IABRFilters
) : Representation[] {
  let _representations = representations;

  if (filters.bitrate != null) {
    _representations = filterByBitrate(_representations, filters.bitrate);
  }

  if (filters.width != null) {
    _representations = filterByWidth(_representations, filters.width);
  }

  return _representations;
}

/**
 * Emit the estimated bitrate and best Representation according to the current
 * network and buffer situation.
 * @param {Object} args
 * @returns {Observable}
 */
export default function RepresentationEstimator({
  bandwidthEstimator,
  bufferEvents$,
  clock$,
  filters$,
  initialBitrate,
  lowLatencyMode,
  manualBitrate$,
  maxAutoBitrate$,
  representations,
} : IRepresentationEstimatorArguments) : Observable<IABREstimate> {
  const scoreCalculator = new RepresentationScoreCalculator();
  const networkAnalyzer = new NetworkAnalyzer(initialBitrate == null ? 0 :
                                                                       initialBitrate,
                                              lowLatencyMode);
  const requestsStore = new PendingRequestsStore();
  const shouldIgnoreMetrics = generateCachedSegmentDetector();

  /**
   * Callback to call when new metrics arrive.
   * @param {Object} value
   */
  function onMetric(value : IABRMetricValue) : void {
    const { duration, size, content } = value;

    if (shouldIgnoreMetrics(content, duration)) {
      // We already loaded not cached segments.
      // Do not consider cached segments anymore.
      return;
    }

    // calculate bandwidth
    bandwidthEstimator.addSample(duration, size);

    // calculate "maintainability score"
    const { segment } = content;
    if (segment.duration == null) {
      return;
    }
    const requestDuration = duration / 1000;
    const segmentDuration = segment.duration / segment.timescale;

    const { representation } = content;
    scoreCalculator.addSample(representation, requestDuration, segmentDuration);
  }

  const metrics$ = bufferEvents$.pipe(
    filter((e) : e is IABRMetric => e.type === "metrics"),
    tap(({ value }) => onMetric(value)),
    ignoreElements());

  const requests$ = bufferEvents$.pipe(
    tap((evt) => {
      switch (evt.type) {
        case "requestBegin":
          requestsStore.add(evt.value);
          break;
        case "requestEnd":
          requestsStore.remove(evt.value.id);
          break;
        case "progress":
          requestsStore.addProgress(evt.value);
          break;
      }
    }),
    ignoreElements());

  const currentRepresentation$ = bufferEvents$.pipe(
    filter((e) : e is IABRRepresentationChange => e.type === "representationChange"),
    map((e) => e.value.representation),
    startWith(null));

  const estimate$ = observableDefer(() => {
    if (representations.length === 0) {
      throw new Error("ABRManager: no representation choice given");
    }

    if (representations.length === 1) {
      return observableOf({ bitrate: undefined,
        representation: representations[0],
        manual: false,
        urgent: true,
        knownStableBitrate: undefined });
    }

    return manualBitrate$.pipe(switchMap(manualBitrate => {
      if (manualBitrate >= 0) {
        // -- MANUAL mode --
        const manualRepresentation = (() => {
          const fromBitrate = fromBitrateCeil(representations,
                                              manualBitrate);
          if (fromBitrate !== undefined) {
            return fromBitrate;
          }
          return representations[0];
        })();
        return observableOf({
          representation: manualRepresentation,
          bitrate: undefined, // Bitrate estimation is deactivated here
          knownStableBitrate: undefined,
          manual: true,
          urgent: true, // a manual bitrate switch should happen immediately
        });
      }

      // -- AUTO mode --
      let lastEstimatedBitrate : number | undefined;
      let forceBandwidthMode = true;

      // Emit each time a buffer-based estimation should be actualized (each
      // time a segment is added).
      const bufferBasedClock$ = bufferEvents$.pipe(
        filter((e) : e is IBufferEventAddedSegment => e.type === "added-segment"),
        withLatestFrom(clock$),
        map(([{ value: evtValue }, { speed, currentTime } ]) => {
          const timeRanges = evtValue.buffered;
          const bufferGap = getLeftSizeOfRange(timeRanges, currentTime);
          const { representation } = evtValue.content;
          const currentScore = scoreCalculator.getEstimate(representation);
          const currentBitrate = representation.bitrate;
          return { bufferGap, currentBitrate, currentScore, speed };
        })
      );

      const bitrates = representations.map(r => r.bitrate);
      const bufferBasedEstimation$ = BufferBasedChooser(bufferBasedClock$, bitrates)
        .pipe(startWith(undefined));

      return observableCombineLatest([ clock$,
                                       maxAutoBitrate$,
                                       filters$,
                                       bufferBasedEstimation$ ]
      ).pipe(
        withLatestFrom(currentRepresentation$),
        map(([ [ clock, maxAutoBitrate, filters, bufferBasedBitrate ],
               currentRepresentation ]
        ) : IABREstimate => {
          const _representations = getFilteredRepresentations(representations,
                                                              filters);
          const requests = requestsStore.getRequests();
          const { bandwidthEstimate, bitrateChosen } = networkAnalyzer
            .getBandwidthEstimate(clock,
                                  bandwidthEstimator,
                                  currentRepresentation,
                                  requests,
                                  lastEstimatedBitrate);

          lastEstimatedBitrate = bandwidthEstimate;

          const stableRepresentation = scoreCalculator.getLastStableRepresentation();
          const knownStableBitrate = stableRepresentation == null ?
            undefined :
            stableRepresentation.bitrate / (clock.speed > 0 ? clock.speed : 1);

          const { bufferGap } = clock;
          if (!forceBandwidthMode && bufferGap <= 5) {
            forceBandwidthMode = true;
          } else if (forceBandwidthMode &&
                     Number.isFinite(bufferGap) && bufferGap > 10)
          {
            forceBandwidthMode = false;
          }

          const chosenRepFromBandwidth = (() => {
            const fromBitrate = fromBitrateCeil(_representations,
                                                Math.min(bitrateChosen,
                                                         maxAutoBitrate));
            if (fromBitrate !== undefined) {
              return fromBitrate;
            }
            if (_representations.length > 0) {
              return  _representations[0];
            }
            return representations[0];
          })();
          if (forceBandwidthMode) {
            log.debug("ABR: Choosing representation with bandwith estimation.",
                      chosenRepFromBandwidth);
            return { bitrate: bandwidthEstimate,
                     representation: chosenRepFromBandwidth,
                     urgent: networkAnalyzer.isUrgent(chosenRepFromBandwidth.bitrate,
                                                      currentRepresentation,
                                                      requests,
                                                      clock),
                     manual: false,
                     knownStableBitrate };
          }
          if (bufferBasedBitrate == null ||
              chosenRepFromBandwidth.bitrate >= bufferBasedBitrate)
          {
            log.debug("ABR: Choosing representation with bandwith estimation.",
                      chosenRepFromBandwidth);
            return { bitrate: bandwidthEstimate,
                     representation: chosenRepFromBandwidth,
                     urgent: networkAnalyzer.isUrgent(chosenRepFromBandwidth.bitrate,
                                                      currentRepresentation,
                                                      requests,
                                                      clock),
                     manual: false,
                     knownStableBitrate, };
          }
          const limitedBitrate = Math.min(bufferBasedBitrate, maxAutoBitrate);
          const chosenRepresentation = (() => {
            const fromBitrate = fromBitrateCeil(_representations, limitedBitrate);
            if (fromBitrate !== undefined) {
              return fromBitrate;
            }
            if (_representations.length > 0) {
              return  _representations[0];
            }
            return representations[0];
          })();
          if (bufferBasedBitrate <= maxAutoBitrate) {
            log.debug("ABR: Choosing representation with buffer based bitrate ceiling.",
                      chosenRepresentation);
          }
          return { bitrate: bandwidthEstimate,
                   representation: chosenRepresentation,
                   urgent: networkAnalyzer.isUrgent(bufferBasedBitrate,
                                                    currentRepresentation,
                                                    requests,
                                                    clock),
                   manual: false,
                   knownStableBitrate, };
        })
      );
    }));
  });

  return observableMerge(metrics$, requests$, estimate$);
}
