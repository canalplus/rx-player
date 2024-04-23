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
import type { ICustomMediaKeys } from "../../../compat/eme";
/** ServerCertificateStore */
declare const _default: {
    /**
     * Tells the ServerCertificateStore that you begin to call the APIs to set a
     * ServerCertificate on `mediaKeys`.
     *
     * Calling this function is necessary due to how server certificate work
     * currently in EME APIs:
     * Because right now, it is impossible to tell if a MediaKeys instance has an
     * attached ServerCertificate or not when the corresponding API fails or if it
     * never answers, we prefer to announce through this function that the current
     * server certificate attached to this MediaKeys is for now invalid.
     * @param {MediaKeys | Object} mediaKeys
     */
    prepare(mediaKeys: MediaKeys | ICustomMediaKeys): void;
    /**
     * Attach a new server certificate to a MediaKeys in the
     * ServerCertificateStore.
     *
     * Only one server certificate should ever be attached to a MediaKeys
     * instance and the `prepare` function should have been called before any
     * action to update the server certificate took place (this function does not
     * enforce either of those behaviors).
     * @param {MediaKeys | Object} mediaKeys
     * @param {ArrayBufferView | BufferSource} serverCertificate
     */
    set(mediaKeys: MediaKeys | ICustomMediaKeys, serverCertificate: ArrayBufferView | BufferSource): void;
    /**
     * Returns `true` if the MediaKeys instance has an attached ServerCertificate.
     * Returns `false` if it doesn't.
     *
     * Returns `undefined` if we cannot know, most likely because related EME APIs
     * failed or had an unexpected behavior.
     * @param {MediaKeys} mediaKeys
     * @returns {Boolean|undefined}
     */
    hasOne(mediaKeys: MediaKeys | ICustomMediaKeys): boolean | undefined;
    /**
     * Returns `true` if the given `mediaKeys` has `serverCertificate` attached to
     * it.
     * Returns `false` either if it doesn't of if we doesn't know if it does.
     * @param {MediaKeys | Object} mediaKeys
     * @param {ArrayBufferView | BufferSource} serverCertificate
     * @returns {boolean}
     */
    has(mediaKeys: MediaKeys | ICustomMediaKeys, serverCertificate: ArrayBufferView | BufferSource): boolean;
};
export default _default;
