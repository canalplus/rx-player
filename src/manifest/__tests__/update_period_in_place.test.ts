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

import log from "../../log";
import type Period from "../period";
import { MANIFEST_UPDATE_TYPE } from "../types";
import updatePeriodInPlace from "../update_period_in_place";

/* eslint-disable @typescript-eslint/no-explicit-any */

const oldVideoRepresentation1 = { contentWarnings: [],
                                  id: "rep-video-1",
                                  index: { _update() { /* noop */ },
                                           _replace() { /* noop */ } } };
const oldVideoRepresentation2 = { contentWarnings: [],
                                  id: "rep-video-2",
                                  index: { _update() { /* noop */ },
                                           _replace() { /* noop */ } } };
const oldVideoRepresentation3 = { contentWarnings: [],
                                  id: "rep-video-3",
                                  index: { _update() { /* noop */ },
                                           _replace() { /* noop */ } } };
const oldVideoRepresentation4 = { contentWarnings: [],
                                  id: "rep-video-4",
                                  index: { _update() { /* noop */ },
                                           _replace() { /* noop */ } } };
const oldAudioRepresentation = { contentWarnings: [],
                                 id: "rep-audio-1",
                                 index: { _update() { /* noop */ },
                                          _replace() { /* noop */ } } };

const newVideoRepresentation1 = { contentWarnings: [],
                                  id: "rep-video-1",
                                  index: { _update() { /* noop */ },
                                           _replace() { /* noop */ } } };
const newVideoRepresentation2 = { contentWarnings: [],
                                  id: "rep-video-2",
                                  index: { _update() { /* noop */ },
                                           _replace() { /* noop */ } } };
const newVideoRepresentation3 = { contentWarnings: [],
                                  id: "rep-video-3",
                                  index: { _update() { /* noop */ },
                                           _replace() { /* noop */ } } };
const newVideoRepresentation4 = { contentWarnings: [],
                                  id: "rep-video-4",
                                  index: { _update() { /* noop */ },
                                           _replace() { /* noop */ } } };
const newAudioRepresentation = { contentWarnings: [],
                                 id: "rep-audio-1",
                                 index: { _update() { /* noop */ },
                                          _replace() { /* noop */ } } };

