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

import { expect } from "chai";
import parseTimeCode from "../parseTimeCode";

describe("webvtt - parseTimeCode", () => {
  /* tslint:disable max-line-length */
  it("should translate well-formed webvtt timestamps with minutes and seconds", () => {
  /* tslint:enable max-line-length */
    expect(parseTimeCode("05:01.111 --> 08:13.114")).to.deep.equal({
      start: 5 * 60 + 1.111,
      end: 8 * 60 + 13.114,
    });
  });

  /* tslint:disable max-line-length */
  it("should translate well-formed webvtt timestamps with hours, minutes and seconds", () => {
  /* tslint:enable max-line-length */
    expect(parseTimeCode("00:00:46.440 --> 00:00:48.480")).to.deep.equal({
      start: 46.440,
      end: 48.480,
    });
    expect(parseTimeCode("00:05:01.111 --> 00:08:13.114")).to.deep.equal({
      start: 5 * 60 + 1.111,
      end: 8 * 60 + 13.114,
    });
    expect(parseTimeCode("10:15:01.111 --> 20:18:13.114")).to.deep.equal({
      start: 10 * 3600 + 15 * 60 + 1.111,
      end: 20 * 3600 + 18 * 60 + 13.114,
    });
  });

  it("should return undefined for non-sensical time codes", () => {
    expect(parseTimeCode("erhg")).to.equal(undefined);
    expect(parseTimeCode("5468")).to.equal(undefined);
    expect(parseTimeCode("5468 787767")).to.equal(undefined);
  });

  it("should return undefined for a single timestamp", () => {
    expect(parseTimeCode("00:00:46.440")).to.equal(undefined);
    expect(parseTimeCode("--> 01:10:48.480")).to.equal(undefined);
    expect(parseTimeCode("01:10:48.480 -->")).to.equal(undefined);
  });
});
