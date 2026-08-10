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

import config from "../../config.ts";
import { formatError } from "../../errors/index.ts";
import log from "../../log.ts";
import type { IManifest, IRepresentation } from "../../manifest/index.ts";
import type {
  ICdnMetadata,
  IContentSteeringMetadata,
} from "../../parsers/manifest/index.ts";
import type { ISteeringManifest } from "../../parsers/SteeringManifest/index.ts";
import type { IPlayerError } from "../../public_types.ts";
import type { IRequestCdnMetadata, ITransportPipelines } from "../../transports/index.ts";
import arrayFindIndex from "../../utils/array_find_index.ts";
import EventEmitter from "../../utils/event_emitter.ts";
import globalScope from "../../utils/global_scope.ts";
import SharedReference from "../../utils/reference.ts";
import { RequestError } from "../../utils/request/index.ts";
import SyncOrAsync from "../../utils/sync_or_async.ts";
import type { ISyncOrAsyncValue } from "../../utils/sync_or_async.ts";
import type { CancellationSignal } from "../../utils/task_canceller.ts";
import TaskCanceller, { CancellationError } from "../../utils/task_canceller.ts";
import {
  appendURLQueryString,
  replaceURLHost,
  resolveURL,
  setURLQueryParameters,
} from "../../utils/url-utils.ts";
import SteeringManifestFetcher from "./steering_manifest/index.ts";