describe("Manifest - updatePeriodInPlace", () => {
  let mockOldVideoRepresentation1Replace : jest.MockInstance<void, []> | undefined;
  let mockOldVideoRepresentation2Replace : jest.MockInstance<void, []> | undefined;
  let mockOldVideoRepresentation3Replace : jest.MockInstance<void, []> | undefined;
  let mockOldVideoRepresentation4Replace : jest.MockInstance<void, []> | undefined;
  let mockOldAudioRepresentationReplace : jest.MockInstance<void, []> | undefined;
  let mockOldVideoRepresentation1Update : jest.MockInstance<void, []> | undefined;
  let mockOldVideoRepresentation2Update : jest.MockInstance<void, []> | undefined;
  let mockOldVideoRepresentation3Update : jest.MockInstance<void, []> | undefined;
  let mockOldVideoRepresentation4Update : jest.MockInstance<void, []> | undefined;
  let mockOldAudioRepresentationUpdate : jest.MockInstance<void, []> | undefined;
  let mockNewVideoRepresentation1Replace : jest.MockInstance<void, []> | undefined;
  let mockNewVideoRepresentation2Replace : jest.MockInstance<void, []> | undefined;
  let mockNewVideoRepresentation3Replace : jest.MockInstance<void, []> | undefined;
  let mockNewVideoRepresentation4Replace : jest.MockInstance<void, []> | undefined;
  let mockNewAudioRepresentationReplace : jest.MockInstance<void, []> | undefined;
  let mockNewVideoRepresentation1Update : jest.MockInstance<void, []> | undefined;
  let mockNewVideoRepresentation2Update : jest.MockInstance<void, []> | undefined;
  let mockNewVideoRepresentation3Update : jest.MockInstance<void, []> | undefined;
  let mockNewVideoRepresentation4Update : jest.MockInstance<void, []> | undefined;
  let mockNewAudioRepresentationUpdate : jest.MockInstance<void, []> | undefined;

  beforeEach(() => {
    mockOldVideoRepresentation1Replace =
      jest.spyOn(oldVideoRepresentation1.index, "_replace");
    mockOldVideoRepresentation2Replace =
      jest.spyOn(oldVideoRepresentation2.index, "_replace");
    mockOldVideoRepresentation3Replace =
      jest.spyOn(oldVideoRepresentation3.index, "_replace");
    mockOldVideoRepresentation4Replace =
      jest.spyOn(oldVideoRepresentation4.index, "_replace");
    mockOldAudioRepresentationReplace =
      jest.spyOn(oldAudioRepresentation.index, "_replace");
    mockOldVideoRepresentation1Update =
      jest.spyOn(oldVideoRepresentation1.index, "_update");
    mockOldVideoRepresentation2Update =
      jest.spyOn(oldVideoRepresentation2.index, "_update");
    mockOldVideoRepresentation3Update =
      jest.spyOn(oldVideoRepresentation3.index, "_update");
    mockOldVideoRepresentation4Update =
      jest.spyOn(oldVideoRepresentation4.index, "_update");
    mockOldAudioRepresentationUpdate =
      jest.spyOn(oldAudioRepresentation.index, "_update");
    mockNewVideoRepresentation1Replace =
      jest.spyOn(newVideoRepresentation1.index, "_replace");
    mockNewVideoRepresentation2Replace =
      jest.spyOn(newVideoRepresentation2.index, "_replace");
    mockNewVideoRepresentation3Replace =
      jest.spyOn(newVideoRepresentation3.index, "_replace");
    mockNewVideoRepresentation4Replace =
      jest.spyOn(newVideoRepresentation4.index, "_replace");
    mockNewAudioRepresentationReplace =
      jest.spyOn(newAudioRepresentation.index, "_replace");
    mockNewVideoRepresentation1Update =
      jest.spyOn(newVideoRepresentation1.index, "_update");
    mockNewVideoRepresentation2Update =
      jest.spyOn(newVideoRepresentation2.index, "_update");
    mockNewVideoRepresentation3Update =
      jest.spyOn(newVideoRepresentation3.index, "_update");
    mockNewVideoRepresentation4Update =
      jest.spyOn(newVideoRepresentation4.index, "_update");
    mockNewAudioRepresentationUpdate =
      jest.spyOn(newAudioRepresentation.index, "_update");
  });

  afterEach(() => {
    mockOldVideoRepresentation1Replace?.mockRestore();
    mockOldVideoRepresentation2Replace?.mockRestore();
    mockOldVideoRepresentation3Replace?.mockRestore();
    mockOldVideoRepresentation4Replace?.mockRestore();
    mockOldAudioRepresentationReplace?.mockRestore();
    mockOldVideoRepresentation1Update?.mockRestore();
    mockOldVideoRepresentation2Update?.mockRestore();
    mockOldVideoRepresentation3Update?.mockRestore();
    mockOldVideoRepresentation4Update?.mockRestore();
    mockOldAudioRepresentationUpdate?.mockRestore();
    mockNewVideoRepresentation1Replace?.mockRestore();
    mockNewVideoRepresentation2Replace?.mockRestore();
    mockNewVideoRepresentation3Replace?.mockRestore();
    mockNewVideoRepresentation4Replace?.mockRestore();
    mockNewAudioRepresentationReplace?.mockRestore();
    mockNewVideoRepresentation1Update?.mockRestore();
    mockNewVideoRepresentation2Update?.mockRestore();
    mockNewVideoRepresentation3Update?.mockRestore();
    mockNewVideoRepresentation4Update?.mockRestore();
    mockNewAudioRepresentationUpdate?.mockRestore();
  });

/* eslint-disable max-len */
  it("should fully update the first Period given by the second one in a full update", () => {
/* eslint-enable max-len */
    const oldVideoAdaptation1 = { contentWarnings: [],
                                  id: "ada-video-1",
                                  representations: [oldVideoRepresentation1,
                                                    oldVideoRepresentation2] };
    const oldVideoAdaptation2 = { contentWarnings: [],
                                  id: "ada-video-2",
                                  representations: [oldVideoRepresentation3,
                                                    oldVideoRepresentation4] };
    const oldAudioAdaptation = { contentWarnings: [],
                                 id: "ada-audio-1",
                                 representations: [oldAudioRepresentation] };
    const oldPeriod = {
      contentWarnings: [],
      start: 5,
      end: 15,
      duration: 10,
      adaptations: { video: [oldVideoAdaptation1,
                             oldVideoAdaptation2],
                     audio: [oldAudioAdaptation] },
      getAdaptations() {
        return [oldVideoAdaptation1,
                oldVideoAdaptation2,
                oldAudioAdaptation];
      },
    };
    const newVideoAdaptation1 = { contentWarnings: [],
                                  id: "ada-video-1",
                                  representations: [newVideoRepresentation1,
                                                    newVideoRepresentation2] };
    const newVideoAdaptation2 = { contentWarnings: [],
                                  id: "ada-video-2",
                                  representations: [newVideoRepresentation3,
                                                    newVideoRepresentation4] };
    const newAudioAdaptation = { contentWarnings: [],
                                 id: "ada-audio-1",
                                 representations: [newAudioRepresentation] };
    const newPeriod = {
      contentWarnings: [],
      start: 500,
      end: 520,
      duration: 20,
      adaptations: { video: [newVideoAdaptation1,
                             newVideoAdaptation2],
                     audio: [newAudioAdaptation] },
      getAdaptations() {
        return [ newVideoAdaptation1,
                 newVideoAdaptation2,
                 newAudioAdaptation ];
      },
    };

    const oldPeriodAdaptations = jest.spyOn(oldPeriod, "getAdaptations");
    const newPeriodAdaptations = jest.spyOn(newPeriod, "getAdaptations");
    const mockLog = jest.spyOn(log, "warn");

    updatePeriodInPlace(oldPeriod as unknown as Period,
                        newPeriod as unknown as Period,
                        MANIFEST_UPDATE_TYPE.Full);

    expect(oldPeriod.start).toEqual(500);
    expect(oldPeriod.end).toEqual(520);
    expect(oldPeriod.duration).toEqual(20);
    expect(oldPeriodAdaptations).toHaveBeenCalledTimes(1);

    expect(mockOldVideoRepresentation1Replace).toHaveBeenCalledTimes(1);
    expect(mockOldVideoRepresentation1Replace)
      .toHaveBeenCalledWith(newVideoRepresentation1.index);

    expect(mockOldVideoRepresentation2Replace).toHaveBeenCalledTimes(1);
    expect(mockOldVideoRepresentation2Replace)
      .toHaveBeenCalledWith(newVideoRepresentation2.index);

    expect(mockOldVideoRepresentation3Replace).toHaveBeenCalledTimes(1);
    expect(mockOldVideoRepresentation3Replace)
      .toHaveBeenCalledWith(newVideoRepresentation3.index);

    expect(mockOldVideoRepresentation4Replace).toHaveBeenCalledTimes(1);
    expect(mockOldVideoRepresentation4Replace)
      .toHaveBeenCalledWith(newVideoRepresentation4.index);

    expect(mockOldAudioRepresentationReplace).toHaveBeenCalledTimes(1);
    expect(mockOldAudioRepresentationReplace)
      .toHaveBeenCalledWith(newAudioRepresentation.index);

    expect(newPeriod.start).toEqual(500);
    expect(newPeriod.end).toEqual(520);
    expect(newPeriod.duration).toEqual(20);
    expect(newPeriodAdaptations).toHaveBeenCalledTimes(1);

    expect(mockNewVideoRepresentation1Replace).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation2Replace).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation3Replace).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation4Replace).not.toHaveBeenCalled();
    expect(mockNewAudioRepresentationReplace).not.toHaveBeenCalled();

    expect(mockOldVideoRepresentation1Update).not.toHaveBeenCalled();
    expect(mockOldVideoRepresentation2Update).not.toHaveBeenCalled();
    expect(mockOldVideoRepresentation3Update).not.toHaveBeenCalled();
    expect(mockOldVideoRepresentation4Update).not.toHaveBeenCalled();
    expect(mockOldAudioRepresentationUpdate).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation1Update).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation2Update).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation3Update).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation4Update).not.toHaveBeenCalled();
    expect(mockNewAudioRepresentationUpdate).not.toHaveBeenCalled();

    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });

