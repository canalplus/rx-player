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

import {
  bytesToUTF16Str,
  itole4,
  le4toi,
  strToUTF16Array,
} from "../../utils/byte_parsing";
import startsWith from "../../utils/starts_with";

/**
 * Create formatted fairplay initdata for WebKit createSession.
 * Layout is :
 * [initData][4 byte: idLength][idLength byte: id]
 * [4 byte:certLength][certLength byte: cert]
 * @param {Uint8Array} initData
 * @param {Uint8Array} serverCertificate
 * @returns {Uint8Array}
 */
export default function getWebKitFairPlayInitData(
  initDataBytes: Uint8Array|ArrayBuffer,
  serverCertificateBytes: Uint8Array|ArrayBuffer
): Uint8Array {
  const initData = initDataBytes instanceof Uint8Array ? initDataBytes :
                                                         new Uint8Array(initDataBytes);
  const serverCertificate = serverCertificateBytes instanceof Uint8Array ?
    serverCertificateBytes :
    new Uint8Array(serverCertificateBytes);
  const length = le4toi(initData, 0);
  if (length + 4 !== initData.length) {
    throw new Error("Unsupported WebKit initData.");
  }
  const initDataUri = bytesToUTF16Str(initData);
  const contentIdStr = startsWith(initDataUri, "skd://") ? initDataUri.substring(6) :
                                                           initDataUri;
  const id = strToUTF16Array(contentIdStr);

  let offset = 0;
  const res =
    new Uint8Array(initData.byteLength
                   /* id length */ + 4 + id.byteLength
                   /* certificate length */ + 4 + serverCertificate.byteLength);

  res.set(initData);
  offset += initData.length;

  res.set(itole4(id.byteLength), offset);
  offset += 4;

  /**
   * As the id is formatted in Uint16, we need to represent
   * it in an Uint8 array to be able to set it in our result bytes
   * array.
   */
  res.set(new Uint8Array(id.buffer), offset);
  offset += id.length * 2;

  res.set(itole4(serverCertificate.byteLength), offset);
  offset += 4;

  res.set(serverCertificate, offset);
  return res;
}
