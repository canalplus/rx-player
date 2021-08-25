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

/* eslint-disable no-restricted-properties */

import startsWith from "../starts_with";

/* eslint-disable @typescript-eslint/unbound-method */
const initialStartsWith = String.prototype.startsWith;
/* eslint-enable @typescript-eslint/unbound-method */

describe("utils - starts-with", () => {
  beforeEach(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (String.prototype as any).startsWith = undefined;
    /* eslint-enable @typescript-eslint/no-explicit-any */
  });

  afterEach(() => {
    String.prototype.startsWith = initialStartsWith;
  });

  it("should mirror String.prototype.startsWith behavior", () => {
    expect(startsWith("Kindred", "Kin")).toEqual(true);
    expect(startsWith("Loner", "one", 1)).toEqual(true);
    expect(startsWith("Ashtray Wasp", " ", 7)).toEqual(true);

    expect(startsWith("Rival Dealer", "riv")).toEqual(false);
    expect(startsWith("Hiders", "Hid", 1)).toEqual(false);

    expect(startsWith("Come Down To Us", "")).toEqual(true);
    expect(startsWith("Rough Sleeper", "Ro", -5)).toEqual(true);
    expect(startsWith("", "")).toEqual(true);
  });

  if (typeof initialStartsWith === "function") {
    it("should call the original startsWith function if available", () => {
      String.prototype.startsWith = initialStartsWith;
      const startsWithSpy = jest.spyOn(String.prototype, "startsWith");
      const str = "Street Halo";
      expect(startsWith(str, "Stree")).toBe(true);
      expect(startsWith(str, "Halo")).toBe(false);
      expect(startsWith(str, "Stree", 1)).toBe(false);

      expect(startsWithSpy).toHaveBeenCalledTimes(3);
      expect(startsWithSpy).toHaveBeenNthCalledWith(1, "Stree", undefined);
      expect(startsWithSpy).toHaveBeenNthCalledWith(2, "Halo", undefined);
      expect(startsWithSpy).toHaveBeenNthCalledWith(3, "Stree", 1);
    });
  }
});
