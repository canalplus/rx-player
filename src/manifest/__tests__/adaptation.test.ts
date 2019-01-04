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

import { expect } from "chai";
import Adaptation, {
  IRepresentationInfos,
} from "../adaptation";
import Representation from "../representation";

const minimalRepresentationIndex = {
  getInitSegment() { return null; },
  getSegments() { return []; },
  shouldRefresh() { return false; },
  getFirstPosition() { return undefined; },
  getLastPosition() { return undefined; },
  checkDiscontinuity() { return -1; },
  _update() { /* noop */ },
  _addSegments() { /* noop */ },
};

describe("manifest - Adaptation", () => {
  it("should be able to create a minimal Adaptation", () => {
    const args = { id: "12", representations: [], type: "video" as "video" };
    const adaptation = new Adaptation(args);
    expect(adaptation.id).to.equal("12");
    expect(adaptation.representations).to.eql([]);
    expect(adaptation.type).to.equal("video");
    expect(adaptation.isAudioDescription).to.equal(undefined);
    expect(adaptation.isClosedCaption).to.equal(undefined);
    expect(adaptation.language).to.equal(undefined);
    expect(adaptation.normalizedLanguage).to.equal(undefined);
    expect(adaptation.manuallyAdded).to.equal(false);
    expect(adaptation.parsingErrors).to.eql([]);
    expect(adaptation.getAvailableBitrates()).to.eql([]);
    expect(adaptation.getRepresentation("")).to.equal(undefined);
    expect(adaptation.getRepresentationsForBitrate(0)).to.eql([]);
  });

  it("should normalize a given language", () => {
    const args1 = {
      id: "12",
      representations: [],
      language: "fr",
      type: "video" as "video",
    };
    const adaptation1 = new Adaptation(args1);
    expect(adaptation1.language).to.equal("fr");
    expect(adaptation1.normalizedLanguage).to.equal("fra");

    const args2 = {
      id: "12",
      representations: [],
      language: "toto",
      type: "video" as "video",
    };
    const adaptation2 = new Adaptation(args2);
    expect(adaptation2.language).to.equal("toto");
    expect(adaptation2.normalizedLanguage).to.equal("toto");
  });

  it("should create and sort the corresponding Representations", () => {
    const rep1 = { bitrate: 10, id: "rep1", index: minimalRepresentationIndex };
    const rep2 = { bitrate: 30, id: "rep2", index: minimalRepresentationIndex };
    const rep3 = { bitrate: 20, id: "rep3", index: minimalRepresentationIndex };
    const representations = [rep1, rep2, rep3];
    const args = { id: "12", representations, type: "text" as "text" };
    const adaptation = new Adaptation(args);

    const parsedRepresentations = adaptation.representations;
    expect(adaptation.parsingErrors).to.eql([]);
    expect(parsedRepresentations.length).to.equal(3);
    expect(parsedRepresentations[0]).to.eql(new Representation(rep1));
    expect(parsedRepresentations[1]).to.eql(new Representation(rep3));
    expect(parsedRepresentations[2]).to.eql(new Representation(rep2));

    expect(adaptation.getAvailableBitrates()).to.eql([10, 20, 30]);
    expect(adaptation.getRepresentation("rep2")).to.eql(new Representation(rep2));

    expect(adaptation.getRepresentationsForBitrate(30))
      .to.eql([new Representation(rep2)]);
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
    expect(representationFilterCounter).to.equal(6);
    expect(adaptation.parsingErrors).to.eql([]);
    expect(parsedRepresentations.length).to.equal(3);

    expect(parsedRepresentations[0]).to.eql(new Representation(rep4));
    expect(parsedRepresentations[1]).to.eql(new Representation(rep5));
    expect(parsedRepresentations[2]).to.eql(new Representation(rep6));

    expect(adaptation.getAvailableBitrates()).to.eql([40, 50, 60]);
    expect(adaptation.getRepresentation("rep2")).to.equal(undefined);
    expect(adaptation.getRepresentation("rep4")).to.eql(new Representation(rep4));

    expect(adaptation.getRepresentationsForBitrate(30))
      .to.eql([]);

    expect(adaptation.getRepresentationsForBitrate(50))
      .to.eql([new Representation(rep5)]);
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
    expect(adaptation.parsingErrors).to.eql([]);
    expect(parsedRepresentations.length).to.equal(4);
    expect(parsedRepresentations[0]).to.eql(new Representation(rep1));
    expect(parsedRepresentations[1]).to.eql(new Representation(rep2));
    expect(parsedRepresentations[2]).to.eql(new Representation(rep3));
    expect(parsedRepresentations[3]).to.eql(new Representation(rep4));

    expect(adaptation.getAvailableBitrates()).to.eql([10, 20]);
    expect(adaptation.getRepresentation("rep2")).to.eql(new Representation(rep2));

    expect(adaptation.getRepresentationsForBitrate(20))
      .to.eql([
        new Representation(rep2),
        new Representation(rep3),
        new Representation(rep4),
      ]);
  });

  // TODO do codec support
});
