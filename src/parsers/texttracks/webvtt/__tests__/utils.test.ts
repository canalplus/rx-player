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
import {
  findEndOfCueBlock,
  getFirstLineAfterHeader,
  isStartOfCueBlock,
  isStartOfNoteBlock,
  isStartOfRegionBlock,
  isStartOfStyleBlock,
} from "../utils";

const webvtt1 = [
  "WEBVTT",                                                                   // 0
  "",                                                                         // 1
  "STYLE",                                                                    // 2
  "::cue {",                                                                  // 3
  "  background-image: linear-gradient(to bottom, dimgray, lightgray);",      // 4
  "  color: papayawhip;",                                                     // 5
  "}",                                                                        // 6
  "/* Style blocks cannot use blank lines nor \"dash dash greater than\" */", // 7
  "",                                                                         // 8
  "NOTE comment blocks can be used between style blocks.",                    // 9
  "",                                                                         // 10
  "STYLE",                                                                    // 11
  "::cue(b) {",                                                               // 12
  "  color: peachpuff;",                                                      // 13
  "}",                                                                        // 14
  "",                                                                         // 15
  "00:00:00.000 --> 00:00:10.000",                                            // 16
  "- Hello <b>world</b>.",                                                    // 17
  "",                                                                         // 18
  "NOTE style blocks cannot appear after the first cue.",                     // 19
  "",                                                                         // 20
  "00:05:00.000 --> 00:06:10.000",                                            // 21
  "Rendez-vous on Champs-Elysees",                                            // 22
  "",                                                                         // 23
  "Leave Paris in the morning with TEE",                                      // 24
  "",                                                                         // 25
];

const webvtt2 = [
  "00:00:00.000 --> 00:00:10.000", // 0
  "Toussaint Louverture",          // 1
  "",                              // 2
  "",                              // 3
  "00:02:00.000 --> 00:02:10.000", // 4
  "Liberte",                       // 5
  "Egalite",                       // 6
  "",                              // 7
  "00:07:00.000 --> 00:07:10.000", // 8
  "Fraternite",                    // 9
];

const webvtt3 = [
  "WEBVTT",                          // 0
  "",                                // 1
  "NOTE",                            // 2
  "00:17:31.080 --> 00:17:32.200",   // 3
  "Je suis le petit chevalier",      // 4
  "",                                // 5
  "Avec le ciel dessus mes yeux",    // 6
  "",                                // 7
  "",                                // 8
  "Je ne peux pas me effroyer",      // 9
  "",                                // 10
  "",                                // 11
  "00:17:55.520 --> 00:17:57.640",   // 12
  "Je suis le petit chevalier",      // 13
  "",                                // 14
  "00:18:01.520 --> 00:18:09.640",   // 15
  "",                                // 16
  "Avec la terre dessous mes pieds", // 17
  "",                                // 18
  "112",                             // 19
  "00:18:31.080 --> 00:18:32.200",   // 20
  "NOTE",                            // 21
  "TOTO",                            // 22
  "",                                // 23
  "113",                             // 24
  "00:18:51.080 --> 00:18:52.200",   // 25
  "J'irai te visiter",               // 26
  "J'irai te visiter",               // 27
  "",                                // 28
];

const webvtt4 = [
  "WEBVTT",                          // 0
  "",                                // 1
  "STYLE",                           // 2
  "00:17:31.080 --> 00:17:32.200",   // 3
  "",                                // 4
  "Ce que j'ai fais, ce soir la",    // 5
  "Ce qu'elle a dit, ce soir la",    // 6
  "",                                // 7
  "",                                // 8
  "",                                // 9
  "Realisant mon espoir",            // 10
  "",                                // 11
  "",                                // 12
  "",                                // 13
  "Je me lance, vers la gloire, OK", // 14
];

