import { describe, beforeEach, it, expect, vi } from "vitest";
import getHTTPUTCTimingURL from "../../../../../../../src/parsers/manifest/dash/common/get_http_utc-timing_url.ts";
import type { IMPDIntermediateRepresentation } from "../../../../../../../src/parsers/manifest/dash/node_parser_types.ts";

describe("DASH Parser - getHTTPUTCTimingURL", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return undefined if the given intermediate representation has no UTCTimings element", () => {
    const mpdIR: IMPDIntermediateRepresentation = {
      children: {
        baseURLs: [],
        locations: [],
        periods: [],
        utcTimings: [],
      },
      attributes: {},
    };
    expect(getHTTPUTCTimingURL(mpdIR)).toEqual(undefined);
  });

  it("should return undefined if the given intermediate representation has no http-iso UTCTimings element", () => {
    const mpdIR: IMPDIntermediateRepresentation = {
      children: {
        baseURLs: [],
        locations: [],
        periods: [],
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
    expect(getHTTPUTCTimingURL(mpdIR)).toEqual(undefined);
  });

  it("should return undefined if the given intermediate representation has no value for its http-iso UTCTimings element", () => {
    const mpdIR: IMPDIntermediateRepresentation = {
      children: {
        baseURLs: [],
        locations: [],
        periods: [],
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
    expect(getHTTPUTCTimingURL(mpdIR)).toEqual(undefined);
  });

  it("should return the value of a single http-iso UTCTimings element", () => {
    const mpdIR: IMPDIntermediateRepresentation = {
      children: {
        baseURLs: [],
        locations: [],
        periods: [],
        utcTimings: [
          {
            schemeIdUri: "urn:mpeg:dash:utc:http-iso:2014",
            value: "foobar2000",
          },
        ],
      },
      attributes: {},
    };
    expect(getHTTPUTCTimingURL(mpdIR)).toEqual("foobar2000");
  });

  it("should return the first value of multiple http-iso UTCTimings elements", () => {
    const mpdIR: IMPDIntermediateRepresentation = {
      children: {
        baseURLs: [],
        locations: [],
        periods: [],
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
    expect(getHTTPUTCTimingURL(mpdIR)).toEqual("foobar1000");
  });

  it("should return the first value of a http-iso UTCTimings element when mixed with other elements", () => {
    const mpdIR: IMPDIntermediateRepresentation = {
      children: {
        baseURLs: [],
        locations: [],
        periods: [],
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
    expect(getHTTPUTCTimingURL(mpdIR)).toEqual("foobar2000");
  });
});
