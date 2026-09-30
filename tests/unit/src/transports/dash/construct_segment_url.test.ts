import { describe, expect, it } from "vitest";
import type { ISegment } from "../../../../../src/manifest/index.ts";
import type { IRequestParameters } from "../../../../../src/parsers/manifest/index.ts";
import constructSegmentUrl from "../../../../../src/transports/dash/construct_segment_url.ts";

const segment: ISegment = {
  id: "1",
  isInit: false,
  time: 0,
  end: 1,
  duration: 1,
  timescale: 1,
  complete: true,
  privateInfos: {},
  url: "segment.m4s",
};

function parameters(
  ...urlQuery: Array<{
    value: string;
    sameOriginOnly?: boolean;
    sourceUrl?: string;
  }>
): IRequestParameters {
  return {
    urlQuery: urlQuery.map((query) => ({
      value: query.value,
      sameOriginOnly: query.sameOriginOnly ?? false,
      sourceUrl: query.sourceUrl,
    })),
  };
}

describe("DASH constructSegmentUrl", () => {
  it("returns null without CDN metadata", () => {
    expect(constructSegmentUrl(null, segment)).toBeNull();
  });

  it("resolves segment URLs without request parameters", () => {
    expect(constructSegmentUrl({ baseUrl: "https://example.com/path/" }, segment)).toBe(
      "https://example.com/path/segment.m4s",
    );
  });

  it("uses the BaseURL for a null segment URL", () => {
    expect(
      constructSegmentUrl(
        { baseUrl: "https://example.com/path/?base=1" },
        { ...segment, url: null },
        parameters({ value: "token=2" }),
      ),
    ).toBe("https://example.com/path/?base=1&token=2");
  });

  it("appends query strings to the resolved segment URL", () => {
    expect(
      constructSegmentUrl(
        { baseUrl: "https://example.com/path/" },
        segment,
        parameters({ value: "a=1" }, { value: "b=2" }),
      ),
    ).toBe("https://example.com/path/segment.m4s?a=1&b=2");
  });

  it("preserves existing queries and URL fragments", () => {
    expect(
      constructSegmentUrl(
        { baseUrl: "https://example.com/path/" },
        { ...segment, url: "segment.m4s?existing=1#fragment" },
        parameters({ value: "added=2" }),
      ),
    ).toBe("https://example.com/path/segment.m4s?existing=1&added=2#fragment");
  });

  it("adds same-origin-only query strings on the same origin", () => {
    expect(
      constructSegmentUrl(
        { baseUrl: "https://EXAMPLE.com:443/path/" },
        segment,
        parameters({
          value: "token=1",
          sameOriginOnly: true,
          sourceUrl: "https://example.COM/manifest.mpd",
        }),
      ),
    ).toBe("https://EXAMPLE.com:443/path/segment.m4s?token=1");
  });

  it("drops same-origin-only query strings on another origin", () => {
    expect(
      constructSegmentUrl(
        { baseUrl: "https://cdn.example.com/path/" },
        segment,
        parameters(
          {
            value: "private=1",
            sameOriginOnly: true,
            sourceUrl: "https://manifest.example.com/manifest.mpd",
          },
          { value: "public=2" },
        ),
      ),
    ).toBe("https://cdn.example.com/path/segment.m4s?public=2");
  });

  it("drops restricted parameters when their source URL is unknown", () => {
    expect(
      constructSegmentUrl(
        { baseUrl: "https://example.com/path/" },
        segment,
        parameters({ value: "token=1", sameOriginOnly: true }),
      ),
    ).toBe("https://example.com/path/segment.m4s");
  });

  it("does not append empty query strings", () => {
    expect(
      constructSegmentUrl(
        { baseUrl: "https://example.com/path/" },
        segment,
        parameters({ value: "" }),
      ),
    ).toBe("https://example.com/path/segment.m4s");
  });
});
