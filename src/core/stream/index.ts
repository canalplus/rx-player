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

import objectAssign from "object-assign";
import {
  combineLatest as observableCombineLatest,
  concat as observableConcat,
  merge as observableMerge,
  Observable,
  of as observableOf,
  Subject,
} from "rxjs";
import {
  map,
  mergeMap,
} from "rxjs/operators";
import config from "../../config";
import { ICustomError } from "../../errors";
import log from "../../log";
import {
  ISupplementaryImageTrack,
  ISupplementaryTextTrack,
} from "../../manifest";
import { ITransportPipelines } from "../../net";
import throttle from "../../utils/rx-throttle";
import ABRManager, {
  IABRMetric,
  IABRRequest,
} from "../abr";
import { IKeySystemOption } from "../eme/types";
import {
  createManifestPipeline,
  IPipelineOptions,
  SegmentPipelinesManager,
} from "../pipelines";
import {
  IBufferType,
  ITextTrackSourceBufferOptions,
} from "../source_buffers";
import createEMEManager, {
  IEMEManagerEvent,
} from "./create_eme_manager";
import openMediaSource from "./create_media_source";
import EVENTS from "./events_generators";
import getInitialTime, {
  IInitialTimeOptions,
} from "./get_initial_time";
import loadStreamOnMediaSource, {
  ILoadStreamEvent,
} from "./load_stream_on_media_source";
import createMediaErrorManager from "./media_error_manager";
import {
  IManifestReadyEvent,
  IStreamClockTick,
  IStreamWarningEvent,
} from "./types";

/**
 * Returns pipeline options based on the global config and the user config.
 * @param {Object} networkConfig
 * @returns {Object}
 */
function getManifestPipelineOptions(
  networkConfig: {
    manifestRetry? : number;
    offlineRetry? : number;
  }
) : IPipelineOptions<any, any> {
  return {
    maxRetry: networkConfig.manifestRetry != null ?
      networkConfig.manifestRetry : config.DEFAULT_MAX_MANIFEST_REQUEST_RETRY,
    maxRetryOffline: networkConfig.offlineRetry != null ?
      networkConfig.offlineRetry : config.DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR,
  };
}

// Arguments to give to the Stream
export interface IStreamOptions {
  adaptiveOptions: {
    initialBitrates : Partial<Record<IBufferType, number>>;
    manualBitrates : Partial<Record<IBufferType, number>>;
    maxAutoBitrates : Partial<Record<IBufferType, number>>;
    throttle : Partial<Record<IBufferType, Observable<number>>>;
    limitWidth : Partial<Record<IBufferType, Observable<number>>>;
  };
  autoPlay : boolean;
  bufferOptions : {
    wantedBufferAhead$ : Observable<number>;
    maxBufferAhead$ : Observable<number>;
    maxBufferBehind$ : Observable<number>;
  };
  clock$ : Observable<IStreamClockTick>;
  keySystems : IKeySystemOption[];
  networkConfig: {
    manifestRetry? : number;
    offlineRetry? : number;
    segmentRetry? : number;
  };
  speed$ : Observable<number>;
  startAt? : IInitialTimeOptions;
  supplementaryImageTracks : ISupplementaryImageTrack[];
  supplementaryTextTracks : ISupplementaryTextTrack[];
  textTrackOptions : ITextTrackSourceBufferOptions;
  transport : ITransportPipelines;
  url : string;
  videoElement : HTMLMediaElement;
}

// Every events emitted by the stream.
export type IStreamEvent =
  IManifestReadyEvent |
  ILoadStreamEvent |
  IEMEManagerEvent |
  IStreamWarningEvent;

/**
 * Central part of the player. Play a given stream described by the given
 * manifest with given options.
 *
 * On subscription:
 *  - Creates the MediaSource and attached sourceBuffers instances.
 *  - download the content's manifest
 *  - Perform EME management if needed
 *  - get Buffers for each active adaptations.
 *  - give choice of the adaptation to the caller (e.g. to choose a language)
 *  - returns Observable emitting notifications about the stream lifecycle.
 * @param {Object} args
 * @returns {Observable}
 */
export default function Stream({
  adaptiveOptions,
  autoPlay,
  bufferOptions,
  clock$,
  keySystems,
  networkConfig,
  speed$,
  startAt,
  supplementaryImageTracks, // eventual manually added images
  supplementaryTextTracks, // eventual manually added subtitles
  textTrackOptions,
  transport,
  url,
  videoElement,
} : IStreamOptions) : Observable<IStreamEvent> {
  // Subject through which warnings will be sent
  const warning$ = new Subject<Error|ICustomError>();

  // Fetch and parse the manifest from the URL given.
  // Throttled to avoid doing multiple simultaneous requests.
  const fetchManifest = throttle(createManifestPipeline(
    transport,
    getManifestPipelineOptions(networkConfig),
    warning$,
    supplementaryTextTracks,
    supplementaryImageTracks
  ));

  // Subject through which network metrics will be sent by the segment
  // pipelines to the ABR manager.
  const network$ = new Subject<IABRMetric>();

  // Subject through which each request progression will be sent by the
  // segment pipelines to the ABR manager.
  const requestsInfos$ = new Subject<Subject<IABRRequest>>();

  // Creates pipelines for downloading segments.
  const segmentPipelinesManager = new SegmentPipelinesManager<any>(
    transport, requestsInfos$, network$, warning$);

  // Create ABR Manager, which will choose the right "Representation" for a
  // given "Adaptation".
  const abrManager = new ABRManager(requestsInfos$, network$, adaptiveOptions);

  // Create EME Manager, an observable which will manage every EME-related
  // issue.
  const emeManager$ = createEMEManager(videoElement, keySystems);

  // Translate errors coming from the video element into RxPlayer errors
  // through a throwing Observable.
  const mediaErrorManager$ = createMediaErrorManager(videoElement);

  // Start the whole Stream.
  const stream$ = observableCombineLatest(
    openMediaSource(videoElement),
    fetchManifest(url)
  ).pipe(mergeMap(([ mediaSource, manifest ]) => {

    log.debug("calculating initial time");
    const initialTime = getInitialTime(manifest, startAt);
    log.debug("initial time calculated:", initialTime);

    return observableConcat(
      observableOf(EVENTS.manifestReady(abrManager, manifest)),
      loadStreamOnMediaSource({ // Behold!
        mediaElement: videoElement,
        mediaSource,
        manifest,
        initialSettings: { time: initialTime, shouldPlay: autoPlay },
        clock$,
        speed$,
        abrManager,
        segmentPipelinesManager,
        refreshManifest: fetchManifest,
        bufferOptions: objectAssign({
          textTrackOptions,
          offlineRetry: networkConfig.offlineRetry,
          segmentRetry: networkConfig.segmentRetry,
        }, bufferOptions),
      })
    );
  }));
  return observableMerge(
    stream$,
    mediaErrorManager$,
    emeManager$,
    warning$.pipe(map(EVENTS.warning))
  );
}
