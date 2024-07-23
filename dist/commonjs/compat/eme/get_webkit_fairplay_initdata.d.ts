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
/**
 * Create formatted fairplay initdata for WebKit createSession.
 * Layout is :
 * [initData][4 byte: idLength][idLength byte: id]
 * [4 byte:certLength][certLength byte: cert]
 * @param {Uint8Array} initData
 * @param {Uint8Array} serverCertificate
 * @returns {Uint8Array}
 */
export default function getWebKitFairPlayInitData(initDataBytes: Uint8Array | ArrayBuffer, serverCertificateBytes: Uint8Array | ArrayBuffer): Uint8Array;
//# sourceMappingURL=get_webkit_fairplay_initdata.d.ts.map