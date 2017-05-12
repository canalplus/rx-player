var expect = require("chai").expect;
var parser = require("main/net/dash/parser");

// var mpd = require("raw!test/fixtures/dash-seg-list.mpd");
var mpd = require("raw!test/fixtures/dash-seg-template.mpd");

describe("dash parser", function() {

  it("is has a parseFromString function", function() {
    expect(parser.parseFromString).to.be.a("function");
  });

  it("throws root if not MPD", function() {
    expect(function() { parser.parseFromString("<foo></foo>"); }).to.throw("parser: document root should be MPD");
  });

});
