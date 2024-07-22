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
import type { ICdnMetadata } from "../../../parsers/manifest";
import type { CancellationSignal } from "../../../utils/task_canceller";
import type CdnPrioritizer from "../cdn_prioritizer";
/** Settings to give to the backoff functions to configure their behavior. */
export interface IBackoffSettings {
    /**
     * Initial delay to wait if a request fails before making a new request, in
     * milliseconds.
     */
    baseDelay: number;
    /**
     * Maximum delay to wait if a request fails before making a new request, in
     * milliseconds.
     */
    maxDelay: number;
    /**
     * Maximum number of retries to perform on "regular" errors (e.g. due to HTTP
     * status, integrity errors, timeouts...).
     */
    maxRetry: number;
    /** Callback called when a request is retried. */
    onRetry: (err: unknown) => void;
}
/**
 * Specific algorithm used to perform segment and manifest requests.
 *
 * Here how it works:
 *
 *   1. You give it one or multiple of the CDN available for the resource you
 *      want to request (from the most important one to the least important),
 *      a callback doing the request with the chosen CDN in argument, and some
 *      options.
 *
 *   2. it tries to call the request callback with the most prioritized CDN
 *      first:
 *        - if it works as expected, it resolves the returned Promise with that
 *          request's response.
 *        - if it fails, it calls ther `onRetry` callback given with the
 *          corresponding error, un-prioritize that CDN and try with the new
 *          most prioritized CDN.
 *
 *      Each CDN might be retried multiple times, depending on the nature of the
 *      error and the Configuration given.
 *
 *      Multiple retries of the same CDN are done after a delay to avoid
 *      overwhelming it, this is what we call a "backoff". That delay raises
 *      exponentially as multiple consecutive errors are encountered on this
 *      CDN.
 *
 * @param {Array.<string>|null} cdns - The different CDN on which the
 * wanted resource is available. `scheduleRequestWithCdns` will call the
 * `performRequest` callback with the right element from that array if different
 * from `null`.
 *
 * Can be set to `null` when that resource is not reachable through a CDN, in
 * which case the `performRequest` callback may be called with `null`.
 * @param {Object|null} cdnPrioritizer - Interface allowing to give the priority
 * between multiple CDNs.
 * @param {Function} performRequest - Callback implementing the request in
 * itself. Resolving when the resource request succeed and rejecting with the
 * corresponding error when the request failed.
 * @param {Object} options - Configuration allowing to tweak the number on which
 * the algorithm behind `scheduleRequestWithCdns` bases itself.
 * @param {Object} cancellationSignal - CancellationSignal allowing to cancel
 * the logic of `scheduleRequestWithCdns`.
 * To trigger if the resource is not needed anymore.
 * @returns {Promise} - Promise resolving, with the corresponding
 * `performRequest`'s data, when the resource request succeed and rejecting in
 * the following scenarios:
 *   - `scheduleRequestWithCdns` has been cancelled due to `cancellationSignal`
 *     being triggered. In that case a `CancellationError` is thrown.
 *
 *   - The resource request(s) failed and will not be retried anymore.
 */
export declare function scheduleRequestWithCdns<T>(cdns: ICdnMetadata[] | null, cdnPrioritizer: CdnPrioritizer | null, performRequest: (cdn: ICdnMetadata | null, cancellationSignal: CancellationSignal) => Promise<T>, options: IBackoffSettings, cancellationSignal: CancellationSignal): Promise<T>;
/**
 * Lightweight version of the request algorithm, this time with only a simple
 * Promise given.
 * @param {Function} performRequest
 * @param {Object} options
 * @returns {Promise}
 */
export declare function scheduleRequestPromise<T>(performRequest: () => Promise<T>, options: IBackoffSettings, cancellationSignal: CancellationSignal): Promise<T>;
//# sourceMappingURL=schedule_request.d.ts.map