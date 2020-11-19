/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import parseAvailabilityStartTime from "../parse_availability_start_time";

describe("parseAvailabilityStartTime", function() {
  it("should return 0 for a non-dynamic MPD", () => {
    expect(parseAvailabilityStartTime({ type: "static" }, 100)).toEqual(0);
    expect(parseAvailabilityStartTime({}, 100)).toEqual(0);
    expect(parseAvailabilityStartTime({ type: "static" })).toEqual(0);
    expect(parseAvailabilityStartTime({})).toEqual(0);

    expect(parseAvailabilityStartTime({
      type: "static",
      availabilityStartTime: 5,
    })).toEqual(0);

    expect(parseAvailabilityStartTime({
      type: "static",
      availabilityStartTime: 5,
    }, 10)).toEqual(0);
  });

  it("should return the availabilityStartTime if set for dynamic contents", () => {
    expect(parseAvailabilityStartTime({
      type: "dynamic",
      availabilityStartTime: 5,
    })).toEqual(5);
    expect(parseAvailabilityStartTime({
      type: "dynamic",
      availabilityStartTime: 6,
    }, 100)).toEqual(6);
  });

  /* eslint-disable max-len */
  it("should return the referenceDateTime if set and no availabilityStartTime if set for dynamic contents", () => {
  /* eslint-enable max-len */
    expect(parseAvailabilityStartTime({
      type: "dynamic",
    }, 100)).toEqual(100);
  });

  /* eslint-disable max-len */
  it("should return `0` if neither a referenceDateTime is given nor an availabilityStartTime is set for dynamic contents", () => {
  /* eslint-enable max-len */
    expect(parseAvailabilityStartTime({
      type: "dynamic",
    })).toEqual(0);
  });
});
