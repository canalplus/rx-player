var _ = require("lodash");
var expect = require("chai").expect;
var ttmlRollUp = require("raw!test/fixtures/captures-rollup.ttml");
var ttmlPopOn = require("raw!test/fixtures/captures-popon.ttml");
var { parseTTML } = require("main/net/smooth/tt-ttml");

describe("ttml parser", function() {

  it("parses a ttlm file", function() {
    expect(parseTTML(ttmlRollUp, null, 0)).to.be.an("array");
    expect(parseTTML(ttmlPopOn, null, 0)).to.be.an("array");
  });

  it("has many cues", function() {
    var subs = parseTTML(ttmlRollUp);
    expect(subs).to.have.length(5);
    _.each(subs, s => {
      expect(s.start).to.be.a("number");
      expect(s.end).to.be.a("number");
      expect(s.text).to.be.a("string");
    });
  });

  it("parses correctly ttml with relative sibling duration", function() {
    var subs = parseTTML(ttmlPopOn);
    var start = 12;
    _.each(_.zip([4, 4, 6, 4, 7], subs), ([duration, sub]) => {
      expect(sub.start).to.equal(start);
      expect(sub.end - sub.start).to.equal(duration);
      start += duration;
    });
  });

  it("parses correctly ttml with absolute timings", function() {
    var subs = parseTTML(ttmlRollUp);
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
