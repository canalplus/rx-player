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

describe("getEstimateFromBufferLevels", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should return undefined if the current bitrate is undefined", () => {
    const logger = {};
    jest.mock("../../../log", () => ({ default: logger }));
    const getEstimateFromBufferLevels = require("../get_estimate_from_buffer_levels")
      .default;
    expect(getEstimateFromBufferLevels({
      bufferGap: 0,
      playbackRate: 1,
    }, [], [])).toEqual(undefined);
    expect(getEstimateFromBufferLevels({
      bufferGap: 0,
      playbackRate: 1,
    }, [1, 2, 3], [0, 5, 10])).toEqual(undefined);
    expect(getEstimateFromBufferLevels({
      bufferGap: 0,
      playbackRate: 1,
      currentBitrate: undefined,
      currentScore: undefined,
    }, [10, 20], [0, 58])).toEqual(undefined);
    expect(getEstimateFromBufferLevels({
      bufferGap: 0,
      playbackRate: 1,
      currentBitrate: undefined,
      currentScore: 4,
    }, [1, 2, 3], [0, 5, 10])).toEqual(undefined);
    expect(getEstimateFromBufferLevels({
      bufferGap: 0,
      playbackRate: 1,
      currentScore: 1,
    }, [1, 2, 3], [0, 5, 10])).toEqual(undefined);
  });

  /* tslint:disable max-line-length */
  it("should log an error and return the first bitrate if the given bitrate does not exist", () => {
  /* tslint:enable max-line-length */
    const logger = { error: jest.fn() };
    jest.mock("../../../log", () => ({ default: logger }));
    const getEstimateFromBufferLevels = require("../get_estimate_from_buffer_levels")
      .default;

    expect(getEstimateFromBufferLevels({
      bufferGap: 0,
      playbackRate: 1,
      currentBitrate: 30,
      currentScore: undefined,
    }, [10, 20], [0, 58])).toEqual(10);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error)
      .toHaveBeenCalledWith("ABR: Current Bitrate not found in the calculated levels");
  });

  /* tslint:disable max-line-length */
  it("should log an error and return the first bitrate if the given bitrates and levels are of different length", () => {
  /* tslint:enable max-line-length */
    const logger = { error: jest.fn() };
    jest.mock("../../../log", () => ({ default: logger }));
    const getEstimateFromBufferLevels = require("../get_estimate_from_buffer_levels")
      .default;

    expect(getEstimateFromBufferLevels({
      bufferGap: 0,
      playbackRate: 1,
      currentBitrate: 10,
      currentScore: undefined,
    }, [10, 20], [0, 58, 12])).toEqual(10);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error)
      .toHaveBeenCalledWith("ABR: Current Bitrate not found in the calculated levels");
  });

  /* tslint:disable max-line-length */
  it("should go to the next bitrate if the current one is maintainable and we have more buffer than the next level", () => {
  /* tslint:enable max-line-length */
    const logger = {};
    jest.mock("../../../log", () => ({ default: logger }));
    const getEstimateFromBufferLevels = require("../get_estimate_from_buffer_levels")
      .default;
    expect(getEstimateFromBufferLevels({
      bufferGap: 16,
      playbackRate: 1,
      currentBitrate: 10,
      currentScore: 1.01,
    }, [10, 20, 40], [0, 15, 20])).toEqual(20);
    expect(getEstimateFromBufferLevels({
      bufferGap: 30,
      playbackRate: 1,
      currentBitrate: 20,
      currentScore: 1.01,
    }, [10, 20, 40], [0, 15, 20])).toEqual(40);
    expect(getEstimateFromBufferLevels({
      bufferGap: 30,
      playbackRate: 1,
      currentBitrate: 20,
      currentScore: 100,
    }, [10, 20, 40], [0, 15, 20])).toEqual(40);
    expect(getEstimateFromBufferLevels({
      bufferGap: 30,
      playbackRate: 2,
      currentBitrate: 20,
      currentScore: 2.1,
    }, [10, 20, 40], [0, 15, 20])).toEqual(40);
    expect(getEstimateFromBufferLevels({
      bufferGap: 30,
      playbackRate: 2,
      currentBitrate: 20,
      currentScore: 2.1,
    }, [10, 20, 20, 40], [0, 15, 15, 20])).toEqual(40);
    expect(getEstimateFromBufferLevels({
      bufferGap: 30,
      playbackRate: 0, // 0 is a special case
      currentBitrate: 20,
      currentScore: 100,
    }, [10, 20, 40], [0, 15, 20])).toEqual(40);
  });

  /* tslint:disable max-line-length */
  it("should go to the next bitrate if the current one is maintainable and we have the buffer corresponding to the next level", () => {
  /* tslint:enable max-line-length */
    const logger = {};
    jest.mock("../../../log", () => ({ default: logger }));
    const getEstimateFromBufferLevels = require("../get_estimate_from_buffer_levels")
      .default;
    expect(getEstimateFromBufferLevels({
      bufferGap: 15,
      playbackRate: 1,
      currentBitrate: 10,
      currentScore: 1.01,
    }, [10, 20, 40], [0, 15, 20])).toEqual(20);
    expect(getEstimateFromBufferLevels({
      bufferGap: 20,
      playbackRate: 1,
      currentBitrate: 20,
      currentScore: 1.01,
    }, [10, 20, 40], [0, 15, 20])).toEqual(40);
    expect(getEstimateFromBufferLevels({
      bufferGap: 20,
      playbackRate: 1,
      currentBitrate: 20,
      currentScore: 100,
    }, [10, 20, 40], [0, 15, 20])).toEqual(40);
    expect(getEstimateFromBufferLevels({
      bufferGap: 20,
      playbackRate: 2,
      currentBitrate: 20,
      currentScore: 2.1,
    }, [10, 20, 40], [0, 15, 20])).toEqual(40);
    expect(getEstimateFromBufferLevels({
      bufferGap: 20,
      playbackRate: 2,
      currentBitrate: 20,
      currentScore: 2.1,
    }, [10, 20, 20, 40], [0, 15, 15, 20])).toEqual(40);
    expect(getEstimateFromBufferLevels({
      bufferGap: 20,
      playbackRate: 0, // 0 is a special case
      currentBitrate: 20,
      currentScore: 100,
    }, [10, 20, 40], [0, 15, 20])).toEqual(40);
  });

  /* tslint:disable max-line-length */
  it("should stay at the current bitrate if it is maintainable but we have a buffer inferior to the next level", () => {
  /* tslint:enable max-line-length */
    const logger = {};
    jest.mock("../../../log", () => ({ default: logger }));
    const getEstimateFromBufferLevels = require("../get_estimate_from_buffer_levels")
      .default;
    expect(getEstimateFromBufferLevels({
      bufferGap: 14.9,
      playbackRate: 1,
      currentBitrate: 10,
      currentScore: 1.01,
    }, [10, 20, 40], [0, 15, 20])).toEqual(10);
    expect(getEstimateFromBufferLevels({
      bufferGap: 19.9,
      playbackRate: 1,
      currentBitrate: 20,
      currentScore: 1.01,
    }, [10, 20, 40], [0, 15, 20])).toEqual(20);
    expect(getEstimateFromBufferLevels({
      bufferGap: 19.9,
      playbackRate: 1,
      currentBitrate: 20,
      currentScore: 100,
    }, [10, 20, 40], [0, 15, 20])).toEqual(20);
    expect(getEstimateFromBufferLevels({
      bufferGap: 19.9,
      playbackRate: 1,
      currentBitrate: 20,
      currentScore: 100,
    }, [10, 20, 20, 40], [0, 15, 15, 20])).toEqual(20);
    expect(getEstimateFromBufferLevels({
      bufferGap: 19.9,
      playbackRate: 2,
      currentBitrate: 20,
      currentScore: 2.1,
    }, [10, 20, 40], [0, 15, 20])).toEqual(20);
  });

  /* tslint:disable max-line-length */
  it("should stay at the current bitrate if we are currently at the maximum one", () => {
  /* tslint:enable max-line-length */
    const logger = {};
    jest.mock("../../../log", () => ({ default: logger }));
    const getEstimateFromBufferLevels = require("../get_estimate_from_buffer_levels")
      .default;
    expect(getEstimateFromBufferLevels({
      bufferGap: 100000000000,
      playbackRate: 1,
      currentBitrate: 40,
      currentScore: 1000000,
    }, [10, 20, 40], [0, 15, 20])).toEqual(40);
    expect(getEstimateFromBufferLevels({
      bufferGap: 100000000000,
      playbackRate: 1,
      currentBitrate: 40,
      currentScore: 1000000,
    }, [10, 20, 40, 40], [0, 15, 20, 20])).toEqual(40);
  });

  /* tslint:disable max-line-length */
  it("should stay at the current bitrate if the current one is not maintainable due to the playbackRate", () => {
  /* tslint:enable max-line-length */
    const logger = {};
    jest.mock("../../../log", () => ({ default: logger }));
    const getEstimateFromBufferLevels = require("../get_estimate_from_buffer_levels")
      .default;
    expect(getEstimateFromBufferLevels({
      bufferGap: 15,
      playbackRate: 2,
      currentBitrate: 10,
      currentScore: 1.01,
    }, [10, 20, 40], [0, 15, 20])).toEqual(10);
    expect(getEstimateFromBufferLevels({
      bufferGap: 20,
      playbackRate: 2,
      currentBitrate: 20,
      currentScore: 1.01,
    }, [10, 20, 40], [0, 15, 20])).toEqual(20);
    expect(getEstimateFromBufferLevels({
      bufferGap: 20,
      playbackRate: 100,
      currentBitrate: 20,
      currentScore: 100,
    }, [10, 20, 40], [0, 15, 20])).toEqual(20);
    expect(getEstimateFromBufferLevels({
      bufferGap: 20,
      playbackRate: 100,
      currentBitrate: 20,
      currentScore: 100,
    }, [10, 20, 20,  40], [0, 15, 15, 20])).toEqual(20);
    expect(getEstimateFromBufferLevels({
      bufferGap: 20,
      playbackRate: 3,
      currentBitrate: 20,
      currentScore: 2.1,
    }, [10, 20, 40], [0, 15, 20])).toEqual(20);
  });

  /* tslint:disable max-line-length */
  it("should not go to the next bitrate if we do not know if it is maintainable", () => {
  /* tslint:enable max-line-length */
    const logger = {};
    jest.mock("../../../log", () => ({ default: logger }));
    const getEstimateFromBufferLevels = require("../get_estimate_from_buffer_levels")
      .default;
    expect(getEstimateFromBufferLevels({
      bufferGap: 15,
      playbackRate: 1,
      currentBitrate: 10,
    }, [10, 20, 40], [0, 15, 20])).toEqual(10);
    expect(getEstimateFromBufferLevels({
      bufferGap: 20,
      playbackRate: 1,
      currentBitrate: 20,
    }, [10, 20, 40], [0, 15, 20])).toEqual(20);
    expect(getEstimateFromBufferLevels({
      bufferGap: 20,
      playbackRate: 1,
      currentBitrate: 20,
    }, [10, 20, 40], [0, 15, 20])).toEqual(20);
    expect(getEstimateFromBufferLevels({
      bufferGap: 20,
      playbackRate: 2,
      currentBitrate: 20,
    }, [10, 20, 40], [0, 15, 20])).toEqual(20);
    expect(getEstimateFromBufferLevels({
      bufferGap: 20,
      playbackRate: 2,
      currentBitrate: 20,
    }, [10, 20, 20, 40], [0, 15, 15, 20])).toEqual(20);
    expect(getEstimateFromBufferLevels({
      bufferGap: 20,
      playbackRate: 0, // 0 is a special case
      currentBitrate: 20,
    }, [10, 20, 40], [0, 15, 20])).toEqual(20);
  });
});
