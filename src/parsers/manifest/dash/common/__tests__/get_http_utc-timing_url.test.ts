import { describe, beforeEach, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

describe("DASH Parser - getHTTPUTCTimingURL", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return undefined if the given intermediate representation has no UTCTimings element", async () => {
    const mpdIR = {
      children: {
        utcTimings: [],
      },
      attributes: {},
    };
    const getHTTPUTCTimingURL = (
      (await vi.importActual("../get_http_utc-timing_url")) as any
    ).default;
    expect(getHTTPUTCTimingURL(mpdIR)).toEqual(undefined);
  });

  it("should return undefined if the given intermediate representation has no http-iso UTCTimings element", async () => {
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
    const getHTTPUTCTimingURL = (
      (await vi.importActual("../get_http_utc-timing_url")) as any
    ).default;
    expect(getHTTPUTCTimingURL(mpdIR)).toEqual(undefined);
  });

  it("should return undefined if the given intermediate representation has no value for its http-iso UTCTimings element", async () => {
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
    const getHTTPUTCTimingURL = (
      (await vi.importActual("../get_http_utc-timing_url")) as any
    ).default;
    expect(getHTTPUTCTimingURL(mpdIR)).toEqual(undefined);
  });

  it("should return the value of a single http-iso UTCTimings element", async () => {
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
    const getHTTPUTCTimingURL = (
      (await vi.importActual("../get_http_utc-timing_url")) as any
    ).default;
    expect(getHTTPUTCTimingURL(mpdIR)).toEqual("foobar2000");
  });

  it("should return the first value of multiple http-iso UTCTimings elements", async () => {
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
    const getHTTPUTCTimingURL = (
      (await vi.importActual("../get_http_utc-timing_url")) as any
    ).default;
    expect(getHTTPUTCTimingURL(mpdIR)).toEqual("foobar1000");
  });

  it("should return the first value of a http-iso UTCTimings element when mixed with other elements", async () => {
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
    const getHTTPUTCTimingURL = (
      (await vi.importActual("../get_http_utc-timing_url")) as any
    ).default;
    expect(getHTTPUTCTimingURL(mpdIR)).toEqual("foobar2000");
  });
});
