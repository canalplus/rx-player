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
  le4toi,
  UTF16StrToBytes,
} from "../../utils/byte_parsing";

/**
 * Create formatted init data for WebKit createSession.
 * Layout is :
 * [initData][4 byte: idLength][idLength byte: id]
 * [4 byte:certLength][certLength byte: cert]
 * @param {Uint8Array} initData
 * @param {Uint8Array} serverCertificate
 * @returns {Uint8Array}
 */
export default function getWebKitInitData(initDataBytes: Uint8Array|ArrayBuffer,
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
  const contentIdStr = initDataUri.split("skd://")[1];
  const id = UTF16StrToBytes(contentIdStr);

  let offset = 0;
  const buffer = new ArrayBuffer(initData.byteLength + 4 +
                                 id.byteLength + 4 +
                                 serverCertificate.byteLength);
  const dataView = new DataView(buffer);

  const initDataArray = new Uint8Array(buffer, offset, initData.byteLength);
  initDataArray.set(initData);
  offset += initData.byteLength;

  dataView.setUint32(offset, id.byteLength, true);
  offset += 4;

  const idArray = new Uint16Array(buffer, offset, id.length);
  idArray.set(id);
  offset += idArray.byteLength;

  dataView.setUint32(offset, serverCertificate.byteLength, true);
  offset += 4;

  const certArray = new Uint8Array(buffer, offset, serverCertificate.byteLength);
  certArray.set(serverCertificate);

  const res = new Uint8Array(buffer, 0, buffer.byteLength);
  return res;
}
