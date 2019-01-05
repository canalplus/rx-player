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

import Adaptation, {
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
  _update() { /* noop */ },
  _addSegments() { /* noop */ },
};

describe("manifest - Adaptation", () => {
  it("should be able to create a minimal Adaptation", () => {
    const args = { id: "12", representations: [], type: "video" as "video" };
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
    expect(adaptation.getRepresentationsForBitrate(0)).toEqual([]);
  });

  it("should normalize a given language", () => {
    const args1 = {
      id: "12",
      representations: [],
      language: "fr",
      type: "video" as "video",
    };
    const adaptation1 = new Adaptation(args1);
    expect(adaptation1.language).toBe("fr");
    expect(adaptation1.normalizedLanguage).toBe("fra");

    const args2 = {
      id: "12",
      representations: [],
      language: "toto",
      type: "video" as "video",
    };
    const adaptation2 = new Adaptation(args2);
    expect(adaptation2.language).toBe("toto");
    expect(adaptation2.normalizedLanguage).toBe("toto");
  });

  it("should create and sort the corresponding Representations", () => {
    const rep1 = { bitrate: 10, id: "rep1", index: minimalRepresentationIndex };
    const rep2 = { bitrate: 30, id: "rep2", index: minimalRepresentationIndex };
    const rep3 = { bitrate: 20, id: "rep3", index: minimalRepresentationIndex };
    const representations = [rep1, rep2, rep3];
    const args = { id: "12", representations, type: "text" as "text" };
    const adaptation = new Adaptation(args);

    const parsedRepresentations = adaptation.representations;
    expect(adaptation.parsingErrors).toEqual([]);
    expect(parsedRepresentations.length).toBe(3);
    expect(parsedRepresentations[0]).toEqual(new Representation(rep1));
    expect(parsedRepresentations[1]).toEqual(new Representation(rep3));
    expect(parsedRepresentations[2]).toEqual(new Representation(rep2));

    expect(adaptation.getAvailableBitrates()).toEqual([10, 20, 30]);
    expect(adaptation.getRepresentation("rep2")).toEqual(new Representation(rep2));

    expect(adaptation.getRepresentationsForBitrate(30))
      .toEqual([new Representation(rep2)]);
  });

  it("should execute the representationFilter if given", () => {
    const rep1 = { bitrate: 10, id: "rep1", index: minimalRepresentationIndex };
    const rep2 = { bitrate: 20, id: "rep2", index: minimalRepresentationIndex };
    const rep3 = { bitrate: 30, id: "rep3", index: minimalRepresentationIndex };
    const rep4 = { bitrate: 40, id: "rep4", index: minimalRepresentationIndex };
    const rep5 = { bitrate: 50, id: "rep5", index: minimalRepresentationIndex };
    const rep6 = { bitrate: 60, id: "rep6", index: minimalRepresentationIndex };
    const representations = [rep1, rep2, rep3, rep4, rep5, rep6];

    let representationFilterCounter = 0;
    function representationFilter(
      representation : Representation,
      adaptationInfos : IRepresentationInfos
    ) {
      representationFilterCounter++;

      if (adaptationInfos.language === "fr" && representation.bitrate < 40) {
        return false;
      }
      return true;
    }
    const args = { id: "12", language: "fr", representations, type: "text" as "text" };
    const adaptation = new Adaptation(args, representationFilter);

    const parsedRepresentations = adaptation.representations;
    expect(representationFilterCounter).toBe(6);
    expect(adaptation.parsingErrors).toEqual([]);
    expect(parsedRepresentations.length).toBe(3);

    expect(parsedRepresentations[0]).toEqual(new Representation(rep4));
    expect(parsedRepresentations[1]).toEqual(new Representation(rep5));
    expect(parsedRepresentations[2]).toEqual(new Representation(rep6));

    expect(adaptation.getAvailableBitrates()).toEqual([40, 50, 60]);
    expect(adaptation.getRepresentation("rep2")).toBe(undefined);
    expect(adaptation.getRepresentation("rep4")).toEqual(new Representation(rep4));

    expect(adaptation.getRepresentationsForBitrate(30))
      .toEqual([]);

    expect(adaptation.getRepresentationsForBitrate(50))
      .toEqual([new Representation(rep5)]);
  });

  /* tslint:disable:max-line-length */
  it("should filter Representation with duplicate bitrates in getAvailableBitrates", () => {
  /* tslint:enable:max-line-length */
    const rep1 = { bitrate: 10, id: "rep1", index: minimalRepresentationIndex };
    const rep2 = { bitrate: 20, id: "rep2", index: minimalRepresentationIndex };
    const rep3 = { bitrate: 20, id: "rep3", index: minimalRepresentationIndex };
    const rep4 = { bitrate: 20, id: "rep4", index: minimalRepresentationIndex };
    const representations = [rep1, rep2, rep3, rep4];
    const args = { id: "12", representations, type: "text" as "text" };
    const adaptation = new Adaptation(args);

    const parsedRepresentations = adaptation.representations;
    expect(adaptation.parsingErrors).toEqual([]);
    expect(parsedRepresentations.length).toBe(4);
    expect(parsedRepresentations[0]).toEqual(new Representation(rep1));
    expect(parsedRepresentations[1]).toEqual(new Representation(rep2));
    expect(parsedRepresentations[2]).toEqual(new Representation(rep3));
    expect(parsedRepresentations[3]).toEqual(new Representation(rep4));

    expect(adaptation.getAvailableBitrates()).toEqual([10, 20]);
    expect(adaptation.getRepresentation("rep2")).toEqual(new Representation(rep2));

    expect(adaptation.getRepresentationsForBitrate(20))
      .toEqual([
        new Representation(rep2),
        new Representation(rep3),
        new Representation(rep4),
      ]);
  });

  // TODO do codec support
});
