import { describe, it, expect, beforeEach, vi } from "vitest";
import CmcdDataBuilder from "../cmcd_data_builder.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

const { mockLogDebug, mockCreateUuid, mockGetRelativeUrl } = vi.hoisted(() => {
  return {
    mockLogDebug: vi.fn(),
    mockCreateUuid: vi.fn(() => "test-uuid"),
    mockGetRelativeUrl: vi.fn(),
  };
});

vi.mock("../../../log", () => ({
  default: {
    debug: mockLogDebug,
  },
}));

vi.mock("../../../utils/create_uuid", () => ({
  default: mockCreateUuid,
}));

vi.mock("../../../utils/url-utils", () => ({
  getRelativeUrl: mockGetRelativeUrl,
}));

/** Helpers */
function makePlaybackObserver(
  overrides: Partial<{
    rebuffering: object | null;
    speed: number;
    buffered: Record<string, Array<{ start: number; end: number }> | null>;
    position: { getWanted: () => number | undefined; getPolled: () => number };
  }> = {},
): any {
  const obs = {
    rebuffering: null,
    speed: 1,
    buffered: { video: null, audio: null, text: null },
    position: {
      getWanted: () => 10,
      getPolled: () => 10,
    },
    ...overrides,
  };

  const getReference = vi.fn(() => ({ getValue: () => obs }));
  const getCurrentTime = vi.fn(() => 10);
  const listen = vi.fn((cb: (o: typeof obs) => void, _opts: unknown) => {
    cb(obs);
  });

  return { getReference, getCurrentTime, listen, obs };
}

function makeRepresentation(bitrate: number, playable = true) {
  return {
    bitrate,
    isPlayable: vi.fn(() => (playable ? true : false)),
  };
}

function makeSegmentInfo(
  overrides: Partial<{
    nextSegment: object | null | undefined;
    isInit: boolean;
    segmentUrl: string | null;
    nextSegmentUrl: string | null;
  }> = {},
): any {
  const {
    nextSegment,
    isInit = false,
    segmentUrl = "https://cdn.example.com/video/seg1.m4s",
    nextSegmentUrl = "https://cdn.example.com/video/seg2.m4s",
  } = overrides;

  const representations = [makeRepresentation(2_000_000), makeRepresentation(4_000_000)];

  return {
    manifest: { transport: "dash", isDynamic: false },
    period: {},
    adaptation: {
      type: "video",
      representations,
    },
    representation: { bitrate: 2_000_000 },
    segment: {
      duration: 4,
      url: segmentUrl,
      isInit,
      range: undefined,
      indexRange: undefined,
    },
    nextSegment:
      nextSegment !== undefined
        ? nextSegment
        : {
            url: nextSegmentUrl,
            isInit: false,
            range: undefined,
            indexRange: undefined,
          },
  };
}

