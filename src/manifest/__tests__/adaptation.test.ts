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

import {
  IRepresentationInfos,
} from "../adaptation";
import Representation from "../representation";

const minimalRepresentationIndex = {
  getInitSegment() { return null; },
  getSegments() { return []; },
  shouldRefresh() { return false; },
  getFirstPosition() : undefined { return ; },
  getLastPosition() : undefined { return ; },
  checkDiscontinuity() { return -1; },
  isSegmentStillAvailable() : undefined { return ; },
  canBeOutOfSyncError() : true { return true; },
  isFinished() : true { return true; },
  _replace() { /* noop */ },
  _update() { /* noop */ },
  _addSegments() { /* noop */ },
};

/* tslint:disable no-unsafe-any */
describe("Manifest - Adaptation", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should be able to create a minimal Adaptation", () => {
    const representationSpy = jest.fn(arg => arg);
    const filterSpy = jest.fn((_type, arg) => arg);

    jest.mock("../representation", () => ({
      __esModule: true,
      default: representationSpy,
    }));
    jest.mock("../filter_supported_representations", () => ({
      __esModule: true,
      default: filterSpy,
    }));

    const Adaptation = require("../adaptation").default;
    const args = { id: "12", representations: [], type: "video" };
    const adaptation = new Adaptation(args);
    expect(adaptation.id).toBe("12");
    expect(adaptation.representations).toEqual([]);
    expect(adaptation.type).toBe("video");
    expect(adaptation.isAudioDescription).toBe(undefined);
    expect(adaptation.isClosedCaption).toBe(undefined);
    expect(adaptation.language).toBe(undefined);
    expect(adaptation.normalizedLanguage).toBe(undefined);
    expect(adaptation.manuallyAdded).toBe(false);
    expect(adaptation.parsingErrors).toEqual([]);
    expect(adaptation.getAvailableBitrates()).toEqual([]);
    expect(adaptation.getRepresentation("")).toBe(undefined);

    expect(representationSpy).not.toHaveBeenCalled();
  });

  it("should throw if the given adaptation type is not supported", () => {
    const representationSpy = jest.fn(arg => arg);
    const filterSpy = jest.fn((_type, arg) => arg);

    jest.mock("../representation", () => ({ default: representationSpy }));
    jest.mock("../filter_supported_representations", () => ({ default: filterSpy }));

    const Adaptation = require("../adaptation").default;
    const args = { id: "12", representations: [], type: "foo" };
    let adaptation = null;
    let error = null;
    try {
      adaptation = new Adaptation(args);
    } catch (err) {
      error = err;
    }
    expect(adaptation).toBe(null);
    expect(error).not.toBe(null);
    expect(error.code).toEqual("MANIFEST_UNSUPPORTED_ADAPTATION_TYPE");
    expect(error.type).toEqual("MEDIA_ERROR");
  });

  it("should normalize a given language", () => {
    const representationSpy = jest.fn(arg => arg);
    const filterSpy = jest.fn((_type, arg) => arg);
    const normalizeSpy = jest.fn((lang : string) => lang + "foo");

    jest.mock("../representation", () => ({
      __esModule: true,
      default: representationSpy,
    }));
    jest.mock("../filter_supported_representations", () => ({
      __esModule: true,
      default: filterSpy,
    }));
    jest.mock("../../utils/languages", () => ({
      __esModule: true,
      default: normalizeSpy,
    }));

    const Adaptation = require("../adaptation").default;
    const args1 = {
      id: "12",
      representations: [],
      language: "fr",
      type: "video"as "video",
    };
    const adaptation1 = new Adaptation(args1);
    expect(adaptation1.language).toBe("fr");
    expect(adaptation1.normalizedLanguage).toBe("frfoo");
    expect(normalizeSpy).toHaveBeenCalledTimes(1);
    expect(normalizeSpy).toHaveBeenCalledWith("fr");
    normalizeSpy.mockClear();

    const args2 = {
      id: "12",
      representations: [],
      language: "toto",
      type: "video",
    };
    const adaptation2 = new Adaptation(args2);
    expect(adaptation2.language).toBe("toto");
    expect(adaptation2.normalizedLanguage).toBe("totofoo");
    expect(normalizeSpy).toHaveBeenCalledTimes(1);
    expect(normalizeSpy).toHaveBeenCalledWith("toto");
  });

  it("should not call normalize if no language is given", () => {
    const representationSpy = jest.fn(arg => arg);
    const filterSpy = jest.fn((_type, arg) => arg);
    const normalizeSpy = jest.fn((lang : string) => lang + "foo");

    jest.mock("../representation", () => ({
      __esModule: true,
      default: representationSpy,
    }));
    jest.mock("../filter_supported_representations", () => ({
      __esModule: true,
      default: filterSpy,
    }));
    jest.mock("../../utils/languages", () => ({
      __esModule: true,
      default: normalizeSpy,
    }));

    const Adaptation = require("../adaptation").default;
    const args1 = {
      id: "12",
      representations: [],
      type: "video",
    };
    const adaptation1 = new Adaptation(args1);
    expect(adaptation1.language).toBe(undefined);
    expect(adaptation1.normalizedLanguage).toBe(undefined);
    expect(normalizeSpy).not.toHaveBeenCalled();
  });

  it("should create and sort the corresponding Representations", () => {
    const representationSpy = jest.fn(arg => arg);
    const filterSpy = jest.fn((_type, arg) => arg);

    jest.mock("../representation", () => ({
      __esModule: true,
      default: representationSpy,
    }));
    jest.mock("../filter_supported_representations", () => ({
      __esModule: true,
      default: filterSpy,
    }));

    const Adaptation = require("../adaptation").default;
    const rep1 = { bitrate: 10, id: "rep1", index: minimalRepresentationIndex };
    const rep2 = { bitrate: 30, id: "rep2", index: minimalRepresentationIndex };
    const rep3 = { bitrate: 20, id: "rep3", index: minimalRepresentationIndex };
    const representations = [rep1, rep2, rep3];
    const args = { id: "12", representations, type: "text" as "text" };

    const adaptation = new Adaptation(args);
    const parsedRepresentations = adaptation.representations;
    expect(representationSpy).toHaveBeenCalledTimes(3);
    expect(representationSpy).toHaveBeenNthCalledWith(1, rep1);
    expect(representationSpy).toHaveBeenNthCalledWith(2, rep2);
    expect(representationSpy).toHaveBeenNthCalledWith(3, rep3);
    expect(filterSpy).toHaveReturnedTimes(1);
    expect(filterSpy).toHaveBeenCalledWith("text", representations);

    expect(adaptation.parsingErrors).toEqual([]);
    expect(parsedRepresentations.length).toBe(3);
    expect(parsedRepresentations[0]).toEqual(new Representation(rep1));
    expect(parsedRepresentations[1]).toEqual(new Representation(rep3));
    expect(parsedRepresentations[2]).toEqual(new Representation(rep2));

    expect(adaptation.getAvailableBitrates()).toEqual([10, 20, 30]);
    expect(adaptation.getRepresentation("rep2")).toEqual(new Representation(rep2));
  });

  it("should execute the representationFilter if given", () => {
    const representationSpy = jest.fn(arg => arg);
    const filterSpy = jest.fn((_type, arg) => arg);

    jest.mock("../representation", () => ({
      __esModule: true,
      default: representationSpy,
    }));
    jest.mock("../filter_supported_representations", () => ({
      __esModule: true,
      default: filterSpy,
    }));

    const Adaptation = require("../adaptation").default;
    const rep1 = { bitrate: 10, id: "rep1", index: minimalRepresentationIndex };
    const rep2 = { bitrate: 20, id: "rep2", index: minimalRepresentationIndex };
    const rep3 = { bitrate: 30, id: "rep3", index: minimalRepresentationIndex };
    const rep4 = { bitrate: 40, id: "rep4", index: minimalRepresentationIndex };
    const rep5 = { bitrate: 50, id: "rep5", index: minimalRepresentationIndex };
    const rep6 = { bitrate: 60, id: "rep6", index: minimalRepresentationIndex };
    const representations = [rep1, rep2, rep3, rep4, rep5, rep6];

    const representationFilter = jest.fn((
      representation : Representation,
      adaptationInfos : IRepresentationInfos
    ) => {
      if (adaptationInfos.language === "fr" && representation.bitrate < 40) {
        return false;
      }
      return true;
    });
    const args = { id: "12", language: "fr", representations, type: "text" as "text" };
    const adaptation = new Adaptation(args, { representationFilter });

    const parsedRepresentations = adaptation.representations;
    expect(representationFilter).toHaveBeenCalledTimes(6);
    expect(adaptation.parsingErrors).toEqual([]);
    expect(parsedRepresentations.length).toBe(3);

    expect(parsedRepresentations[0]).toEqual(new Representation(rep4));
    expect(parsedRepresentations[1]).toEqual(new Representation(rep5));
    expect(parsedRepresentations[2]).toEqual(new Representation(rep6));

    expect(adaptation.getAvailableBitrates()).toEqual([40, 50, 60]);
    expect(adaptation.getRepresentation("rep2")).toBe(undefined);
    expect(adaptation.getRepresentation("rep4")).toEqual(new Representation(rep4));
  });

  it("should set a parsing error if no Representation is supported", () => {
    const representationSpy = jest.fn(arg => arg);
    const filterSpy = jest.fn(() => []);

    jest.mock("../representation", () => ({
      __esModule: true,
      default: representationSpy,
    }));
    jest.mock("../filter_supported_representations", () => ({
      __esModule: true,
      default: filterSpy,
    }));

    const Adaptation = require("../adaptation").default;
    const rep1 = { bitrate: 10, id: "rep1", index: minimalRepresentationIndex };
    const rep2 = { bitrate: 20, id: "rep2", index: minimalRepresentationIndex };
    const representations = [rep1, rep2];
    const args = { id: "12", representations, type: "text" as "text" };
    const adaptation = new Adaptation(args);

    const parsedRepresentations = adaptation.representations;
    expect(parsedRepresentations.length).toBe(0);

    expect(adaptation.parsingErrors).toHaveLength(1);
    const error = adaptation.parsingErrors[0];
    expect(error.code).toEqual("MANIFEST_INCOMPATIBLE_CODECS_ERROR");
    expect(error.type).toEqual("MEDIA_ERROR");
  });

  it("should not set a parsing error if we had no Representation", () => {
    const representationSpy = jest.fn(arg => arg);
    const filterSpy = jest.fn(() => []);

    jest.mock("../representation", () => ({
      __esModule: true,
      default: representationSpy,
    }));
    jest.mock("../filter_supported_representations", () => ({
      __esModule: true,
      default: filterSpy,
    }));

    const Adaptation = require("../adaptation").default;
    const args = { id: "12", representations: [], type: "text" as "text" };
    const adaptation = new Adaptation(args);

    const parsedRepresentations = adaptation.representations;
    expect(parsedRepresentations.length).toBe(0);
    expect(adaptation.parsingErrors).toEqual([]);
  });

  it("should set an isDub value if one", () => {
    const representationSpy = jest.fn(arg => arg);
    const filterSpy = jest.fn((_type, arg) => arg);
    const normalizeSpy = jest.fn((lang : string) => lang + "foo");

    jest.mock("../representation", () => ({ __esModule: true,
                                            default: representationSpy }));
    jest.mock("../filter_supported_representations", () => ({ __esModule: true,
                                                              default: filterSpy }));
    jest.mock("../../utils/languages", () => ({ __esModule: true,
                                                default: normalizeSpy }));

    const Adaptation = require("../adaptation").default;

    const args1 = { id: "12",
                    representations: [],
                    isDub: false,
                    type: "video" };
    const adaptation1 = new Adaptation(args1);
    expect(adaptation1.language).toBe(undefined);
    expect(adaptation1.normalizedLanguage).toBe(undefined);
    expect(adaptation1.isDub).toEqual(false);
    expect(normalizeSpy).not.toHaveBeenCalled();

    const args2 = { id: "12",
                    representations: [],
                    isDub: true,
                    type: "video" };
    const adaptation2 = new Adaptation(args2);
    expect(adaptation2.language).toBe(undefined);
    expect(adaptation2.normalizedLanguage).toBe(undefined);
    expect(adaptation2.isDub).toEqual(true);
    expect(normalizeSpy).not.toHaveBeenCalled();
  });

  it("should set an isClosedCaption value if one", () => {
    const representationSpy = jest.fn(arg => arg);
    const filterSpy = jest.fn((_type, arg) => arg);
    const normalizeSpy = jest.fn((lang : string) => lang + "foo");

    jest.mock("../representation", () => ({
      __esModule: true,
      default: representationSpy,
    }));
    jest.mock("../filter_supported_representations", () => ({
      __esModule: true,
      default: filterSpy,
    }));
    jest.mock("../../utils/languages", () => ({
      __esModule: true,
      default: normalizeSpy,
    }));

    const Adaptation = require("../adaptation").default;

    const args1 = {
      id: "12",
      representations: [],
      closedCaption: false,
      type: "video",
    };
    const adaptation1 = new Adaptation(args1);
    expect(adaptation1.language).toBe(undefined);
    expect(adaptation1.normalizedLanguage).toBe(undefined);
    expect(adaptation1.isClosedCaption).toEqual(false);
    expect(normalizeSpy).not.toHaveBeenCalled();

    const args2 = {
      id: "12",
      representations: [],
      closedCaption: true,
      type: "video",
    };
    const adaptation2 = new Adaptation(args2);
    expect(adaptation2.language).toBe(undefined);
    expect(adaptation2.normalizedLanguage).toBe(undefined);
    expect(adaptation2.isClosedCaption).toEqual(true);
    expect(normalizeSpy).not.toHaveBeenCalled();
  });

  it("should set an isAudioDescription value if one", () => {
    const representationSpy = jest.fn(arg => arg);
    const filterSpy = jest.fn((_type, arg) => arg);
    const normalizeSpy = jest.fn((lang : string) => lang + "foo");

    jest.mock("../representation", () => ({
      __esModule: true,
      default: representationSpy,
    }));
    jest.mock("../filter_supported_representations", () => ({
      __esModule: true,
      default: filterSpy,
    }));
    jest.mock("../../utils/languages", () => ({
      __esModule: true,
      default: normalizeSpy,
    }));

    const Adaptation = require("../adaptation").default;

    const args1 = {
      id: "12",
      representations: [],
      audioDescription: false,
      type: "video",
    };
    const adaptation1 = new Adaptation(args1);
    expect(adaptation1.language).toBe(undefined);
    expect(adaptation1.normalizedLanguage).toBe(undefined);
    expect(adaptation1.isAudioDescription).toEqual(false);
    expect(normalizeSpy).not.toHaveBeenCalled();

    const args2 = {
      id: "12",
      representations: [],
      audioDescription: true,
      type: "video",
    };
    const adaptation2 = new Adaptation(args2);
    expect(adaptation2.language).toBe(undefined);
    expect(adaptation2.normalizedLanguage).toBe(undefined);
    expect(adaptation2.isAudioDescription).toEqual(true);
    expect(normalizeSpy).not.toHaveBeenCalled();
  });

  it("should set a manuallyAdded value if one", () => {
    const representationSpy = jest.fn(arg => arg);
    const filterSpy = jest.fn((_type, arg) => arg);
    const normalizeSpy = jest.fn((lang : string) => lang + "foo");

    jest.mock("../representation", () => ({
      __esModule: true,
      default: representationSpy,
    }));
    jest.mock("../filter_supported_representations", () => ({
      __esModule: true,
      default: filterSpy,
    }));
    jest.mock("../../utils/languages", () => ({
      __esModule: true,
      default: normalizeSpy,
    }));

    const Adaptation = require("../adaptation").default;

    const args1 = {
      id: "12",
      representations: [],
      type: "video",
    };
    const adaptation1 = new Adaptation(args1, { isManuallyAdded: false });
    expect(adaptation1.language).toBe(undefined);
    expect(adaptation1.normalizedLanguage).toBe(undefined);
    expect(adaptation1.manuallyAdded).toEqual(false);
    expect(normalizeSpy).not.toHaveBeenCalled();

    const args2 = {
      id: "12",
      representations: [],
      type: "video",
    };
    const adaptation2 = new Adaptation(args2, { isManuallyAdded: true });
    expect(adaptation2.language).toBe(undefined);
    expect(adaptation2.normalizedLanguage).toBe(undefined);
    expect(adaptation2.manuallyAdded).toEqual(true);
    expect(normalizeSpy).not.toHaveBeenCalled();
  });

  /* tslint:disable:max-line-length */
  it("should filter Representation with duplicate bitrates in getAvailableBitrates", () => {
  /* tslint:enable:max-line-length */

    const representationSpy = jest.fn(arg => arg);
    const filterSpy = jest.fn((_type, arg) => arg);
    const uniqSpy = jest.fn(() => [45, 92]);

    jest.mock("../../utils/uniq", () => ({
      __esModule: true,
      default: uniqSpy,
    }));
    jest.mock("../representation", () => ({
      __esModule: true,
      default: representationSpy,
    }));
    jest.mock("../filter_supported_representations", () => ({
      __esModule: true,
      default: filterSpy,
    }));

    const Adaptation = require("../adaptation").default;
    const rep1 = { bitrate: 10, id: "rep1", index: minimalRepresentationIndex };
    const rep2 = { bitrate: 20, id: "rep2", index: minimalRepresentationIndex };
    const rep3 = { bitrate: 20, id: "rep3", index: minimalRepresentationIndex };
    const representations = [rep1, rep2, rep3];
    const args = { id: "12", representations, type: "text" as "text" };
    const adaptation = new Adaptation(args);

    const parsedRepresentations = adaptation.representations;
    expect(adaptation.parsingErrors).toEqual([]);
    expect(parsedRepresentations.length).toBe(3);

    expect(adaptation.getAvailableBitrates()).toEqual([45, 92]);
    expect(uniqSpy).toHaveBeenCalledTimes(1);
    expect(uniqSpy).toHaveBeenCalledWith(representations.map(r => r.bitrate));
  });

  /* tslint:disable:max-line-length */
  it("should return the first Representation with the given Id with `getRepresentation`", () => {
  /* tslint:enable:max-line-length */

    const representationSpy = jest.fn(arg => arg);
    const filterSpy = jest.fn((_type, arg) => arg);

    jest.mock("../representation", () => ({
      __esModule: true,
      default: representationSpy,
    }));
    jest.mock("../filter_supported_representations", () => ({
      __esModule: true,
      default: filterSpy,
    }));

    const Adaptation = require("../adaptation").default;
    const rep1 = { bitrate: 10, id: "rep1", index: minimalRepresentationIndex };
    const rep2 = { bitrate: 20, id: "rep2", index: minimalRepresentationIndex };
    const rep3 = { bitrate: 30, id: "rep2", index: minimalRepresentationIndex };
    const representations = [rep1, rep2, rep3];
    const args = { id: "12", representations, type: "text" as "text" };
    const adaptation = new Adaptation(args);

    expect(adaptation.getRepresentation("rep1")).toBe(rep1);
    expect(adaptation.getRepresentation("rep2")).toBe(rep2);
  });

  /* tslint:disable:max-line-length */
  it("should return undefined in `getRepresentation` if no representation is found with this Id", () => {
  /* tslint:enable:max-line-length */

    const representationSpy = jest.fn(arg => arg);
    const filterSpy = jest.fn((_type, arg) => arg);

    jest.mock("../representation", () => ({
      __esModule: true,
      default: representationSpy,
    }));
    jest.mock("../filter_supported_representations", () => ({
      __esModule: true,
      default: filterSpy,
    }));

    const Adaptation = require("../adaptation").default;
    const rep1 = { bitrate: 10, id: "rep1", index: minimalRepresentationIndex };
    const rep2 = { bitrate: 20, id: "rep2", index: minimalRepresentationIndex };
    const rep3 = { bitrate: 30, id: "rep2", index: minimalRepresentationIndex };
    const representations = [rep1, rep2, rep3];
    const args = { id: "12", representations, type: "text" as "text" };
    const adaptation = new Adaptation(args);

    expect(adaptation.getRepresentation("rep5")).toBe(undefined);
  });
});
/* tslint:enable no-unsafe-any */
