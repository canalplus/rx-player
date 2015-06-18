var _ = require("lodash");
var expect = require("chai").expect;
var { Timeline, Template } = require("main/core/index-handler");

describe("Timeline index handler", function() {
  var { getLiveEdge, getSegments, addSegment } = Timeline;

  describe("getSegments", function() {

    it("is a function", function() {
      expect(getSegments).to.be.a("function");
    });

    it("matches the segment before", function() {
      var timeline = [{ ts:0, d:2, r:0 }, { ts:2, d:2, r:0 }, { ts:4, d:2, r:0 }];
      var timescale = 1;
      var index = { timeline, timescale };
      expect(_.pluck(getSegments(index, 0, 1), "time")).to.eql([0]);
      expect(_.pluck(getSegments(index, 1, 2), "time")).to.eql([0]);
      expect(_.pluck(getSegments(index, 2, 3), "time")).to.eql([2]);
      expect(_.pluck(getSegments(index, 2.1, 3), "time")).to.eql([2]);
      expect(_.pluck(getSegments(index, 3, 4), "time")).to.eql([2]);
      expect(_.pluck(getSegments(index, 4, 5), "time")).to.eql([4]);
      expect(_.pluck(getSegments(index, 4.1, 5), "time")).to.eql([4]);
      expect(_.pluck(getSegments(index, 100, 101), "time")).to.eql([]);
    });

    it("works with negative ts", function() {
      var index = {
        timeline: [{ ts:0, d:2 }, { ts:2, d:2 }, { ts: 4, d: 2 }],
        timescale: 1
      };
      expect(getSegments(index, -1, -2)).to.eql([]);
    });

    it("is fast", function() {
      var timeline = _.map(Array(1000000), (i) => ({ ts: i, d: 1 }));
      var time = window.performance.now();
      getSegments({ timeline, timescale: 1 }, 1, 1000);
      getSegments({ timeline, timescale: 1 }, 1, 8000);
      expect(window.performance.now() - time).to.be.lt(4);
    });

    it("can return multiple elements", function() {
      var index = {
        timeline: [{ ts:0, d:2, r:0 }, { ts:2, d:2, r:0 }, { ts:4, d:2, r:0 }],
        timescale: 1
      };
      expect(_.pluck(getSegments(index, 0, 1), "time")).to.eql([0]);
      expect(_.pluck(getSegments(index, 0, 2.1), "time")).to.eql([0, 2]);
      expect(_.pluck(getSegments(index, 0, 3), "time")).to.eql([0, 2]);
      expect(_.pluck(getSegments(index, 0, 4.1), "time")).to.eql([0, 2, 4]);
    });

  });

  describe("addSegment", function() {

    it("is a function", function() {
      expect(addSegment).to.be.a("function");
    });

    it("appends segments with duration -1", function() {
      expect(addSegment({
        timeline: [{ ts:4, d:2, r: 0 }],
        timescale: 1
      }, { ts:4, d:2 }).timeline).to.eql([{ ts:4, d:2, r:0 }, { d:-1, ts:6, r:0 }]);
    });

    it("only appends segments", function() {
      expect(addSegment({ timeline: [{ ts:4, d:2, r:0 }, { ts:8, d:2, r:0 }], timescale: 1 }, { ts:-2, d:2, r:0 }).timeline).to.eql([{ ts:4, d:2, r:0 }, { ts:8, d:2, r:0 }]);
      expect(addSegment({ timeline: [{ ts:4, d:2, r:0 }, { ts:8, d:2, r:0 }], timescale: 1 }, { ts:2, d:2, r:0 }).timeline).to.eql([{ ts:4, d:2, r:0 }, { ts:8, d:2, r:0 }]);
    });

  });

});

describe("Template index handler", function() {
  var { getLiveEdge, getSegments, addSegment } = Template;

  describe("getSegments", function() {

    it("is a function", function() {
      expect(getSegments).to.be.a("function");
    });

    it("create the good segment number", function() {
      var template = { media:"foo", duration: 2000, startNumber: 1, timescale: 1000, initialization:"bar" };
      expect(getSegments(template, 0)).to.eql([{media:"foo",number:1,initialization:"bar"}]);
      expect(getSegments(template, 3)).to.eql([{media:"foo",number:2,initialization:"bar"}]);
      expect(getSegments(template, 4)).to.eql([{media:"foo",number:3,initialization:"bar"}]);
      expect(getSegments(template, 4.1)).to.eql([{media:"foo",number:3,initialization:"bar"}]);
      expect(getSegments(template, 11)).to.eql([{media:"foo",number:6,initialization:"bar"}]);
      expect(getSegments(template, 20)).to.eql([{media:"foo",number:11,initialization:"bar"}]);
    });

    it("concats with a buffer size", function() {
      var template = { media:"foo", duration: 2000, startNumber: 1, timescale: 1000, initialization:"bar" };

      expect(getSegments(template, 3, 0, 10)).to.eql([
        {media:"foo",number:2,initialization:"bar"},
        {media:"foo",number:3,initialization:"bar"},
        {media:"foo",number:4,initialization:"bar"},
        {media:"foo",number:5,initialization:"bar"},
        {media:"foo",number:6,initialization:"bar"}
      ]);

      expect(getSegments(template, 3, 2, 10)).to.eql([
        {media:"foo",number:3,initialization:"bar"},
        {media:"foo",number:4,initialization:"bar"},
        {media:"foo",number:5,initialization:"bar"},
        {media:"foo",number:6,initialization:"bar"}
      ]);
    });
  });
});
