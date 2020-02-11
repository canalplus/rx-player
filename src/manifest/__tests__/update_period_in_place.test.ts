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
import { MANIFEST_UPDATE_TYPE } from "../types";
import updatePeriodInPlace from "../update_period_in_place";

const oldVideoRepresentation1 = { parsingErrors: [],
                                  id: "rep-video-1",
                                  index: { _update() { /* noop */ },
                                           _replace() { /* noop */ } } };
const oldVideoRepresentation2 = { parsingErrors: [],
                                  id: "rep-video-2",
                                  index: { _update() { /* noop */ },
                                           _replace() { /* noop */ } } };
const oldVideoRepresentation3 = { parsingErrors: [],
                                  id: "rep-video-3",
                                  index: { _update() { /* noop */ },
                                           _replace() { /* noop */ } } };
const oldVideoRepresentation4 = { parsingErrors: [],
                                  id: "rep-video-4",
                                  index: { _update() { /* noop */ },
                                           _replace() { /* noop */ } } };
const oldAudioRepresentation = { parsingErrors: [],
                                 id: "rep-audio-1",
                                 index: { _update() { /* noop */ },
                                          _replace() { /* noop */ } } };

const newVideoRepresentation1 = { parsingErrors: [],
                                  id: "rep-video-1",
                                  index: { _update() { /* noop */ },
                                           _replace() { /* noop */ } } };
const newVideoRepresentation2 = { parsingErrors: [],
                                  id: "rep-video-2",
                                  index: { _update() { /* noop */ },
                                           _replace() { /* noop */ } } };
const newVideoRepresentation3 = { parsingErrors: [],
                                  id: "rep-video-3",
                                  index: { _update() { /* noop */ },
                                           _replace() { /* noop */ } } };
const newVideoRepresentation4 = { parsingErrors: [],
                                  id: "rep-video-4",
                                  index: { _update() { /* noop */ },
                                           _replace() { /* noop */ } } };
const newAudioRepresentation = { parsingErrors: [],
                                 id: "rep-audio-1",
                                 index: { _update() { /* noop */ },
                                          _replace() { /* noop */ } } };

