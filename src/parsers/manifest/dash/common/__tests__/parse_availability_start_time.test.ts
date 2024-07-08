import { describe, it, expect } from "vitest";
import parseAvailabilityStartTime from "../parse_availability_start_time";

describe("parseAvailabilityStartTime", function () {
  it("should return 0 for a non-dynamic MPD", () => {
    expect(parseAvailabilityStartTime({ type: "static" }, 100)).toEqual(0);
    expect(parseAvailabilityStartTime({}, 100)).toEqual(0);
    expect(parseAvailabilityStartTime({ type: "static" })).toEqual(0);
    expect(parseAvailabilityStartTime({})).toEqual(0);

    expect(
      parseAvailabilityStartTime({
        type: "static",
        availabilityStartTime: 5,
      }),
    ).toEqual(0);

    expect(
      parseAvailabilityStartTime(
        {
          type: "static",
          availabilityStartTime: 5,
        },
        10,
      ),
    ).toEqual(0);
  });

  it("should return the availabilityStartTime if set for dynamic contents", () => {
    expect(
      parseAvailabilityStartTime({
        type: "dynamic",
        availabilityStartTime: 5,
      }),
    ).toEqual(5);
    expect(
      parseAvailabilityStartTime(
        {
          type: "dynamic",
          availabilityStartTime: 6,
        },
        100,
      ),
    ).toEqual(6);
  });

  it("should return the referenceDateTime if set and no availabilityStartTime if set for dynamic contents", () => {
    expect(
      parseAvailabilityStartTime(
        {
          type: "dynamic",
        },
        100,
      ),
    ).toEqual(100);
  });

  it("should return `0` if neither a referenceDateTime is given nor an availabilityStartTime is set for dynamic contents", () => {
    expect(
      parseAvailabilityStartTime({
        type: "dynamic",
      }),
    ).toEqual(0);
  });
});
