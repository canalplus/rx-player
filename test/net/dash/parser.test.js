const expect = require("chai").expect;
const parser = require("../../../src/net/dash/parser.js");

// const mpd = require("raw!test/fixtures/dash-seg-list.mpd");
// const mpd = require("raw!test/fixtures/dash-seg-template.mpd");

describe("dash parser", function() {

  it("is has a parseFromString function", function() {
    expect(parser.parseFromString).to.be.a("function");
  });

  it("throws root if not MPD", function() {
    expect(function() { parser.parseFromString("<foo></foo>"); }).to.throw("parser: document root should be MPD");
  });
});
