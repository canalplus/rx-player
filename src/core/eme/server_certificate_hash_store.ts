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

/**
 * Keep track of server certificate which have been set for a MediaKeys.
 * As it is impossible for a MediaKeys to have his server certificate set
 * to a nullish value, we consider that once it has been set, it will remain
 * set until the MediaKeys instance is killed.
 *
 * So, a WeakMap helps keeping a trace of which server certificate (identified
 * with a unique hash) is set on a MediaKeys.
 */
let serverCertificateHashesMap: WeakMap<MediaKeys | ICustomMediaKeys, number> =
    new WeakMap<MediaKeys | ICustomMediaKeys, number>();

/** ServerCertificateHashStore */
export default {
  /**
   * @param {MediaKeys | Object} mediaKeys
   * @param {number} hash
   */
  add(mediaKeys: MediaKeys | ICustomMediaKeys, hash: number): void {
    serverCertificateHashesMap.set(mediaKeys, hash);
  },
  /**
   * @param {MediaKeys | Object} mediaKeys
   * @returns {number | null}
   */
  get(mediaKeys: MediaKeys | ICustomMediaKeys): number | null {
    const serverCertificateHash = serverCertificateHashesMap.get(mediaKeys);
    if (serverCertificateHash === undefined) {
      return null;
    }
    return serverCertificateHash;
  },
  clear() {
    serverCertificateHashesMap = new WeakMap<MediaKeys | ICustomMediaKeys, number>();
  },
};
