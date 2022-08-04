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

import config from "../../config";
import { formatError } from "../../errors";
import log from "../../log";
import Manifest from "../../manifest";
import {
  ICdnMetadata,
  IContentSteeringMetadata,
} from "../../parsers/manifest";
import { ISteeringManifest } from "../../parsers/SteeringManifest";
import { IPlayerError } from "../../public_types";
import arrayFindIndex from "../../utils/array_find_index";
import arrayIncludes from "../../utils/array_includes";
import EventEmitter from "../../utils/event_emitter";
import createSharedReference, {
  ISharedReference,
} from "../../utils/reference";
import SyncOrAsync, {
  ISyncOrAsyncValue,
} from "../../utils/sync_or_async";
import TaskCanceller, {
  CancellationError,
  CancellationSignal,
} from "../../utils/task_canceller";
import SteeringManifestFetcher from "../fetchers/steering_manifest";

/**
 * Class signaling the priority between multiple CDN available for any given
 * resource.
 *
 * It might rely behind the hood on a fetched document giving priorities such as
 * a Content Steering Manifest and also on issues that appeared with some given
 * CDN in the [close] past.
 *
 * This class might perform requests and schedule timeouts by itself to keep its
 * internal list of CDN priority up-to-date.
 * When it is not needed anymore, you should call the `dispose` method to clear
 * all resources.
 *
 * @class CdnPrioritizer
 */
export default class CdnPrioritizer extends EventEmitter<ICdnPrioritizerEvents> {
  /**
   * Metadata parsed from the last Content Steering Manifest loaded.
   *
   * `null` either if there's no such Manifest or if it is currently being
   * loaded for the first time.
   */
  private _lastSteeringManifest : ISteeringManifest | null;

  private _defaultCdnId : string | undefined;

  /**
   * Structure keeping a list of CDN currently downgraded.
   * Downgraded CDN immediately have a lower priority than any non-downgraded
   * CDN for a specific amount of time.
   */
  private _downgradedCdnList : {
    /** Metadata of downgraded CDN, in no important order. */
    metadata : ICdnMetadata[];
    /**
     * Timeout ID (to give to `clearTimeout`) of elements in the `metadata`
     * array, for the element at the same index in the `metadata` array.
     *
     * This structure has been writted as an object of two arrays of the same
     * length, instead of an array of objects, to simplify the usage of the
     * `metadata` array which is used considerably more than the `timeouts`
     * array.
     */
    timeouts : number[];
  };

  /**
   * TaskCanceller allowing to abort the process of loading and refreshing the
   * Content Steering Manifest.
   * Set to `null` when no such process is pending.
   */
  private _steeringManifestUpdateCanceller : TaskCanceller | null;

  private _readyState : ISharedReference<"not-ready" | "ready" | "disposed">;

  /**
   * @param {Object} manifest
   * @param {Object|null} steeringManifestFetcher
   * @param {Object} destroySignal
   */
  constructor(
    manifest : Manifest,
    steeringManifestFetcher : SteeringManifestFetcher | null,
    destroySignal : CancellationSignal
  ) {
    super();
    this._lastSteeringManifest = null;
    this._downgradedCdnList = { metadata: [], timeouts: [] };
    this._steeringManifestUpdateCanceller = null;
    this._defaultCdnId = manifest.contentSteering?.defaultId;

    let lastContentSteering = manifest.contentSteering;

    manifest.addEventListener("manifestUpdate", () => {
      const prevContentSteering = lastContentSteering;
      lastContentSteering = manifest.contentSteering;
      if (prevContentSteering === null) {
        if (lastContentSteering !== null) {
          if (steeringManifestFetcher === null) {
            log.warn("CP: Steering manifest declared but no way to fetch it");
          } else {
            log.info("CP: A Steering Manifest is declared in a new Manifest");
            this._autoRefreshSteeringManifest(steeringManifestFetcher,
                                              lastContentSteering);
          }
        }
      } else if (lastContentSteering === null) {
        log.info("CP: A Steering Manifest is removed in a new Manifest");
        this._steeringManifestUpdateCanceller?.cancel();
        this._steeringManifestUpdateCanceller = null;
      } else if (prevContentSteering.url !== lastContentSteering.url ||
                 prevContentSteering.proxyUrl !== lastContentSteering.proxyUrl)
      {
        log.info("CP: A Steering Manifest's information changed in a new Manifest");
        this._steeringManifestUpdateCanceller?.cancel();
        this._steeringManifestUpdateCanceller = null;
        if (steeringManifestFetcher === null) {
          log.warn("CP: Steering manifest changed but no way to fetch it");
        } else {
          this._autoRefreshSteeringManifest(steeringManifestFetcher,
                                            lastContentSteering);
        }
      }
    }, destroySignal);

    if (manifest.contentSteering !== null) {
      if (steeringManifestFetcher === null) {
        log.warn("CP: Steering Manifest initially present but no way to fetch it.");
        this._readyState = createSharedReference("ready");
      } else {
        const readyState = manifest.contentSteering.queryBeforeStart ? "not-ready" :
                                                                       "ready";
        this._readyState = createSharedReference(readyState);
        this._autoRefreshSteeringManifest(steeringManifestFetcher,
                                          manifest.contentSteering);
      }
    } else {
      this._readyState = createSharedReference("ready");
    }
    destroySignal.register(() => {
      this._readyState.setValue("disposed");
      this._readyState.finish();
      this._steeringManifestUpdateCanceller?.cancel();
      this._steeringManifestUpdateCanceller = null;
      this._lastSteeringManifest = null;
      for (const timeout of this._downgradedCdnList.timeouts) {
        clearTimeout(timeout);
      }
      this._downgradedCdnList = { metadata: [], timeouts: [] };
    });
  }

