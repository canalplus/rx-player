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

import { ICustomMediaKeys } from "../../compat";
import hashBuffer from "../../utils/hash_buffer";

/**
 * Keep track of server certificate which have been set for a MediaKeys.
 * As it is impossible for a MediaKeys to have his server certificate set
 * to a nullish value, we consider that once it has been set, it will remain
 * set until the MediaKeys instance is killed.
 *
 * So, a WeakMap helps keeping a trace of which server certificate (identified
 * with a unique hash) is set on a MediaKeys.
 */
let serverCertificateHashesMap: WeakMap<MediaKeys | ICustomMediaKeys,
                                        { hash: number; serverCertificate: Uint8Array }> =
  new WeakMap<MediaKeys | ICustomMediaKeys,
              { hash: number; serverCertificate: Uint8Array }>();

/** ServerCertificateStore */
export default {
  /**
   * @param {MediaKeys | Object} mediaKeys
   * @param {BufferSource} serverCertificate
   */
  add(mediaKeys: MediaKeys | ICustomMediaKeys, serverCertificate: BufferSource): void {
    const formattedServerCertificate: Uint8Array =
    serverCertificate instanceof Uint8Array ?
      serverCertificate :
      new Uint8Array(
        serverCertificate instanceof ArrayBuffer ? serverCertificate :
                                                   serverCertificate.buffer);
    const hash = hashBuffer(formattedServerCertificate);
    serverCertificateHashesMap.set(
      mediaKeys, { hash, serverCertificate: formattedServerCertificate });
  },
  /**
   * @param {MediaKeys | Object} mediaKeys
   */
  delete(mediaKeys: MediaKeys | ICustomMediaKeys): void {
    serverCertificateHashesMap.delete(mediaKeys);
  },
  /**
   * @param {MediaKeys | Object} mediaKeys
   * @param {BufferSource} serverCertificate
   * @returns {boolean}
   */
  has(mediaKeys: MediaKeys | ICustomMediaKeys, serverCertificate: BufferSource): boolean {
    const serverCertificateHash = serverCertificateHashesMap.get(mediaKeys);
    if (serverCertificateHash === undefined) {
      return false;
    }
    const { hash: oldHash, serverCertificate: oldServerCertificate } =
      serverCertificateHash;
    const newServerCertificate: Uint8Array =
      serverCertificate instanceof Uint8Array ?
        serverCertificate :
        new Uint8Array(
          serverCertificate instanceof ArrayBuffer ? serverCertificate :
                                                     serverCertificate.buffer);
    const newHash = hashBuffer(newServerCertificate);
    if (newHash !== oldHash ||
        oldServerCertificate.length !== newServerCertificate.length) {
      return false;
    }
    for (let i = 0; i < oldServerCertificate.length; i++) {
      if (oldServerCertificate[i] !== newServerCertificate[i]) {
        return false;
      }
    }
    return true;
  },
  clear() {
    serverCertificateHashesMap =
      new WeakMap<MediaKeys | ICustomMediaKeys,
                  { hash: number; serverCertificate: Uint8Array }>();
  },
};
