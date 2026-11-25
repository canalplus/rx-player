import { describe, it, expect } from "vitest";
import type { IEMSG } from "../../../../../src/parsers/containers/isobmff/index.ts";
import getEventsOutOfEMSGs from "../../../../../src/transports/dash/get_events_out_of_emsgs.ts";
import { concat } from "../../../../../src/utils/byte_parsing.ts";
import { strToUtf8 } from "../../../../../src/utils/string_parsing.ts";

/**
 * Create a parsed MPD validity expiration EMSG.
 * @param {Uint8Array} messageData
 * @returns {Object}
 */
function createRefreshEmsg(messageData: Uint8Array): IEMSG {
  return {
    schemeIdUri: "urn:mpeg:dash:event:2012",
    value: "1",
    timescale: 1,
    presentationTimeDelta: 0,
    eventDuration: 0xffffffff,
    id: 1,
    messageData,
  };
}

/** Manifest `publishTime`, in seconds, as our Manifest stores it. */
const manifestPublishTime = Date.parse("2024-01-01T10:00:00Z") / 1000;

describe("getEventsOutOfEMSGs", () => {
  it("should return undefined if there's no EMSG", () => {
    expect(getEventsOutOfEMSGs([], manifestPublishTime)).toBe(undefined);
  });

  it("should not refresh if the event's publishTime is older than the Manifest's", () => {
    const emsg = createRefreshEmsg(strToUtf8("2024-01-01T09:59:59Z"));
    expect(getEventsOutOfEMSGs([emsg], manifestPublishTime)).toEqual({
      needsManifestRefresh: false,
      inbandEvents: undefined,
    });
  });

  it("should refresh if the event's publishTime is the same as the Manifest's", () => {
    const emsg = createRefreshEmsg(strToUtf8("2024-01-01T10:00:00Z"));
    expect(getEventsOutOfEMSGs([emsg], manifestPublishTime)?.needsManifestRefresh).toBe(
      true,
    );
  });

  it("should refresh if the event's publishTime is newer than the Manifest's", () => {
    const emsg = createRefreshEmsg(strToUtf8("2024-01-01T10:00:01Z"));
    expect(getEventsOutOfEMSGs([emsg], manifestPublishTime)?.needsManifestRefresh).toBe(
      true,
    );
  });

  it("should handle a null-terminated publishTime", () => {
    const older = createRefreshEmsg(
      concat(strToUtf8("2024-01-01T09:59:59Z"), new Uint8Array([0])),
    );
    expect(getEventsOutOfEMSGs([older], manifestPublishTime)?.needsManifestRefresh).toBe(
      false,
    );
    const newer = createRefreshEmsg(
      concat(strToUtf8("2024-01-01T10:00:01Z"), new Uint8Array([0])),
    );
    expect(getEventsOutOfEMSGs([newer], manifestPublishTime)?.needsManifestRefresh).toBe(
      true,
    );
  });

  it("should refresh if the event's publishTime cannot be parsed", () => {
    const emsg = createRefreshEmsg(strToUtf8("not a date"));
    expect(getEventsOutOfEMSGs([emsg], manifestPublishTime)?.needsManifestRefresh).toBe(
      true,
    );
  });

  it("should refresh if any of the refresh events asks for it", () => {
    const older = createRefreshEmsg(strToUtf8("2024-01-01T09:00:00Z"));
    const newer = createRefreshEmsg(strToUtf8("2024-01-01T11:00:00Z"));
    expect(
      getEventsOutOfEMSGs([older, newer], manifestPublishTime)?.needsManifestRefresh,
    ).toBe(true);
  });

  it("should return other events as inband events", () => {
    const refresh = createRefreshEmsg(strToUtf8("2024-01-01T09:00:00Z"));
    const other: IEMSG = {
      schemeIdUri: "urn:other",
      value: "x",
      timescale: 1,
      presentationTimeDelta: 0,
      eventDuration: 0,
      id: 2,
      messageData: new Uint8Array([1]),
    };
    expect(getEventsOutOfEMSGs([refresh, other], manifestPublishTime)).toEqual({
      needsManifestRefresh: false,
      inbandEvents: [{ type: "emsg", value: other }],
    });
  });
});
