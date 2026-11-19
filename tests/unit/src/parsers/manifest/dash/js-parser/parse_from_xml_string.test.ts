import { afterEach, describe, it, expect, vi } from "vitest";
import getInitialTime from "../../../../../../../src/main_thread/init/utils/get_initial_time.ts";
import Manifest from "../../../../../../../src/manifest/classes/manifest.ts";
import type { IManifest } from "../../../../../../../src/manifest/index.ts";
import parseFromString from "../../../../../../../src/parsers/manifest/dash/js-parser/parse_from_xml_string.ts";

describe("parseFromString", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    { availabilityTimeOffset: -15.559, expectedTip: 84, expectedStart: 74 },
    { availabilityTimeOffset: 0, expectedTip: 100, expectedStart: 90 },
    { availabilityTimeOffset: 5, expectedTip: 100, expectedStart: 90 },
  ])(
    "uses the available timeline tip for initial positioning with ATO=$availabilityTimeOffset",
    ({ availabilityTimeOffset, expectedTip, expectedStart }) => {
      vi.spyOn(performance, "now").mockReturnValue(0);
      const xml = `
        <MPD type="dynamic" availabilityStartTime="1970-01-01T00:00:00Z"
             minimumUpdatePeriod="PT2S" minBufferTime="PT1S">
          <Period start="PT30S">
            <AdaptationSet contentType="video" mimeType="video/mp4">
              <SegmentTemplate timescale="1000" presentationTimeOffset="90000"
                               media="$Time$.m4s"
                               availabilityTimeOffset="${availabilityTimeOffset}">
                <SegmentTimeline><S t="120000" d="2000" r="19"/></SegmentTimeline>
              </SegmentTemplate>
              <Representation id="video" bandwidth="1000000" codecs="avc1.4D401E"/>
            </AdaptationSet>
          </Period>
          <UTCTiming schemeIdUri="urn:mpeg:dash:utc:direct:2014"
                     value="1970-01-01T00:01:40Z"/>
        </MPD>`;
      const result = parseFromString(xml, {
        unsafelyBaseOnPreviousManifest: null,
        manifestReceivedTime: 0,
      });

      expect(result.type).toBe("done");
      if (result.type !== "done") {
        throw new Error("Unexpected external resource request");
      }
      expect(result.value.parsed.timeBounds.maximumTimeData.maximumSafePosition).toBe(
        expectedTip,
      );
      const manifest = new Manifest(result.value.parsed, {});
      expect(getInitialTime(manifest, false)).toBe(expectedStart);
    },
  );

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
});
