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

describe("parsers - srt - findEndOfCueBlock", () => {
  it("should return an index immediately after the end of a cue block", () => {
    const srt1 = [
      "112",                             // 0
      "00:17:31.080 --> 00:17:32.200",   // 1
      "Je suis le petit chevalier",      // 2
      "Avec le ciel dessus mes yeux",    // 3
      "Je ne peux pas me effroyer",      // 4
      "",                                // 5
      "",                                // 6
      "00:17:55.520 --> 00:17:57.640",   // 7
      "Je suis le petit chevalier",      // 8
      "",                                // 9
      "00:18:01.520 --> 00:18:09.640",   // 10
      "",                                // 11
      "Avec la terre dessous mes pieds", // 12
      "",                                // 13
      "112",                             // 14
      "00:18:31.080 --> 00:18:32.200",   // 15
      "",                                // 16
      "112",                             // 17
      "00:18:51.080 --> 00:18:52.200",   // 18
      "J'irai te visiter",               // 19
      "J'irai te visiter",               // 20
      "",                                // 21
    ];

    const srt2 = [
      "112",                             // 0
      "00:17:31.080 --> 00:17:32.200",   // 1
      "Ce que j'ai fais, ce soir la",    // 2
      "Ce qu'elle a dit, ce soir la",    // 3
      "",                                // 4
      "",                                // 5
      "",                                // 6
      "Realisant mon espoir",            // 7
      "",                                // 8
      "",                                // 9
      "",                                // 10
      "Je me lance, vers la gloire, OK", // 11
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

    expect(findEndOfCueBlock(srt1, 0)).to.equal(5);
    expect(findEndOfCueBlock(srt1, 1)).to.equal(5);
    expect(findEndOfCueBlock(srt1, 2)).to.equal(5);
    expect(findEndOfCueBlock(srt1, 3)).to.equal(5);
    expect(findEndOfCueBlock(srt1, 4)).to.equal(5);
    expect(findEndOfCueBlock(srt1, 7)).to.equal(9);
    expect(findEndOfCueBlock(srt1, 8)).to.equal(9);
    expect(findEndOfCueBlock(srt1, 10)).to.equal(11);
    expect(findEndOfCueBlock(srt1, 14)).to.equal(16);
    expect(findEndOfCueBlock(srt1, 15)).to.equal(16);
    expect(findEndOfCueBlock(srt1, 17)).to.equal(21);
    expect(findEndOfCueBlock(srt1, 18)).to.equal(21);
    expect(findEndOfCueBlock(srt1, 19)).to.equal(21);
    expect(findEndOfCueBlock(srt1, 20)).to.equal(21);

    expect(findEndOfCueBlock(srt2, 0)).to.equal(4);
    expect(findEndOfCueBlock(srt2, 1)).to.equal(4);
    expect(findEndOfCueBlock(srt2, 2)).to.equal(4);
    expect(findEndOfCueBlock(srt2, 3)).to.equal(4);

    expect(findEndOfCueBlock(srt3, 2)).to.equal(5);
    expect(findEndOfCueBlock(srt3, 3)).to.equal(5);
    expect(findEndOfCueBlock(srt3, 4)).to.equal(5);

    expect(findEndOfCueBlock(srt3, 6)).to.equal(8);
    expect(findEndOfCueBlock(srt3, 7)).to.equal(8);
  });
});
