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

import { itole4, le4toi, toUint8Array } from "../../utils/byte_parsing.ts";
import { strToUtf16LE, utf16LEToStr } from "../../utils/string_parsing.ts";

/**
 * Create formatted fairplay initdata for WebKit createSession.
 * Layout is :
 * [initData][4 byte: idLength][idLength byte: id]
 * [4 byte:certLength][certLength byte: cert]
 * @param {Uint8Array} initDataBytes
 * @param {Uint8Array} serverCertificateBytes
 * @returns {Uint8Array}
 */
export default function getWebKitFairPlayInitData(
  initDataBytes: BufferSource,
  serverCertificateBytes: BufferSource,
): Uint8Array<ArrayBuffer> {
  const initData = toUint8Array(initDataBytes);
  const serverCertificate = toUint8Array(serverCertificateBytes);
  const length = le4toi(initData, 0);
  if (length + 4 !== initData.length) {
    throw new Error("Unsupported WebKit initData.");
  }
  const initDataUri = utf16LEToStr(initData);
  const skdIndexInInitData = initDataUri.indexOf("skd://");
  const contentIdStr =
    skdIndexInInitData > -1 ? initDataUri.substring(skdIndexInInitData + 6) : initDataUri;
  const id = strToUtf16LE(contentIdStr);

  let offset = 0;
  const res = new Uint8Array(
    initData.byteLength +
      /* id length */ 4 +
      id.byteLength +
      /* certificate length */ 4 +
      serverCertificate.byteLength,
  );

  res.set(initData);
  offset += initData.length;

  res.set(itole4(id.byteLength), offset);
  offset += 4;

  res.set(id, offset);
  offset += id.byteLength;

  res.set(itole4(serverCertificate.byteLength), offset);
  offset += 4;

  res.set(serverCertificate, offset);
  return res;
}
