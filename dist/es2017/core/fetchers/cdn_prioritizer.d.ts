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
import type { ICdnMetadata } from "../../parsers/manifest";
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
    private _downgradedCdnList;
    /**
     * @param {Object} destroySignal
     */
    constructor(destroySignal: CancellationSignal);
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
    getCdnPreferenceForResource(everyCdnForResource: ICdnMetadata[]): ICdnMetadata[];
    /**
     * Limit usage of the CDN for a configured amount of time.
     * Call this method if you encountered an issue with that CDN which leads you
     * to want to prevent its usage currently.
     *
     * Note that the CDN can still be the preferred one if no other CDN exist for
     * a wanted resource.
     * @param {string} metadata
     */
    downgradeCdn(metadata: ICdnMetadata): void;
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
    private _innerGetCdnPreferenceForResource;
    /**
     * @param {number} index
     */
    private _removeIndexFromDowngradeList;
}
/** Events sent by a `CdnPrioritizer` */
export interface ICdnPrioritizerEvents {
    /**
     * The priority of one or several CDN changed.
     *
     * You might want to re-check if a CDN should still be used when this event
     * is triggered.
     */
    priorityChange: null;
}