/**
 * Class storing and signaling the priority between multiple CDN available for
 * any given resource.
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
 * This class was created to implement the complexities behind Content Steering
 * features.
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
  private _lastSteeringManifest: ISteeringManifest | null;

  private _defaultCdnIds: string[];

  private _currentContentSteering: IContentSteeringMetadata | null;
  private _steeringManifestFetcher: SteeringManifestFetcher | null;
  private _destroySignal: CancellationSignal;
  private _isStarted: boolean;
  private _usedPathways: string[];
  private _pathwayThroughputs: Map<string, number>;

  /**
   * Structure keeping a list of CDN currently downgraded.
   * Downgraded CDN immediately have a lower priority than any non-downgraded
   * CDN for a specific amount of time.
   */
  private _downgradedCdnList: {
    /**
     * Metadata of downgraded CDN, sorted by the time at which they have
     * been downgraded ascending.
     */
    metadata: ICdnMetadata[];
    /**
     * Timeout ID (to give to `clearTimeout`) of elements in the `metadata`
     * array, for the element at the same index in the `metadata` array.
     *
     * This structure has been writted as an object of two arrays of the same
     * length, instead of an array of objects, to simplify the usage of the
     * `metadata` array which is used considerably more than the `timeouts`
     * array.
     */
    timeouts: Array<ReturnType<typeof setTimeout>>;
  };

  /**
   * TaskCanceller allowing to abort the process of loading and refreshing the
   * Content Steering Manifest.
   * Set to `null` when no such process is pending.
   */
  private _steeringManifestUpdateCanceller: TaskCanceller | null;

  private _readyState: SharedReference<ICdnPrioritizerReadyState>;

  /**
   * @param {Object} transport
   * @param {Object} destroySignal
   */
  constructor(transport: ITransportPipelines, destroySignal: CancellationSignal) {
    super();
    this._lastSteeringManifest = null;
    this._downgradedCdnList = { metadata: [], timeouts: [] };
    this._steeringManifestUpdateCanceller = null;
    this._currentContentSteering = null;
    this._defaultCdnIds = [];
    this._destroySignal = destroySignal;
    this._isStarted = false;
    this._usedPathways = [];
    this._pathwayThroughputs = new Map();
    this._readyState = new SharedReference<ICdnPrioritizerReadyState>("ready");
    this._steeringManifestFetcher =
      transport.steeringManifest === null
        ? null
        : new SteeringManifestFetcher(transport.steeringManifest, {
            maxRetry: undefined,
          });
    destroySignal.register(() => {
      this._readyState.setValue("disposed");
      this._readyState.finish();
      this._steeringManifestUpdateCanceller?.cancel("CdnPrioritizer disposed");
      this._steeringManifestUpdateCanceller = null;
      this._lastSteeringManifest = null;
      this._usedPathways = [];
      this._pathwayThroughputs.clear();
      for (const timeout of this._downgradedCdnList.timeouts) {
        clearTimeout(timeout);
      }
      this._downgradedCdnList = { metadata: [], timeouts: [] };
    });
  }

  /** Start prioritizing resources described by the given Manifest. */
  public start(manifest: IManifest): void {
    if (this._isStarted || this._destroySignal.cancellationError !== null) {
      return;
    }
    this._isStarted = true;
    this._currentContentSteering = manifest.contentSteering;
    this._defaultCdnIds = manifest.contentSteering?.defaultIds ?? [];
    const steeringManifestFetcher = this._steeringManifestFetcher;

    let currentContentSteering = manifest.contentSteering;

    manifest.addEventListener(
      "manifestUpdate",
      () => {
        const prevContentSteering = currentContentSteering;
        currentContentSteering = manifest.contentSteering;
        this._currentContentSteering = currentContentSteering;
        this._defaultCdnIds = currentContentSteering?.defaultIds ?? [];
        if (prevContentSteering === null) {
          if (currentContentSteering !== null) {
            this.trigger("priorityChange", null);
            if (steeringManifestFetcher === null) {
              log.warn("Core", "Steering manifest declared but no way to fetch it");
            } else {
              log.info("Core", "A Steering Manifest is declared in a new Manifest");
              this._autoRefreshSteeringManifest(
                steeringManifestFetcher,
                currentContentSteering,
                currentContentSteering.url,
              );
            }
          }
        } else if (currentContentSteering === null) {
          log.info("Core", "A Steering Manifest is removed in a new Manifest");
          this._steeringManifestUpdateCanceller?.cancel(
            "new MPD removed ContentSteering",
          );
          this._steeringManifestUpdateCanceller = null;
          this._lastSteeringManifest = null;
          this.trigger("priorityChange", null);
        } else if (prevContentSteering.url !== currentContentSteering.url) {
          log.info("Core", "A Steering Manifest's information changed in a new Manifest");
          this._steeringManifestUpdateCanceller?.cancel(
            "new MPD updated ContentSteering URL",
          );
          this._steeringManifestUpdateCanceller = null;
          if (steeringManifestFetcher === null) {
            log.warn("Core", "Steering manifest changed but no way to fetch it");
          } else {
            this._lastSteeringManifest = null;
            this.trigger("priorityChange", null);
            this._autoRefreshSteeringManifest(
              steeringManifestFetcher,
              currentContentSteering,
              currentContentSteering.url,
            );
          }
        } else {
          this.trigger("priorityChange", null);
        }
      },
      this._destroySignal,
    );

    if (manifest.contentSteering !== null) {
      if (steeringManifestFetcher === null) {
        log.warn("Core", "Steering Manifest initially present but no way to fetch it.");
      } else {
        const readyState = manifest.contentSteering.queryBeforeStart
          ? "not-ready"
          : "ready";
        this._readyState.setValue(readyState);
        this._autoRefreshSteeringManifest(
          steeringManifestFetcher,
          manifest.contentSteering,
          manifest.contentSteering.url,
        );
      }
    }
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
    everyCdnForResource: ICdnMetadata[],
  ): ISyncOrAsyncValue<IRequestCdnMetadata[]> {
    if (everyCdnForResource.length <= 1 && this._currentContentSteering === null) {
      // The huge majority of contents have only one CDN available.
      // Here, prioritizing make no sense.
      return SyncOrAsync.createSync(everyCdnForResource);
    }

    if (this._readyState.getValue() === "not-ready") {
      const val = new Promise<IRequestCdnMetadata[]>((res, rej) => {
        this._readyState.onUpdate(
          (readyState) => {
            if (readyState === "ready") {
              res(this._innerGetCdnPreferenceForResource(everyCdnForResource));
            } else if (readyState === "disposed") {
              rej(
                new CancellationError(
                  "Preferred CDN obtention",
                  "CdnPrioritizer disposed",
                ),
              );
            }
          },
          {
            // NOTE: It is guaranteed in this class that `this._readyState` will
            // never hang
            clearSignal: new TaskCanceller("").signal,
          },
        );
      });
      return SyncOrAsync.createAsync(val);
    }
    return SyncOrAsync.createSync(
      this._innerGetCdnPreferenceForResource(everyCdnForResource),
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
  public downgradeCdn(metadata: ICdnMetadata): void {
    const indexOf = indexOfMetadata(this._downgradedCdnList.metadata, metadata);
    if (indexOf >= 0) {
      this._removeIndexFromDowngradeList(indexOf);
    }

    const { DEFAULT_CDN_DOWNGRADE_TIME } = config.getCurrent();
    const downgradeTime =
      this._lastSteeringManifest?.lifetime ?? DEFAULT_CDN_DOWNGRADE_TIME;
    this._downgradedCdnList.metadata.push(metadata);
    const timeout = setTimeout(() => {
      const newIndex = indexOfMetadata(this._downgradedCdnList.metadata, metadata);
      if (newIndex >= 0) {
        this._removeIndexFromDowngradeList(newIndex);
      }
      this.trigger("priorityChange", null);
    }, downgradeTime * 1000);
    this._downgradedCdnList.timeouts.push(timeout);
    this.trigger("priorityChange", null);
  }

  /** Record that a resource request is using the given pathway. */
  public recordCdnUsage(metadata: ICdnMetadata): void {
    if (metadata.id !== undefined) {
      if (this._usedPathways.indexOf(metadata.id) < 0) {
        this._usedPathways.push(metadata.id);
      }
    }
  }

  /** Store a measured throughput for a pathway, in integer bits per second. */
  public recordCdnThroughput(metadata: ICdnMetadata, throughput: number): void {
    if (metadata.id !== undefined && Number.isFinite(throughput) && throughput >= 0) {
      this._pathwayThroughputs.set(metadata.id, Math.round(throughput));
    }
  }

  /** Keep Representations available on the highest usable pathway. */
  public filterRepresentationsByPreferredPathway(
    representations: IRepresentation[],
  ): IRepresentation[] {
    const priorities = this._lastSteeringManifest?.priorities ?? this._defaultCdnIds;
    if (priorities.length === 0) {
      return representations;
    }
    let downgradedMatch: IRepresentation[] | undefined;
    for (const pathway of priorities) {
      const matching = representations.filter((representation) => {
        const cdns = representation.cdnMetadata;
        return (
          cdns !== null &&
          synthesizePathwayClones(
            cdns,
            this._lastSteeringManifest ?? {
              lifetime: 0,
              priorities: [],
              pathwayClones: [],
            },
          ).some(({ id }) => id === pathway)
        );
      });
      if (matching.length > 0) {
        if (!this._downgradedCdnList.metadata.some(({ id }) => id === pathway)) {
          return matching;
        }
        downgradedMatch ??= matching;
      }
    }
    return downgradedMatch ?? representations;
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
    everyCdnForResource: ICdnMetadata[],
  ): IRequestCdnMetadata[] {
    let cdnBase;
    if (this._lastSteeringManifest !== null) {
      const priorities = this._lastSteeringManifest.priorities;
      const availableCdns = synthesizePathwayClones(
        everyCdnForResource,
        this._lastSteeringManifest,
      );
      const inSteeringManifest: IRequestCdnMetadata[] = [];
      for (const priority of priorities) {
        inSteeringManifest.push(
          ...availableCdns.filter((available) => available.id === priority),
        );
      }
      if (inSteeringManifest.length > 0) {
        cdnBase = inSteeringManifest;
      }
    }

    // (If using the SteeringManifest gave nothing, or if it just didn't exist.) */
    if (cdnBase === undefined) {
      // (If a default CDN was indicated, try to use it) */
      if (this._defaultCdnIds.length > 0) {
        const remainingCdns = everyCdnForResource.slice();
        const defaultCdns: IRequestCdnMetadata[] = [];
        for (const defaultId of this._defaultCdnIds) {
          const matching = remainingCdns.filter(({ id }) => id === defaultId);
          defaultCdns.push(...matching);
          for (let index = remainingCdns.length - 1; index >= 0; index--) {
            if (remainingCdns[index].id === defaultId) {
              remainingCdns.splice(index, 1);
            }
          }
        }
        cdnBase = defaultCdns.concat(remainingCdns);
      }

      if (cdnBase === undefined) {
        cdnBase = everyCdnForResource.slice();
      }
    }
    const [allowedInOrder, downgradedInOrder] = cdnBase.reduce(
      (acc: [IRequestCdnMetadata[], IRequestCdnMetadata[]], elt: IRequestCdnMetadata) => {
        if (
          this._downgradedCdnList.metadata.some((c) =>
            elt.id !== undefined
              ? c.id === elt.id
              : c.id === undefined && c.baseUrl === elt.baseUrl,
          )
        ) {
          acc[1].push(elt);
        } else {
          acc[0].push(elt);
        }
        return acc;
      },
      [[], []],
    );
    return allowedInOrder.concat(downgradedInOrder);
  }

  private _autoRefreshSteeringManifest(
    steeringManifestFetcher: SteeringManifestFetcher,
    contentSteering: IContentSteeringMetadata,
    steeringUrl: string,
  ) {
    if (this._steeringManifestUpdateCanceller === null) {
      const steeringManifestUpdateCanceller = new TaskCanceller(
        "ContentSteering Manifest update",
      );
      this._steeringManifestUpdateCanceller = steeringManifestUpdateCanceller;
    }
    const canceller: TaskCanceller = this._steeringManifestUpdateCanceller;
    const requestUrl = this._addSteeringRequestQueryParameters(
      steeringUrl,
      contentSteering,
    );
    steeringManifestFetcher
      .fetch(
        requestUrl,
        (err: IPlayerError) => this.trigger("warnings", [err]),
        canceller.signal,
      )
      .then(({ parse, url: responseUrl }) => {
        const parsed = parse((errs) => this.trigger("warnings", errs));
        if (canceller.isUsed()) {
          return;
        }
        const prevSteeringManifest = this._lastSteeringManifest;
        this._lastSteeringManifest = parsed;
        const nextUrl =
          parsed.reloadUri === undefined
            ? responseUrl
            : resolveURL(responseUrl, parsed.reloadUri);
        this._scheduleSteeringRefresh(
          steeringManifestFetcher,
          nextUrl,
          parsed.lifetime,
          canceller,
        );
        if (this._readyState.getValue() === "not-ready") {
          this._readyState.setValue("ready");
        }
        if (
          prevSteeringManifest === null ||
          prevSteeringManifest.priorities.length !== parsed.priorities.length ||
          prevSteeringManifest.priorities.some(
            (val, idx) => val !== parsed.priorities[idx],
          ) ||
          JSON.stringify(prevSteeringManifest.pathwayClones) !==
            JSON.stringify(parsed.pathwayClones)
        ) {
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
        if (this._readyState.getValue() === "not-ready") {
          this._readyState.setValue("ready");
        }

        if (err instanceof RequestError && err.status === 410) {
          if (this._lastSteeringManifest === null) {
            this.trigger("priorityChange", null);
          }
          return;
        }
        if (err instanceof Error && err.message.indexOf("Unhandled DCSM version") >= 0) {
          this._lastSteeringManifest = null;
          this.trigger("priorityChange", null);
          return;
        }
        if (err instanceof RequestError && err.status === 429) {
          // TODO Handle the Retry-After response header once request errors expose it.
        }
        this._scheduleSteeringRefresh(
          steeringManifestFetcher,
          steeringUrl,
          this._lastSteeringManifest?.lifetime ?? 300,
          canceller,
        );
      });
  }

  private _scheduleSteeringRefresh(
    steeringManifestFetcher: SteeringManifestFetcher,
    steeringUrl: string,
    delayInSeconds: number,
    canceller: TaskCanceller,
  ): void {
    const timeout = globalScope.setTimeout(() => {
      canceller.signal.deregister(onTimeoutEnd);
      const latestContentSteering = this._currentContentSteering;
      if (latestContentSteering === null) {
        return;
      }
      this._autoRefreshSteeringManifest(
        steeringManifestFetcher,
        latestContentSteering,
        steeringUrl,
      );
    }, delayInSeconds * 1000);
    const onTimeoutEnd = () => clearTimeout(timeout);
    canceller.signal.register(onTimeoutEnd);
  }

  private _addSteeringRequestQueryParameters(
    steeringUrl: string,
    contentSteering: IContentSteeringMetadata,
  ): string {
    let url = appendURLQueryString(steeringUrl, contentSteering.queryString);
    const queryParameters: Array<[string, string]> = [];
    if (this._usedPathways.length > 0) {
      const pathways = this._usedPathways.slice();
      queryParameters.push(["_DASH_pathway", `"${pathways.join(",")}"`]);
      const throughputs = pathways.map(
        (pathway) => this._pathwayThroughputs.get(pathway)?.toString() ?? "",
      );
      queryParameters.push(["_DASH_throughput", throughputs.join(",")]);
      this._usedPathways = [pathways[pathways.length - 1]];
    }
    url = setURLQueryParameters(url, queryParameters);
    return url;
  }

  /**
   * @param {number} index
   */
  private _removeIndexFromDowngradeList(index: number): void {
    this._downgradedCdnList.metadata.splice(index, 1);
    const oldTimeout = this._downgradedCdnList.timeouts.splice(index, 1);
    clearTimeout(oldTimeout[0]);
  }
}

type ICdnPrioritizerReadyState = "not-ready" | "ready" | "disposed";

/** Events sent by a `CdnPrioritizer` */
export interface ICdnPrioritizerEvents {
  /**
   * The priority of one or several CDN changed.
   *
   * You might want to re-check if a CDN should still be used when this event
   * is triggered.
   */
  priorityChange: null;

  warnings: IPlayerError[];
}

/**
 * Find the index of the given CDN metadata in a CDN metadata array.
 * Returns `-1` if not found.
 * @param {Array.<Object>} arr
 * @param {Object} elt
 * @returns {number}
 */
function indexOfMetadata(arr: ICdnMetadata[], elt: ICdnMetadata): number {
  if (arr.length === 0) {
    return -1;
  }
  return elt.id !== undefined
    ? arrayFindIndex(arr, (m) => m.id === elt.id)
    : arrayFindIndex(arr, (m) => m.baseUrl === elt.baseUrl);
}

function synthesizePathwayClones(
  cdns: ICdnMetadata[],
  steeringManifest: ISteeringManifest,
): IRequestCdnMetadata[] {
  const allCdns: IRequestCdnMetadata[] = cdns.slice();
  const byId = new Map<string, IRequestCdnMetadata[]>();
  for (const cdn of cdns) {
    if (cdn.id !== undefined) {
      const current = byId.get(cdn.id);
      if (current === undefined) {
        byId.set(cdn.id, [cdn]);
      } else {
        current.push(cdn);
      }
    }
  }
  for (const clone of steeringManifest.pathwayClones) {
    if (byId.has(clone.id)) {
      continue;
    }
    const baseCdns = byId.get(clone.baseId);
    if (baseCdns === undefined) {
      continue;
    }
    const clonedCdns = baseCdns.map(
      (baseCdn): IRequestCdnMetadata => ({
        baseUrl: baseCdn.baseUrl,
        id: clone.id,
        pathwayClone: {
          host: clone.uriReplacement.host ?? baseCdn.pathwayClone?.host,
          params: {
            ...baseCdn.pathwayClone?.params,
            ...clone.uriReplacement.params,
          },
        },
      }),
    );
    byId.set(clone.id, clonedCdns);
    allCdns.push(...clonedCdns);
  }
  return allCdns;
}

export function applyPathwayCloneToUrl(metadata: IRequestCdnMetadata): string {
  if (metadata.pathwayClone === undefined) {
    return metadata.baseUrl;
  }
  let url = metadata.baseUrl;
  if (metadata.pathwayClone.host !== undefined) {
    url = replaceURLHost(url, metadata.pathwayClone.host);
  }
  if (metadata.pathwayClone.params !== undefined) {
    const parameters = Object.entries(metadata.pathwayClone.params).map(
      ([key, value]): [string, string] => [
        safeDecodeUriComponent(key),
        safeDecodeUriComponent(value),
      ],
    );
    url = setURLQueryParameters(url, parameters);
  }
  return url;
}

function safeDecodeUriComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch (_) {
    return value;
  }
}
