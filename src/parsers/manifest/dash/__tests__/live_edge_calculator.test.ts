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

import LiveEdgeCalculator from "../live_edge_calculator";

describe("DASH parsers - LiveEdgeCalculator", () => {
  /* tslint:disable max-line-length */
  it("should return undefined through `getCurrentLiveEdge` if the live edge was never set", () => {
  /* tslint:enable max-line-length */
    const liveEdgeCalculator = new LiveEdgeCalculator();
    expect(liveEdgeCalculator.getCurrentLiveEdge()).toEqual(undefined);
    expect(liveEdgeCalculator.getCurrentLiveEdge()).toEqual(undefined);
    expect(liveEdgeCalculator.getCurrentLiveEdge()).toEqual(undefined);
  });

  /* tslint:disable max-line-length */
  it("should return `false` through `knowCurrentLiveEdge` if `setLiveEdgeOffset` was never called", () => {
  /* tslint:enable max-line-length */
    const liveEdgeCalculator = new LiveEdgeCalculator();
    expect(liveEdgeCalculator.knowCurrentLiveEdge()).toEqual(false);
    expect(liveEdgeCalculator.getCurrentLiveEdge()).toEqual(undefined);
    expect(liveEdgeCalculator.knowCurrentLiveEdge()).toEqual(false);
  });

  /* tslint:disable max-line-length */
  it("should return `true` through `knowCurrentLiveEdge` if `setLiveEdgeOffset` was called", () => {
  /* tslint:enable max-line-length */
    const liveEdgeCalculator = new LiveEdgeCalculator();
    liveEdgeCalculator.setLiveEdgeOffset(1000);
    expect(liveEdgeCalculator.knowCurrentLiveEdge()).toEqual(true);
  });

  /* tslint:disable max-line-length */
  it("should return how much time has elapsed through `getCurrentLiveEdge` since the live edge was set", () => {
  /* tslint:enable max-line-length */
    let date = 5000;
    const performanceSpy = jest.spyOn(performance, "now")
      .mockImplementation(jest.fn(() => date));
    const liveEdgeCalculator = new LiveEdgeCalculator();
    liveEdgeCalculator.setLiveEdgeOffset(1000);
    date = 15000;
    expect(liveEdgeCalculator.getCurrentLiveEdge()).toEqual(1015);
    date = 25000;
    expect(liveEdgeCalculator.getCurrentLiveEdge()).toEqual(1025);
    performanceSpy.mockRestore();
  });

  it("should authorize and handle multiple `setLiveEdgeOffset` calls", () => {
    let date = 5000;
    const performanceSpy = jest.spyOn(performance, "now")
      .mockImplementation(jest.fn(() => date));
    const liveEdgeCalculator = new LiveEdgeCalculator();
    liveEdgeCalculator.setLiveEdgeOffset(1000);
    date = 20000;
    expect(liveEdgeCalculator.getCurrentLiveEdge()).toEqual(1020);
    liveEdgeCalculator.setLiveEdgeOffset(0);
    date = 25000;
    expect(liveEdgeCalculator.getCurrentLiveEdge()).toEqual(25);
    performanceSpy.mockRestore();
  });
});