describe("Manifest - updatePeriodInPlace", () => {
   let oldVideoRepresentation1ReplaceSpy : jest.MockInstance<void, []> | undefined;
   let oldVideoRepresentation2ReplaceSpy : jest.MockInstance<void, []> | undefined;
   let oldVideoRepresentation3ReplaceSpy : jest.MockInstance<void, []> | undefined;
   let oldVideoRepresentation4ReplaceSpy : jest.MockInstance<void, []> | undefined;
   let oldAudioRepresentationReplaceSpy : jest.MockInstance<void, []> | undefined;
   let oldVideoRepresentation1UpdateSpy : jest.MockInstance<void, []> | undefined;
   let oldVideoRepresentation2UpdateSpy : jest.MockInstance<void, []> | undefined;
   let oldVideoRepresentation3UpdateSpy : jest.MockInstance<void, []> | undefined;
   let oldVideoRepresentation4UpdateSpy : jest.MockInstance<void, []> | undefined;
   let oldAudioRepresentationUpdateSpy : jest.MockInstance<void, []> | undefined;
   let newVideoRepresentation1ReplaceSpy : jest.MockInstance<void, []> | undefined;
   let newVideoRepresentation2ReplaceSpy : jest.MockInstance<void, []> | undefined;
   let newVideoRepresentation3ReplaceSpy : jest.MockInstance<void, []> | undefined;
   let newVideoRepresentation4ReplaceSpy : jest.MockInstance<void, []> | undefined;
   let newAudioRepresentationReplaceSpy : jest.MockInstance<void, []> | undefined;
   let newVideoRepresentation1UpdateSpy : jest.MockInstance<void, []> | undefined;
   let newVideoRepresentation2UpdateSpy : jest.MockInstance<void, []> | undefined;
   let newVideoRepresentation3UpdateSpy : jest.MockInstance<void, []> | undefined;
   let newVideoRepresentation4UpdateSpy : jest.MockInstance<void, []> | undefined;
   let newAudioRepresentationUpdateSpy : jest.MockInstance<void, []> | undefined;

  beforeEach(() => {
    oldVideoRepresentation1ReplaceSpy =
      jest.spyOn(oldVideoRepresentation1.index, "_replace");
    oldVideoRepresentation2ReplaceSpy =
      jest.spyOn(oldVideoRepresentation2.index, "_replace");
    oldVideoRepresentation3ReplaceSpy =
      jest.spyOn(oldVideoRepresentation3.index, "_replace");
    oldVideoRepresentation4ReplaceSpy =
      jest.spyOn(oldVideoRepresentation4.index, "_replace");
    oldAudioRepresentationReplaceSpy =
      jest.spyOn(oldAudioRepresentation.index, "_replace");
    oldVideoRepresentation1UpdateSpy =
      jest.spyOn(oldVideoRepresentation1.index, "_update");
    oldVideoRepresentation2UpdateSpy =
      jest.spyOn(oldVideoRepresentation2.index, "_update");
    oldVideoRepresentation3UpdateSpy =
      jest.spyOn(oldVideoRepresentation3.index, "_update");
    oldVideoRepresentation4UpdateSpy =
      jest.spyOn(oldVideoRepresentation4.index, "_update");
    oldAudioRepresentationUpdateSpy =
      jest.spyOn(oldAudioRepresentation.index, "_update");
    newVideoRepresentation1ReplaceSpy =
      jest.spyOn(newVideoRepresentation1.index, "_replace");
    newVideoRepresentation2ReplaceSpy =
      jest.spyOn(newVideoRepresentation2.index, "_replace");
    newVideoRepresentation3ReplaceSpy =
      jest.spyOn(newVideoRepresentation3.index, "_replace");
    newVideoRepresentation4ReplaceSpy =
      jest.spyOn(newVideoRepresentation4.index, "_replace");
    newAudioRepresentationReplaceSpy =
      jest.spyOn(newAudioRepresentation.index, "_replace");
    newVideoRepresentation1UpdateSpy =
      jest.spyOn(newVideoRepresentation1.index, "_update");
    newVideoRepresentation2UpdateSpy =
      jest.spyOn(newVideoRepresentation2.index, "_update");
    newVideoRepresentation3UpdateSpy =
      jest.spyOn(newVideoRepresentation3.index, "_update");
    newVideoRepresentation4UpdateSpy =
      jest.spyOn(newVideoRepresentation4.index, "_update");
    newAudioRepresentationUpdateSpy =
      jest.spyOn(newAudioRepresentation.index, "_update");
  });

  afterEach(() => {
    oldVideoRepresentation1ReplaceSpy?.mockRestore();
    oldVideoRepresentation2ReplaceSpy?.mockRestore();
    oldVideoRepresentation3ReplaceSpy?.mockRestore();
    oldVideoRepresentation4ReplaceSpy?.mockRestore();
    oldAudioRepresentationReplaceSpy?.mockRestore();
    oldVideoRepresentation1UpdateSpy?.mockRestore();
    oldVideoRepresentation2UpdateSpy?.mockRestore();
    oldVideoRepresentation3UpdateSpy?.mockRestore();
    oldVideoRepresentation4UpdateSpy?.mockRestore();
    oldAudioRepresentationUpdateSpy?.mockRestore();
    newVideoRepresentation1ReplaceSpy?.mockRestore();
    newVideoRepresentation2ReplaceSpy?.mockRestore();
    newVideoRepresentation3ReplaceSpy?.mockRestore();
    newVideoRepresentation4ReplaceSpy?.mockRestore();
    newAudioRepresentationReplaceSpy?.mockRestore();
    newVideoRepresentation1UpdateSpy?.mockRestore();
    newVideoRepresentation2UpdateSpy?.mockRestore();
    newVideoRepresentation3UpdateSpy?.mockRestore();
    newVideoRepresentation4UpdateSpy?.mockRestore();
    newAudioRepresentationUpdateSpy?.mockRestore();
  });

/* tslint:disable max-line-length */
  it("should fully update the first Period given by the second one in a full update", () => {
/* tslint:enable max-line-length */
    const oldVideoAdaptation1 = { parsingErrors: [],
                                  id: "ada-video-1",
                                  representations: [oldVideoRepresentation1,
                                                    oldVideoRepresentation2] };
    const oldVideoAdaptation2 = { parsingErrors: [],
                                  id: "ada-video-2",
                                  representations: [oldVideoRepresentation3,
                                                    oldVideoRepresentation4], };
    const oldAudioAdaptation = { parsingErrors: [],
                                 id: "ada-audio-1",
                                 representations: [oldAudioRepresentation] };
    const oldPeriod = { parsingErrors: [],
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
                        } };
    const newVideoAdaptation1 = { parsingErrors: [],
                                  id: "ada-video-1",
                                  representations: [newVideoRepresentation1,
                                                    newVideoRepresentation2] };
    const newVideoAdaptation2 = { parsingErrors: [],
                                  id: "ada-video-2",
                                  representations: [newVideoRepresentation3,
                                                    newVideoRepresentation4] };
    const newAudioAdaptation = { parsingErrors: [],
                                 id: "ada-audio-1",
                                 representations: [newAudioRepresentation] };
    const newPeriod = { parsingErrors: [],
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
                        } };

    const oldPeriodAdaptationsSpy = jest.spyOn(oldPeriod, "getAdaptations");
    const newPeriodAdaptationsSpy = jest.spyOn(newPeriod, "getAdaptations");
    const logSpy = jest.spyOn(log, "warn");

    updatePeriodInPlace(oldPeriod as any, newPeriod as any, MANIFEST_UPDATE_TYPE.Full);

    expect(oldPeriod.start).toEqual(500);
    expect(oldPeriod.end).toEqual(520);
    expect(oldPeriod.duration).toEqual(20);
    expect(oldPeriodAdaptationsSpy).toHaveBeenCalledTimes(1);

    expect(oldVideoRepresentation1ReplaceSpy).toHaveBeenCalledTimes(1);
    expect(oldVideoRepresentation1ReplaceSpy)
      .toHaveBeenCalledWith(newVideoRepresentation1.index);

    expect(oldVideoRepresentation2ReplaceSpy).toHaveBeenCalledTimes(1);
    expect(oldVideoRepresentation2ReplaceSpy)
      .toHaveBeenCalledWith(newVideoRepresentation2.index);

    expect(oldVideoRepresentation3ReplaceSpy).toHaveBeenCalledTimes(1);
    expect(oldVideoRepresentation3ReplaceSpy)
      .toHaveBeenCalledWith(newVideoRepresentation3.index);

    expect(oldVideoRepresentation4ReplaceSpy).toHaveBeenCalledTimes(1);
    expect(oldVideoRepresentation4ReplaceSpy)
      .toHaveBeenCalledWith(newVideoRepresentation4.index);

    expect(oldAudioRepresentationReplaceSpy).toHaveBeenCalledTimes(1);
    expect(oldAudioRepresentationReplaceSpy)
      .toHaveBeenCalledWith(newAudioRepresentation.index);

    expect(newPeriod.start).toEqual(500);
    expect(newPeriod.end).toEqual(520);
    expect(newPeriod.duration).toEqual(20);
    expect(newPeriodAdaptationsSpy).toHaveBeenCalledTimes(1);

    expect(newVideoRepresentation1ReplaceSpy).not.toHaveBeenCalled();
    expect(newVideoRepresentation2ReplaceSpy).not.toHaveBeenCalled();
    expect(newVideoRepresentation3ReplaceSpy).not.toHaveBeenCalled();
    expect(newVideoRepresentation4ReplaceSpy).not.toHaveBeenCalled();
    expect(newAudioRepresentationReplaceSpy).not.toHaveBeenCalled();

    expect(oldVideoRepresentation1UpdateSpy).not.toHaveBeenCalled();
    expect(oldVideoRepresentation2UpdateSpy).not.toHaveBeenCalled();
    expect(oldVideoRepresentation3UpdateSpy).not.toHaveBeenCalled();
    expect(oldVideoRepresentation4UpdateSpy).not.toHaveBeenCalled();
    expect(oldAudioRepresentationUpdateSpy).not.toHaveBeenCalled();
    expect(newVideoRepresentation1UpdateSpy).not.toHaveBeenCalled();
    expect(newVideoRepresentation2UpdateSpy).not.toHaveBeenCalled();
    expect(newVideoRepresentation3UpdateSpy).not.toHaveBeenCalled();
    expect(newVideoRepresentation4UpdateSpy).not.toHaveBeenCalled();
    expect(newAudioRepresentationUpdateSpy).not.toHaveBeenCalled();

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

/* tslint:disable max-line-length */
  it("should partially update the first Period given by the second one in a partial update", () => {
/* tslint:enable max-line-length */
    const oldVideoAdaptation1 = { parsingErrors: [],
                                  id: "ada-video-1",
                                  representations: [oldVideoRepresentation1,
                                                    oldVideoRepresentation2] };
    const oldVideoAdaptation2 = { parsingErrors: [],
                                  id: "ada-video-2",
                                  representations: [oldVideoRepresentation3,
                                                    oldVideoRepresentation4], };
    const oldAudioAdaptation = { parsingErrors: [],
                                 id: "ada-audio-1",
                                 representations: [oldAudioRepresentation] };
    const oldPeriod = { parsingErrors: [],
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
                        } };
    const newVideoAdaptation1 = { parsingErrors: [],
                                  id: "ada-video-1",
                                  representations: [newVideoRepresentation1,
                                                    newVideoRepresentation2] };
    const newVideoAdaptation2 = { parsingErrors: [],
                                  id: "ada-video-2",
                                  representations: [newVideoRepresentation3,
                                                    newVideoRepresentation4] };
    const newAudioAdaptation = { parsingErrors: [],
                                 id: "ada-audio-1",
                                 representations: [newAudioRepresentation] };
    const newPeriod = { parsingErrors: [],
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
                        } };

    const oldPeriodAdaptationsSpy = jest.spyOn(oldPeriod, "getAdaptations");
    const newPeriodAdaptationsSpy = jest.spyOn(newPeriod, "getAdaptations");
    const logSpy = jest.spyOn(log, "warn");

    updatePeriodInPlace(oldPeriod as any, newPeriod as any, MANIFEST_UPDATE_TYPE.Partial);

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

    expect(oldVideoRepresentation1ReplaceSpy).not.toHaveBeenCalled();
    expect(oldVideoRepresentation2ReplaceSpy).not.toHaveBeenCalled();
    expect(oldVideoRepresentation3ReplaceSpy).not.toHaveBeenCalled();
    expect(oldVideoRepresentation4ReplaceSpy).not.toHaveBeenCalled();
    expect(oldAudioRepresentationReplaceSpy).not.toHaveBeenCalled();
    expect(newVideoRepresentation1ReplaceSpy).not.toHaveBeenCalled();
    expect(newVideoRepresentation2ReplaceSpy).not.toHaveBeenCalled();
    expect(newVideoRepresentation3ReplaceSpy).not.toHaveBeenCalled();
    expect(newVideoRepresentation4ReplaceSpy).not.toHaveBeenCalled();
    expect(newAudioRepresentationReplaceSpy).not.toHaveBeenCalled();

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("should do nothing with new Adaptations", () => {
    const oldVideoAdaptation1 = { parsingErrors: [],
                                  id: "ada-video-1",
                                  representations: [oldVideoRepresentation1,
                                                    oldVideoRepresentation2] };
    const oldAudioAdaptation = { parsingErrors: [],
                                 id: "ada-audio-1",
                                 representations: [oldAudioRepresentation] };
    const oldPeriod = { parsingErrors: [],
                        start: 5,
                        end: 15,
                        duration: 10,
                        adaptations: { video: [oldVideoAdaptation1],
                                       audio: [oldAudioAdaptation] },
                        getAdaptations() {
                          return [oldVideoAdaptation1,
                                  oldAudioAdaptation];
                        } };
    const newVideoAdaptation1 = { parsingErrors: [],
                                  id: "ada-video-1",
                                  representations: [newVideoRepresentation1,
                                                    newVideoRepresentation2] };
    const newVideoAdaptation2 = { parsingErrors: [],
                                  id: "ada-video-2",
                                  representations: [newVideoRepresentation3,
                                                    newVideoRepresentation4] };
    const newAudioAdaptation = { parsingErrors: [],
                                 id: "ada-audio-1",
                                 representations: [newAudioRepresentation] };
    const newPeriod = { parsingErrors: [],
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
                        } };

    const logSpy = jest.spyOn(log, "warn");
    updatePeriodInPlace(oldPeriod as any, newPeriod as any, MANIFEST_UPDATE_TYPE.Full);
    expect(logSpy).not.toHaveBeenCalled();
    expect(oldPeriod.adaptations.video).toHaveLength(1);
    updatePeriodInPlace(oldPeriod as any, newPeriod as any, MANIFEST_UPDATE_TYPE.Partial);
    expect(logSpy).not.toHaveBeenCalled();
    expect(oldPeriod.adaptations.video).toHaveLength(1);
    logSpy.mockRestore();
  });

  it("should warn if an old Adaptation is not found", () => {
    const oldVideoAdaptation1 = { parsingErrors: [],
                                  id: "ada-video-1",
                                  representations: [oldVideoRepresentation1,
                                                    oldVideoRepresentation2] };
    const oldVideoAdaptation2 = { parsingErrors: [],
                                  id: "ada-video-2",
                                  representations: [oldVideoRepresentation3,
                                                    oldVideoRepresentation4] };
    const oldAudioAdaptation = { parsingErrors: [],
                                 id: "ada-audio-1",
                                 representations: [oldAudioRepresentation] };
    const oldPeriod = { parsingErrors: [],
                        start: 500,
                        end: 520,
                        duration: 20,
                        adaptations: { video: [oldVideoAdaptation1,
                                               oldVideoAdaptation2],
                                       audio: [oldAudioAdaptation], },
                        getAdaptations() {
                          return [oldVideoAdaptation1,
                                  oldVideoAdaptation2,
                                  oldAudioAdaptation];
                        } };
    const newVideoAdaptation1 = { parsingErrors: [],
                                  id: "ada-video-1",
                                  representations: [newVideoRepresentation1,
                                                    newVideoRepresentation2] };
    const newAudioAdaptation = { parsingErrors: [],
                                 id: "ada-audio-1",
                                 representations: [newAudioRepresentation] };
    const newPeriod = { parsingErrors: [],
                        start: 5,
                        end: 15,
                        duration: 10,
                        adaptations: { video: [newVideoAdaptation1],
                                       audio: [newAudioAdaptation] },
                        getAdaptations() {
                          return [newVideoAdaptation1, newAudioAdaptation];
                        } };

    const logSpy = jest.spyOn(log, "warn");
    updatePeriodInPlace(oldPeriod as any, newPeriod as any, MANIFEST_UPDATE_TYPE.Full);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      "Manifest: Adaptation \"ada-video-2\" not found when merging."
    );
    expect(oldPeriod.adaptations.video).toHaveLength(2);
    logSpy.mockClear();
    updatePeriodInPlace(oldPeriod as any, newPeriod as any, MANIFEST_UPDATE_TYPE.Partial);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      "Manifest: Adaptation \"ada-video-2\" not found when merging."
    );
    expect(oldPeriod.adaptations.video).toHaveLength(2);
    logSpy.mockRestore();
  });

  it("should do nothing with new Representations", () => {
    const oldVideoAdaptation1 = { parsingErrors: [],
                                  id: "ada-video-1",
                                  representations: [oldVideoRepresentation1], };
    const oldAudioAdaptation = { parsingErrors: [],
                                 id: "ada-audio-1",
                                 representations: [oldAudioRepresentation] };
    const oldPeriod = { parsingErrors: [],
                        start: 5,
                        end: 15,
                        duration: 10,
                        adaptations: { video: [oldVideoAdaptation1],
                                       audio: [oldAudioAdaptation] },
                        getAdaptations() { return [oldVideoAdaptation1,
                                                   oldAudioAdaptation]; } };

    const newVideoAdaptation1 = { parsingErrors: [],
                                  id: "ada-video-1",
                                  representations: [newVideoRepresentation1,
                                                    newVideoRepresentation2], };
    const newAudioAdaptation = { parsingErrors: [],
                                 id: "ada-audio-1",
                                 representations: [newAudioRepresentation] };
    const newPeriod = { parsingErrors: [],
                        start: 500,
                        end: 520,
                        duration: 20,
                        adaptations: { video: [newVideoAdaptation1],
                                       audio: [newAudioAdaptation] },
                        getAdaptations() {
                          return [newVideoAdaptation1, newAudioAdaptation];
                        } };

    const logSpy = jest.spyOn(log, "warn");
    updatePeriodInPlace(oldPeriod as any, newPeriod as any, MANIFEST_UPDATE_TYPE.Full);
    expect(logSpy).not.toHaveBeenCalled();
    expect(oldVideoAdaptation1.representations).toHaveLength(1);
    updatePeriodInPlace(oldPeriod as any, newPeriod as any, MANIFEST_UPDATE_TYPE.Partial);
    expect(logSpy).not.toHaveBeenCalled();
    expect(oldVideoAdaptation1.representations).toHaveLength(1);
    logSpy.mockRestore();
  });

  it("should warn if an old Representation is not found", () => {
    const oldVideoAdaptation1 = { parsingErrors: [],
                                  id: "ada-video-1",
                                  representations: [oldVideoRepresentation1,
                                                    oldVideoRepresentation2] };
    const oldAudioAdaptation = { parsingErrors: [],
                                 id: "ada-audio-1",
                                 representations: [oldAudioRepresentation] };
    const oldPeriod = { parsingErrors: [],
                        start: 500,
                        end: 520,
                        duration: 20,
                        adaptations: { video: [oldVideoAdaptation1],
                                       audio: [oldAudioAdaptation] },
                        getAdaptations() { return [oldVideoAdaptation1,
                                                   oldAudioAdaptation]; } };
    const newVideoAdaptation1 = { parsingErrors: [],
                                  id: "ada-video-1",
                                  representations: [newVideoRepresentation1] };
    const newAudioAdaptation = { parsingErrors: [],
                                 id: "ada-audio-1",
                                 representations: [newAudioRepresentation] };
    const newPeriod = { parsingErrors: [],
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

    const logSpy = jest.spyOn(log, "warn");
    updatePeriodInPlace(oldPeriod as any, newPeriod as any, MANIFEST_UPDATE_TYPE.Full);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      "Manifest: Representation \"rep-video-2\" not found when merging."
    );
    expect(oldVideoAdaptation1.representations).toHaveLength(2);
    logSpy.mockClear();
    updatePeriodInPlace(oldPeriod as any, newPeriod as any, MANIFEST_UPDATE_TYPE.Partial);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      "Manifest: Representation \"rep-video-2\" not found when merging."
    );
    expect(oldVideoAdaptation1.representations).toHaveLength(2);
    logSpy.mockRestore();
  });
});
