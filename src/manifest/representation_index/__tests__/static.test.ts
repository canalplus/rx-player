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

import log from "../../../log";
import StaticRepresentationIndex from "../static";

describe("manifest - StaticRepresentationIndex", () => {
  it("should return no init segment", () => {
    const staticRI = new StaticRepresentationIndex({ media: "foo" });
    expect(staticRI.getInitSegment()).toBe(null);
  });

  it("should return a single segment with the maximum duration and the right url", () => {
    const staticRI = new StaticRepresentationIndex({ media: "foo" });
    expect(staticRI.getSegments()).toEqual([{ id: "0",
                                              isInit: false,
                                              number: 0,
                                              time: 0,
                                              duration: Number.MAX_VALUE,
                                              timescale: 1,
                                              mediaURLs: ["foo"] }]);
  });

  it("should return no first position", () => {
    const staticRI = new StaticRepresentationIndex({ media: "foo" });
    expect(staticRI.getFirstPosition()).toBe(undefined);
  });

  it("should return no last position", () => {
    const staticRI = new StaticRepresentationIndex({ media: "foo" });
    expect(staticRI.getLastPosition()).toBe(undefined);
  });

  it("should never be refreshed", () => {
    const staticRI = new StaticRepresentationIndex({ media: "foo" });
    expect(staticRI.shouldRefresh()).toBe(false);
  });

  it("should never have a discontinuity", () => {
    const staticRI = new StaticRepresentationIndex({ media: "foo" });
    expect(staticRI.checkDiscontinuity()).toBe(-1);
  });

  it("should never add segments and warn when trying to do so", () => {
    const spy = jest.fn();
    jest.spyOn(log, "warn").mockImplementation(spy);
    const staticRI = new StaticRepresentationIndex({ media: "foo" });

    staticRI._addSegments();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(staticRI.getSegments().length).toBe(1);
  });

  it("should never replace and warn when trying to do so", () => {
    const spy = jest.fn();
    jest.spyOn(log, "warn").mockImplementation(spy);
    const staticRI = new StaticRepresentationIndex({ media: "foo" });

    staticRI._replace();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
