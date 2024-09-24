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

import parseCueBlock from "../parse_cue";

const cueBlock1 = [
  "112",
  "00:00:31.080 --> 00:07:32.200",
  "Je suis le petit chevalier",
  "Avec le ciel dessus mes yeux",
  "Je ne peux pas me effroyer",
];

const cueBlock2 = ["00:17:55.520-->00:17:57.640", "Je suis le petit chevalier"];

const cueBlock3 = ["00:18:01--> 00:18:09"];

const cueBlock4 = ["112", "00:18:31.080 -->00:18:32.200"];

const notCueBlock1 = ["TOTO"];

const notCueBlock2 = ["TOTO", "TATA"];

const notCueBlock3 = ["TOTO", "TATA", "00:18:31.080 --> 00:18:32.200"];

describe("parsers - srt - parseCueBlocks", () => {
  it("should correctly parse regular cue blocks", () => {
    expect(parseCueBlock(cueBlock1, 0)).toEqual({
      start: 31.08,
      end: 452.2,
      payload: [
        "Je suis le petit chevalier",
        "Avec le ciel dessus mes yeux",
        "Je ne peux pas me effroyer",
      ],
    });
    expect(parseCueBlock(cueBlock2, 0)).toEqual({
      start: 1075.52,
      end: 1077.64,
      payload: ["Je suis le petit chevalier"],
    });
    expect(parseCueBlock(cueBlock3, 0)).toEqual({
      start: 1081,
      end: 1089,
      payload: [],
    });
    expect(parseCueBlock(cueBlock4, 0)).toEqual({
      start: 1111.08,
      end: 1112.2,
      payload: [],
    });
  });

  it("should add timeOffset in seconds", () => {
    expect(parseCueBlock(cueBlock1, 10.1)).toEqual({
      start: 41.18,
      end: 462.3,
      payload: [
        "Je suis le petit chevalier",
        "Avec le ciel dessus mes yeux",
        "Je ne peux pas me effroyer",
      ],
    });
    expect(parseCueBlock(cueBlock2, 6)).toEqual({
      start: 1081.52,
      end: 1083.64,
      payload: ["Je suis le petit chevalier"],
    });
    expect(parseCueBlock(cueBlock3, -1.5)).toEqual({
      start: 1079.5,
      end: 1087.5,
      payload: [],
    });
    expect(parseCueBlock(cueBlock4, -1)).toEqual({
      start: 1110.08,
      end: 1111.2,
      payload: [],
    });
  });

  it("should return null for invalid cue blocks", () => {
    expect(parseCueBlock(notCueBlock1, 0)).toEqual(null);
    expect(parseCueBlock(notCueBlock1, 5)).toEqual(null);
    expect(parseCueBlock(notCueBlock2, 0)).toEqual(null);
    expect(parseCueBlock(notCueBlock2, 9)).toEqual(null);
    expect(parseCueBlock(notCueBlock3, 0)).toEqual(null);
    expect(parseCueBlock(notCueBlock3, 21)).toEqual(null);
  });
});
