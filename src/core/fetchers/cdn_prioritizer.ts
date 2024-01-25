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
import type { ICdnMetadata } from "../../parsers/manifest";
import arrayFindIndex from "../../utils/array_find_index";
import EventEmitter from "../../utils/event_emitter";
import type { CancellationSignal } from "../../utils/task_canceller";

/**
 * Class storing and signaling the priority between multiple CDN available for
 * any given resource.
 *
 * This class was first created to implement the complexities behind
 * Content Steering features, though its handling hasn't been added yet as we
 * wait for its specification to be both standardized and relied on in the wild.
 * In the meantime, it acts as an abstraction for the simple concept of
 * avoiding to request a CDN for any segment when an issue is encountered with
 * one (e.g. HTTP 500 statuses) and several CDN exist for a given resource. It
 * should be noted that this is also one of the planified features of the
 * Content Steering specification.
 *
 * @class CdnPrioritizer
 */
export default class CdnPrioritizer extends EventEmitter<ICdnPrioritizerEvents> {
  /**
   * Structure keeping a list of CDN currently downgraded.
   * Downgraded CDN immediately have a lower priority than any non-downgraded
   * CDN for a specific amount of time.
   */
  private _downgradedCdnList : {
    /**
     * Metadata of downgraded CDN, sorted by the time at which they have
     * been downgraded ascending.
     */
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
   * @param {Object} destroySignal
   */
  constructor(destroySignal : CancellationSignal) {
    super();
    this._downgradedCdnList = { metadata: [], timeouts: [] };
    destroySignal.register(() => {
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
   * @returns {Array.<Object>} - Array of CDN that can be tried to reach the
   * resource, sorted by order of CDN preference, according to the
   * `CdnPrioritizer`'s own list of priorities.
   */
  public getCdnPreferenceForResource(
    everyCdnForResource : ICdnMetadata[]
  ) : ICdnMetadata[] {
    if (everyCdnForResource.length <= 1) {
      // The huge majority of contents have only one CDN available.
      // Here, prioritizing make no sense.
      return everyCdnForResource;
    }

    return this._innerGetCdnPreferenceForResource(everyCdnForResource);
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
    const downgradeTime = DEFAULT_CDN_DOWNGRADE_TIME;
    this._downgradedCdnList.metadata.push(metadata);
    const timeout = setTimeout(() => {
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
    const [allowedInOrder, downgradedInOrder] = everyCdnForResource
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

  /**
   * @param {number} index
   */
  private _removeIndexFromDowngradeList(index : number) : void {
    this._downgradedCdnList.metadata.splice(index, 1);
    const oldTimeout = this._downgradedCdnList.timeouts.splice(index, 1);
    clearTimeout(oldTimeout[0]);
  }
}

/** Events sent by a `CdnPrioritizer` */
export interface ICdnPrioritizerEvents {
  /**
   * The priority of one or several CDN changed.
   *
   * You might want to re-check if a CDN should still be used when this event
   * is triggered.
   */
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
  return elt.id !== undefined ? arrayFindIndex(arr, m => m.id === elt.id) :
                                arrayFindIndex(arr, m => m.baseUrl === elt.baseUrl);
}