  /**
   * From the list of __ALL__ CDNs available to a resource, return them in the
   * order in which requests should be performed.
   *
   * Note: It is VERY important to include all CDN that are able to reach the
   * wanted resource, even those which will in the end not be used anyway.
   * If some CDN are not communicated, the `CdnPrioritizer` might wrongly
   * consider that the current resource don't have any of the CDN prioritized
   * internally and return other CDN which should have been forbidden if it knew
   * about the other, non-used, ones.
   *
   * @param {Array.<string>} everyCdnForResource - Array of ALL available CDN
   * able to reach the wanted resource - even those which might not be used in
   * the end.
   * @returns {Object} - Array of CDN that can be tried to reach the
   * resource, sorted by order of CDN preference, according to the
   * `CdnPrioritizer`'s own list of priorities.
   *
   * This value is wrapped in a `ISyncOrAsyncValue` as in relatively rare
   * scenarios, the order can only be known once the steering Manifest has been
   * fetched.
   */
  public getCdnPreferenceForResource(
    everyCdnForResource : ICdnMetadata[]
  ) : ISyncOrAsyncValue<ICdnMetadata[]> {
    if (everyCdnForResource.length <= 1) {
      // The huge majority of contents have only one CDN available.
      // Here, prioritizing make no sense.
      return SyncOrAsync.createSync(everyCdnForResource);
    }

    if (this._readyState.getValue() === "not-ready") {
      const val = new Promise<ICdnMetadata[]>((res, rej) => {
        this._readyState.onUpdate((readyState) => {
          if (readyState === "ready") {
            res(this._innerGetCdnPreferenceForResource(everyCdnForResource));
          } else if (readyState === "disposed") {
            rej(new CancellationError());
          }
        });
      });
      return SyncOrAsync.createAsync(val);
    }
    return SyncOrAsync.createSync(
      this._innerGetCdnPreferenceForResource(everyCdnForResource)
    );
  }

  /**
   * Limit usage of the CDN for a configured amount of time.
   * Call this method if you encountered an issue with that CDN which leads you
   * to want to prevent its usage currently.
   *
   * Note that the CDN can still be the preferred one if no other CDN exist for
   * a wanted resource.
   * @param {string} metadata
   */
  public downgradeCdn(metadata : ICdnMetadata) : void {
    const indexOf = indexOfMetadata(this._downgradedCdnList.metadata, metadata);
    if (indexOf >= 0) {
      this._removeIndexFromDowngradeList(indexOf);
    }

    const { DEFAULT_CDN_DOWNGRADE_TIME } = config.getCurrent();
    const downgradeTime = this._lastSteeringManifest?.lifetime ??
                          DEFAULT_CDN_DOWNGRADE_TIME;
    this._downgradedCdnList.metadata.push(metadata);
    const timeout = window.setTimeout(() => {
      const newIndex = indexOfMetadata(this._downgradedCdnList.metadata, metadata);
      if (newIndex >= 0) {
        this._removeIndexFromDowngradeList(newIndex);
      }
      this.trigger("priorityChange", null);
    }, downgradeTime);
    this._downgradedCdnList.timeouts.push(timeout);
    this.trigger("priorityChange", null);
  }

