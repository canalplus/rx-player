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
  BehaviorSubject,
  combineLatest as observableCombineLatest,
  EMPTY,
  merge as observableMerge,
  Observable,
  of as observableOf,
  Subject,
} from "rxjs";
import {
  exhaustMap,
  filter,
  finalize,
  ignoreElements,
  map,
  mapTo,
  mergeMap,
  mergeScan,
  share,
  shareReplay,
  startWith,
  switchMap,
  take,
  takeUntil,
  tap,
} from "rxjs/operators";
import { shouldReloadMediaSourceOnDecipherabilityUpdate } from "../../compat";
import config from "../../config";
import log from "../../log";
import deferSubscriptions from "../../utils/defer_subscriptions";
import { fromEvent } from "../../utils/event_emitter";
import filterMap from "../../utils/filter_map";
import objectAssign from "../../utils/object_assign";
import ABRManager, {
  IABRManagerArguments,
} from "../abr";
import {
  getCurrentKeySystem,
  IContentProtection,
  IEMEManagerEvent,
  IKeySystemOption,
} from "../eme";
import {
  IManifestFetcherParsedResult,
  IManifestFetcherWarningEvent,
  ManifestFetcher,
  SegmentFetcherCreator,
} from "../fetchers";
import { ITextTrackSegmentBufferOptions } from "../segment_buffers";
import createEMEManager, {
  IEMEDisabledEvent,
} from "./create_eme_manager";
import openMediaSource from "./create_media_source";
import EVENTS from "./events_generators";
import getInitialTime, {
  IInitialTimeOptions,
} from "./get_initial_time";
import createMediaSourceLoader from "./load_on_media_source";
import manifestUpdateScheduler, {
  IManifestRefreshSchedulerEvent,
} from "./manifest_update_scheduler";
import throwOnMediaError from "./throw_on_media_error";
import {
  IInitClockTick,
  IInitEvent,
  IMediaSourceLoaderEvent,
} from "./types";

const { OUT_OF_SYNC_MANIFEST_REFRESH_DELAY } = config;

