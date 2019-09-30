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
import updatePeriodInPlace from "../update_period_in_place";

describe("Manifest - updatePeriodInPlace", () => {
  it("should update the first Period given by the second one", () => {
    const oldVideoRepresentation1 = {
      parsingErrors: [],
      id: "rep-video-1",
      index: {
        _update() { /* noop */ },
      },
    };
    const oldVideoRepresentation2 = {
      parsingErrors: [],
      id: "rep-video-2",
      index: {
        _update() { /* noop */ },
      },
    };
    const oldVideoRepresentation3 = {
      parsingErrors: [],
      id: "rep-video-3",
      index: {
        _update() { /* noop */ },
      },
    };
    const oldVideoRepresentation4 = {
      parsingErrors: [],
      id: "rep-video-4",
      index: {
        _update() { /* noop */ },
      },
    };
    const oldAudioRepresentation = {
      parsingErrors: [],
      id: "rep-audio-1",
      index: {
        _update() { /* noop */ },
      },
    };
    const oldVideoAdaptation1 = {
      parsingErrors: [],
      id: "ada-video-1",
      representations: [oldVideoRepresentation1, oldVideoRepresentation2],
    };
    const oldVideoAdaptation2 = {
      parsingErrors: [],
      id: "ada-video-2",
      representations: [oldVideoRepresentation3, oldVideoRepresentation4],
    };
    const oldAudioAdaptation = {
      parsingErrors: [],
      id: "ada-audio-1",
      representations: [oldAudioRepresentation],
    };
    const oldPeriod = {
      parsingErrors: [],
      start: 5,
      end: 15,
      duration: 10,
      adaptations: {
        video: [oldVideoAdaptation1, oldVideoAdaptation2],
        audio: [oldAudioAdaptation],
      },
      getAdaptations() {
        return [oldVideoAdaptation1, oldVideoAdaptation2, oldAudioAdaptation];
      },
    };

    const newVideoRepresentation1 = {
      parsingErrors: [],
      id: "rep-video-1",
      index: {
        _update() { /* noop */ },
      },
    };
    const newVideoRepresentation2 = {
      parsingErrors: [],
      id: "rep-video-2",
      index: {
        _update() { /* noop */ },
      },
    };
    const newVideoRepresentation3 = {
      parsingErrors: [],
      id: "rep-video-3",
      index: {
        _update() { /* noop */ },
      },
    };
    const newVideoRepresentation4 = {
      parsingErrors: [],
      id: "rep-video-4",
      index: {
        _update() { /* noop */ },
      },
    };
    const newAudioRepresentation = {
      parsingErrors: [],
      id: "rep-audio-1",
      index: {
        _update() { /* noop */ },
      },
    };
    const newVideoAdaptation1 = {
      parsingErrors: [],
      id: "ada-video-1",
      representations: [newVideoRepresentation1, newVideoRepresentation2],
    };
    const newVideoAdaptation2 = {
      parsingErrors: [],
      id: "ada-video-2",
      representations: [newVideoRepresentation3, newVideoRepresentation4],
    };
    const newAudioAdaptation = {
      parsingErrors: [],
      id: "ada-audio-1",
      representations: [newAudioRepresentation],
    };
    const newPeriod = {
      parsingErrors: [],
      start: 500,
      end: 520,
      duration: 20,
      adaptations: {
        video: [newVideoAdaptation1, newVideoAdaptation2],
        audio: [newAudioAdaptation],
      },
      getAdaptations() {
        return [newVideoAdaptation1, newVideoAdaptation2, newAudioAdaptation];
      },
    };

    const oldPeriodAdaptationsSpy = jest.spyOn(oldPeriod, "getAdaptations");
    const oldVideoRepresentation1UpdateSpy = jest.spyOn(
      oldVideoRepresentation1.index, "_update");
    const oldVideoRepresentation2UpdateSpy = jest.spyOn(
      oldVideoRepresentation2.index, "_update");
    const oldVideoRepresentation3UpdateSpy = jest.spyOn(
      oldVideoRepresentation3.index, "_update");
    const oldVideoRepresentation4UpdateSpy = jest.spyOn(
      oldVideoRepresentation4.index, "_update");
    const oldAudioRepresentationUpdateSpy = jest.spyOn(
      oldAudioRepresentation.index, "_update");

    const newPeriodAdaptationsSpy = jest.spyOn(newPeriod, "getAdaptations");
    const newVideoRepresentation1UpdateSpy = jest.spyOn(
      newVideoRepresentation1.index, "_update");
    const newVideoRepresentation2UpdateSpy = jest.spyOn(
      newVideoRepresentation2.index, "_update");
    const newVideoRepresentation3UpdateSpy = jest.spyOn(
      newVideoRepresentation3.index, "_update");
    const newVideoRepresentation4UpdateSpy = jest.spyOn(
      newVideoRepresentation4.index, "_update");
    const newAudioRepresentationUpdateSpy = jest.spyOn(
      newAudioRepresentation.index, "_update");

    const logSpy = jest.spyOn(log, "warn");

    updatePeriodInPlace(oldPeriod as any, newPeriod as any);

    expect(oldPeriod.start).toEqual(500);
    expect(oldPeriod.end).toEqual(520);
    expect(oldPeriod.duration).toEqual(20);
    expect(oldPeriodAdaptationsSpy).toHaveBeenCalledTimes(1);

    expect(oldVideoRepresentation1UpdateSpy).toHaveBeenCalledTimes(1);
    expect(oldVideoRepresentation1UpdateSpy)
      .toHaveBeenCalledWith(newVideoRepresentation1.index);

    expect(oldVideoRepresentation2UpdateSpy).toHaveBeenCalledTimes(1);
    expect(oldVideoRepresentation2UpdateSpy)
      .toHaveBeenCalledWith(newVideoRepresentation2.index);

    expect(oldVideoRepresentation3UpdateSpy).toHaveBeenCalledTimes(1);
    expect(oldVideoRepresentation3UpdateSpy)
      .toHaveBeenCalledWith(newVideoRepresentation3.index);

    expect(oldVideoRepresentation4UpdateSpy).toHaveBeenCalledTimes(1);
    expect(oldVideoRepresentation4UpdateSpy)
      .toHaveBeenCalledWith(newVideoRepresentation4.index);

    expect(oldAudioRepresentationUpdateSpy).toHaveBeenCalledTimes(1);
    expect(oldAudioRepresentationUpdateSpy)
      .toHaveBeenCalledWith(newAudioRepresentation.index);

    expect(newPeriod.start).toEqual(500);
    expect(newPeriod.end).toEqual(520);
    expect(newPeriod.duration).toEqual(20);
    expect(newPeriodAdaptationsSpy).toHaveBeenCalledTimes(1);

    expect(newVideoRepresentation1UpdateSpy).not.toHaveBeenCalled();
    expect(newVideoRepresentation2UpdateSpy).not.toHaveBeenCalled();
    expect(newVideoRepresentation3UpdateSpy).not.toHaveBeenCalled();
    expect(newVideoRepresentation4UpdateSpy).not.toHaveBeenCalled();
    expect(newAudioRepresentationUpdateSpy).not.toHaveBeenCalled();

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("should do nothing with new Adaptations", () => {
    const oldVideoRepresentation1 = {
      parsingErrors: [],
      id: "rep-video-1",
      index: {
        _update() { /* noop */ },
      },
    };
    const oldVideoRepresentation2 = {
      parsingErrors: [],
      id: "rep-video-2",
      index: {
        _update() { /* noop */ },
      },
    };
    const oldAudioRepresentation = {
      parsingErrors: [],
      id: "rep-audio-1",
      index: {
        _update() { /* noop */ },
      },
    };
    const oldVideoAdaptation1 = {
      parsingErrors: [],
      id: "ada-video-1",
      representations: [oldVideoRepresentation1, oldVideoRepresentation2],
    };
    const oldAudioAdaptation = {
      parsingErrors: [],
      id: "ada-audio-1",
      representations: [oldAudioRepresentation],
    };
    const oldPeriod = {
      parsingErrors: [],
      start: 5,
      end: 15,
      duration: 10,
      adaptations: {
        video: [oldVideoAdaptation1],
        audio: [oldAudioAdaptation],
      },
      getAdaptations() {
        return [oldVideoAdaptation1, oldAudioAdaptation];
      },
    };

    const newVideoRepresentation1 = {
      parsingErrors: [],
      id: "rep-video-1",
      index: {
        _update() { /* noop */ },
      },
    };
    const newVideoRepresentation2 = {
      parsingErrors: [],
      id: "rep-video-2",
      index: {
        _update() { /* noop */ },
      },
    };
    const newVideoRepresentation3 = {
      parsingErrors: [],
      id: "rep-video-3",
      index: {
        _update() { /* noop */ },
      },
    };
    const newVideoRepresentation4 = {
      parsingErrors: [],
      id: "rep-video-4",
      index: {
        _update() { /* noop */ },
      },
    };
    const newAudioRepresentation = {
      parsingErrors: [],
      id: "rep-audio-1",
      index: {
        _update() { /* noop */ },
      },
    };
    const newVideoAdaptation1 = {
      parsingErrors: [],
      id: "ada-video-1",
      representations: [newVideoRepresentation1, newVideoRepresentation2],
    };
    const newVideoAdaptation2 = {
      parsingErrors: [],
      id: "ada-video-2",
      representations: [newVideoRepresentation3, newVideoRepresentation4],
    };
    const newAudioAdaptation = {
      parsingErrors: [],
      id: "ada-audio-1",
      representations: [newAudioRepresentation],
    };
    const newPeriod = {
      parsingErrors: [],
      start: 500,
      end: 520,
      duration: 20,
      adaptations: {
        video: [newVideoAdaptation1, newVideoAdaptation2],
        audio: [newAudioAdaptation],
      },
      getAdaptations() {
        return [newVideoAdaptation1, newVideoAdaptation2, newAudioAdaptation];
      },
    };

    const logSpy = jest.spyOn(log, "warn");
    updatePeriodInPlace(oldPeriod as any, newPeriod as any);
    expect(logSpy).not.toHaveBeenCalled();
    expect(oldPeriod.adaptations.video).toHaveLength(1);
    logSpy.mockRestore();
  });

  it("should warn if an old Adaptation is not found", () => {
    const oldVideoRepresentation1 = {
      parsingErrors: [],
      id: "rep-video-1",
      index: {
        _update() { /* noop */ },
      },
    };
    const oldVideoRepresentation2 = {
      parsingErrors: [],
      id: "rep-video-2",
      index: {
        _update() { /* noop */ },
      },
    };
    const oldVideoRepresentation3 = {
      parsingErrors: [],
      id: "rep-video-3",
      index: {
        _update() { /* noop */ },
      },
    };
    const oldVideoRepresentation4 = {
      parsingErrors: [],
      id: "rep-video-4",
      index: {
        _update() { /* noop */ },
      },
    };
    const oldAudioRepresentation = {
      parsingErrors: [],
      id: "rep-audio-1",
      index: {
        _update() { /* noop */ },
      },
    };
    const oldVideoAdaptation1 = {
      parsingErrors: [],
      id: "ada-video-1",
      representations: [oldVideoRepresentation1, oldVideoRepresentation2],
    };
    const oldVideoAdaptation2 = {
      parsingErrors: [],
      id: "ada-video-2",
      representations: [oldVideoRepresentation3, oldVideoRepresentation4],
    };
    const oldAudioAdaptation = {
      parsingErrors: [],
      id: "ada-audio-1",
      representations: [oldAudioRepresentation],
    };
    const oldPeriod = {
      parsingErrors: [],
      start: 500,
      end: 520,
      duration: 20,
      adaptations: {
        video: [oldVideoAdaptation1, oldVideoAdaptation2],
        audio: [oldAudioAdaptation],
      },
      getAdaptations() {
        return [oldVideoAdaptation1, oldVideoAdaptation2, oldAudioAdaptation];
      },
    };

    const newVideoRepresentation1 = {
      parsingErrors: [],
      id: "rep-video-1",
      index: {
        _update() { /* noop */ },
      },
    };
    const newVideoRepresentation2 = {
      parsingErrors: [],
      id: "rep-video-2",
      index: {
        _update() { /* noop */ },
      },
    };
    const newAudioRepresentation = {
      parsingErrors: [],
      id: "rep-audio-1",
      index: {
        _update() { /* noop */ },
      },
    };
    const newVideoAdaptation1 = {
      parsingErrors: [],
      id: "ada-video-1",
      representations: [newVideoRepresentation1, newVideoRepresentation2],
    };
    const newAudioAdaptation = {
      parsingErrors: [],
      id: "ada-audio-1",
      representations: [newAudioRepresentation],
    };
    const newPeriod = {
      parsingErrors: [],
      start: 5,
      end: 15,
      duration: 10,
      adaptations: {
        video: [newVideoAdaptation1],
        audio: [newAudioAdaptation],
      },
      getAdaptations() {
        return [newVideoAdaptation1, newAudioAdaptation];
      },
    };

    const logSpy = jest.spyOn(log, "warn");
    updatePeriodInPlace(oldPeriod as any, newPeriod as any);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      "Manifest: Adaptation \"ada-video-2\" not found when merging."
    );
    expect(oldPeriod.adaptations.video).toHaveLength(2);
    logSpy.mockRestore();
  });

  it("should do nothing with new Representations", () => {
    const oldVideoRepresentation1 = {
      parsingErrors: [],
      id: "rep-video-1",
      index: {
        _update() { /* noop */ },
      },
    };
    const oldAudioRepresentation = {
      parsingErrors: [],
      id: "rep-audio-1",
      index: {
        _update() { /* noop */ },
      },
    };
    const oldVideoAdaptation1 = {
      parsingErrors: [],
      id: "ada-video-1",
      representations: [oldVideoRepresentation1],
    };
    const oldAudioAdaptation = {
      parsingErrors: [],
      id: "ada-audio-1",
      representations: [oldAudioRepresentation],
    };
    const oldPeriod = {
      parsingErrors: [],
      start: 5,
      end: 15,
      duration: 10,
      adaptations: {
        video: [oldVideoAdaptation1],
        audio: [oldAudioAdaptation],
      },
      getAdaptations() {
        return [oldVideoAdaptation1, oldAudioAdaptation];
      },
    };

    const newVideoRepresentation1 = {
      parsingErrors: [],
      id: "rep-video-1",
      index: {
        _update() { /* noop */ },
      },
    };
    const newVideoRepresentation2 = {
      parsingErrors: [],
      id: "rep-video-2",
      index: {
        _update() { /* noop */ },
      },
    };
    const newAudioRepresentation = {
      parsingErrors: [],
      id: "rep-audio-1",
      index: {
        _update() { /* noop */ },
      },
    };
    const newVideoAdaptation1 = {
      parsingErrors: [],
      id: "ada-video-1",
      representations: [newVideoRepresentation1, newVideoRepresentation2],
    };
    const newAudioAdaptation = {
      parsingErrors: [],
      id: "ada-audio-1",
      representations: [newAudioRepresentation],
    };
    const newPeriod = {
      parsingErrors: [],
      start: 500,
      end: 520,
      duration: 20,
      adaptations: {
        video: [newVideoAdaptation1],
        audio: [newAudioAdaptation],
      },
      getAdaptations() {
        return [newVideoAdaptation1, newAudioAdaptation];
      },
    };

    const logSpy = jest.spyOn(log, "warn");
    updatePeriodInPlace(oldPeriod as any, newPeriod as any);
    expect(logSpy).not.toHaveBeenCalled();
    expect(oldVideoAdaptation1.representations).toHaveLength(1);
    logSpy.mockRestore();
  });

  it("should warn if an old Representation is not found", () => {
    const oldVideoRepresentation1 = {
      parsingErrors: [],
      id: "rep-video-1",
      index: {
        _update() { /* noop */ },
      },
    };
    const oldVideoRepresentation2 = {
      parsingErrors: [],
      id: "rep-video-2",
      index: {
        _update() { /* noop */ },
      },
    };
    const oldAudioRepresentation = {
      parsingErrors: [],
      id: "rep-audio-1",
      index: {
        _update() { /* noop */ },
      },
    };
    const oldVideoAdaptation1 = {
      parsingErrors: [],
      id: "ada-video-1",
      representations: [oldVideoRepresentation1, oldVideoRepresentation2],
    };
    const oldAudioAdaptation = {
      parsingErrors: [],
      id: "ada-audio-1",
      representations: [oldAudioRepresentation],
    };
    const oldPeriod = {
      parsingErrors: [],
      start: 500,
      end: 520,
      duration: 20,
      adaptations: {
        video: [oldVideoAdaptation1],
        audio: [oldAudioAdaptation],
      },
      getAdaptations() {
        return [oldVideoAdaptation1, oldAudioAdaptation];
      },
    };

    const newVideoRepresentation1 = {
      parsingErrors: [],
      id: "rep-video-1",
      index: {
        _update() { /* noop */ },
      },
    };
    const newAudioRepresentation = {
      parsingErrors: [],
      id: "rep-audio-1",
      index: {
        _update() { /* noop */ },
      },
    };
    const newVideoAdaptation1 = {
      parsingErrors: [],
      id: "ada-video-1",
      representations: [newVideoRepresentation1],
    };
    const newAudioAdaptation = {
      parsingErrors: [],
      id: "ada-audio-1",
      representations: [newAudioRepresentation],
    };
    const newPeriod = {
      parsingErrors: [],
      start: 5,
      end: 15,
      duration: 10,
      adaptations: {
        video: [newVideoAdaptation1],
        audio: [newAudioAdaptation],
      },
      getAdaptations() {
        return [newVideoAdaptation1, newAudioAdaptation];
      },
    };

    const logSpy = jest.spyOn(log, "warn");
    updatePeriodInPlace(oldPeriod as any, newPeriod as any);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      "Manifest: Representation \"rep-video-2\" not found when merging."
    );
    expect(oldVideoAdaptation1.representations).toHaveLength(2);
    logSpy.mockRestore();
  });
});
