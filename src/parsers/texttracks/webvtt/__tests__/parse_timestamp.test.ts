import { describe, it, expect } from "vitest";
import parseTimestamp from "../parse_timestamp";

const time1 = "00:00:31.080";
const time2 = "00:18:01";
const time3 = "00:31.070";
const notTime1 = "1";
const notTime2 = "a";

describe("parsers - webvtt - parseTimestamp", () => {
  it("should correctly parse textual time into seconds", () => {
    expect(parseTimestamp(time1)).toEqual(31.08);
    expect(parseTimestamp(time2)).toEqual(1081);
    expect(parseTimestamp(time3)).toEqual(31.07);
  });

  it("should return undefined for invalid textual time", () => {
    expect(parseTimestamp(notTime1)).toEqual(undefined);
    expect(parseTimestamp(notTime2)).toEqual(undefined);
    expect(parseTimestamp("bb:44:12.0")).toEqual(undefined);
    expect(parseTimestamp("11:cc:12.0")).toEqual(undefined);
    expect(parseTimestamp("11:44:dd.c")).toEqual(undefined);
  });
});
