import { describe, it, expect } from "vitest";
import parseTimestamp from "../parse_timestamp";

const time1 = "00:00:31.080";
const time2 = "00:18:01";
const notTime1 = "1";
const notTime2 = "a";
const notTime3 = "00:31.080";

describe("parsers - srt - parseTimestamp", () => {
  it("should correctly parse textual time into seconds", () => {
    expect(parseTimestamp(time1)).toEqual(31.08);
    expect(parseTimestamp(time2)).toEqual(1081);
  });

  it("should return undefined for invalid textual time", () => {
    expect(parseTimestamp(notTime1)).toEqual(undefined);
    expect(parseTimestamp(notTime2)).toEqual(undefined);
    expect(parseTimestamp(notTime3)).toEqual(undefined);
  });
});
