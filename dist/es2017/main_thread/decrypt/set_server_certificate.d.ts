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
import type { ICustomMediaKeys } from "../../compat/eme";
import type { IPlayerError } from "../../public_types";
/**
 * Call the setServerCertificate API with the given certificate.
 * Resolves on success, rejects on failure.
 *
 * TODO Handle returned value?
 * From the spec:
 *   - setServerCertificate resolves with true if everything worked
 *   - it resolves with false if the CDM does not support server
 *     certificates.
 *
 * @param {MediaKeys} mediaKeys
 * @param {ArrayBuffer} serverCertificate
 * @returns {Promise}
 */
declare function setServerCertificate(mediaKeys: ICustomMediaKeys | MediaKeys, serverCertificate: BufferSource): Promise<unknown>;
/**
 * Call the setCertificate API. If it fails just emit the error as warning
 * and complete.
 * @param {MediaKeys} mediaKeys
 * @param {ArrayBuffer} serverCertificate
 * @returns {Promise.<Object>}
 */
export default function trySettingServerCertificate(mediaKeys: ICustomMediaKeys | MediaKeys, serverCertificate: BufferSource): Promise<{
    type: "success";
    value: unknown;
} | {
    type: "already-has-one";
} | {
    type: "method-not-implemented";
} | {
    type: "error";
    value: IPlayerError;
}>;
export { trySettingServerCertificate, setServerCertificate };
