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

import { EncryptedMediaError } from "../../errors";
import log from "../../utils/log";
import { createEME, onEncrypted } from "../eme";

/**
 * Perform EME management if needed.
 * @returns {Observable}
 */
function createEMEIfKeySystems(videoElement, keySystems, errorStream) {
  if (keySystems && keySystems.length) {
    return createEME(videoElement, keySystems, errorStream);
  } else {
    return onEncrypted(videoElement).map(() => {
      log.error("eme: ciphered media and no keySystem passed");
      throw new EncryptedMediaError("MEDIA_IS_ENCRYPTED_ERROR", null, true);
    });
  }
}

export default createEMEIfKeySystems;
