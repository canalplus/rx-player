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

/* tslint:disable no-unsafe-any */
describe("DASH Parser - getHTTPUTCTimingURL", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  /* tslint:disable max-line-length */
  it("should return undefined if the given intermediate representation has no UTCTimings element", () => {
  /* tslint:enable max-line-length */
    const mpdIR = {
      children: {
        utcTimings: [],
      },
      attributes: {},
    };
    const getHTTPUTCTimingURL = require("../get_http_utc-timing_url").default;
    expect(getHTTPUTCTimingURL(mpdIR)).toEqual(undefined);
  });

  /* tslint:disable max-line-length */
  it("should return undefined if the given intermediate representation has no http-iso UTCTimings element", () => {
  /* tslint:enable max-line-length */
    const mpdIR = {
      children: {
        utcTimings: [
          {
            schemeIdUri: "urn:mpeg:dash:utc:direct-iso:2014",
            value: "foob",
          },
          {
            schemeIdUri: "urn:mpeg:dash:utc:http-iso:2009",
            value: "foob",
          },
        ],
      },
      attributes: {},
    };
    const getHTTPUTCTimingURL = require("../get_http_utc-timing_url").default;
    expect(getHTTPUTCTimingURL(mpdIR)).toEqual(undefined);
  });

  /* tslint:disable max-line-length */
  it("should return undefined if the given intermediate representation has no value for its http-iso UTCTimings element", () => {
  /* tslint:enable max-line-length */
    const mpdIR = {
      children: {
        utcTimings: [
          {
            schemeIdUri: "urn:mpeg:dash:utc:http-iso:2014",
          },
          {
            schemeIdUri: "urn:mpeg:dash:utc:direct-iso:2014",
            value: "foob",
          },
          {
            schemeIdUri: "urn:mpeg:dash:utc:http-iso:2014",
          },
        ],
      },
      attributes: {},
    };
    const getHTTPUTCTimingURL = require("../get_http_utc-timing_url").default;
    expect(getHTTPUTCTimingURL(mpdIR)).toEqual(undefined);
  });

  /* tslint:disable max-line-length */
  it("should return the value of a single http-iso UTCTimings element", () => {
  /* tslint:enable max-line-length */
    const mpdIR = {
      children: {
        utcTimings: [
          {
            schemeIdUri: "urn:mpeg:dash:utc:http-iso:2014",
            value: "foobar2000",
          },
        ],
      },
      attributes: {},
    };
    const getHTTPUTCTimingURL = require("../get_http_utc-timing_url").default;
    expect(getHTTPUTCTimingURL(mpdIR)).toEqual("foobar2000");
  });

  /* tslint:disable max-line-length */
  it("should return the first value of multiple http-iso UTCTimings elements", () => {
  /* tslint:enable max-line-length */
    const mpdIR = {
      children: {
        utcTimings: [
          {
            schemeIdUri: "urn:mpeg:dash:utc:http-iso:2014",
            value: "foobar1000",
          },
          {
            schemeIdUri: "urn:mpeg:dash:utc:http-iso:2014",
            value: "foobar2000",
          },
          {
            schemeIdUri: "urn:mpeg:dash:utc:http-iso:2014",
            value: "foobar3000",
          },
        ],
      },
      attributes: {},
    };
    const getHTTPUTCTimingURL = require("../get_http_utc-timing_url").default;
    expect(getHTTPUTCTimingURL(mpdIR)).toEqual("foobar1000");
  });

  /* tslint:disable max-line-length */
  it("should return the first value of a http-iso UTCTimings element when mixed with other elements", () => {
  /* tslint:enable max-line-length */
    const mpdIR = {
      children: {
        utcTimings: [
          {
            schemeIdUri: "urn:mpeg:dash:utc:direct-iso:2014",
            value: "foob",
          },
          {
            schemeIdUri: "urn:mpeg:dash:utc:http-iso:2014",
            value: "foobar2000",
          },
          {
            schemeIdUri: "urn:mpeg:dash:utc:http-iso:2014",
            value: "foobar1000",
          },
          {
            schemeIdUri: "urn:mpeg:dash:utc:direct-iso:2014",
            value: "foob",
          },
          {
            schemeIdUri: "urn:mpeg:dash:utc:http-iso:2014",
            value: "foobar1000",
          },
        ],
      },
      attributes: {},
    };
    const getHTTPUTCTimingURL = require("../get_http_utc-timing_url").default;
    expect(getHTTPUTCTimingURL(mpdIR)).toEqual("foobar2000");
  });
});
/* tslint:enable no-unsafe-any */
