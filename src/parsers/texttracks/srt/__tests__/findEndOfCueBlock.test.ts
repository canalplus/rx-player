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
import findEndOfCueBlock from "../findEndOfCueBlock";

describe("srt - findEndOfCueBlock", () => {
  it.only("should return an index immediately after the end of a cue block", () => {
    const srt1 = [
      "112",                             // 0
      "00:17:31.080 --> 00:17:32.200",   // 1
      "Je suis le petit chevalier",      // 2
      "",                                // 3
      "Avec le ciel dessus mes yeux",    // 4
      "",                                // 5
      "",                                // 6
      "Je ne peux pas me effroyer",      // 7
      "",                                // 8
      "",                                // 9
      "00:17:55.520 --> 00:17:57.640",   // 10
      "Je suis le petit chevalier",      // 11
      "",                                // 12
      "00:18:01.520 --> 00:18:09.640",   // 13
      "",                                // 14
      "Avec la terre dessous mes pieds", // 15
      "",                                // 16
      "112",                             // 17
      "00:18:31.080 --> 00:18:32.200",   // 18
      "",                                // 19
      "112",                             // 20
      "00:18:51.080 --> 00:18:52.200",   // 21
      "J'irai te visiter",               // 22
      "J'irai te visiter",               // 23
      "",                                // 24
    ];

    const srt2 = [
      "112",                             // 0
      "00:17:31.080 --> 00:17:32.200",   // 1
      "",                                // 2
      "Ce que j'ai fais, ce soir la",    // 3
      "Ce qu'elle a dit, ce soir la",    // 4
      "",                                // 5
      "",                                // 6
      "",                                // 7
      "Realisant mon espoir",            // 8
      "",                                // 9
      "",                                // 10
      "",                                // 11
      "Je me lance, vers la gloire, OK", // 12
    ];

    const srt3 = [
      "",                                      // 0
      "",                                      // 1
      "1",                                     // 2
      "00:17:31.080 --> 00:17:32.200",         // 3
      "Je n'ai plus peur de perdre mon temps", // 4
      "",                                      // 5
      "00:18:51.080 --> 00:18:52.200",         // 6
      "Je n'ai plus peur de perdre mes dents", // 7
    ];

    expect(findEndOfCueBlock(srt1, 0)).to.equal(8);
    expect(findEndOfCueBlock(srt1, 1)).to.equal(8);
    expect(findEndOfCueBlock(srt1, 2)).to.equal(8);
    expect(findEndOfCueBlock(srt1, 3)).to.equal(8);
    expect(findEndOfCueBlock(srt1, 4)).to.equal(8);
    expect(findEndOfCueBlock(srt1, 5)).to.equal(8);
    expect(findEndOfCueBlock(srt1, 6)).to.equal(8);
    expect(findEndOfCueBlock(srt1, 7)).to.equal(8);
    expect(findEndOfCueBlock(srt1, 10)).to.equal(12);
    expect(findEndOfCueBlock(srt1, 11)).to.equal(12);
    expect(findEndOfCueBlock(srt1, 13)).to.equal(16);
    expect(findEndOfCueBlock(srt1, 14)).to.equal(16);
    expect(findEndOfCueBlock(srt1, 15)).to.equal(16);
    expect(findEndOfCueBlock(srt1, 17)).to.equal(19);
    expect(findEndOfCueBlock(srt1, 18)).to.equal(19);
    expect(findEndOfCueBlock(srt1, 20)).to.equal(24);
    expect(findEndOfCueBlock(srt1, 21)).to.equal(24);
    expect(findEndOfCueBlock(srt1, 22)).to.equal(24);
    expect(findEndOfCueBlock(srt1, 23)).to.equal(24);

    expect(findEndOfCueBlock(srt2, 0)).to.equal(13);
    expect(findEndOfCueBlock(srt2, 1)).to.equal(13);
    expect(findEndOfCueBlock(srt2, 2)).to.equal(13);
    expect(findEndOfCueBlock(srt2, 3)).to.equal(13);
    expect(findEndOfCueBlock(srt2, 4)).to.equal(13);
    expect(findEndOfCueBlock(srt2, 5)).to.equal(13);
    expect(findEndOfCueBlock(srt2, 6)).to.equal(13);
    expect(findEndOfCueBlock(srt2, 7)).to.equal(13);
    expect(findEndOfCueBlock(srt2, 8)).to.equal(13);
    expect(findEndOfCueBlock(srt2, 9)).to.equal(13);
    expect(findEndOfCueBlock(srt2, 10)).to.equal(13);
    expect(findEndOfCueBlock(srt2, 11)).to.equal(13);
    expect(findEndOfCueBlock(srt2, 12)).to.equal(13);

    expect(findEndOfCueBlock(srt3, 2)).to.equal(5);
    expect(findEndOfCueBlock(srt3, 3)).to.equal(5);
    expect(findEndOfCueBlock(srt3, 4)).to.equal(5);
    expect(findEndOfCueBlock(srt3, 6)).to.equal(8);
    expect(findEndOfCueBlock(srt3, 7)).to.equal(8);
  });
});
