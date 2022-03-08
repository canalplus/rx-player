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

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { IRepresentationInfos } from "../../public_types";
import Representation from "../representation";

const minimalRepresentationIndex = {
  getInitSegment() { return null; },
  getSegments() { return []; },
  shouldRefresh() { return false; },
  getFirstPosition() : undefined { return ; },
  getLastPosition() : undefined { return ; },
  checkDiscontinuity() { return null; },
  isSegmentStillAvailable() : undefined { return ; },
  canBeOutOfSyncError() : true { return true; },
  isFinished() : true { return true; },
  areSegmentsChronologicallyGenerated() { return true; },
  _replace() { /* noop */ },
  _update() { /* noop */ },
};
const mockDefaultRepresentationImpl = jest.fn(arg => {
  return { bitrate: arg.bitrate,
           id: arg.id,
           isSupported: true,
           isPlayable() { return true; },
           index: arg.index };
});

describe("Manifest - Adaptation", () => {
  beforeEach(() => {
    jest.resetModules();
  });
  afterEach(() => {
    mockDefaultRepresentationImpl.mockClear();
  });

  it("should be able to create a minimal Adaptation", () => {
    jest.mock("../representation", () => ({ __esModule: true as const,
                                            default: mockDefaultRepresentationImpl }));

    const Adaptation = jest.requireActual("../adaptation").default;
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
    expect(adaptation.getRepresentation("")).toBe(undefined);

    expect(mockDefaultRepresentationImpl).not.toHaveBeenCalled();
  });

  it("should normalize a given language", () => {
    jest.mock("../representation", () => ({ __esModule: true as const,
                                            default: mockDefaultRepresentationImpl }));
    const mockNormalize = jest.fn((lang : string) => lang + "foo");
    jest.mock("../../utils/languages", () => ({ __esModule: true as const,
                                                default: mockNormalize }));

    const Adaptation = jest.requireActual("../adaptation").default;
    const args1 = { id: "12",
                    representations: [],
                    language: "fr",
                    type: "video"as const };
    const adaptation1 = new Adaptation(args1);
    expect(adaptation1.language).toBe("fr");
    expect(adaptation1.normalizedLanguage).toBe("frfoo");
    expect(mockNormalize).toHaveBeenCalledTimes(1);
    expect(mockNormalize).toHaveBeenCalledWith("fr");
    mockNormalize.mockClear();

    const args2 = { id: "12",
                    representations: [],
                    language: "toto",
                    type: "video" };
    const adaptation2 = new Adaptation(args2);
    expect(adaptation2.language).toBe("toto");
    expect(adaptation2.normalizedLanguage).toBe("totofoo");
    expect(mockNormalize).toHaveBeenCalledTimes(1);
    expect(mockNormalize).toHaveBeenCalledWith("toto");
  });

  it("should not call normalize if no language is given", () => {
    jest.mock("../representation", () => ({ __esModule: true as const,
                                            default: mockDefaultRepresentationImpl }));
    const mockNormalize = jest.fn((lang : string) => lang + "foo");
    jest.mock("../../utils/languages", () => ({ __esModule: true as const,
                                                default: mockNormalize }));

    const Adaptation = jest.requireActual("../adaptation").default;
    const args1 = { id: "12",
                    representations: [],
                    type: "video" };
    const adaptation1 = new Adaptation(args1);
    expect(adaptation1.language).toBe(undefined);
    expect(adaptation1.normalizedLanguage).toBe(undefined);
    expect(mockNormalize).not.toHaveBeenCalled();
  });

  it("should create and sort the corresponding Representations", () => {
    jest.mock("../representation", () => ({ __esModule: true as const,
                                            default: mockDefaultRepresentationImpl }));

    const Adaptation = jest.requireActual("../adaptation").default;
    const rep1 = { bitrate: 10,
                   id: "rep1",
                   index: minimalRepresentationIndex };
    const rep2 = { bitrate: 30,
                   id: "rep2",
                   index: minimalRepresentationIndex };
    const rep3 = { bitrate: 20,
                   id: "rep3",
                   index: minimalRepresentationIndex };
    const representations = [rep1, rep2, rep3];
    const args = { id: "12",
                   representations,
                   type: "text" as const };

    const adaptation = new Adaptation(args);
    const parsedRepresentations = adaptation.representations;
    expect(mockDefaultRepresentationImpl).toHaveBeenCalledTimes(3);
    expect(mockDefaultRepresentationImpl)
      .toHaveBeenNthCalledWith(1, rep1, { type: "text" });
    expect(mockDefaultRepresentationImpl)
      .toHaveBeenNthCalledWith(2, rep2, { type: "text" });
    expect(mockDefaultRepresentationImpl)
      .toHaveBeenNthCalledWith(3, rep3, { type: "text" });

    expect(parsedRepresentations.length).toBe(3);
    expect(parsedRepresentations[0].id).toEqual("rep1");
    expect(parsedRepresentations[1].id).toEqual("rep3");
    expect(parsedRepresentations[2].id).toEqual("rep2");

    expect(adaptation.getRepresentation("rep2").bitrate).toEqual(30);
  });

  it("should execute the representationFilter if given", () => {
    const mockRepresentation = jest.fn(arg => {
      return { bitrate: arg.bitrate,
               id: arg.id,
               isSupported: arg.id !== "rep4",
               isPlayable() { return true; },
               index: arg.index };
    });

    jest.mock("../representation", () => ({ __esModule: true as const,
                                            default: mockRepresentation }));

    const Adaptation = jest.requireActual("../adaptation").default;
    const rep1 = { bitrate: 10,
                   id: "rep1",
                   index: minimalRepresentationIndex };
    const rep2 = { bitrate: 20,
                   id: "rep2",
                   index: minimalRepresentationIndex };
    const rep3 = { bitrate: 30,
                   id: "rep3",
                   index: minimalRepresentationIndex };
    const rep4 = { bitrate: 40,
                   id: "rep4",
                   index: minimalRepresentationIndex };
    const rep5 = { bitrate: 50,
                   id: "rep5",
                   index: minimalRepresentationIndex };
    const rep6 = { bitrate: 60,
                   id: "rep6",
                   index: minimalRepresentationIndex };
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
    const args = { id: "12",
                   language: "fr",
                   representations,
                   type: "text" as const };
    const adaptation = new Adaptation(args, { representationFilter });

    const parsedRepresentations = adaptation.representations;
    expect(representationFilter).toHaveBeenCalledTimes(6);
    expect(parsedRepresentations.length).toBe(3);

    expect(parsedRepresentations[0].id).toEqual("rep4");
    expect(parsedRepresentations[1].id).toEqual("rep5");
    expect(parsedRepresentations[2].id).toEqual("rep6");

    expect(adaptation.getRepresentation("rep2")).toBe(undefined);
    expect(adaptation.getRepresentation("rep4").id).toEqual("rep4");
  });

  it("should set an isDub value if one", () => {
    jest.mock("../representation", () => ({ __esModule: true as const,
                                            default: mockDefaultRepresentationImpl }));
    const mockNormalize = jest.fn((lang : string) => lang + "foo");
    jest.mock("../../utils/languages", () => ({ __esModule: true as const,
                                                default: mockNormalize }));

    const Adaptation = jest.requireActual("../adaptation").default;

    const args1 = { id: "12",
                    representations: [],
                    isDub: false,
                    type: "video" };
    const adaptation1 = new Adaptation(args1);
    expect(adaptation1.language).toBe(undefined);
    expect(adaptation1.normalizedLanguage).toBe(undefined);
    expect(adaptation1.isDub).toEqual(false);
    expect(mockNormalize).not.toHaveBeenCalled();

    const args2 = { id: "12",
                    representations: [],
                    isDub: true,
                    type: "video" };
    const adaptation2 = new Adaptation(args2);
    expect(adaptation2.language).toBe(undefined);
    expect(adaptation2.normalizedLanguage).toBe(undefined);
    expect(adaptation2.isDub).toEqual(true);
    expect(mockNormalize).not.toHaveBeenCalled();
  });

  it("should set an isClosedCaption value if one", () => {
    jest.mock("../representation", () => ({ __esModule: true as const,
                                            default: mockDefaultRepresentationImpl }));
    const mockNormalize = jest.fn((lang : string) => lang + "foo");
    jest.mock("../../utils/languages", () => ({ __esModule: true as const,
                                                default: mockNormalize }));

    const Adaptation = jest.requireActual("../adaptation").default;

    const args1 = { id: "12",
                    representations: [],
                    closedCaption: false,
                    type: "video" };
    const adaptation1 = new Adaptation(args1);
    expect(adaptation1.language).toBe(undefined);
    expect(adaptation1.normalizedLanguage).toBe(undefined);
    expect(adaptation1.isClosedCaption).toEqual(false);
    expect(mockNormalize).not.toHaveBeenCalled();

    const args2 = { id: "12",
                    representations: [],
                    closedCaption: true,
                    type: "video" };
    const adaptation2 = new Adaptation(args2);
    expect(adaptation2.language).toBe(undefined);
    expect(adaptation2.normalizedLanguage).toBe(undefined);
    expect(adaptation2.isClosedCaption).toEqual(true);
    expect(mockNormalize).not.toHaveBeenCalled();
  });

  it("should set an isAudioDescription value if one", () => {
    jest.mock("../representation", () => ({ __esModule: true as const,
                                            default: mockDefaultRepresentationImpl }));
    const mockNormalize = jest.fn((lang : string) => lang + "foo");

    jest.mock("../../utils/languages", () => ({ __esModule: true as const,
                                                default: mockNormalize }));

    const Adaptation = jest.requireActual("../adaptation").default;

    const args1 = { id: "12",
                    representations: [],
                    audioDescription: false,
                    type: "video" };
    const adaptation1 = new Adaptation(args1);
    expect(adaptation1.language).toBe(undefined);
    expect(adaptation1.normalizedLanguage).toBe(undefined);
    expect(adaptation1.isAudioDescription).toEqual(false);
    expect(mockNormalize).not.toHaveBeenCalled();

    const args2 = { id: "12",
                    representations: [],
                    audioDescription: true,
                    type: "video" };
    const adaptation2 = new Adaptation(args2);
    expect(adaptation2.language).toBe(undefined);
    expect(adaptation2.normalizedLanguage).toBe(undefined);
    expect(adaptation2.isAudioDescription).toEqual(true);
    expect(mockNormalize).not.toHaveBeenCalled();
  });

  it("should set a manuallyAdded value if one", () => {
    jest.mock("../representation", () => ({ __esModule: true as const,
                                            default: mockDefaultRepresentationImpl }));
    const mockNormalize = jest.fn((lang : string) => lang + "foo");
    jest.mock("../../utils/languages", () => ({ __esModule: true as const,
                                                default: mockNormalize }));

    const Adaptation = jest.requireActual("../adaptation").default;

    const args1 = { id: "12",
                    representations: [],
                    type: "video" };
    const adaptation1 = new Adaptation(args1, { isManuallyAdded: false });
    expect(adaptation1.language).toBe(undefined);
    expect(adaptation1.normalizedLanguage).toBe(undefined);
    expect(adaptation1.manuallyAdded).toEqual(false);
    expect(mockNormalize).not.toHaveBeenCalled();

    const args2 = { id: "12",
                    representations: [],
                    type: "video" };
    const adaptation2 = new Adaptation(args2, { isManuallyAdded: true });
    expect(adaptation2.language).toBe(undefined);
    expect(adaptation2.normalizedLanguage).toBe(undefined);
    expect(adaptation2.manuallyAdded).toEqual(true);
    expect(mockNormalize).not.toHaveBeenCalled();
  });

  /* eslint-disable max-len */
  it("should return the first Representation with the given Id with `getRepresentation`", () => {
  /* eslint-enable max-len */

    jest.mock("../representation", () => ({ __esModule: true as const,
                                            default: mockDefaultRepresentationImpl }));

    const Adaptation = jest.requireActual("../adaptation").default;
    const rep1 = { bitrate: 10,
                   id: "rep1",
                   index: minimalRepresentationIndex };
    const rep2 = { bitrate: 20,
                   id: "rep2",
                   index: minimalRepresentationIndex };
    const rep3 = { bitrate: 30,
                   id: "rep2",
                   index: minimalRepresentationIndex };
    const representations = [rep1, rep2, rep3];
    const args = { id: "12", representations, type: "text" as const };
    const adaptation = new Adaptation(args);

    expect(adaptation.getRepresentation("rep1").bitrate).toEqual(10);
    expect(adaptation.getRepresentation("rep2").bitrate).toEqual(20);
  });

  /* eslint-disable max-len */
  it("should return undefined in `getRepresentation` if no representation is found with this Id", () => {
  /* eslint-enable max-len */

    jest.mock("../representation", () => ({ __esModule: true as const,
                                            default: mockDefaultRepresentationImpl }));

    const Adaptation = jest.requireActual("../adaptation").default;
    const rep1 = { bitrate: 10,
                   id: "rep1",
                   index: minimalRepresentationIndex };
    const rep2 = { bitrate: 20,
                   id: "rep2",
                   index: minimalRepresentationIndex };
    const rep3 = { bitrate: 30,
                   id: "rep2",
                   index: minimalRepresentationIndex };
    const representations = [rep1, rep2, rep3];
    const args = { id: "12", representations, type: "text" as const };
    const adaptation = new Adaptation(args);

    expect(adaptation.getRepresentation("rep5")).toBe(undefined);
  });

  /* eslint-disable max-len */
  it("should return only playable representations when calling `getPlayableRepresentations`", () => {
  /* eslint-enable max-len */
    const mockRepresentation = jest.fn(arg => {
      return { bitrate: arg.bitrate,
               id: arg.id,
               isPlayable() { return arg.id !== "rep3"; },
               index: arg.index };
    });
    jest.mock("../representation", () => ({ __esModule: true as const,
                                            default: mockRepresentation }));

    const Adaptation = jest.requireActual("../adaptation").default;
    const rep1 = { bitrate: 10,
                   id: "rep1",
                   index: minimalRepresentationIndex };
    const rep2 = { bitrate: 20,
                   id: "rep2",
                   index: minimalRepresentationIndex };
    const rep3 = { bitrate: 30,
                   id: "rep3",
                   index: minimalRepresentationIndex };
    const rep4 = { bitrate: 40,
                   id: "rep4",
                   index: minimalRepresentationIndex };
    const rep5 = { bitrate: 50,
                   id: "rep5",
                   index: minimalRepresentationIndex };
    const rep6 = { bitrate: 60,
                   id: "rep6",
                   index: minimalRepresentationIndex };
    const rep7 = { bitrate: 70,
                   id: "rep7",
                   index: minimalRepresentationIndex };
    const rep8 = { bitrate: 80,
                   id: "rep8",
                   index: minimalRepresentationIndex };
    const representations = [rep1,
                             rep2,
                             rep3,
                             rep4,
                             rep5,
                             rep6,
                             rep7,
                             rep8];
    const args = { id: "12", representations, type: "text" as const };
    const adaptation = new Adaptation(args);

    const playableRepresentations = adaptation.getPlayableRepresentations();
    expect(playableRepresentations.length).toEqual(7);
    expect(playableRepresentations[0].id).toEqual("rep1");
    expect(playableRepresentations[1].id).toEqual("rep2");
    expect(playableRepresentations[2].id).toEqual("rep4");
    expect(playableRepresentations[3].id).toEqual("rep5");
    expect(playableRepresentations[4].id).toEqual("rep6");
    expect(playableRepresentations[5].id).toEqual("rep7");
    expect(playableRepresentations[6].id).toEqual("rep8");
  });
});
