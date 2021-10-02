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
  filter,
  finalize,
  ignoreElements,
  map,
  merge as observableMerge,
  mergeMap,
  Observable,
  of as observableOf,
  share,
  shareReplay,
  startWith,
  Subject,
  switchMap,
  take,
  takeUntil,
} from "rxjs";
import { shouldReloadMediaSourceOnDecipherabilityUpdate } from "../../compat";
import config from "../../config";
import log from "../../log";
import { IKeySystemOption } from "../../public_types";
import deferSubscriptions from "../../utils/defer_subscriptions";
import { fromEvent } from "../../utils/event_emitter";
import filterMap from "../../utils/filter_map";
import objectAssign from "../../utils/object_assign";
import { IReadOnlySharedReference } from "../../utils/reference";
import AdaptiveRepresentationSelector, {
  IAdaptiveRepresentationSelectorArguments,
} from "../adaptive";
import { PlaybackObserver } from "../api";
import {
  getCurrentKeySystem,
  IContentProtection,
} from "../decrypt";
import {
  IManifestFetcherParsedResult,
  IManifestFetcherWarningEvent,
  ManifestFetcher,
  SegmentFetcherCreator,
} from "../fetchers";
import { ITextTrackSegmentBufferOptions } from "../segment_buffers";
import openMediaSource from "./create_media_source";
import EVENTS from "./events_generators";
import getInitialTime, {
  IInitialTimeOptions,
} from "./get_initial_time";
import linkDrmAndContent, {
  IDecryptionDisabledEvent,
  IDecryptionReadyEvent,
} from "./link_drm_and_content";
import createMediaSourceLoader from "./load_on_media_source";
import manifestUpdateScheduler, {
  IManifestRefreshSchedulerEvent,
} from "./manifest_update_scheduler";
import throwOnMediaError from "./throw_on_media_error";
import {
  IInitEvent,
  IMediaSourceLoaderEvent,
} from "./types";

// NOTE As of now (RxJS 7.4.0), RxJS defines `ignoreElements` default
// first type parameter as `any` instead of the perfectly fine `unknown`,
// leading to linter issues, as it forbids the usage of `any`.
// This is why we're disabling the eslint rule.
/* eslint-disable @typescript-eslint/no-unsafe-argument */

/** Arguments to give to the `InitializeOnMediaSource` function. */
export interface IInitializeArguments {
  /** Options concerning the ABR logic. */
  adaptiveOptions: IAdaptiveRepresentationSelectorArguments;
  /** `true` if we should play when loaded. */
  autoPlay : boolean;
  /** Options concerning the media buffers. */
  bufferOptions : {
    /** Buffer "goal" at which we stop downloading new segments. */
    wantedBufferAhead : IReadOnlySharedReference<number>;
    /** Buffer maximum size in kiloBytes at which we stop downloading */
    maxVideoBufferSize :  IReadOnlySharedReference<number>;
    /** Max buffer size after the current position, in seconds (we GC further up). */
    maxBufferAhead : IReadOnlySharedReference<number>;
    /** Max buffer size before the current position, in seconds (we GC further down). */
    maxBufferBehind : IReadOnlySharedReference<number>;
    /** Strategy when switching the current bitrate manually (smooth vs reload). */
    manualBitrateSwitchingMode : "seamless" | "direct";
    /**
     * Enable/Disable fastSwitching: allow to replace lower-quality segments by
     * higher-quality ones to have a faster transition.
     */
    enableFastSwitching : boolean;
    /** Behavior when a new video and/or audio codec is encountered. */
    onCodecSwitch : "continue" | "reload";
  };
  /** Regularly emit current playback conditions. */
  playbackObserver : PlaybackObserver;
  /** Every encryption configuration set. */
  keySystems : IKeySystemOption[];
  /** `true` to play low-latency contents optimally. */
  lowLatencyMode : boolean;
  /** Initial Manifest value. */
  manifest$ : Observable<IManifestFetcherWarningEvent |
                         IManifestFetcherParsedResult>;
  /** Interface allowing to load and refresh the Manifest */
  manifestFetcher : ManifestFetcher;
/** The HTMLMediaElement on which we will play. */
  mediaElement : HTMLMediaElement;
  /** Limit the frequency of Manifest updates. */
  minimumManifestUpdateInterval : number;
  /** Interface allowing to load segments */
  segmentFetcherCreator : SegmentFetcherCreator;
  /** Emit the playback rate (speed) set by the user. */
  speed : IReadOnlySharedReference<number>;
  /** The configured starting position. */
  startAt? : IInitialTimeOptions | undefined;
  /** Configuration specific to the text track. */
  textTrackOptions : ITextTrackSegmentBufferOptions;
}