/* eslint-disable max-len */
  it("should partially update the first Period given by the second one in a partial update", () => {
/* eslint-enable max-len */
    const oldVideoAdaptation1 = { contentWarnings: [],
                                  id: "ada-video-1",
                                  representations: [oldVideoRepresentation1,
                                                    oldVideoRepresentation2] };
    const oldVideoAdaptation2 = { contentWarnings: [],
                                  id: "ada-video-2",
                                  representations: [oldVideoRepresentation3,
                                                    oldVideoRepresentation4] };
    const oldAudioAdaptation = { contentWarnings: [],
                                 id: "ada-audio-1",
                                 representations: [oldAudioRepresentation] };
    const oldPeriod = {
      contentWarnings: [],
      start: 5,
      end: 15,
      duration: 10,
      adaptations: { video: [oldVideoAdaptation1,
                             oldVideoAdaptation2],
                     audio: [oldAudioAdaptation] },
      getAdaptations() {
        return [oldVideoAdaptation1,
                oldVideoAdaptation2,
                oldAudioAdaptation];
      },
    };
    const newVideoAdaptation1 = { contentWarnings: [],
                                  id: "ada-video-1",
                                  representations: [newVideoRepresentation1,
                                                    newVideoRepresentation2] };
    const newVideoAdaptation2 = { contentWarnings: [],
                                  id: "ada-video-2",
                                  representations: [newVideoRepresentation3,
                                                    newVideoRepresentation4] };
    const newAudioAdaptation = { contentWarnings: [],
                                 id: "ada-audio-1",
                                 representations: [newAudioRepresentation] };
    const newPeriod = {
      contentWarnings: [],
      start: 500,
      end: 520,
      duration: 20,
      adaptations: { video: [newVideoAdaptation1,
                             newVideoAdaptation2],
                     audio: [newAudioAdaptation] },
      getAdaptations() {
        return [ newVideoAdaptation1,
                 newVideoAdaptation2,
                 newAudioAdaptation ];
      },
    };

    const mockOldPeriodGetAdaptations = jest.spyOn(oldPeriod, "getAdaptations");
    const mockNewPeriodGetAdaptations = jest.spyOn(newPeriod, "getAdaptations");
    const mockLog = jest.spyOn(log, "warn");

    updatePeriodInPlace(oldPeriod as unknown as Period,
                        newPeriod as unknown as Period,
                        MANIFEST_UPDATE_TYPE.Partial);

    expect(oldPeriod.start).toEqual(500);
    expect(oldPeriod.end).toEqual(520);
    expect(oldPeriod.duration).toEqual(20);
    expect(mockOldPeriodGetAdaptations).toHaveBeenCalledTimes(1);

    expect(mockOldVideoRepresentation1Update).toHaveBeenCalledTimes(1);
    expect(mockOldVideoRepresentation1Update)
      .toHaveBeenCalledWith(newVideoRepresentation1.index);

    expect(mockOldVideoRepresentation2Update).toHaveBeenCalledTimes(1);
    expect(mockOldVideoRepresentation2Update)
      .toHaveBeenCalledWith(newVideoRepresentation2.index);

    expect(mockOldVideoRepresentation3Update).toHaveBeenCalledTimes(1);
    expect(mockOldVideoRepresentation3Update)
      .toHaveBeenCalledWith(newVideoRepresentation3.index);

    expect(mockOldVideoRepresentation4Update).toHaveBeenCalledTimes(1);
    expect(mockOldVideoRepresentation4Update)
      .toHaveBeenCalledWith(newVideoRepresentation4.index);

    expect(mockOldAudioRepresentationUpdate).toHaveBeenCalledTimes(1);
    expect(mockOldAudioRepresentationUpdate)
      .toHaveBeenCalledWith(newAudioRepresentation.index);

    expect(newPeriod.start).toEqual(500);
    expect(newPeriod.end).toEqual(520);
    expect(newPeriod.duration).toEqual(20);
    expect(mockNewPeriodGetAdaptations).toHaveBeenCalledTimes(1);

    expect(mockNewVideoRepresentation1Update).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation2Update).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation3Update).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation4Update).not.toHaveBeenCalled();
    expect(mockNewAudioRepresentationUpdate).not.toHaveBeenCalled();

    expect(mockOldVideoRepresentation1Replace).not.toHaveBeenCalled();
    expect(mockOldVideoRepresentation2Replace).not.toHaveBeenCalled();
    expect(mockOldVideoRepresentation3Replace).not.toHaveBeenCalled();
    expect(mockOldVideoRepresentation4Replace).not.toHaveBeenCalled();
    expect(mockOldAudioRepresentationReplace).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation1Replace).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation2Replace).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation3Replace).not.toHaveBeenCalled();
    expect(mockNewVideoRepresentation4Replace).not.toHaveBeenCalled();
    expect(mockNewAudioRepresentationReplace).not.toHaveBeenCalled();

    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });

  it("should do nothing with new Adaptations", () => {
    const oldVideoAdaptation1 = { contentWarnings: [],
                                  id: "ada-video-1",
                                  representations: [oldVideoRepresentation1,
                                                    oldVideoRepresentation2] };
    const oldAudioAdaptation = { contentWarnings: [],
                                 id: "ada-audio-1",
                                 representations: [oldAudioRepresentation] };
    const oldPeriod = {
      contentWarnings: [],
      start: 5,
      end: 15,
      duration: 10,
      adaptations: { video: [oldVideoAdaptation1],
                     audio: [oldAudioAdaptation] },
      getAdaptations() {
        return [oldVideoAdaptation1,
                oldAudioAdaptation];
      },
    };
    const newVideoAdaptation1 = { contentWarnings: [],
                                  id: "ada-video-1",
                                  representations: [newVideoRepresentation1,
                                                    newVideoRepresentation2] };
    const newVideoAdaptation2 = { contentWarnings: [],
                                  id: "ada-video-2",
                                  representations: [newVideoRepresentation3,
                                                    newVideoRepresentation4] };
    const newAudioAdaptation = { contentWarnings: [],
                                 id: "ada-audio-1",
                                 representations: [newAudioRepresentation] };
    const newPeriod = {
      contentWarnings: [],
      start: 500,
      end: 520,
      duration: 20,
      adaptations: { video: [newVideoAdaptation1,
                             newVideoAdaptation2],
                     audio: [newAudioAdaptation] },
      getAdaptations() {
        return [newVideoAdaptation1,
                newVideoAdaptation2,
                newAudioAdaptation];
      },
    };

    const mockLog = jest.spyOn(log, "warn");
    updatePeriodInPlace(oldPeriod as unknown as Period,
                        newPeriod as unknown as Period,
                        MANIFEST_UPDATE_TYPE.Full);
    expect(mockLog).not.toHaveBeenCalled();
    expect(oldPeriod.adaptations.video).toHaveLength(1);
    updatePeriodInPlace(oldPeriod as unknown as Period,
                        newPeriod as unknown as Period,
                        MANIFEST_UPDATE_TYPE.Partial);
    expect(mockLog).not.toHaveBeenCalled();
    expect(oldPeriod.adaptations.video).toHaveLength(1);
    mockLog.mockRestore();
  });

  it("should warn if an old Adaptation is not found", () => {
    const oldVideoAdaptation1 = { contentWarnings: [],
                                  id: "ada-video-1",
                                  representations: [oldVideoRepresentation1,
                                                    oldVideoRepresentation2] };
    const oldVideoAdaptation2 = { contentWarnings: [],
                                  id: "ada-video-2",
                                  representations: [oldVideoRepresentation3,
                                                    oldVideoRepresentation4] };
    const oldAudioAdaptation = { contentWarnings: [],
                                 id: "ada-audio-1",
                                 representations: [oldAudioRepresentation] };
    const oldPeriod = {
      contentWarnings: [],
      start: 500,
      end: 520,
      duration: 20,
      adaptations: { video: [oldVideoAdaptation1,
                             oldVideoAdaptation2],
                     audio: [oldAudioAdaptation] },
      getAdaptations() {
        return [oldVideoAdaptation1,
                oldVideoAdaptation2,
                oldAudioAdaptation];
      },
    };
    const newVideoAdaptation1 = { contentWarnings: [],
                                  id: "ada-video-1",
                                  representations: [newVideoRepresentation1,
                                                    newVideoRepresentation2] };
    const newAudioAdaptation = { contentWarnings: [],
                                 id: "ada-audio-1",
                                 representations: [newAudioRepresentation] };
    const newPeriod = {
      contentWarnings: [],
      start: 5,
      end: 15,
      duration: 10,
      adaptations: { video: [newVideoAdaptation1],
                     audio: [newAudioAdaptation] },
      getAdaptations() {
        return [newVideoAdaptation1, newAudioAdaptation];
      },
    };

    const mockLog = jest.spyOn(log, "warn");
    updatePeriodInPlace(oldPeriod as unknown as Period,
                        newPeriod as unknown as Period,
                        MANIFEST_UPDATE_TYPE.Full);
    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith(
      "Manifest: Adaptation \"ada-video-2\" not found when merging."
    );
    expect(oldPeriod.adaptations.video).toHaveLength(2);
    mockLog.mockClear();
    updatePeriodInPlace(oldPeriod as unknown as Period,
                        newPeriod as unknown as Period,
                        MANIFEST_UPDATE_TYPE.Partial);
    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith(
      "Manifest: Adaptation \"ada-video-2\" not found when merging."
    );
    expect(oldPeriod.adaptations.video).toHaveLength(2);
    mockLog.mockRestore();
  });

  it("should do nothing with new Representations", () => {
    const oldVideoAdaptation1 = { contentWarnings: [],
                                  id: "ada-video-1",
                                  representations: [oldVideoRepresentation1] };
    const oldAudioAdaptation = { contentWarnings: [],
                                 id: "ada-audio-1",
                                 representations: [oldAudioRepresentation] };
    const oldPeriod = { contentWarnings: [],
                        start: 5,
                        end: 15,
                        duration: 10,
                        adaptations: { video: [oldVideoAdaptation1],
                                       audio: [oldAudioAdaptation] },
                        getAdaptations() { return [oldVideoAdaptation1,
                                                   oldAudioAdaptation]; } };

    const newVideoAdaptation1 = { contentWarnings: [],
                                  id: "ada-video-1",
                                  representations: [newVideoRepresentation1,
                                                    newVideoRepresentation2] };
    const newAudioAdaptation = { contentWarnings: [],
                                 id: "ada-audio-1",
                                 representations: [newAudioRepresentation] };
    const newPeriod = {
      contentWarnings: [],
      start: 500,
      end: 520,
      duration: 20,
      adaptations: { video: [newVideoAdaptation1],
                     audio: [newAudioAdaptation] },
      getAdaptations() {
        return [newVideoAdaptation1, newAudioAdaptation];
      },
    };

    const mockLog = jest.spyOn(log, "warn");
    updatePeriodInPlace(oldPeriod as unknown as Period,
                        newPeriod as unknown as Period,
                        MANIFEST_UPDATE_TYPE.Full);
    expect(mockLog).not.toHaveBeenCalled();
    expect(oldVideoAdaptation1.representations).toHaveLength(1);
    updatePeriodInPlace(oldPeriod as unknown as Period,
                        newPeriod as unknown as Period,
                        MANIFEST_UPDATE_TYPE.Partial);
    expect(mockLog).not.toHaveBeenCalled();
    expect(oldVideoAdaptation1.representations).toHaveLength(1);
    mockLog.mockRestore();
  });

  it("should warn if an old Representation is not found", () => {
    const oldVideoAdaptation1 = { contentWarnings: [],
                                  id: "ada-video-1",
                                  representations: [oldVideoRepresentation1,
                                                    oldVideoRepresentation2] };
    const oldAudioAdaptation = { contentWarnings: [],
                                 id: "ada-audio-1",
                                 representations: [oldAudioRepresentation] };
    const oldPeriod = { contentWarnings: [],
                        start: 500,
                        end: 520,
                        duration: 20,
                        adaptations: { video: [oldVideoAdaptation1],
                                       audio: [oldAudioAdaptation] },
                        getAdaptations() { return [oldVideoAdaptation1,
                                                   oldAudioAdaptation]; } };
    const newVideoAdaptation1 = { contentWarnings: [],
                                  id: "ada-video-1",
                                  representations: [newVideoRepresentation1] };
    const newAudioAdaptation = { contentWarnings: [],
                                 id: "ada-audio-1",
                                 representations: [newAudioRepresentation] };
    const newPeriod = { contentWarnings: [],
                        start: 5,
                        end: 15,
                        duration: 10,
                        adaptations: { video: [newVideoAdaptation1],
                                       audio: [newAudioAdaptation],
                        },
                        getAdaptations() {
                          return [newVideoAdaptation1, newAudioAdaptation];
                        },
    };

    const mockLog = jest.spyOn(log, "warn");
    updatePeriodInPlace(oldPeriod as unknown as Period,
                        newPeriod as unknown as Period,
                        MANIFEST_UPDATE_TYPE.Full);
    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith(
      "Manifest: Representation \"rep-video-2\" not found when merging."
    );
    expect(oldVideoAdaptation1.representations).toHaveLength(2);
    mockLog.mockClear();
    updatePeriodInPlace(oldPeriod as unknown as Period,
                        newPeriod as unknown as Period,
                        MANIFEST_UPDATE_TYPE.Partial);
    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith(
      "Manifest: Representation \"rep-video-2\" not found when merging."
    );
    expect(oldVideoAdaptation1.representations).toHaveLength(2);
    mockLog.mockRestore();
  });
});
