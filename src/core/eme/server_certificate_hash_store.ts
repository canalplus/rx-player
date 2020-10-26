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
 */
let serverCertificateForMediaKeys: WeakMap<MediaKeys | ICustomMediaKeys, number> =
    new WeakMap<MediaKeys | ICustomMediaKeys, number>();

export default {
  add(mediaKeys: MediaKeys | ICustomMediaKeys, hash: number): void {
    serverCertificateForMediaKeys.set(mediaKeys, hash);
  },
  get(mediaKeys: MediaKeys | ICustomMediaKeys): number | undefined {
    return serverCertificateForMediaKeys.get(mediaKeys);
  },
  clear() {
    serverCertificateForMediaKeys = new WeakMap<MediaKeys | ICustomMediaKeys, number>();
  },
};
