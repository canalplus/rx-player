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

import _ from "lodash";
import { expect } from "chai";
import ttmlRollUp from "raw-loader!./fixtures/captures-rollup.ttml";
import ttmlPopOn from "raw-loader!./fixtures/captures-popon.ttml";
import { parseTTML } from "../ttml.js";

describe("ttml parser", function() {
  xit("parses a ttml file", function() {
    expect(parseTTML(ttmlRollUp, null, 0)).to.be.an("array");
    expect(parseTTML(ttmlPopOn, null, 0)).to.be.an("array");
  });

  xit("has many cues", function() {
    const subs = parseTTML(ttmlRollUp);
    expect(subs).to.have.length(5);
    _.each(subs, s => {
      expect(s.start).to.be.a("number");
      expect(s.end).to.be.a("number");
      expect(s.text).to.be.a("string");
    });
  });

  xit("parses correctly ttml with relative sibling duration", function() {
    const subs = parseTTML(ttmlPopOn);
    let start = 12;
    _.each(_.zip([4, 4, 6, 4, 7], subs), ([duration, sub]) => {
      expect(sub.start).to.equal(start);
      expect(sub.end - sub.start).to.equal(duration);
      start += duration;
    });
  });

  xit("parses correctly ttml with absolute timings", function() {
    const subs = parseTTML(ttmlRollUp);
    _.each(_.zip([
      [ 0.00,  8.00],
      [ 4.00, 12.00],
      [ 8.00, 18.00],
      [14.00, 25.00],
      [18.00, 29.02],
    ], subs), ([[start, end], sub]) => {
      expect(sub.start).to.equal(start);
      expect(sub.end).to.equal(end);
    });
  });

});
