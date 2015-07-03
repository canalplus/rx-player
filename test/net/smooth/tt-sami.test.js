var _ = require("lodash");
var expect = require("chai").expect;
var smi = require("raw!test/fixtures/captures.smi");
var { parseSami } = require("main/net/smooth/tt-sami");

describe("sami parser", function() {

  it("parses a smi file", function() {
    expect(parseSami(smi, "fr-FR")).to.be.an("array");
  });

  it("has many cues with { start, end, text }", function() {
    var subs = parseSami(smi, "fr-FR");
    expect(subs).to.be.an("array");
    expect(subs).to.have.length(32);
    _.each(subs, s => {
      expect(s.start).to.be.a("number");
      expect(s.end).to.be.a("number");
      expect(s.start < s.end).to.equal(true);
      expect(s.text).to.be.a("string");
      expect(s.text).to.not.equal("&npsp;");
      expect(s.text).to.not.match(/<br>/);
    });
  });

});
