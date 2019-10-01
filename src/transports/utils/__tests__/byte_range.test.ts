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

import byteRange from "../byte_range";

describe("transports utils - byteRange", () => {
  it("should construct a ByteRange string", () => {
    expect(byteRange([0, 35])).toEqual("bytes=0-35");
    expect(byteRange([8, 40])).toEqual("bytes=8-40");
    expect(byteRange([888, 40])).toEqual("bytes=888-40");
    expect(byteRange([-Infinity, 40])).toEqual("bytes=-Infinity-40");
    expect(byteRange([-Infinity, -Infinity])).toEqual("bytes=-Infinity--Infinity");
    expect(byteRange([Infinity, -Infinity])).toEqual("bytes=Infinity--Infinity");
  });
  it("should not add ending byte if end is equal to +Infinity ", () => {
    expect(byteRange([0, Infinity])).toEqual("bytes=0-");
    expect(byteRange([54, Infinity])).toEqual("bytes=54-");
    expect(byteRange([0, +Infinity])).toEqual("bytes=0-");
    expect(byteRange([54, +Infinity])).toEqual("bytes=54-");
    expect(byteRange([Infinity, +Infinity])).toEqual("bytes=Infinity-");
  });
});
