import { describe, expect, it } from "vitest";
import mergeRequestHeaders from "../../../../../src/transports/utils/merge_request_headers.ts";

describe("mergeRequestHeaders", () => {
  it("should return undefined when no headers are given", () => {
    expect(mergeRequestHeaders(undefined, undefined)).toBeUndefined();
  });

  it("should merge custom and RxPlayer headers", () => {
    expect(
      mergeRequestHeaders(
        { Range: "bytes=0-10" },
        { Authorization: "token", ["X-Custom"]: "custom" },
      ),
    ).toEqual({
      Authorization: "token",
      ["X-Custom"]: "custom",
      Range: "bytes=0-10",
    });
  });

  it("should give precedence to custom headers independently of casing", () => {
    expect(
      mergeRequestHeaders(
        { Range: "bytes=0-10", ["CMCD-Object"]: "rxplayer-cmcd" },
        { range: "custom-range", ["Cmcd-Object"]: "custom-cmcd" },
      ),
    ).toEqual({
      range: "custom-range",
      ["Cmcd-Object"]: "custom-cmcd",
    });
  });
});
