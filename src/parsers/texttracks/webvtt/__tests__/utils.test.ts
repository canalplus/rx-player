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

describe("parsers - webvtt - utils", () => {
  describe("getFirstLineAfterHeader", () => {
    it("should give the second line after the WEBVTT one if no header", () => {
      const webvttFile = [
        "WEBVTT",
        "",
        "1",
        "00:00:46.440 --> 00:00:48.480",
        "Alors?",
        "",
      ];
      expect(getFirstLineAfterHeader(webvttFile)).to.equal(2);
    });

    it("should give the line after the line break after the header if one", () => {
      const webvttFile = [
        "WEBVTT",
        " Some Header",
        "BLALABAL",
        "",
        "1",
        "00:00:46.440 --> 00:00:48.480",
        "Alors?",
        "",
      ];
      expect(getFirstLineAfterHeader(webvttFile)).to.equal(4);
    });

    it("should give the second line if there is an empty line on top", () => {
      const webvttFile = [
        "",
        "1",
        "00:00:46.440 --> 00:00:48.480",
        "Alors?",
        "",
      ];
      expect(getFirstLineAfterHeader(webvttFile)).to.equal(1);
    });

    it("should return 0 if there is no content", () => {
      const webvttFile : string[] = [];
      expect(getFirstLineAfterHeader(webvttFile)).to.equal(0);
    });
  });

  describe("isStartOfCueBlock", () => {
    it("should return false if called on a note block", () => {
      expect(isStartOfCueBlock(["NOTE SOMETHING", ""], 0)).to.equal(false);
    });

    it("should return false if called on a region block", () => {
      expect(isStartOfCueBlock(["REGION SOMETHING", ""], 0)).to.equal(false);
    });

    it("should return false if called on a style block", () => {
      expect(isStartOfCueBlock(["STYLE SOMETHING", ""], 0)).to.equal(false);
    });

    it("should return false if called on an empty line", () => {
      expect(isStartOfCueBlock(["", "00:00:01:00 --> 00:00:02:00"], 0)).to.equal(false);
    });

    it("should return true for any other cases", () => {
      expect(isStartOfCueBlock(["1", "00:00:01:00 --> 00:00:02:00"], 0)).to.equal(true);
      expect(isStartOfCueBlock(["ababa abs", "00:00:01:00 --> 00:00:02:00"], 0))
        .to.equal(true);
      expect(isStartOfCueBlock(["00:00:01:00 --> 00:00:02:00", "a"], 0)).to.equal(true);
      expect(isStartOfCueBlock(["00:00:01:00 --> 00:00:02:00", " "], 0)).to.equal(true);
    });
  });

  describe("isStartOfNoteBlock", () => {
    it("should return true if called on a `NOTE` line", () => {
      expect(isStartOfNoteBlock("NOTE")).to.equal(true);
    });

    it("should return true if called on line containing `NOTE` and spaces", () => {
      expect(isStartOfNoteBlock("NOTE ")).to.equal(true);
      expect(isStartOfNoteBlock("NOTE  ")).to.equal(true);
      expect(isStartOfNoteBlock("NOTE         ")).to.equal(true);
    });

    /* tslint:disable max-line-length */
    it("should return true if called on line containing `NOTE` and spaces and text", () => {
    /* tslint:enable max-line-length */
      expect(isStartOfNoteBlock("NOTE dsj f")).to.equal(true);
      expect(isStartOfNoteBlock("NOTE   oej ewj ")).to.equal(true);
      expect(isStartOfNoteBlock("NOTE         eowj pogj qpeoj")).to.equal(true);
    });

    /* tslint:disable max-line-length */
    it("should return false if called on a line containing `NOTE` and text attached", () => {
    /* tslint:enable max-line-length */
      expect(isStartOfNoteBlock("NOTEdsj f")).to.equal(false);
      expect(isStartOfNoteBlock("NOTEoej ewj ")).to.equal(false);
      expect(isStartOfNoteBlock("NOTEeowj pogj qpeoj")).to.equal(false);
      expect(isStartOfNoteBlock("NOTENOTE")).to.equal(false);
    });

    it("should return false if called on a region block", () => {
      expect(isStartOfNoteBlock("REGION SOMETHING")).to.equal(false);
    });

    it("should return false if called on a style block", () => {
      expect(isStartOfNoteBlock("STYLE SOMETHING")).to.equal(false);
    });

    it("should return false if called on an empty line", () => {
      expect(isStartOfNoteBlock("")).to.equal(false);
    });

    it("should return false for any other cases", () => {
      expect(isStartOfNoteBlock("1")).to.equal(false);
      expect(isStartOfNoteBlock("ababa abs")).to.equal(false);
      expect(isStartOfNoteBlock("a")).to.equal(false);
      expect(isStartOfNoteBlock(" ")).to.equal(false);
      expect(isStartOfNoteBlock("NOTESOMETHING")).to.equal(false);
      expect(isStartOfNoteBlock("REGIONSOMETHING")).to.equal(false);
      expect(isStartOfNoteBlock("STYLESOMETHING")).to.equal(false);
    });
  });

  describe("isStartOfRegionBlock", () => {
    it("should return true if called on a `REGION` line", () => {
      expect(isStartOfRegionBlock("REGION")).to.equal(true);
    });

    it("should return true if called on line containing `REGION` and spaces", () => {
      expect(isStartOfRegionBlock("REGION ")).to.equal(true);
      expect(isStartOfRegionBlock("REGION  ")).to.equal(true);
      expect(isStartOfRegionBlock("REGION         ")).to.equal(true);
    });

    /* tslint:disable max-line-length */
    it("should return true if called on line containing `REGION` and spaces and text", () => {
    /* tslint:enable max-line-length */
      expect(isStartOfRegionBlock("REGION dsj f")).to.equal(true);
      expect(isStartOfRegionBlock("REGION   oej ewj ")).to.equal(true);
      expect(isStartOfRegionBlock("REGION         eowj pogj qpeoj")).to.equal(true);
    });

    /* tslint:disable max-line-length */
    it("should return false if called on a line containing `REGION` and text attached", () => {
    /* tslint:enable max-line-length */
      expect(isStartOfRegionBlock("REGIONdsj f")).to.equal(false);
      expect(isStartOfRegionBlock("REGIONoej ewj ")).to.equal(false);
      expect(isStartOfRegionBlock("REGIONeowj pogj qpeoj")).to.equal(false);
      expect(isStartOfRegionBlock("REGIONREGION")).to.equal(false);
    });

    it("should return false if called on a note block", () => {
      expect(isStartOfRegionBlock("NOTE SOMETHING")).to.equal(false);
    });

    it("should return false if called on a style block", () => {
      expect(isStartOfRegionBlock("STYLE SOMETHING")).to.equal(false);
    });

    it("should return false if called on an empty line", () => {
      expect(isStartOfRegionBlock("")).to.equal(false);
    });

    it("should return false for any other cases", () => {
      expect(isStartOfRegionBlock("1")).to.equal(false);
      expect(isStartOfRegionBlock("ababa abs")).to.equal(false);
      expect(isStartOfRegionBlock("a")).to.equal(false);
      expect(isStartOfRegionBlock(" ")).to.equal(false);
      expect(isStartOfRegionBlock("NOTESOMETHING")).to.equal(false);
      expect(isStartOfRegionBlock("REGIONSOMETHING")).to.equal(false);
      expect(isStartOfRegionBlock("STYLESOMETHING")).to.equal(false);
    });
  });

  describe("isStartOfStyleBlock", () => {
    it("should return true if called on a `STYLE` line", () => {
      expect(isStartOfStyleBlock("STYLE")).to.equal(true);
    });

    it("should return true if called on line containing `STYLE` and spaces", () => {
      expect(isStartOfStyleBlock("STYLE ")).to.equal(true);
      expect(isStartOfStyleBlock("STYLE  ")).to.equal(true);
      expect(isStartOfStyleBlock("STYLE         ")).to.equal(true);
    });

    /* tslint:disable max-line-length */
    it("should return true if called on line containing `STYLE` and spaces and text", () => {
    /* tslint:enable max-line-length */
      expect(isStartOfStyleBlock("STYLE dsj f")).to.equal(true);
      expect(isStartOfStyleBlock("STYLE   oej ewj ")).to.equal(true);
      expect(isStartOfStyleBlock("STYLE         eowj pogj qpeoj")).to.equal(true);
    });

    /* tslint:disable max-line-length */
    it("should return false if called on a line containing `STYLE` and text attached", () => {
    /* tslint:enable max-line-length */
      expect(isStartOfStyleBlock("STYLEdsj f")).to.equal(false);
      expect(isStartOfStyleBlock("STYLEoej ewj ")).to.equal(false);
      expect(isStartOfStyleBlock("STYLEeowj pogj qpeoj")).to.equal(false);
      expect(isStartOfStyleBlock("STYLESTYLE")).to.equal(false);
    });

    it("should return false if called on a note block", () => {
      expect(isStartOfStyleBlock("NOTE SOMETHING")).to.equal(false);
    });

    it("should return false if called on a region block", () => {
      expect(isStartOfStyleBlock("REGION SOMETHING")).to.equal(false);
    });

    it("should return false if called on an empty line", () => {
      expect(isStartOfStyleBlock("")).to.equal(false);
    });

    it("should return false for any other cases", () => {
      expect(isStartOfStyleBlock("1")).to.equal(false);
      expect(isStartOfStyleBlock("ababa abs")).to.equal(false);
      expect(isStartOfStyleBlock("a")).to.equal(false);
      expect(isStartOfStyleBlock(" ")).to.equal(false);
      expect(isStartOfStyleBlock("NOTESOMETHING")).to.equal(false);
      expect(isStartOfStyleBlock("REGIONSOMETHING")).to.equal(false);
      expect(isStartOfStyleBlock("STYLESOMETHING")).to.equal(false);
    });
  });

  describe("findEndOfCueBlock", () => {
    it.only("should return an index immediately after the end of a cue block", () => {
      const vtt1 = [
        "WEBVTT",                          // 0
        "",                                // 1
        "112",                             // 2
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
        "112",                             // 24
        "00:18:51.080 --> 00:18:52.200",   // 25
        "J'irai te visiter",               // 26
        "J'irai te visiter",               // 27
        "",                                // 28
      ];

      const vtt2 = [
        "WEBVTT",                          // 0
        "",                                // 1
        "112",                             // 2
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

      const vtt3 = [
        "WEBVTT",                                // 0
        "",                                      // 1
        "",                                      // 2
        "",                                      // 3
        "1",                                     // 4
        "00:17:31.080 --> 00:17:32.200",         // 5
        "Je n'ai plus peur de perdre mon temps", // 6
        "",                                      // 7
        "00:18:51.080 --> 00:18:52.200",         // 8
        "Je n'ai plus peur de perdre mes dents", // 9
      ];

      const vtt4 = [
        "WEBVTT",                                  // 0
        "",                                        // 1
        "112",                                     // 2
        "00:17:31.080 --> 00:17:32.200",           // 3
        "",                                        // 4
        "J'ai tres tres peur ca c'est certain",    // 5
        "",                                        // 6
        "NOTE",                                    // 7
        "",                                        // 8
        "J'ai tres tres peur mais beaucoup moins", // 9
        "",                                        // 10
        "",                                        // 11
      ];

      expect(findEndOfCueBlock(vtt1, 2)).to.equal(10);
      expect(findEndOfCueBlock(vtt1, 3)).to.equal(10);
      expect(findEndOfCueBlock(vtt1, 4)).to.equal(10);
      expect(findEndOfCueBlock(vtt1, 5)).to.equal(10);
      expect(findEndOfCueBlock(vtt1, 6)).to.equal(10);
      expect(findEndOfCueBlock(vtt1, 7)).to.equal(10);
      expect(findEndOfCueBlock(vtt1, 8)).to.equal(10);
      expect(findEndOfCueBlock(vtt1, 9)).to.equal(10);
      expect(findEndOfCueBlock(vtt1, 12)).to.equal(14);
      expect(findEndOfCueBlock(vtt1, 13)).to.equal(14);
      expect(findEndOfCueBlock(vtt1, 15)).to.equal(18);
      expect(findEndOfCueBlock(vtt1, 16)).to.equal(18);
      expect(findEndOfCueBlock(vtt1, 17)).to.equal(18);
      expect(findEndOfCueBlock(vtt1, 19)).to.equal(23);
      expect(findEndOfCueBlock(vtt1, 20)).to.equal(23);
      expect(findEndOfCueBlock(vtt1, 21)).to.equal(23);
      expect(findEndOfCueBlock(vtt1, 22)).to.equal(23);
      expect(findEndOfCueBlock(vtt1, 24)).to.equal(28);
      expect(findEndOfCueBlock(vtt1, 25)).to.equal(28);
      expect(findEndOfCueBlock(vtt1, 26)).to.equal(28);
      expect(findEndOfCueBlock(vtt1, 27)).to.equal(28);

      expect(findEndOfCueBlock(vtt2, 2)).to.equal(15);
      expect(findEndOfCueBlock(vtt2, 3)).to.equal(15);
      expect(findEndOfCueBlock(vtt2, 4)).to.equal(15);
      expect(findEndOfCueBlock(vtt2, 5)).to.equal(15);
      expect(findEndOfCueBlock(vtt2, 6)).to.equal(15);
      expect(findEndOfCueBlock(vtt2, 7)).to.equal(15);
      expect(findEndOfCueBlock(vtt2, 8)).to.equal(15);
      expect(findEndOfCueBlock(vtt2, 9)).to.equal(15);
      expect(findEndOfCueBlock(vtt2, 10)).to.equal(15);
      expect(findEndOfCueBlock(vtt2, 11)).to.equal(15);
      expect(findEndOfCueBlock(vtt2, 12)).to.equal(15);
      expect(findEndOfCueBlock(vtt2, 13)).to.equal(15);
      expect(findEndOfCueBlock(vtt2, 14)).to.equal(15);

      expect(findEndOfCueBlock(vtt3, 4)).to.equal(7);
      expect(findEndOfCueBlock(vtt3, 5)).to.equal(7);
      expect(findEndOfCueBlock(vtt3, 6)).to.equal(7);
      expect(findEndOfCueBlock(vtt3, 8)).to.equal(10);
      expect(findEndOfCueBlock(vtt3, 9)).to.equal(10);

      expect(findEndOfCueBlock(vtt4, 2)).to.equal(6);
      expect(findEndOfCueBlock(vtt4, 3)).to.equal(6);
      expect(findEndOfCueBlock(vtt4, 4)).to.equal(6);
      expect(findEndOfCueBlock(vtt4, 5)).to.equal(6);
    });
  });
});
