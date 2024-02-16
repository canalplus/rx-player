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
import log from "../../../log";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import objectValues from "../../../utils/object_values";
/**
 * Store information about pending requests, like information about:
 *   - for which segments they are
 *   - how the request's progress goes
 * @class PendingRequestsStore
 */
export default class PendingRequestsStore {
    constructor() {
        this._currentRequests = {};
    }
    /**
     * Add information about a new pending request.
     * @param {Object} payload
     */
    add(payload) {
        const { id, requestTimestamp, content } = payload;
        this._currentRequests[id] = { requestTimestamp, progress: [], content };
    }
    /**
     * Notify of the progress of a currently pending request.
     * @param {Object} progress
     */
    addProgress(progress) {
        const request = this._currentRequests[progress.id];
        if (isNullOrUndefined(request)) {
            if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 1 /* __ENVIRONMENT__.DEV */) {
                throw new Error("ABR: progress for a request not added");
            }
            log.warn("ABR: progress for a request not added");
            return;
        }
        request.progress.push(progress);
    }
    /**
     * Remove a request previously set as pending.
     * @param {string} id
     */
    remove(id) {
        if (isNullOrUndefined(this._currentRequests[id])) {
            if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 1 /* __ENVIRONMENT__.DEV */) {
                throw new Error("ABR: can't remove unknown request");
            }
            log.warn("ABR: can't remove unknown request");
        }
        delete this._currentRequests[id];
    }
    /**
     * Returns information about all pending requests, in segment's chronological
     * order.
     * @returns {Array.<Object>}
     */
    getRequests() {
        return objectValues(this._currentRequests)
            .filter((x) => !isNullOrUndefined(x))
            .sort((reqA, reqB) => reqA.content.segment.time - reqB.content.segment.time);
    }
}