/**
 * Begin content playback.
 *
 * Returns an Observable emitting notifications about the content lifecycle.
 * On subscription, it will perform every necessary tasks so the content can
 * play. Among them:
 *
 *   - Creates a MediaSource on the given `mediaElement` and attach to it the
 *     necessary SourceBuffer instances.
 *
 *   - download the content's Manifest and handle its refresh logic
 *
 *   - Perform decryption if needed
 *
 *   - ask for the choice of the wanted Adaptation through events (e.g. to
 *     choose a language)
 *
 *   - requests and push the right segments (according to the Adaptation choice,
 *     the current position, the network conditions etc.)
 *
 * This Observable will throw in the case where a fatal error (i.e. which has
 * stopped content playback) is encountered, with the corresponding error as a
 * payload.
 *
 * This Observable will never complete, it will always run until it is
 * unsubscribed from.
 * Unsubscription will stop playback and reset the corresponding state.
 *
 * @param {Object} args
 * @returns {Observable}
 */
export default function InitializeOnMediaSource(
  { adaptiveOptions,
    autoPlay,
    bufferOptions,
    keySystems,
    lowLatencyMode,
    manifest$,
    manifestFetcher,
    mediaElement,
    minimumManifestUpdateInterval,
    playbackObserver,
    segmentFetcherCreator,
    speed,
    startAt,
    textTrackOptions } : IInitializeArguments
) : Observable<IInitEvent> {
  /** Choose the right "Representation" for a given "Adaptation". */
  const representationEstimator = AdaptiveRepresentationSelector(adaptiveOptions);

  /**
   * Create and open a new MediaSource object on the given media element on
   * subscription.
   * Multiple concurrent subscriptions on this Observable will obtain the same
   * created MediaSource.
   * The MediaSource will be closed when subscriptions are down to 0.
   */
  const openMediaSource$ = openMediaSource(mediaElement).pipe(
    shareReplay({ refCount: true })
  );

  /** Send content protection initialization data. */
  const protectedSegments$ = new Subject<IContentProtection>();

  /** Initialize decryption capabilities and MediaSource. */
  const drmEvents$ = linkDrmAndContent(mediaElement,
                                       keySystems,
                                       protectedSegments$,
                                       openMediaSource$)
    .pipe(
      // Because multiple Observables here depend on this Observable as a source,
      // we prefer deferring Subscription until those Observables are themselves
      // all subscribed to.
      // This is needed because `drmEvents$` might send events synchronously
      // on subscription. In that case, it might communicate those events directly
      // after the first Subscription is done, making the next subscription miss
      // out on those events, even if that second subscription is done
      // synchronously after the first one.
      // By calling `deferSubscriptions`, we ensure that subscription to
      // `drmEvents$` effectively starts after a very short delay, thus
      // ensuring that no such race condition can occur.
      deferSubscriptions(),
      share());

  /**
   * Translate errors coming from the media element into RxPlayer errors
   * through a throwing Observable.
   */
  const mediaError$ = throwOnMediaError(mediaElement);

  const mediaSourceReady$ = drmEvents$.pipe(
    filter((evt) : evt is IDecryptionReadyEvent<MediaSource> |
                          IDecryptionDisabledEvent<MediaSource> =>
      evt.type === "decryption-ready" || evt.type === "decryption-disabled"),
    map(e => e.value),
    take(1));

  /** Load and play the content asked. */
  const loadContent$ = observableCombineLatest([manifest$, mediaSourceReady$]).pipe(
    mergeMap(([manifestEvt, { drmSystemId, mediaSource: initialMediaSource } ]) => {
      if (manifestEvt.type === "warning") {
        return observableOf(manifestEvt);
      }
      const { manifest } = manifestEvt;

      log.debug("Init: Calculating initial time");
      const initialTime = getInitialTime(manifest, lowLatencyMode, startAt);
      log.debug("Init: Initial time calculated:", initialTime);

      const mediaSourceLoader = createMediaSourceLoader({
        bufferOptions: objectAssign({ textTrackOptions, drmSystemId },
                                    bufferOptions),
        manifest,
        mediaElement,
        playbackObserver,
        representationEstimator,
        segmentFetcherCreator,
        speed,
      });

      // handle initial load and reloads
      const recursiveLoad$ = recursivelyLoadOnMediaSource(initialMediaSource,
                                                          initialTime,
                                                          autoPlay);

      // Emit when we want to manually update the manifest.
      const scheduleRefresh$ = new Subject<IManifestRefreshSchedulerEvent>();

      const manifestUpdate$ = manifestUpdateScheduler({ initialManifest: manifestEvt,
                                                        manifestFetcher,
                                                        minimumManifestUpdateInterval,
                                                        scheduleRefresh$ });

      const manifestEvents$ = observableMerge(
        fromEvent(manifest, "manifestUpdate")
          .pipe(map(() => EVENTS.manifestUpdate())),
        fromEvent(manifest, "decipherabilityUpdate")
          .pipe(map(EVENTS.decipherabilityUpdate)));

      return observableMerge(manifestEvents$,
                             manifestUpdate$,
                             recursiveLoad$)
        .pipe(startWith(EVENTS.manifestReady(manifest)),
              finalize(() => { scheduleRefresh$.complete(); }));

      /**
       * Load the content defined by the Manifest in the mediaSource given at the
       * given position and playing status.
       * This function recursively re-call itself when a MediaSource reload is
       * wanted.
       * @param {MediaSource} mediaSource
       * @param {number} startingPos
       * @param {boolean} shouldPlay
       * @returns {Observable}
       */
      function recursivelyLoadOnMediaSource(
        mediaSource : MediaSource,
        startingPos : number,
        shouldPlay : boolean
      ) : Observable<IInitEvent> {
        const reloadMediaSource$ = new Subject<{ position : number;
                                                 autoPlay : boolean; }>();
        const mediaSourceLoader$ = mediaSourceLoader(mediaSource, startingPos, shouldPlay)
          .pipe(filterMap<IMediaSourceLoaderEvent, IInitEvent, null>((evt) => {
            switch (evt.type) {
              case "needs-manifest-refresh":
                scheduleRefresh$.next({ completeRefresh: false,
                                        canUseUnsafeMode: true });
                return null;
              case "manifest-might-be-out-of-sync":
                const { OUT_OF_SYNC_MANIFEST_REFRESH_DELAY } = config.getCurrent();
                scheduleRefresh$.next({
                  completeRefresh: true,
                  canUseUnsafeMode: false,
                  delay: OUT_OF_SYNC_MANIFEST_REFRESH_DELAY,
                });
                return null;
              case "needs-media-source-reload":
                reloadMediaSource$.next(evt.value);
                return null;
              case "needs-decipherability-flush":
                const keySystem = getCurrentKeySystem(mediaElement);
                if (shouldReloadMediaSourceOnDecipherabilityUpdate(keySystem)) {
                  reloadMediaSource$.next(evt.value);
                  return null;
                }

                // simple seek close to the current position
                // to flush the buffers
                const { position } = evt.value;
                if (position + 0.001 < evt.value.duration) {
                  playbackObserver.setCurrentTime(mediaElement.currentTime + 0.001);
                } else {
                  playbackObserver.setCurrentTime(position);
                }
                return null;
              case "encryption-data-encountered":
                protectedSegments$.next(evt.value);
                return null;
              case "needs-buffer-flush":
                playbackObserver.setCurrentTime(mediaElement.currentTime + 0.001);
                return null;
            }
            return evt;
          }, null));

        const currentLoad$ =
          mediaSourceLoader$.pipe(takeUntil(reloadMediaSource$));

        const handleReloads$ = reloadMediaSource$.pipe(
          switchMap((reloadOrder) => {
            return openMediaSource(mediaElement).pipe(
              mergeMap(newMS => recursivelyLoadOnMediaSource(newMS,
                                                             reloadOrder.position,
                                                             reloadOrder.autoPlay)),
              startWith(EVENTS.reloadingMediaSource())
            );
          }));

        return observableMerge(handleReloads$, currentLoad$);
      }
    }));

  return observableMerge(loadContent$, mediaError$, drmEvents$.pipe(ignoreElements()));
}
