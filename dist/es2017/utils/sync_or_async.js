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
import noop from "./noop";
const SyncOrAsync = {
    /**
     * Create the synchronous variant of an `ISyncOrAsyncValue`.
     * @param {*} val
     * @returns {Object}
     */
    createSync(val) {
        return {
            syncValue: val,
            getValueAsAsync() {
                return Promise.resolve(val);
            },
        };
    },
    /**
     * Create the asynchronous variant of an `ISyncOrAsyncValue`.
     * @param {Promise} val
     * @returns {Object}
     */
    createAsync(val) {
        let ret = null;
        val.then((resolved) => {
            ret = resolved;
        }, noop);
        return {
            syncValue: ret,
            getValueAsAsync() {
                return val;
            },
        };
    },
};
export default SyncOrAsync;
