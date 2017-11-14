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
// import sinon = require("sinon");

import {
  parseFromDocument,
  parseFromString,
} from "../index";

// const mpd = require("raw!test/fixtures/dash-seg-list.mpd");
// const mpd = require("raw!test/fixtures/dash-seg-template.mpd");

describe("dash parser", function() {

  it("has a parseFromString function", function() {
    expect(parseFromString).to.be.a("function");
  });

  it("has a parseFromDocument function", function() {
    expect(parseFromDocument).to.be.a("function");
  });

  describe("parseFromString", () => {
    /* tslint:disable:max-line-length */
    // xit("should call parseFromDocument with the string given converted to a document", function() {
       /* tslint:enable:max-line-length */
    //   const xmlString = "<foo></foo>";
    //   const fakeDoc = { a: 97 };
    //   const contentProtectionParser = () => {};

    //   const DOMParserStub = sinon
    //     .stub(DOMParser.prototype, "parseFromString")
    //     .callsFake((doc, mimeType) => {
    //       expect(doc).to.equal(xmlString);
    //       expect(mimeType).to.equal("application/xml");
    //       return fakeDoc;
    //     });

    //   const parseFromDocumentStub = sinon
    //     .stub(parser, "parseFromDocument")
    //     .returns();

    //   parseFromString(xmlString, contentProtectionParser);

    //   /* tslint:disable:no-unused-expression */
    //   expect(DOMParserStub).to.have.been.calledOnce;
    //   expect(parseFromDocumentStub).to.have.been.calledOnce;
    //   /* tslint:enable:no-unused-expression */
    //   expect(parseFromDocumentStub).to.have.been.calledWith(
    //     fakeDoc,
    //     contentProtectionParser
    //   );
    //   DOMParserStub.restore();
    //   parseFromDocumentStub.restore();
    // });
  });

  describe("parseFromDocument", () => {
    function setDocumentFromString(str : string) : Document {
      return new DOMParser().parseFromString(str, "application/xml");
    }

    it("throws root if not MPD", function() {
      const doc = setDocumentFromString("<foo></foo>");

      expect(function() {
        parseFromDocument(doc);
      }).to.throw("document root should be MPD");
    });
  });
});
