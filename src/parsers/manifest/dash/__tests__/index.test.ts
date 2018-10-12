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
// import sinon from "sinon";

import { dashManifestParser } from "../index";

// const mpd = require("raw!test/fixtures/dash-seg-list.mpd");
// const mpd = require("raw!test/fixtures/dash-seg-template.mpd");

describe("dash parser", function() {
  describe("parseFromDocument", () => {
    function setDocumentFromString(str : string) : Document {
      return new DOMParser().parseFromString(str, "application/xml");
    }

    it("throws root if not MPD", function() {
      const doc = setDocumentFromString("<foo></foo>");

      expect(function() {
        dashManifestParser(doc, "");
      }).to.throw("document root should be MPD");
    });
  });
});
