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

import getCueBlocks from "../get_cue_blocks";

const webvtt1 = [
  "WEBVTT",
  "",
  "STYLE",
  "::cue {",
  "  background-image: linear-gradient(to bottom, dimgray, lightgray);",
  "  color: papayawhip;",
  "}",
  "/* Style blocks cannot use blank lines nor \"dash dash greater than\" */",
  "",
  "NOTE comment blocks can be used between style blocks.",
  "",
  "STYLE",
  "::cue(b) {",
  "  color: peachpuff;",
  "}",
  "",
  "00:00:00.000 --> 00:00:10.000",
  "- Hello <b>world</b>.",
  "",
  "NOTE style blocks cannot appear after the first cue.",
  "",
  "00:05:00.000 --> 00:06:10.000",
  "Rendez-vous on Champs-Elysees",
  "",
];

const webvtt2 = [
  "WEBVTT",
  "",
  "00:00:00.000 --> 00:00:10.000",
  "Toussaint Louverture",
  "",
  "",
  "00:02:00.000 --> 00:02:10.000",
  "Liberte",
  "Egalite",
  "",
  "00:07:00.000 --> 00:07:10.000",
  "Fraternite",
];

const webvtt3 = [
  "WEBVTT",
  "",
  "NOTE",
  "00:17:31.080 --> 00:17:32.200",
  "Je suis le petit chevalier",
  "Avec le ciel dessus mes yeux",
  "Je ne peux pas me effroyer",
  "",
  "",
  "00:17:55.520 --> 00:17:57.640",
  "Je suis le petit chevalier",
  "",
  "00:18:01.520 --> 00:18:09.640",
  "",
  "Avec la terre dessous mes pieds",
  "",
  "112",
  "00:18:31.080 --> 00:18:32.200",
  "NOTE",
  "TOTO",
  "",
  "113",
  "00:18:51.080 --> 00:18:52.200",
  "J'irai te visiter",
  "J'irai te visiter",
  "",
];

const webvtt4 = [
  "WEBVTT",
  "",
  "STYLE",
  "00:17:31.080 --> 00:17:32.200",
  "Ce que j'ai fais, ce soir la",
  "Ce qu'elle a dit, ce soir la",
  "",
  "",
  "",
  "Realisant mon espoir",
  "",
  "",
  "",
  "Je me lance, vers la gloire, OK",
];

const webvtt5 = [
  "WEBVTT",
  " Some Header",
  "00:15:31.080 --> 00:15:32.200",
  "BLALABAL",
  "",
  "",
  "",
  "REGION",
  "00:17:31.080 --> 00:17:32.200",
  "Je n'ai plus peur de perdre mon temps",
  "",
  "00:18:51.080 --> 00:18:52.200",
  "Je n'ai plus peur de perdre mes dents",
];

const webvtt6 = [
  "",
  "112",
  "00:17:31.080 --> 00:17:32.200",
  "J'ai tres tres peur ca c'est certain",
  "",
  "NOTE",
  "",
  "J'ai tres tres peur mais beaucoup moins",
  "",
  "",
];

describe("parsers - webvtt - getCueBlocks", () => {
  it("should return only timed cue blocks from a webvtt", () => {
    expect(getCueBlocks(webvtt1, 1)).toEqual([
      [
        "00:00:00.000 --> 00:00:10.000",
        "- Hello <b>world</b>.",
      ],
      [
        "00:05:00.000 --> 00:06:10.000",
        "Rendez-vous on Champs-Elysees",
      ],
    ]);
    expect(getCueBlocks(webvtt2, 1)).toEqual([
      [
        "00:00:00.000 --> 00:00:10.000",
        "Toussaint Louverture",
      ],
      [
        "00:02:00.000 --> 00:02:10.000",
        "Liberte",
        "Egalite",
      ],
      [
        "00:07:00.000 --> 00:07:10.000",
        "Fraternite",
      ],
    ]);
    expect(getCueBlocks(webvtt3, 1)).toEqual([
      [
        "NOTE",
        "00:17:31.080 --> 00:17:32.200",
        "Je suis le petit chevalier",
        "Avec le ciel dessus mes yeux",
        "Je ne peux pas me effroyer",
      ],
      [
        "00:17:55.520 --> 00:17:57.640",
        "Je suis le petit chevalier",
      ],
      [
        "00:18:01.520 --> 00:18:09.640",
      ],
      [
        "112",
        "00:18:31.080 --> 00:18:32.200",
        "NOTE",
        "TOTO",
      ],
      [
        "113",
        "00:18:51.080 --> 00:18:52.200",
        "J'irai te visiter",
        "J'irai te visiter",
      ],
    ]);
    expect(getCueBlocks(webvtt4, 1)).toEqual([
      [
        "STYLE",
        "00:17:31.080 --> 00:17:32.200",
        "Ce que j'ai fais, ce soir la",
        "Ce qu'elle a dit, ce soir la",
      ],
    ]);
    expect(getCueBlocks(webvtt5, 5)).toEqual([
      [
        "REGION",
        "00:17:31.080 --> 00:17:32.200",
        "Je n'ai plus peur de perdre mon temps",
      ],
      [
        "00:18:51.080 --> 00:18:52.200",
        "Je n'ai plus peur de perdre mes dents",
      ],
    ]);
    expect(getCueBlocks(webvtt6, 0)).toEqual([
      [
        "112",
        "00:17:31.080 --> 00:17:32.200",
        "J'ai tres tres peur ca c'est certain",
      ],
    ]);
  });
});