/** Arguments to give to the `InitializeOnMediaSource` function. */
export interface IInitializeArguments {
  /** Options concerning the ABR logic. */
  adaptiveOptions: IABRManagerArguments;
  /** `true` if we should play when loaded. */
  autoPlay : boolean;
  /** Options concerning the media buffers. */
  bufferOptions : {
    /** Buffer "goal" at which we stop downloading new segments. */
    wantedBufferAhead$ : BehaviorSubject<number>;
    /** Max buffer size after the current position, in seconds (we GC further up). */
    maxBufferAhead$ : Observable<number>;
    /** Max buffer size before the current position, in seconds (we GC further down). */
    maxBufferBehind$ : Observable<number>;
    /** Strategy when switching the current bitrate manually (smooth vs reload). */
    manualBitrateSwitchingMode : "seamless" | "direct";
    /**
     * Enable/Disable fastSwitching: allow to replace lower-quality segments by
     * higher-quality ones to have a faster transition.
     */
    enableFastSwitching : boolean;
    /** Strategy when switching of audio track. */
    audioTrackSwitchingMode : "seamless" | "direct";
    /** Behavior when a new video and/or audio codec is encountered. */
    onCodecSwitch : "continue" | "reload";
  };
  /** Regularly emit current playback conditions. */
  clock$ : Observable<IInitClockTick>;
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
  segmentFetcherCreator : SegmentFetcherCreator<any>;
  /** Perform an internal seek */
  setCurrentTime: (time: number) => void;
  /** Emit the playback rate (speed) set by the user. */
  speed$ : Observable<number>;
  /** The configured starting position. */
  startAt? : IInitialTimeOptions;
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
 *   - Perform EME management if needed
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
    clock$,
    keySystems,
    lowLatencyMode,
    manifest$,
    manifestFetcher,
    mediaElement,
    minimumManifestUpdateInterval,
    segmentFetcherCreator,
    setCurrentTime,
    speed$,
    startAt,
    textTrackOptions } : IInitializeArguments
) : Observable<IInitEvent> {
  /** Choose the right "Representation" for a given "Adaptation". */
  const abrManager = new ABRManager(adaptiveOptions);

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

  /** Send content protection data to the `EMEManager`. */
  const protectedSegments$ = new Subject<IContentProtection>();

  /** Create `EMEManager`, an observable which will handle content DRM. */
  const emeManager$ = createEMEManager(mediaElement,
                                       keySystems,
                                       protectedSegments$).pipe(
    // Because multiple Observables here depend on this Observable as a source,
    // we prefer deferring Subscription until those Observables are themselves
    // all subscribed to.
    // This is needed because `emeManager$` might send events synchronously
    // on subscription. In that case, it might communicate those events directly
    // after the first Subscription is done, making the next subscription miss
    // out on those events, even if that second subscription is done
    // synchronously after the first one.
    // By calling `deferSubscriptions`, we ensure that subscription to
    // `emeManager$` effectively starts after a very short delay, thus
    // ensuring that no such race condition can occur.
    deferSubscriptions(),
    share());

  /**
   * Translate errors coming from the media element into RxPlayer errors
   * through a throwing Observable.
   */
  const mediaError$ = throwOnMediaError(mediaElement);

  /**
   * Wait for the MediaKeys to have been created before opening the MediaSource,
   * after that second step is done, ask the EMEManager to attach the MediaKeys.
   * Steps are done in that specific order to avoid compatibility issues.
   *
   * This Observable will emit when ready both the MediaSource and useful
   * DRM-specific information.
   */
  const prepareMediaSource$ = emeManager$.pipe(
    mergeScan((
      acc : {
        /** set to true once EME APIs have been initialized. */
        isEmeReady : boolean;
        /**
         * ID identifying the current MediaKeys' system ID. Can be used to only
         * send initialization data linked to that ID as an optimization measure.
         */
        drmSystemId? : string;
      },
      evt : IEMEManagerEvent | IEMEDisabledEvent
    ) => {
      switch (evt.type) {
        case "eme-disabled":
        case "attached-media-keys":
          return observableOf({ isEmeReady: true,
                                drmSystemId: acc.drmSystemId });
        case "created-media-keys":
          const drmSystemId = evt.value.initializationDataSystemId;
          return openMediaSource$.pipe(
            mergeMap(() => {
              // Now that the MediaSource has been opened and linked to the media
              // element we can attach the MediaKeys instance to the latter.
              evt.value.attachMediaKeys$.next();

              // If the `disableMediaKeysAttachmentLock` option has been set to
              // `true`, we should not wait until the MediaKeys instance has been
              // attached to start loading the content.
              const shouldDisableLock = evt.value.options
                .disableMediaKeysAttachmentLock === true;
              return shouldDisableLock ? observableOf({ isEmeReady: true,
                                                        drmSystemId }) :
                                         EMPTY;
            }),
            startWith({ isEmeReady: false, drmSystemId }));
        default:
          return EMPTY;
      }
    }, { isEmeReady: false, drmSystemId: undefined }),
    filter((emitted) => emitted.isEmeReady),
    take(1),
    exhaustMap(({ drmSystemId }) =>
      openMediaSource$
        .pipe(map((mediaSource) => ({ mediaSource, drmSystemId })))));

  /** Load and play the content asked. */
  const loadContent$ = observableCombineLatest([manifest$,
                                                prepareMediaSource$]).pipe(
    mergeMap(([manifestEvt, mediaSourceInfo]) => {
      if (manifestEvt.type === "warning") {
        return observableOf(manifestEvt);
      }
      const { manifest } = manifestEvt;
      const { mediaSource: initialMediaSource, drmSystemId } = mediaSourceInfo;

      log.debug("Init: Calculating initial time");
      const initialTime = getInitialTime(manifest, lowLatencyMode, startAt);
      log.debug("Init: Initial time calculated:", initialTime);

      const mediaSourceLoader = createMediaSourceLoader({
        abrManager,
        bufferOptions: objectAssign({ textTrackOptions, drmSystemId },
                                    bufferOptions),
        clock$,
        manifest,
        mediaElement,
        segmentFetcherCreator,
        speed$,
        setCurrentTime,
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
          .pipe(mapTo(EVENTS.manifestUpdate())),
        fromEvent(manifest, "decipherabilityUpdate")
          .pipe(map(EVENTS.decipherabilityUpdate)));

      const setUndecipherableRepresentations$ = emeManager$.pipe(
        tap((evt) => {
          if (evt.type === "keys-update") {
            manifest.updateDeciperabilitiesBasedOnKeyIds(evt.value);
          } else if (evt.type === "blacklist-protection-data") {
            log.info("Init: blacklisting Representations based on protection data.");
            manifest.addUndecipherableProtectionData(evt.value);
          }
        }),
        ignoreElements());

      return observableMerge(manifestEvents$,
                             manifestUpdate$,
                             setUndecipherableRepresentations$,
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
                  setCurrentTime(mediaElement.currentTime + 0.001);
                } else {
                  setCurrentTime(position);
                }
                return null;
              case "encryption-data-encountered":
                protectedSegments$.next(evt.value);
                return null;
              case "needs-buffer-flush":
                setCurrentTime(mediaElement.currentTime + 0.001);
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

  return observableMerge(loadContent$, mediaError$, emeManager$);
}