  /**
   * From the list of __ALL__ CDNs available to a resource, return them in the
   * order in which requests should be performed.
   *
   * Note: It is VERY important to include all CDN that are able to reach the
   * wanted resource, even those which will in the end not be used anyway.
   * If some CDN are not communicated, the `CdnPrioritizer` might wrongly
   * consider that the current resource don't have any of the CDN prioritized
   * internally and return other CDN which should have been forbidden if it knew
   * about the other, non-used, ones.
   *
   * @param {Array.<string>} everyCdnForResource - Array of ALL available CDN
   * able to reach the wanted resource - even those which might not be used in
   * the end.
   * @returns {Array.<string>} - Array of CDN that can be tried to reach the
   * resource, sorted by order of CDN preference, according to the
   * `CdnPrioritizer`'s own list of priorities.
   */
  private _innerGetCdnPreferenceForResource(
    everyCdnForResource : ICdnMetadata[]
  ) : ICdnMetadata[] {
    let cdnBase;
    if (this._lastSteeringManifest !== null) {
      const priorities = this._lastSteeringManifest.priorities;
      const inSteeringManifest = everyCdnForResource.filter(available =>
        available.id !== undefined && arrayIncludes(priorities, available.id));
      if (inSteeringManifest.length > 0) {
        cdnBase = inSteeringManifest;
      }
    }

    // (If using the SteeringManifest gave nothing, or if it just didn't exist.) */
    if (cdnBase === undefined) {
      // (If a default CDN was indicated, try to use it) */
      if (this._defaultCdnId !== undefined) {
        const indexOf = arrayFindIndex(everyCdnForResource, (x) =>
          x.id !== undefined && x.id === this._defaultCdnId);
        if (indexOf >= 0) {
          const elem = everyCdnForResource.splice(indexOf, 1)[0];
          everyCdnForResource.unshift(elem);
        }
      }

      if (cdnBase === undefined) {
        cdnBase = everyCdnForResource;
      }
    }
    const [allowedInOrder, downgradedInOrder] = cdnBase
      .reduce((acc : [ICdnMetadata[], ICdnMetadata[]], elt : ICdnMetadata) => {
        if (this._downgradedCdnList.metadata.some(c => c.id === elt.id &&
                                                       c.baseUrl === elt.baseUrl))
        {
          acc[1].push(elt);
        } else {
          acc[0].push(elt);
        }
        return acc;
      }, [[], []]);
    return allowedInOrder.concat(downgradedInOrder);
  }

  private _autoRefreshSteeringManifest(
    steeringManifestFetcher : SteeringManifestFetcher,
    contentSteering : IContentSteeringMetadata
  ) {
    if (this._steeringManifestUpdateCanceller === null) {
      const steeringManifestUpdateCanceller = new TaskCanceller();
      this._steeringManifestUpdateCanceller = steeringManifestUpdateCanceller;
    }
    const canceller : TaskCanceller = this._steeringManifestUpdateCanceller;
    steeringManifestFetcher.fetch(contentSteering.url,
                                  (err : IPlayerError) => this.trigger("warnings", [err]),
                                  canceller.signal)
      .then((parse) => {
        const parsed = parse((errs) => this.trigger("warnings", errs));
        const prevSteeringManifest = this._lastSteeringManifest;
        this._lastSteeringManifest = parsed;
        if (parsed.lifetime > 0) {
          const timeout = window.setTimeout(() => {
            canceller.signal.deregister(onTimeoutEnd);
            this._autoRefreshSteeringManifest(steeringManifestFetcher, contentSteering);
          }, parsed.lifetime * 1000);
          const onTimeoutEnd = () => {
            clearTimeout(timeout);
          };
          canceller.signal.register(onTimeoutEnd);
        }
        if (this._readyState.getValue() === "not-ready") {
          this._readyState.setValue("ready");
        }
        if (canceller.isUsed) {
          return;
        }
        if (prevSteeringManifest === null ||
            prevSteeringManifest.priorities.length !== parsed.priorities.length ||
            prevSteeringManifest.priorities
              .some((val, idx) => val !== parsed.priorities[idx]))
        {
          this.trigger("priorityChange", null);
        }
      })
      .catch((err) => {
        if (err instanceof CancellationError) {
          return;
        }
        const formattedError = formatError(err, {
          defaultCode: "NONE",
          defaultReason: "Unknown error when fetching and parsing the steering Manifest",
        });
        this.trigger("warnings", [formattedError]);
      });
  }

  /**
   * @param {number} index
   */
  private _removeIndexFromDowngradeList(index : number) : void {
    this._downgradedCdnList.metadata.splice(index, 1);
    const oldTimeout = this._downgradedCdnList.timeouts.splice(index, 1);
    clearTimeout(oldTimeout[0]);
  }
}

export interface ICdnPrioritizerEvents {
  warnings : IPlayerError[];
  priorityChange : null;
}

/**
 * Find the index of the given CDN metadata in a CDN metadata array.
 * Returns `-1` if not found.
 * @param {Array.<Object>} arr
 * @param {Object} elt
 * @returns {number}
 */
function indexOfMetadata(
  arr : ICdnMetadata[],
  elt : ICdnMetadata
) : number {
  if (arr.length === 0) {
    return -1;
  }
  if (elt.id !== undefined) {
    for (let i = 0; i < arr.length; i++) {
      const m = arr[i];
      if (m.id === elt.id) {
        return i;
      }
    }
  } else {
    for (let i = 0; i < arr.length; i++) {
      const m = arr[i];
      if (m.baseUrl === elt.baseUrl) {
        return i;
      }
    }
  }
  return -1;
}
