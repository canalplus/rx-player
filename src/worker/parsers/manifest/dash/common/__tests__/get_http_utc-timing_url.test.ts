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

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

describe("DASH Parser - getHTTPUTCTimingURL", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  /* eslint-disable max-len */
  it("should return undefined if the given intermediate representation has no UTCTimings element", () => {
  /* eslint-enable max-len */
    const mpdIR = {
      children: {
        utcTimings: [],
      },
      attributes: {},
    };
    const getHTTPUTCTimingURL = jest.requireActual("../get_http_utc-timing_url").default;
    expect(getHTTPUTCTimingURL(mpdIR)).toEqual(undefined);
  });

  /* eslint-disable max-len */
  it("should return undefined if the given intermediate representation has no http-iso UTCTimings element", () => {
  /* eslint-enable max-len */
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
    const getHTTPUTCTimingURL = jest.requireActual("../get_http_utc-timing_url").default;
    expect(getHTTPUTCTimingURL(mpdIR)).toEqual(undefined);
  });

  /* eslint-disable max-len */
  it("should return undefined if the given intermediate representation has no value for its http-iso UTCTimings element", () => {
  /* eslint-enable max-len */
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
    const getHTTPUTCTimingURL = jest.requireActual("../get_http_utc-timing_url").default;
    expect(getHTTPUTCTimingURL(mpdIR)).toEqual(undefined);
  });

  /* eslint-disable max-len */
  it("should return the value of a single http-iso UTCTimings element", () => {
  /* eslint-enable max-len */
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
    const getHTTPUTCTimingURL = jest.requireActual("../get_http_utc-timing_url").default;
    expect(getHTTPUTCTimingURL(mpdIR)).toEqual("foobar2000");
  });

  /* eslint-disable max-len */
  it("should return the first value of multiple http-iso UTCTimings elements", () => {
  /* eslint-enable max-len */
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
    const getHTTPUTCTimingURL = jest.requireActual("../get_http_utc-timing_url").default;
    expect(getHTTPUTCTimingURL(mpdIR)).toEqual("foobar1000");
  });

  /* eslint-disable max-len */
  it("should return the first value of a http-iso UTCTimings element when mixed with other elements", () => {
  /* eslint-enable max-len */
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
    const getHTTPUTCTimingURL = jest.requireActual("../get_http_utc-timing_url").default;
    expect(getHTTPUTCTimingURL(mpdIR)).toEqual("foobar2000");
  });
});
