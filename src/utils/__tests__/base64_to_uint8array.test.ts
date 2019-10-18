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

import base64ToUint8Array from "../base64_to_uint8array";

describe("base64ToUint8Array", () => {
  it("should return an empty Uint8Array for an empty string", () => {
    expect(base64ToUint8Array("")).toEqual(new Uint8Array([]));
  });
  it("should convert a base64 to an Uint8Array", () => {
    expect(base64ToUint8Array("woDCge+/vg=="))
      .toEqual(new Uint8Array([194, 128, 194, 129, 239, 191, 190]));
    expect(base64ToUint8Array("dG90b/CfjIM="))
      .toEqual(new Uint8Array([116, 111, 116, 111, 240, 159, 140, 131]));
    expect(base64ToUint8Array("JGV4cGVjdChiYXNlNjRUb1VpbnQ4QXJyYXkoIiIp"))
      .toEqual(new Uint8Array([ 36, 101, 120, 112, 101, 99, 116, 40, 98, 97,
                                115, 101, 54, 52, 84, 111, 85, 105, 110, 116,
                                56, 65, 114, 114, 97, 121, 40, 34, 34, 41, ]));
    expect(base64ToUint8Array(window.btoa("toto")))
      .toEqual(new Uint8Array([ 116, 111, 116, 111 ]));
  });
});