describe("CmcdDataBuilder", () => {
  beforeEach(() => {
    mockCreateUuid.mockReturnValue("test-uuid");
    mockGetRelativeUrl.mockReturnValue(null);
  });

  describe("constructor", () => {
    it("uses provided sessionId and contentId", () => {
      const builder = new CmcdDataBuilder({
        sessionId: "my-session",
        contentId: "my-content",
        communicationType: "query",
      });
      const payload: any = builder.getCmcdDataForManifest("dash");
      expect(payload.type).toBe("query");
      const qs = decodeURIComponent(payload.value[0][1]);
      expect(qs).toContain("my-session");
      expect(qs).toContain("my-content");
    });

    it("generates UUIDs when sessionId/contentId not provided", () => {
      mockCreateUuid
        .mockReturnValueOnce("uuid-session")
        .mockReturnValueOnce("uuid-content");
      const builder = new CmcdDataBuilder({ communicationType: "query" });
      const payload: any = builder.getCmcdDataForManifest("dash");
      const qs = decodeURIComponent(payload.value[0][1]);
      expect(qs).toContain("uuid-session");
      expect(qs).toContain("uuid-content");
    });
  });

  describe("getCmcdDataForManifest", () => {
    it("returns headers payload when communicationType is headers", () => {
      const builder = new CmcdDataBuilder({
        sessionId: "s1",
        contentId: "c1",
        communicationType: "headers",
      });
      const payload: any = builder.getCmcdDataForManifest("dash");
      expect(payload.type).toBe("headers");
      expect(payload.value).toHaveProperty("CMCD-Object");
      expect(payload.value).toHaveProperty("CMCD-Session");
    });

    it("returns query payload when communicationType is query", () => {
      const builder = new CmcdDataBuilder({
        sessionId: "s1",
        contentId: "c1",
        communicationType: "query",
      });
      const payload: any = builder.getCmcdDataForManifest("dash");
      expect(payload.type).toBe("query");
    });

    it("sets ot=m for manifest", () => {
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const payload: any = builder.getCmcdDataForManifest("dash");
      const objectHeader = payload.value["CMCD-Object"];
      expect(objectHeader).toContain("ot=m");
    });

    it("sets sf=d for dash transport", () => {
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const payload: any = builder.getCmcdDataForManifest("dash");
      const sessionHeader = payload.value["CMCD-Session"];
      expect(sessionHeader).toContain("sf=d");
    });

    it("sets sf=s for smooth transport", () => {
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const payload: any = builder.getCmcdDataForManifest("smooth");
      const sessionHeader = payload.value["CMCD-Session"];
      expect(sessionHeader).toContain("sf=s");
    });

    it("sets sf=o for unknown transport", () => {
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const payload: any = builder.getCmcdDataForManifest("hls");
      const sessionHeader = payload.value["CMCD-Session"];
      expect(sessionHeader).toContain("sf=o");
    });
  });

  describe("getCmcdDataForSegmentRequest", () => {
    it("sets br from representation bitrate (in kbps)", () => {
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const payload: any = builder.getCmcdDataForSegmentRequest(makeSegmentInfo());
      const objectHeader = payload.value["CMCD-Object"];
      expect(objectHeader).toContain("br=2000");
    });

    it("sets d from segment duration (in ms)", () => {
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const payload: any = builder.getCmcdDataForSegmentRequest(makeSegmentInfo());
      const objectHeader = payload.value["CMCD-Object"];
      expect(objectHeader).toContain("d=4000");
    });

    it("sets ot=v for video segments", () => {
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const payload: any = builder.getCmcdDataForSegmentRequest(makeSegmentInfo());
      const objectHeader = payload.value["CMCD-Object"];
      expect(objectHeader).toContain("ot=v");
    });

    it("sets ot=a for audio segments", () => {
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const info = makeSegmentInfo();
      info.adaptation.type = "audio";
      const payload: any = builder.getCmcdDataForSegmentRequest(info);
      const objectHeader = payload.value["CMCD-Object"];
      expect(objectHeader).toContain("ot=a");
    });

    it("sets ot=c for text segments", () => {
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const info = makeSegmentInfo();
      info.adaptation.type = "text";
      const payload: any = builder.getCmcdDataForSegmentRequest(info);
      const objectHeader = payload.value["CMCD-Object"];
      expect(objectHeader).toContain("ot=c");
    });

    it("overrides ot to i for init segments", () => {
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const info = makeSegmentInfo({ isInit: true });
      const payload: any = builder.getCmcdDataForSegmentRequest(info);
      const objectHeader = payload.value["CMCD-Object"];
      expect(objectHeader).toContain("ot=i");
    });

    it("sets st=v for VOD", () => {
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const payload: any = builder.getCmcdDataForSegmentRequest(makeSegmentInfo());
      const sessionHeader = payload.value["CMCD-Session"];
      expect(sessionHeader).toContain("st=v");
    });

    it("sets st=l for live", () => {
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const info = makeSegmentInfo();
      info.manifest.isDynamic = true;
      const payload: any = builder.getCmcdDataForSegmentRequest(info);
      const sessionHeader = payload.value["CMCD-Session"];
      expect(sessionHeader).toContain("st=l");
    });

    it("sets tb to the highest playable bitrate in kbps", () => {
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const payload: any = builder.getCmcdDataForSegmentRequest(makeSegmentInfo());
      const objectHeader = payload.value["CMCD-Object"];
      expect(objectHeader).toContain("tb=4000");
    });

    it("ignores non-playable representations when computing tb", () => {
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const info = makeSegmentInfo();
      info.adaptation.representations = [
        makeRepresentation(6_000_000, false),
        makeRepresentation(2_000_000, true),
      ];
      const payload: any = builder.getCmcdDataForSegmentRequest(info);
      const objectHeader = payload.value["CMCD-Object"];
      expect(objectHeader).toContain("tb=2000");
    });

    it("sets nor when nextSegment has a relative url", () => {
      mockGetRelativeUrl.mockReturnValue("seg2.m4s");
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const payload: any = builder.getCmcdDataForSegmentRequest(makeSegmentInfo());
      const requestHeader = payload.value["CMCD-Request"];
      expect(requestHeader).toContain("nor=");
    });

    it("does not set nor when relative url is '.' (same file)", () => {
      mockGetRelativeUrl.mockReturnValue(".");
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const payload: any = builder.getCmcdDataForSegmentRequest(makeSegmentInfo());
      const requestHeader = payload.value["CMCD-Request"];
      expect(requestHeader).not.toContain("nor=");
    });

    it("does not set nor when nextSegment is null", () => {
      mockGetRelativeUrl.mockReturnValue("seg2.m4s");
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const payload: any = builder.getCmcdDataForSegmentRequest(
        makeSegmentInfo({ nextSegment: null }),
      );
      const requestHeader = payload.value["CMCD-Request"];
      expect(requestHeader).not.toContain("nor=");
    });

    it("sets nrr when next segment has a range", () => {
      mockGetRelativeUrl.mockReturnValue("seg2.m4s");
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const info = makeSegmentInfo();
      (info.nextSegment as { range: [number, number] }).range = [0, 999];
      const payload: any = builder.getCmcdDataForSegmentRequest(info);
      const requestHeader = payload.value["CMCD-Request"];
      expect(requestHeader).toContain("nrr=");
      expect(requestHeader).toContain("0-999");
    });
  });

  describe("updateThroughput + mtp", () => {
    it("includes mtp rounded to nearest 100kbps when throughput is set", () => {
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      builder.updateThroughput("video", 3_450_000); // 3450 kbps → round to 3500
      const payload: any = builder.getCmcdDataForSegmentRequest(makeSegmentInfo());
      const requestHeader = payload.value["CMCD-Request"];
      expect(requestHeader).toContain("mtp=3500");
    });

    it("does not include mtp when throughput is undefined", () => {
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const payload: any = builder.getCmcdDataForSegmentRequest(makeSegmentInfo());
      const requestHeader = payload.value["CMCD-Request"];
      expect(requestHeader).not.toContain("mtp=");
    });
  });

  describe("startMonitoringPlayback / buffer starvation", () => {
    it("sets bs=true when rebuffering was observed, then clears it on next request", () => {
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const observer = makePlaybackObserver({ rebuffering: { timestamp: 0 } });
      builder.startMonitoringPlayback(observer);

      const payload1: any = builder.getCmcdDataForManifest("dash");
      const status1 = payload1.value["CMCD-Status"];
      // bs is a boolean flag - present means true
      expect(status1).toContain("bs");

      // second request - bs should have been reset
      const payload2: any = builder.getCmcdDataForManifest("dash");
      const status2 = payload2.value["CMCD-Status"];
      expect(status2).not.toContain("bs");
    });

    it("includes bl (buffer length) for video when playback observer is set", () => {
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const observer = makePlaybackObserver({
        buffered: {
          video: [{ start: 5, end: 20 }],
          audio: null,
          text: null,
        },
        speed: 1,
        rebuffering: null,
      });
      builder.startMonitoringPlayback(observer);

      const payload: any = builder.getCmcdDataForSegmentRequest(makeSegmentInfo());
      const requestHeader = payload.value["CMCD-Request"];
      // position = 10, range.end = 20 → bufferLength = 10000ms → rounded to 10000
      expect(requestHeader).toContain("bl=10000");
    });

    it("includes pr when playback speed is not 1", () => {
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const observer = makePlaybackObserver({ speed: 2, rebuffering: null });
      builder.startMonitoringPlayback(observer);

      const payload: any = builder.getCmcdDataForManifest("dash");
      const sessionHeader = payload.value["CMCD-Session"];
      expect(sessionHeader).toContain("pr=2");
    });

    it("does not include pr when speed is 1", () => {
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const observer = makePlaybackObserver({ speed: 1, rebuffering: null });
      builder.startMonitoringPlayback(observer);

      const payload: any = builder.getCmcdDataForManifest("dash");
      const sessionHeader = payload.value["CMCD-Session"];
      expect(sessionHeader).not.toContain("pr=");
    });

    it("does not include pr when playback speed is negative", () => {
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const observer = makePlaybackObserver({ speed: -1, rebuffering: null });
      builder.startMonitoringPlayback(observer);

      const payload: any = builder.getCmcdDataForManifest("dash");
      const sessionHeader = payload.value["CMCD-Session"];
      expect(sessionHeader).not.toContain("pr=");
    });

    it("includes su when rebuffering is active", () => {
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const observer = makePlaybackObserver({ rebuffering: { timestamp: 0 }, speed: 1 });
      builder.startMonitoringPlayback(observer);

      const payload: any = builder.getCmcdDataForManifest("dash");
      const requestHeader = payload.value["CMCD-Request"];
      expect(requestHeader).toContain("su");
    });

    it("does not include dl or rtp when playback speed is 0", () => {
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const observer = makePlaybackObserver({
        buffered: {
          video: [{ start: 5, end: 20 }],
          audio: null,
          text: null,
        },
        speed: 0,
        rebuffering: null,
      });
      builder.startMonitoringPlayback(observer);

      const payload: any = builder.getCmcdDataForSegmentRequest(makeSegmentInfo());
      const requestHeader = payload.value["CMCD-Request"];
      const statusHeader = payload.value["CMCD-Status"];
      expect(requestHeader).toContain("bl=10000");
      expect(requestHeader).not.toContain("dl=");
      expect(statusHeader).not.toContain("rtp=");
    });
  });

  describe("stopMonitoringPlayback", () => {
    it("clears the playback observer so subsequent calls work without observation data", () => {
      const builder = new CmcdDataBuilder({ communicationType: "headers" });
      const observer = makePlaybackObserver({ speed: 2, rebuffering: null });
      builder.startMonitoringPlayback(observer);
      builder.stopMonitoringPlayback();

      const payload: any = builder.getCmcdDataForManifest("dash");
      const sessionHeader = payload.value["CMCD-Session"];
      // no pr since observer is gone
      expect(sessionHeader).not.toContain("pr=");
    });
  });

  describe("query string output format", () => {
    it("encodes the query string and wraps it as CMCD param", () => {
      const builder = new CmcdDataBuilder({
        sessionId: "s",
        contentId: "c",
        communicationType: "query",
      });
      const payload: any = builder.getCmcdDataForManifest("dash");
      expect(payload.type).toBe("query");
      const value = payload.value;
      expect(value[0][0]).toBe("CMCD");
    });

    it("does not have trailing comma in query string", () => {
      const builder = new CmcdDataBuilder({
        sessionId: "s",
        contentId: "c",
        communicationType: "query",
      });
      const payload: any = builder.getCmcdDataForManifest("dash");
      const qs = decodeURIComponent(payload.value[0][1]);
      expect(qs[qs.length - 1]).not.toBe(",");
    });

    it("does not have trailing comma in headers", () => {
      const builder = new CmcdDataBuilder({
        sessionId: "s",
        contentId: "c",
        communicationType: "headers",
      });
      const payload = builder.getCmcdDataForManifest("dash");
      const headers = payload.value;
      // eslint-disable-next-line no-restricted-properties
      for (const val of Object.values(headers)) {
        if (val.length > 0) {
          expect(val[val.length - 1]).not.toBe(",");
        }
      }
    });

    it("escapes all backslashes and quotes in header strings", () => {
      const builder = new CmcdDataBuilder({
        sessionId: 's\\"id\\tail',
        contentId: 'c\\"id\\tail',
        communicationType: "headers",
      });
      const payload: any = builder.getCmcdDataForManifest("dash");
      const sessionHeader = payload.value["CMCD-Session"];
      expect(sessionHeader).toContain('cid="c\\\\\\"id\\\\tail"');
      expect(sessionHeader).toContain('sid="s\\\\\\"id\\\\tail"');
    });

    it("preserves all backslashes and quotes after query decoding", () => {
      const builder = new CmcdDataBuilder({
        sessionId: 's\\"id\\tail',
        contentId: 'c\\"id\\tail',
        communicationType: "query",
      });
      const payload: any = builder.getCmcdDataForManifest("dash");
      const qs = decodeURIComponent(payload.value[0][1]);
      expect(qs).toContain('cid="c\\\\\\"id\\\\tail"');
      expect(qs).toContain('sid="s\\\\\\"id\\\\tail"');
    });
  });
});
