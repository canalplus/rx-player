import { describe, it, expect } from "vitest";
import type { IManifest } from "../../../../../../../src/manifest/index.ts";
import parseFromString from "../../../../../../../src/parsers/manifest/dash/js-parser/parse_from_xml_string.ts";

describe("parseFromString", () => {
  it("throws root if not MPD", function () {
    const xml = "<foo></foo>";

    expect(function () {
      parseFromString(xml, {
        url: "",
        externalClockOffset: 10,
        unsafelyBaseOnPreviousManifest: null,
      });
    }).toThrow("document root should be MPD");

    expect(function () {
      const prevManifest = {} as unknown as IManifest;
      parseFromString(xml, {
        url: "",
        unsafelyBaseOnPreviousManifest: prevManifest,
      });
    }).toThrow("document root should be MPD");
  });

  it("uses the manifest URL as refresh URL when no Location is present", () => {
    const response = parseFromString("<MPD><Period /></MPD>", {
      url: "https://example.com/path/manifest.mpd",
      unsafelyBaseOnPreviousManifest: null,
    });

    expect(response.type).toBe("done");
    if (response.type === "done") {
      expect(response.value.parsed.refreshUrls).toEqual([
        { baseUrl: "https://example.com/path/manifest.mpd", id: undefined },
      ]);
    }
  });

  it("uses Locations instead of the manifest URL for refreshes", () => {
    const response = parseFromString(
      '<MPD><Location serviceLocation="first">refresh.mpd</Location>' +
        '<Location serviceLocation="second">https://other.example/manifest.mpd</Location>' +
        "<Period /></MPD>",
      {
        url: "https://example.com/path/manifest.mpd",
        unsafelyBaseOnPreviousManifest: null,
      },
    );

    expect(response.type).toBe("done");
    if (response.type === "done") {
      expect(response.value.parsed.refreshUrls).toEqual([
        { baseUrl: "https://example.com/path/refresh.mpd", id: "first" },
        { baseUrl: "https://other.example/manifest.mpd", id: "second" },
      ]);
    }
  });

  it("warns and ignores a relative Location when the manifest URL is unknown", () => {
    const response = parseFromString(
      "<MPD><Location>refresh.mpd</Location><Period /></MPD>",
      {
        unsafelyBaseOnPreviousManifest: null,
      },
    );

    expect(response.type).toBe("done");
    if (response.type === "done") {
      expect(response.value.parsed.refreshUrls).toEqual([]);
      expect(response.value.warnings).toHaveLength(1);
      expect(response.value.warnings[0].message).toBe(
        'DASH Parser: Cannot resolve relative <Location> URL without a manifest URL: "refresh.mpd"',
      );
    }
  });

  it("keeps an absolute Location when the manifest URL is unknown", () => {
    const response = parseFromString(
      "<MPD><Location>https://example.com/refresh.mpd</Location><Period /></MPD>",
      { unsafelyBaseOnPreviousManifest: null },
    );

    expect(response.type).toBe("done");
    if (response.type === "done") {
      expect(response.value.parsed.refreshUrls).toEqual([
        { baseUrl: "https://example.com/refresh.mpd", id: undefined },
      ]);
      expect(response.value.warnings).toEqual([]);
    }
  });

  it("resolves an empty Location to the manifest URL and keeps its serviceLocation", () => {
    const response = parseFromString(
      '<MPD><Location serviceLocation="origin" /><Period /></MPD>',
      {
        url: "https://example.com/path/manifest.mpd",
        unsafelyBaseOnPreviousManifest: null,
      },
    );

    expect(response.type).toBe("done");
    if (response.type === "done") {
      expect(response.value.parsed.refreshUrls).toEqual([
        { baseUrl: "https://example.com/path/manifest.mpd", id: "origin" },
      ]);
    }
  });

  it("ignores an empty Location when the manifest URL is unknown", () => {
    const response = parseFromString(
      '<MPD><Location serviceLocation="origin" /><Period /></MPD>',
      { unsafelyBaseOnPreviousManifest: null },
    );

    expect(response.type).toBe("done");
    if (response.type === "done") {
      expect(response.value.parsed.refreshUrls).toEqual([]);
      expect(response.value.warnings).toHaveLength(1);
      expect(response.value.warnings[0].message).toBe(
        'DASH Parser: Cannot resolve relative <Location> URL without a manifest URL: ""',
      );
    }
  });
});
