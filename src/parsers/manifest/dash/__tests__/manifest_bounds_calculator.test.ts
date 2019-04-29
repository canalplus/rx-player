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

import ManifestBoundsCalculator from "../manifest_bounds_calculator";

describe("DASH parsers - ManifestBoundsCalculator", () => {
  /* tslint:disable max-line-length */
  it("should return undefined through `getMinimumBound` if the live edge was never set for a dynamic content with a timeShiftBufferDepth", () => {
  /* tslint:enable max-line-length */
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      isDynamic: true,
      timeShiftBufferDepth: 5,
    });
    expect(manifestBoundsCalculator.getMinimumBound()).toEqual(undefined);
    expect(manifestBoundsCalculator.getMinimumBound()).toEqual(undefined);
    expect(manifestBoundsCalculator.getMinimumBound()).toEqual(undefined);
  });

  /* tslint:disable max-line-length */
  it("should return 0 through `getMinimumBound` if the live edge was never set for a static content", () => {
  /* tslint:enable max-line-length */
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      isDynamic: false,
      timeShiftBufferDepth: 5,
    });
    expect(manifestBoundsCalculator.getMinimumBound()).toEqual(0);
    expect(manifestBoundsCalculator.getMinimumBound()).toEqual(0);
    expect(manifestBoundsCalculator.getMinimumBound()).toEqual(0);
  });

  /* tslint:disable max-line-length */
  it("should return 0 through `getMinimumBound` if the live edge was never set for a dynamic content with no timeShiftBufferDepth", () => {
  /* tslint:enable max-line-length */
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      isDynamic: false,
    });
    expect(manifestBoundsCalculator.getMinimumBound()).toEqual(0);
    expect(manifestBoundsCalculator.getMinimumBound()).toEqual(0);
    expect(manifestBoundsCalculator.getMinimumBound()).toEqual(0);
  });

  /* tslint:disable max-line-length */
  it("should return `false` through `lastPositionIsKnown` if `setLastPositionOffset` was never called", () => {
  /* tslint:enable max-line-length */
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      isDynamic: true,
      timeShiftBufferDepth: 5,
    });
    expect(manifestBoundsCalculator.lastPositionIsKnown()).toEqual(false);
    expect(manifestBoundsCalculator.getMinimumBound()).toEqual(undefined);
    expect(manifestBoundsCalculator.lastPositionIsKnown()).toEqual(false);
  });

  /* tslint:disable max-line-length */
  it("should return `true` through `lastPositionIsKnown` if `setLastPositionOffset` was called for a dynamic content", () => {
  /* tslint:enable max-line-length */
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      isDynamic: true,
      timeShiftBufferDepth: 5,
    });
    manifestBoundsCalculator.setLastPosition(1000, 0);
    expect(manifestBoundsCalculator.lastPositionIsKnown()).toEqual(true);
  });

  /* tslint:disable max-line-length */
  it("should return `true` through `lastPositionIsKnown` if `setLastPositionOffset` was called for a non dynamic content", () => {
  /* tslint:enable max-line-length */
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      isDynamic: false,
      timeShiftBufferDepth: 5,
    });
    manifestBoundsCalculator.setLastPosition(1000, 0);
    expect(manifestBoundsCalculator.lastPositionIsKnown()).toEqual(true);
  });

  /* tslint:disable max-line-length */
  it("should return how much time has elapsed through `getMinimumBound` since the live edge was set for a dynamic content", () => {
  /* tslint:enable max-line-length */
    let date = 5000;
    const performanceSpy = jest.spyOn(performance, "now")
      .mockImplementation(jest.fn(() => date));
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      isDynamic: true,
      timeShiftBufferDepth: 5,
    });
    manifestBoundsCalculator.setLastPosition(1000, 10);
    date = 25000;
    expect(manifestBoundsCalculator.getMinimumBound()).toEqual(1010);
    date = 35000;
    expect(manifestBoundsCalculator.getMinimumBound()).toEqual(1020);
    performanceSpy.mockRestore();
  });

  /* tslint:disable max-line-length */
  it("should return 0 even when a last position has been set for a static content", () => {
  /* tslint:enable max-line-length */
    let date = 5000;
    const performanceSpy = jest.spyOn(performance, "now")
      .mockImplementation(jest.fn(() => date));
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      isDynamic: false,
      timeShiftBufferDepth: 5,
    });
    manifestBoundsCalculator.setLastPosition(1000, 0);
    date = 25000;
    expect(manifestBoundsCalculator.getMinimumBound()).toEqual(0);
    date = 35000;
    expect(manifestBoundsCalculator.getMinimumBound()).toEqual(0);
    performanceSpy.mockRestore();
  });

  /* tslint:disable max-line-length */
  it("should authorize and handle multiple `setLastPositionOffset` calls for dynamic contents", () => {
  /* tslint:enable max-line-length */
    let date = 5000;
    const performanceSpy = jest.spyOn(performance, "now")
      .mockImplementation(jest.fn(() => date));
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      isDynamic: true,
      timeShiftBufferDepth: 5,
    });
    manifestBoundsCalculator.setLastPosition(1000, 0);
    date = 50000;
    expect(manifestBoundsCalculator.getMinimumBound()).toEqual(1045);
    manifestBoundsCalculator.setLastPosition(0, 0);
    date = 55000;
    expect(manifestBoundsCalculator.getMinimumBound()).toEqual(50);
    performanceSpy.mockRestore();
  });
});
