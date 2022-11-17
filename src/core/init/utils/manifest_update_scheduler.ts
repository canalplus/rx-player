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

import config from "../../../config";
import log from "../../../log";
import Manifest from "../../../manifest";
import { IPlayerError } from "../../../public_types";
import noop from "../../../utils/noop";
import TaskCanceller from "../../../utils/task_canceller";
import { ManifestFetcher } from "../../fetchers";

/**
 * Refresh the Manifest at the right time.
 * @param {Object} lastManifestResponse - Information about the last loading
 * operation of the manifest.
 * @param {Object} manifestFetcher - Interface allowing to refresh the Manifest.
 * @param {number} minimumManifestUpdateInterval - Minimum interval to keep
 * between Manifest updates.
 * @param {Function} onWarning - Callback called when a minor error occurs.
 * @param {Function} onError - Callback called when a major error occured,
 * leading to a complete stop of Manifest refresh.
 * @returns {Object} - Manifest Update Scheduler Interface allowing to manually
 * schedule Manifest refresh and to stop them at any time.
 */
export default function createManifestUpdateScheduler(
  lastManifestResponse : { manifest : Manifest;
                           sendingTime? : number | undefined;
                           receivedTime? : number | undefined;
                           parsingTime? : number | undefined; },
  manifestFetcher : ManifestFetcher,
  minimumManifestUpdateInterval : number,
  onWarning : (err : IPlayerError) => void,
  onError : (err : unknown) => void
) : IManifestUpdateScheduler {
  /**
   * `TaskCanceller` allowing to cancel the refresh operation from ever
   * happening.
   * Used to dispose of this `IManifestUpdateScheduler`.
   */
  const canceller = new TaskCanceller();

  /** Function used to manually schedule a Manifest refresh. */
  let scheduleManualRefresh : (settings : IManifestRefreshSettings) => void = noop;

  /**
   * Set to `true` when a Manifest refresh is currently pending.
   * Allows to avoid doing multiple concurrent Manifest refresh, as this is
   * most of the time unnecessary.
   */
  let isRefreshAlreadyPending = false;

  // The Manifest always keeps the same reference
  const { manifest } = lastManifestResponse;

  /** Number of consecutive times the parsing has been done in `unsafeMode`. */
  let consecutiveUnsafeMode = 0;

  /* Start-up the logic now. */
  recursivelyRefreshManifest(lastManifestResponse);

  return {
    forceRefresh(settings : IManifestRefreshSettings) : void {
      scheduleManualRefresh(settings);
    },
    stop() : void {
      scheduleManualRefresh = noop;
      canceller.cancel();
    },
  };

  /**
   * Performs Manifest refresh (recursively) when it judges it is time to do so.
   * @param {Object} manifestRequestInfos - Various information linked to the
   * last Manifest loading and parsing operations.
   */
  function recursivelyRefreshManifest(
    { sendingTime, parsingTime, updatingTime } : { sendingTime?: number | undefined;
                                                   parsingTime? : number | undefined;
                                                   updatingTime? : number | undefined; }
  ) : void {
    const { MAX_CONSECUTIVE_MANIFEST_PARSING_IN_UNSAFE_MODE,
            MIN_MANIFEST_PARSING_TIME_TO_ENTER_UNSAFE_MODE } = config.getCurrent();

    /**
     * Total time taken to fully update the last Manifest, in milliseconds.
     * Note: this time also includes possible requests done by the parsers.
     */
    const totalUpdateTime = parsingTime !== undefined ?
      parsingTime + (updatingTime ?? 0) :
      undefined;

    /**
     * "unsafeMode" is a mode where we unlock advanced Manifest parsing
     * optimizations with the added risk to lose some information.
     * `unsafeModeEnabled` is set to `true` when the `unsafeMode` is enabled.
     *
     * Only perform parsing in `unsafeMode` when the last full parsing took a
     * lot of time and do not go higher than the maximum consecutive time.
     */

    const unsafeModeEnabled = consecutiveUnsafeMode > 0 ?
      consecutiveUnsafeMode < MAX_CONSECUTIVE_MANIFEST_PARSING_IN_UNSAFE_MODE :
      totalUpdateTime !== undefined ?
        (totalUpdateTime >= MIN_MANIFEST_PARSING_TIME_TO_ENTER_UNSAFE_MODE) :
        false;

    /** Time elapsed since the beginning of the Manifest request, in milliseconds. */
    const timeSinceRequest = sendingTime === undefined ? 0 :
                                                         performance.now() - sendingTime;

    /** Minimum update delay we should not go below, in milliseconds. */
    const minInterval = Math.max(minimumManifestUpdateInterval - timeSinceRequest, 0);

    /**
     * Multiple refresh trigger are scheduled here, but only the first one should
     * be effectively considered.
     * `nextRefreshCanceller` will allow to cancel every other when one is triggered.
     */
    const nextRefreshCanceller = new TaskCanceller({ cancelOn: canceller.signal });

    /* Function to manually schedule a Manifest refresh */
    scheduleManualRefresh = (settings : IManifestRefreshSettings) => {
      const { completeRefresh, delay, canUseUnsafeMode } = settings;
      const unsafeMode = canUseUnsafeMode && unsafeModeEnabled;
      // The value allows to set a delay relatively to the last Manifest refresh
      // (to avoid asking for it too often).
      const timeSinceLastRefresh = sendingTime === undefined ?
                                     0 :
                                     performance.now() - sendingTime;
      const _minInterval = Math.max(minimumManifestUpdateInterval - timeSinceLastRefresh,
                                    0);
      const timeoutId = setTimeout(() => {
        nextRefreshCanceller.cancel();
        triggerNextManifestRefresh({ completeRefresh, unsafeMode });
      }, Math.max((delay ?? 0) - timeSinceLastRefresh, _minInterval));
      nextRefreshCanceller.signal.register(() => {
        clearTimeout(timeoutId);
      });
    };

    /* Handle Manifest expiration. */
    if (manifest.expired !== null) {
      const timeoutId = setTimeout(() => {
        manifest.expired?.then(() => {
          nextRefreshCanceller.cancel();
          triggerNextManifestRefresh({ completeRefresh: true,
                                       unsafeMode: unsafeModeEnabled });
        }, noop /* `expired` should not reject */);
      }, minInterval);
      nextRefreshCanceller.signal.register(() => {
        clearTimeout(timeoutId);
      });
    }

    /*
     * Trigger Manifest refresh when the Manifest needs to be refreshed
     * according to the Manifest's internal properties (parsing time is also
     * taken into account in this operation to avoid refreshing too often).
     */
    if (manifest.lifetime !== undefined && manifest.lifetime >= 0) {
      /** Regular refresh delay as asked by the Manifest. */
      const regularRefreshDelay = manifest.lifetime * 1000 - timeSinceRequest;

      /** Actually choosen delay to refresh the Manifest. */
      let actualRefreshInterval : number;

      if (totalUpdateTime === undefined) {
        actualRefreshInterval = regularRefreshDelay;
      } else if (manifest.lifetime < 3 && totalUpdateTime >= 100) {
        // If Manifest update is very frequent and we take time to update it,
        // postpone it.
        actualRefreshInterval = Math.min(
          Math.max(
            // Take 3 seconds as a default safe value for a base interval.
            3000 - timeSinceRequest,
            // Add update time to the original interval.
            Math.max(regularRefreshDelay, 0) + totalUpdateTime
          ),

          // Limit the postponment's higher bound to a very high value relative
          // to `regularRefreshDelay`.
          // This avoid perpetually postponing a Manifest update when
          // performance seems to have been abysmal one time.
          regularRefreshDelay * 6
        );
        log.info("MUS: Manifest update rythm is too frequent. Postponing next request.",
                 regularRefreshDelay,
                 actualRefreshInterval);
      } else if (totalUpdateTime >= (manifest.lifetime * 1000) / 10) {
        // If Manifest updating time is very long relative to its lifetime,
        // postpone it:
        actualRefreshInterval = Math.min(
          // Just add the update time to the original waiting time
          Math.max(regularRefreshDelay, 0) + totalUpdateTime,

          // Limit the postponment's higher bound to a very high value relative
          // to `regularRefreshDelay`.
          // This avoid perpetually postponing a Manifest update when
          // performance seems to have been abysmal one time.
          regularRefreshDelay * 6);
        log.info("MUS: Manifest took too long to parse. Postponing next request",
                 actualRefreshInterval,
                 actualRefreshInterval);
      } else {
        actualRefreshInterval = regularRefreshDelay;
      }
      const timeoutId = setTimeout(() => {
        nextRefreshCanceller.cancel();
        triggerNextManifestRefresh({ completeRefresh: false,
                                     unsafeMode: unsafeModeEnabled });
      }, Math.max(actualRefreshInterval, minInterval));
      nextRefreshCanceller.signal.register(() => {
        clearTimeout(timeoutId);
      });
    }
  }

  /**
   * Refresh the Manifest, performing a full update if a partial update failed.
   * Also re-call `recursivelyRefreshManifest` to schedule the next refresh
   * trigger.
   * @param {Object} refreshInformation
   */
  function triggerNextManifestRefresh(
    { completeRefresh,
      unsafeMode } : { completeRefresh : boolean;
                       unsafeMode : boolean; }
  ) {
    const manifestUpdateUrl = manifest.updateUrl;
    const fullRefresh = completeRefresh || manifestUpdateUrl === undefined;
    const refreshURL = fullRefresh ? manifest.getUrl() :
                                     manifestUpdateUrl;
    const externalClockOffset = manifest.clockOffset;

    if (unsafeMode) {
      consecutiveUnsafeMode += 1;
      log.info("Init: Refreshing the Manifest in \"unsafeMode\" for the " +
               String(consecutiveUnsafeMode) + " consecutive time.");
    } else if (consecutiveUnsafeMode > 0) {
      log.info("Init: Not parsing the Manifest in \"unsafeMode\" anymore after " +
               String(consecutiveUnsafeMode) + " consecutive times.");
      consecutiveUnsafeMode = 0;
    }

    if (isRefreshAlreadyPending) {
      return;
    }
    isRefreshAlreadyPending = true;
    manifestFetcher.fetch(refreshURL, onWarning, canceller.signal)
      .then(res => res.parse({ externalClockOffset,
                               previousManifest: manifest,
                               unsafeMode }))
      .then(res => {
        isRefreshAlreadyPending = false;
        const { manifest: newManifest,
                sendingTime: newSendingTime,
                parsingTime } = res;
        const updateTimeStart = performance.now();

        if (fullRefresh) {
          manifest.replace(newManifest);
        } else {
          try {
            manifest.update(newManifest);
          } catch (e) {
            const message = e instanceof Error ? e.message :
                                                 "unknown error";
            log.warn(`MUS: Attempt to update Manifest failed: ${message}`,
                     "Re-downloading the Manifest fully");
            const { FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY } = config.getCurrent();

            // The value allows to set a delay relatively to the last Manifest refresh
            // (to avoid asking for it too often).
            const timeSinceLastRefresh = newSendingTime === undefined ?
                                           0 :
                                           performance.now() - newSendingTime;
            const _minInterval = Math.max(minimumManifestUpdateInterval -
                                            timeSinceLastRefresh,
                                          0);
            let unregisterCanceller = noop;
            const timeoutId = setTimeout(() => {
              unregisterCanceller();
              triggerNextManifestRefresh({ completeRefresh: true, unsafeMode: false });
            }, Math.max(FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY -
                          timeSinceLastRefresh,
                        _minInterval));
            unregisterCanceller = canceller.signal.register(() => {
              clearTimeout(timeoutId);
            });
            return;
          }
        }
        const updatingTime = performance.now() - updateTimeStart;
        recursivelyRefreshManifest({ sendingTime: newSendingTime,
                                     parsingTime,
                                     updatingTime });
      })
      .catch((err) => {
        isRefreshAlreadyPending = false;
        onError(err);
      });
  }
}

export interface IManifestRefreshSettings {
  /**
   * if `true`, the Manifest should be fully updated.
   * if `false`, a shorter version with just the added information can be loaded
   * instead.
   */
  completeRefresh : boolean;
  /**
   * Optional wanted refresh delay, which is the minimum time you want to wait
   * before updating the Manifest
   */
  delay? : number | undefined;
  /**
   * Whether the parsing can be done in the more efficient "unsafeMode".
   * This mode is extremely fast but can lead to de-synchronisation with the
   * server.
   */
  canUseUnsafeMode : boolean;
}

export interface IManifestUpdateScheduler {
  forceRefresh(settings : IManifestRefreshSettings) : void;
  stop() : void;
}