const webvtt5 = [
  "WEBVTT",                                // 0
  " Some Header",                          // 1
  "BLALABAL",                              // 2
  "",                                      // 3
  "",                                      // 4
  "",                                      // 5
  "REGION",                                // 6
  "00:17:31.080 --> 00:17:32.200",         // 7
  "Je n'ai plus peur de perdre mon temps", // 8
  "",                                      // 9
  "00:18:51.080 --> 00:18:52.200",         // 10
  "Je n'ai plus peur de perdre mes dents", // 11
];

const webvtt6 = [
  "",                                        // 0
  "112",                                     // 1
  "00:17:31.080 --> 00:17:32.200",           // 2
  "",                                        // 3
  "J'ai tres tres peur ca c'est certain",    // 4
  "",                                        // 5
  "NOTE",                                    // 6
  "",                                        // 7
  "J'ai tres tres peur mais beaucoup moins", // 8
  "",                                        // 9
  "",                                        // 10
];

describe("parsers - webvtt - utils", () => {
  describe("getFirstLineAfterHeader", () => {
    it("should give the second line after the WEBVTT one if no header", () => {
      expect(getFirstLineAfterHeader(webvtt1)).to.equal(2);
      expect(getFirstLineAfterHeader(webvtt2)).to.equal(3);
      expect(getFirstLineAfterHeader(webvtt3)).to.equal(2);
      expect(getFirstLineAfterHeader(webvtt4)).to.equal(2);
      expect(getFirstLineAfterHeader(webvtt5)).to.equal(4);
    });

    it("should give the line after the line break after the header if one", () => {
      expect(getFirstLineAfterHeader(webvtt5)).to.equal(4);
    });

    it("should give the second line if there is an empty line on top", () => {
      expect(getFirstLineAfterHeader(webvtt6)).to.equal(1);
    });

    it("should return 0 if there is no content", () => {
      const webvttFile : string[] = [];
      expect(getFirstLineAfterHeader(webvttFile)).to.equal(0);
    });
  });

  describe("isStartOfCueBlock", () => {
    it("should return false if called on a note block", () => {
      expect(isStartOfCueBlock(webvtt1, 9)).to.equal(false);
      expect(isStartOfCueBlock(webvtt1, 19)).to.equal(false);
      expect(isStartOfCueBlock(webvtt1, 19)).to.equal(false);
      expect(isStartOfCueBlock(webvtt6, 50)).to.equal(false);
    });

    it("should return false if called on a region block", () => {
      expect(isStartOfCueBlock(["REGION SOMETHING", ""], 0)).to.equal(false);
      expect(isStartOfCueBlock(["REGION SOMETHING", "a"], 0)).to.equal(false);
      expect(isStartOfCueBlock(["REGION", "SOMETHING"], 0)).to.equal(false);
    });

    it("should return false if called on a style block", () => {
      expect(isStartOfCueBlock(webvtt1, 2)).to.equal(false);
      expect(isStartOfCueBlock(webvtt1, 11)).to.equal(false);
    });

    it("should return false if called on an empty line", () => {
      expect(isStartOfCueBlock(webvtt1, 15)).to.equal(false);
      expect(isStartOfCueBlock(webvtt1, 20)).to.equal(false);
      expect(isStartOfCueBlock(webvtt2, 3)).to.equal(false);
    });

    it("should return true if the line has timings in it", () => {
      expect(isStartOfCueBlock(webvtt1, 16)).to.equal(true);
      expect(isStartOfCueBlock(webvtt3, 3)).to.equal(true);
      expect(isStartOfCueBlock(webvtt3, 15)).to.equal(true);
      expect(isStartOfCueBlock(webvtt6, 2)).to.equal(true);
    });

    it("should return true for cue identifier followed by timings", () => {
      expect(isStartOfCueBlock(webvtt3, 2)).to.equal(true);
      expect(isStartOfCueBlock(webvtt3, 19)).to.equal(true);
      expect(isStartOfCueBlock(webvtt3, 24)).to.equal(true);
      expect(isStartOfCueBlock(webvtt4, 2)).to.equal(true);
      expect(isStartOfCueBlock(webvtt5, 6)).to.equal(true);
    });
  });

  describe("isStartOfNoteBlock", () => {
    it("should return true if called on a `NOTE` line followed by timings", () => {
      expect(isStartOfNoteBlock(webvtt2, 2)).to.equal(false);
    });

    it("should return true if called on a `NOTE` line not followed by timings", () => {
      expect(isStartOfNoteBlock(webvtt6, 6)).to.equal(true);
      expect(isStartOfNoteBlock(webvtt3, 21)).to.equal(true); // This is actually bad
    });

    it("should return true if called on line containing `NOTE` and spaces", () => {
      expect(isStartOfNoteBlock(["NOTE    "], 0)).to.equal(true);
      expect(isStartOfNoteBlock(["", "NOTE ", "TOTO"], 1)).to.equal(true);
    });

    /* tslint:disable max-line-length */
    it("should return true if called on line containing `NOTE` and spaces and text", () => {
    /* tslint:enable max-line-length */
      expect(isStartOfNoteBlock(webvtt1, 9)).to.equal(true);
      expect(isStartOfNoteBlock(webvtt1, 19)).to.equal(true);
    });

    /* tslint:disable max-line-length */
    it("should return false if called on a line containing `NOTE` and text attached", () => {
    /* tslint:enable max-line-length */
      expect(isStartOfNoteBlock(["NOTEdsj f"], 0)).to.equal(false);
      expect(isStartOfNoteBlock(["aaa", "NOTEoej ewj ", "aaa"], 1)).to.equal(false);
    });

    it("should return false if called on a region block", () => {
      expect(isStartOfNoteBlock(["REGION SOMETHING"], 0)).to.equal(false);
    });

    it("should return false if called on a style block", () => {
      expect(isStartOfNoteBlock(["STYLE SOMETHING"], 0)).to.equal(false);
      expect(isStartOfCueBlock(webvtt1, 2)).to.equal(false);
      expect(isStartOfCueBlock(webvtt1, 11)).to.equal(false);
    });

    it("should return false if called on an empty line", () => {
      expect(isStartOfNoteBlock(["", "NOTE"], 0)).to.equal(false);
      expect(isStartOfCueBlock(webvtt1, 18)).to.equal(false);
      expect(isStartOfCueBlock(webvtt3, 1)).to.equal(false);
    });
  });

  describe("isStartOfRegionBlock", () => {
    it("should return true if called on a `REGION` line", () => {
      expect(isStartOfRegionBlock(["REGION"], 0)).to.equal(true);
    });

    it("should return true if called on line containing `REGION` and spaces", () => {
      expect(isStartOfRegionBlock(["REGION "], 0)).to.equal(true);
      expect(isStartOfRegionBlock(["REGION  "], 0)).to.equal(true);
      expect(isStartOfRegionBlock(["REGION         "], 0)).to.equal(true);
    });

    /* tslint:disable max-line-length */
    it("should return true if called on line containing `REGION` and spaces and text", () => {
    /* tslint:enable max-line-length */
      expect(isStartOfRegionBlock(["REGION dsj f"], 0)).to.equal(true);
      expect(isStartOfRegionBlock(["REGION   oej ewj "], 0)).to.equal(true);
      expect(isStartOfRegionBlock(["REGION         eowj pogj qpeoj"], 0)).to.equal(true);
    });

    /* tslint:disable max-line-length */
    it("should return false if called on a line containing `REGION` and text attached", () => {
    /* tslint:enable max-line-length */
      expect(isStartOfRegionBlock(["REGIONdsj f"], 0)).to.equal(false);
      expect(isStartOfRegionBlock(["REGIONoej ewj "], 0)).to.equal(false);
      expect(isStartOfRegionBlock(["REGIONeowj pogj qpeoj"], 0)).to.equal(false);
      expect(isStartOfRegionBlock(["REGIONREGION"], 0)).to.equal(false);
    });

    it("should return false if called on a note block", () => {
      expect(isStartOfRegionBlock(["NOTE SOMETHING"], 0)).to.equal(false);
    });

    it("should return false if called on a style block", () => {
      expect(isStartOfRegionBlock(["STYLE SOMETHING"], 0)).to.equal(false);
    });

    it("should return false if called on an empty line", () => {
      expect(isStartOfRegionBlock([""], 0)).to.equal(false);
    });

    it("should return false for any other cases", () => {
      expect(isStartOfRegionBlock(["1"], 0)).to.equal(false);
      expect(isStartOfRegionBlock(["ababa abs"], 0)).to.equal(false);
      expect(isStartOfRegionBlock(["a"], 0)).to.equal(false);
      expect(isStartOfRegionBlock([" "], 0)).to.equal(false);
      expect(isStartOfRegionBlock(["NOTESOMETHING"], 0)).to.equal(false);
      expect(isStartOfRegionBlock(["REGIONSOMETHING"], 0)).to.equal(false);
      expect(isStartOfRegionBlock(["STYLESOMETHING"], 0)).to.equal(false);
    });
  });

  describe("isStartOfStyleBlock", () => {
    it("should return true if called on a `STYLE` line", () => {
      expect(isStartOfStyleBlock(["STYLE"], 0)).to.equal(true);
    });

    it("should return true if called on line containing `STYLE` and spaces", () => {
      expect(isStartOfStyleBlock(["STYLE "], 0)).to.equal(true);
      expect(isStartOfStyleBlock(["STYLE  "], 0)).to.equal(true);
      expect(isStartOfStyleBlock(["STYLE         "], 0)).to.equal(true);
    });

    /* tslint:disable max-line-length */
    it("should return true if called on line containing `STYLE` and spaces and text", () => {
    /* tslint:enable max-line-length */
      expect(isStartOfStyleBlock(["STYLE dsj f"], 0)).to.equal(true);
      expect(isStartOfStyleBlock(["STYLE   oej ewj "], 0)).to.equal(true);
      expect(isStartOfStyleBlock(["STYLE         eowj pogj qpeoj"], 0)).to.equal(true);
    });

    /* tslint:disable max-line-length */
    it("should return false if called on a line containing `STYLE` and text attached", () => {
    /* tslint:enable max-line-length */
      expect(isStartOfStyleBlock(["STYLEdsj f"], 0)).to.equal(false);
      expect(isStartOfStyleBlock(["STYLEoej ewj "], 0)).to.equal(false);
      expect(isStartOfStyleBlock(["STYLEeowj pogj qpeoj"], 0)).to.equal(false);
      expect(isStartOfStyleBlock(["STYLESTYLE"], 0)).to.equal(false);
    });

    it("should return false if called on a note block", () => {
      expect(isStartOfStyleBlock(["NOTE SOMETHING"], 0)).to.equal(false);
    });

    it("should return false if called on a region block", () => {
      expect(isStartOfStyleBlock(["REGION SOMETHING"], 0)).to.equal(false);
    });

    it("should return false if called on an empty line", () => {
      expect(isStartOfStyleBlock([""], 0)).to.equal(false);
    });

    it("should return false for any other cases", () => {
      expect(isStartOfStyleBlock(["1"], 0)).to.equal(false);
      expect(isStartOfStyleBlock(["ababa abs"], 0)).to.equal(false);
      expect(isStartOfStyleBlock(["a"], 0)).to.equal(false);
      expect(isStartOfStyleBlock([" "], 0)).to.equal(false);
      expect(isStartOfStyleBlock(["NOTESOMETHING"], 0)).to.equal(false);
      expect(isStartOfStyleBlock(["REGIONSOMETHING"], 0)).to.equal(false);
      expect(isStartOfStyleBlock(["STYLESOMETHING"], 0)).to.equal(false);
    });
  });

  describe("findEndOfCueBlock", () => {
    it("should return an index immediately after the end of a cue block", () => {
      expect(findEndOfCueBlock(webvtt3, 2)).to.equal(10);
      expect(findEndOfCueBlock(webvtt3, 3)).to.equal(10);
      expect(findEndOfCueBlock(webvtt3, 4)).to.equal(10);
      expect(findEndOfCueBlock(webvtt3, 5)).to.equal(10);
      expect(findEndOfCueBlock(webvtt3, 6)).to.equal(10);
      expect(findEndOfCueBlock(webvtt3, 7)).to.equal(10);
      expect(findEndOfCueBlock(webvtt3, 8)).to.equal(10);
      expect(findEndOfCueBlock(webvtt3, 9)).to.equal(10);
      expect(findEndOfCueBlock(webvtt3, 12)).to.equal(14);
      expect(findEndOfCueBlock(webvtt3, 13)).to.equal(14);
      expect(findEndOfCueBlock(webvtt3, 15)).to.equal(18);
      expect(findEndOfCueBlock(webvtt3, 16)).to.equal(18);
      expect(findEndOfCueBlock(webvtt3, 17)).to.equal(18);
      expect(findEndOfCueBlock(webvtt3, 19)).to.equal(23);
      expect(findEndOfCueBlock(webvtt3, 20)).to.equal(23);
      expect(findEndOfCueBlock(webvtt3, 21)).to.equal(23);
      expect(findEndOfCueBlock(webvtt3, 22)).to.equal(23);
      expect(findEndOfCueBlock(webvtt3, 24)).to.equal(28);
      expect(findEndOfCueBlock(webvtt3, 25)).to.equal(28);
      expect(findEndOfCueBlock(webvtt3, 26)).to.equal(28);
      expect(findEndOfCueBlock(webvtt3, 27)).to.equal(28);

      expect(findEndOfCueBlock(webvtt4, 2)).to.equal(15);
      expect(findEndOfCueBlock(webvtt4, 3)).to.equal(15);
      expect(findEndOfCueBlock(webvtt4, 4)).to.equal(15);
      expect(findEndOfCueBlock(webvtt4, 5)).to.equal(15);
      expect(findEndOfCueBlock(webvtt4, 6)).to.equal(15);
      expect(findEndOfCueBlock(webvtt4, 7)).to.equal(15);
      expect(findEndOfCueBlock(webvtt4, 8)).to.equal(15);
      expect(findEndOfCueBlock(webvtt4, 9)).to.equal(15);
      expect(findEndOfCueBlock(webvtt4, 10)).to.equal(15);
      expect(findEndOfCueBlock(webvtt4, 11)).to.equal(15);
      expect(findEndOfCueBlock(webvtt4, 12)).to.equal(15);
      expect(findEndOfCueBlock(webvtt4, 13)).to.equal(15);
      expect(findEndOfCueBlock(webvtt4, 14)).to.equal(15);

      expect(findEndOfCueBlock(webvtt5, 6)).to.equal(9);
      expect(findEndOfCueBlock(webvtt5, 7)).to.equal(9);
      expect(findEndOfCueBlock(webvtt5, 8)).to.equal(9);
      expect(findEndOfCueBlock(webvtt5, 10)).to.equal(12);
      expect(findEndOfCueBlock(webvtt5, 11)).to.equal(12);

      expect(findEndOfCueBlock(webvtt6, 1)).to.equal(5);
      expect(findEndOfCueBlock(webvtt6, 2)).to.equal(5);
      expect(findEndOfCueBlock(webvtt6, 3)).to.equal(5);
      expect(findEndOfCueBlock(webvtt6, 4)).to.equal(5);
    });
  });
});
