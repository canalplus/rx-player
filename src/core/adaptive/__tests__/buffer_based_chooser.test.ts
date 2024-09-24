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

import { ScoreConfidenceLevel } from "../utils/representation_score_calculator";

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

describe("BufferBasedChooser", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should return the first bitrate if the current bitrate is undefined", () => {
    const logger = { debug: jest.fn() };
    jest.mock("../../../log", () => ({ __esModule: true as const, default: logger }));
    const BufferBasedChooser = jest.requireActual("../buffer_based_chooser").default;

    let bbc = new BufferBasedChooser([]);
    bbc.onAddedSegment({ bufferGap: 0, speed: 1 });
    expect(bbc.getLastEstimate()).toEqual(undefined);

    bbc = new BufferBasedChooser([1, 2, 3]);
    bbc.onAddedSegment({ bufferGap: 0, speed: 1 });
    expect(bbc.getLastEstimate()).toEqual(1);

    bbc = new BufferBasedChooser([10, 20]);
    bbc.onAddedSegment({
      bufferGap: 0,
      speed: 1,
      currentBitrate: undefined,
      currentScore: undefined,
    });
    expect(bbc.getLastEstimate()).toEqual(10);

    bbc = new BufferBasedChooser([1, 2, 3]);
    bbc.onAddedSegment({
      bufferGap: 0,
      speed: 1,
      currentBitrate: undefined,
      currentScore: { score: 4, confidenceLevel: ScoreConfidenceLevel.LOW },
    });
    expect(bbc.getLastEstimate()).toEqual(1);

    bbc = new BufferBasedChooser([1, 2, 3]);
    bbc.onAddedSegment({
      bufferGap: 0,
      speed: 1,
      currentBitrate: undefined,
      currentScore: { score: 4, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(1);

    bbc = new BufferBasedChooser([1, 2, 3]);
    bbc.onAddedSegment({
      bufferGap: 0,
      speed: 1,
      currentBitrate: undefined,
      currentScore: { score: 1, confidenceLevel: ScoreConfidenceLevel.LOW },
    });
    expect(bbc.getLastEstimate()).toEqual(1);

    bbc = new BufferBasedChooser([1, 2, 3]);
    bbc.onAddedSegment({
      bufferGap: 0,
      speed: 1,
      currentBitrate: undefined,
      currentScore: { score: 1, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(1);
  });

  /* eslint-disable max-len */
  it("should log an error and return the first bitrate if the given bitrate does not exist", () => {
    /* eslint-enable max-len */
    const logger = { debug: jest.fn(), error: jest.fn() };
    jest.mock("../../../log", () => ({ __esModule: true as const, default: logger }));
    const BufferBasedChooser = jest.requireActual("../buffer_based_chooser").default;

    const bbc = new BufferBasedChooser([10, 20]);
    bbc.onAddedSegment({
      bufferGap: 0,
      speed: 1,
      currentBitrate: 30,
      currentScore: undefined,
    });
    expect(bbc.getLastEstimate()).toEqual(10);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      "ABR: Current Bitrate not found in the calculated levels",
    );
  });

  /* eslint-disable max-len */
  it("should not go to the next bitrate if we don't have a high enough maintainability score", () => {
    /* eslint-enable max-len */
    const logger = { debug: jest.fn() };
    jest.mock("../../../log", () => ({ __esModule: true as const, default: logger }));
    const BufferBasedChooser = jest.requireActual("../buffer_based_chooser").default;

    let bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 16,
      speed: 1,
      currentBitrate: 10,
      currentScore: { score: 1.15, confidenceLevel: ScoreConfidenceLevel.LOW },
    });
    expect(bbc.getLastEstimate()).toEqual(10);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 30,
      speed: 1,
      currentBitrate: 20,
      currentScore: { score: 1.15, confidenceLevel: ScoreConfidenceLevel.LOW },
    });
    expect(bbc.getLastEstimate()).toEqual(20);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 30,
      speed: 1,
      currentBitrate: 20,
      currentScore: { score: 100, confidenceLevel: ScoreConfidenceLevel.LOW },
    });
    expect(bbc.getLastEstimate()).toEqual(20);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 30,
      speed: 2,
      currentBitrate: 20,
      currentScore: { score: 2.3, confidenceLevel: ScoreConfidenceLevel.LOW },
    });
    expect(bbc.getLastEstimate()).toEqual(20);

    bbc = new BufferBasedChooser([10, 20, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 30,
      speed: 2,
      currentBitrate: 20,
      currentScore: { score: 2.3, confidenceLevel: ScoreConfidenceLevel.LOW },
    });
    expect(bbc.getLastEstimate()).toEqual(20);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 30,
      speed: 0, // 0 is a special case
      currentBitrate: 20,
      currentScore: { score: 100, confidenceLevel: ScoreConfidenceLevel.LOW },
    });
    expect(bbc.getLastEstimate()).toEqual(20);
  });

  /* eslint-disable max-len */
  it("should go to the next bitrate if the current one is maintainable and we have more buffer than the next level", () => {
    /* eslint-enable max-len */
    const logger = { debug: jest.fn() };
    jest.mock("../../../log", () => ({ __esModule: true as const, default: logger }));
    const BufferBasedChooser = jest.requireActual("../buffer_based_chooser").default;

    let bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 16,
      speed: 1,
      currentBitrate: 10,
      currentScore: { score: 1.15, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(20);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 30,
      speed: 1,
      currentBitrate: 20,
      currentScore: { score: 1.15, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(40);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 30,
      speed: 1,
      currentBitrate: 20,
      currentScore: { score: 100, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(40);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 30,
      speed: 2,
      currentBitrate: 20,
      currentScore: { score: 2.3, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(40);

    bbc = new BufferBasedChooser([10, 20, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 30,
      speed: 2,
      currentBitrate: 20,
      currentScore: { score: 2.3, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(40);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 30,
      speed: 0, // 0 is a special case
      currentBitrate: 20,
      currentScore: { score: 100, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(40);
  });

  /* eslint-disable max-len */
  it("should stay at the current bitrate if it is maintainable but we have a buffer inferior to the next level", () => {
    /* eslint-enable max-len */
    const logger = { debug: jest.fn() };
    jest.mock("../../../log", () => ({ __esModule: true as const, default: logger }));
    const BufferBasedChooser = jest.requireActual("../buffer_based_chooser").default;

    let bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 6,
      speed: 1,
      currentBitrate: 10,
      currentScore: { score: 1.15, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(10);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 13,
      speed: 1,
      currentBitrate: 20,
      currentScore: { score: 1.15, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(20);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 13,
      speed: 1,
      currentBitrate: 20,
      currentScore: { score: 100, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(20);

    bbc = new BufferBasedChooser([10, 20, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 13,
      speed: 1,
      currentBitrate: 20,
      currentScore: { score: 100, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(20);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 13,
      speed: 2,
      currentBitrate: 20,
      currentScore: { score: 2.3, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(20);
  });

  /* eslint-disable max-len */
  it("should stay at the current bitrate if we are currently at the maximum one", () => {
    /* eslint-enable max-len */
    const logger = { debug: jest.fn() };
    jest.mock("../../../log", () => ({ __esModule: true as const, default: logger }));
    const BufferBasedChooser = jest.requireActual("../buffer_based_chooser").default;

    let bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 100000000000,
      speed: 1,
      currentBitrate: 40,
      currentScore: { score: 1000000, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(40);

    bbc = new BufferBasedChooser([10, 20, 40, 40]);
    bbc.onAddedSegment({
      bufferGap: 100000000000,
      speed: 1,
      currentBitrate: 40,
      currentScore: { score: 1000000, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(40);
  });

  /* eslint-disable max-len */
  it("should stay at the current bitrate if the current one is not maintainable due to the speed", () => {
    /* eslint-enable max-len */
    const logger = { debug: jest.fn() };
    jest.mock("../../../log", () => ({ __esModule: true as const, default: logger }));
    const BufferBasedChooser = jest.requireActual("../buffer_based_chooser").default;

    let bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 15,
      speed: 2,
      currentBitrate: 10,
      currentScore: { score: 2, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(10);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 22,
      speed: 2,
      currentBitrate: 20,
      currentScore: { score: 2, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(20);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 22,
      speed: 100,
      currentBitrate: 20,
      currentScore: { score: 100, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(20);

    bbc = new BufferBasedChooser([10, 20, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 22,
      speed: 100,
      currentBitrate: 20,
      currentScore: { score: 100, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(20);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 22,
      speed: 3,
      currentBitrate: 20,
      currentScore: { score: 3, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(20);
  });

  /* eslint-disable max-len */
  it("should lower bitrate if the current one is not maintainable due to the speed", () => {
    /* eslint-enable max-len */
    const logger = { debug: jest.fn() };
    jest.mock("../../../log", () => ({ __esModule: true as const, default: logger }));
    const BufferBasedChooser = jest.requireActual("../buffer_based_chooser").default;

    let bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 15,
      speed: 2,
      currentBitrate: 10,
      currentScore: { score: 1.9, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(10);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 22,
      speed: 2,
      currentBitrate: 20,
      currentScore: { score: 1.9, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(10);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 22,
      speed: 100,
      currentBitrate: 20,
      currentScore: { score: 99, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(10);

    bbc = new BufferBasedChooser([10, 20, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 22,
      speed: 100,
      currentBitrate: 20,
      currentScore: { score: 99, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(10);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 22,
      speed: 3,
      currentBitrate: 20,
      currentScore: { score: 2.5, confidenceLevel: ScoreConfidenceLevel.HIGH },
    });
    expect(bbc.getLastEstimate()).toEqual(10);
  });

  /* eslint-disable max-len */
  it("should not lower bitrate if the current one is not maintainable due to the speed but confidence on the score is low", () => {
    /* eslint-enable max-len */
    const logger = { debug: jest.fn() };
    jest.mock("../../../log", () => ({ __esModule: true as const, default: logger }));
    const BufferBasedChooser = jest.requireActual("../buffer_based_chooser").default;

    let bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 15,
      speed: 2,
      currentBitrate: 10,
      currentScore: { score: 1.9, confidenceLevel: ScoreConfidenceLevel.LOW },
    });
    expect(bbc.getLastEstimate()).toEqual(10);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 22,
      speed: 2,
      currentBitrate: 20,
      currentScore: undefined,
    });
    expect(bbc.getLastEstimate()).toEqual(20);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 22,
      speed: 2,
      currentBitrate: 20,
      currentScore: { score: 1.9, confidenceLevel: ScoreConfidenceLevel.LOW },
    });
    expect(bbc.getLastEstimate()).toEqual(20);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 22,
      speed: 100,
      currentBitrate: 20,
      currentScore: { score: 99, confidenceLevel: ScoreConfidenceLevel.LOW },
    });
    expect(bbc.getLastEstimate()).toEqual(20);

    bbc = new BufferBasedChooser([10, 20, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 22,
      speed: 100,
      currentBitrate: 20,
      currentScore: { score: 99, confidenceLevel: ScoreConfidenceLevel.LOW },
    });
    expect(bbc.getLastEstimate()).toEqual(20);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 22,
      speed: 3,
      currentBitrate: 20,
      currentScore: { score: 2.5, confidenceLevel: ScoreConfidenceLevel.LOW },
    });
    expect(bbc.getLastEstimate()).toEqual(20);
  });

  /* eslint-disable max-len */
  it("should not go to the next bitrate if we do not know if it is maintainable", () => {
    /* eslint-enable max-len */
    const logger = { debug: jest.fn() };
    jest.mock("../../../log", () => ({ __esModule: true as const, default: logger }));
    const BufferBasedChooser = jest.requireActual("../buffer_based_chooser").default;

    let bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 15,
      speed: 1,
      currentBitrate: 10,
    });
    expect(bbc.getLastEstimate()).toEqual(10);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 20,
      speed: 1,
      currentBitrate: 20,
    });
    expect(bbc.getLastEstimate()).toEqual(20);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 20,
      speed: 1,
      currentBitrate: 20,
    });
    expect(bbc.getLastEstimate()).toEqual(20);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 20,
      speed: 2,
      currentBitrate: 20,
    });
    expect(bbc.getLastEstimate()).toEqual(20);

    bbc = new BufferBasedChooser([10, 20, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 20,
      speed: 2,
      currentBitrate: 20,
    });
    expect(bbc.getLastEstimate()).toEqual(20);

    bbc = new BufferBasedChooser([10, 20, 40]);
    bbc.onAddedSegment({
      bufferGap: 20,
      speed: 0, // 0 is a special case
      currentBitrate: 20,
    });
    expect(bbc.getLastEstimate()).toEqual(20);
  });
});
