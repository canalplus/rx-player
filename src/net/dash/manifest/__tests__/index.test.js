const expect = require("chai").expect;
const sinon = require("sinon");

const parser = require("../index.js");

// const mpd = require("raw!test/fixtures/dash-seg-list.mpd");
// const mpd = require("raw!test/fixtures/dash-seg-template.mpd");

describe("dash parser", function() {

  it("has a parseFromString function", function() {
    expect(parser.parseFromString).to.be.a("function");
  });

  it("has a parseFromDocument function", function() {
    expect(parser.parseFromDocument).to.be.a("function");
  });

  describe("parseFromString", () => {
    it("should call parseFromDocument with the string given converted to a document", function () {
      const xmlString = "<foo></foo>";
      const fakeDoc = { a: 97 };
      const contentProtectionParser = () => {};

      const DOMParserStub = sinon
        .stub(window.DOMParser.prototype, "parseFromString")
        .callsFake((doc, mimeType) => {
          expect(doc).to.equal(xmlString);
          expect(mimeType).to.equal("application/xml");
          return fakeDoc;
        });

      const parseFromDocumentStub = sinon
        .stub(parser, "parseFromDocument")
        .returns();

      parser.parseFromString(xmlString, contentProtectionParser);

      expect(DOMParserStub).to.have.been.calledOnce;
      expect(parseFromDocumentStub).to.have.been.calledOnce;
      expect(parseFromDocumentStub).to.have.been.calledWith(
        fakeDoc,
        contentProtectionParser
      );
      DOMParserStub.restore();
      parseFromDocumentStub.restore();
    });
  });

  describe("parseFromDocument", () => {
    const setDocumentFromString = (str) => {
      return new DOMParser().parseFromString(str, "application/xml");
    };

    it("throws root if not MPD", function() {
      const doc = setDocumentFromString("<foo></foo>");

      expect(function() {
        parser.parseFromDocument(doc);
      }).to.throw("document root should be MPD");
    });
  });
});
