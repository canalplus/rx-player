// import _ from "lodash";
// import { expect } from "chai";
// import Timeline from "../indexes/timeline.js";
// import Template from "../indexes/template.js";

// describe("Timeline index handler", function() {
//   const { getSegments, addSegment } = Timeline;

//   describe("getSegments", function() {

//     xit("is a function", function() {
//       expect(getSegments).to.be.a("function");
//     });

//     xit("matches the segment before", function() {
//       const timeline = [{ ts:0, d:2, r:0 }, { ts:2, d:2, r:0 }, { ts:4, d:2, r:0 }];
//       const timescale = 1;
//       const index = { timeline, timescale };
//       expect(_.pluck(getSegments(index, 0, 1), "time")).to.eql([0]);
//       expect(_.pluck(getSegments(index, 1, 2), "time")).to.eql([0]);
//       expect(_.pluck(getSegments(index, 2, 3), "time")).to.eql([2]);
//       expect(_.pluck(getSegments(index, 2.1, 3), "time")).to.eql([2]);
//       expect(_.pluck(getSegments(index, 3, 4), "time")).to.eql([2]);
//       expect(_.pluck(getSegments(index, 4, 5), "time")).to.eql([4]);
//       expect(_.pluck(getSegments(index, 4.1, 5), "time")).to.eql([4]);
//       expect(_.pluck(getSegments(index, 100, 101), "time")).to.eql([]);
//     });

//     xit("works with negative ts", function() {
//       const index = {
//         timeline: [{ ts:0, d:2 }, { ts:2, d:2 }, { ts: 4, d: 2 }],
//         timescale: 1,
//       };
//       expect(getSegments(index, -1, -2)).to.eql([]);
//     });

//     xit("is fast", function() {
//       const timeline = _.map(Array(1000000), (i) => ({ ts: i, d: 1 }));
//       const time = window.performance.now();
//       getSegments({ timeline, timescale: 1 }, 1, 1000);
//       getSegments({ timeline, timescale: 1 }, 1, 8000);
//       expect(window.performance.now() - time).to.be.lt(4);
//     });

//     xit("can return multiple elements", function() {
//       const index = {
//         timeline: [{ ts:0, d:2, r:0 }, { ts:2, d:2, r:0 }, { ts:4, d:2, r:0 }],
//         timescale: 1,
//       };
//       expect(_.pluck(getSegments(index, 0, 1), "time")).to.eql([0]);
//       expect(_.pluck(getSegments(index, 0, 2.1), "time")).to.eql([0, 2]);
//       expect(_.pluck(getSegments(index, 0, 3), "time")).to.eql([0, 2]);
//       expect(_.pluck(getSegments(index, 0, 4.1), "time")).to.eql([0, 2, 4]);
//     });

//   });

//   describe("addSegment", function() {

//     xit("is a function", function() {
//       expect(addSegment).to.be.a("function");
//     });

//     xit("appends segments with duration -1", function() {
//       expect(addSegment({
//         timeline: [{ ts:4, d:2, r: 0 }],
//         timescale: 1,
//       }, { ts:4, d:2 }).timeline).to.eql([{ ts:4, d:2, r:0 }, { d:-1, ts:6, r:0 }]);
//     });

//     xit("only appends segments", function() {
//       expect(addSegment({
//         timeline: [
//           { ts:4, d:2, r:0 },
//           { ts:8, d:2, r:0 },
//         ],
//         timescale: 1,
//       }, { ts:-2, d:2, r:0 }
//       ).timeline).to.eql([{ ts:4, d:2, r:0 }, { ts:8, d:2, r:0 }]);

//       expect(addSegment({
//         timeline: [
//           { ts:4, d:2, r:0 },
//           { ts:8, d:2, r:0 },
//         ],
//         timescale: 1,
//       }, { ts:2, d:2, r:0 }
//       ).timeline).to.eql([{ ts:4, d:2, r:0 }, { ts:8, d:2, r:0 }]);
//     });

//   });

// });

// describe("Template index handler", function() {
//   const { getSegments } = Template;

//   describe("getSegments", function() {

//     xit("is a function", function() {
//       expect(getSegments).to.be.a("function");
//     });

//     xit("create the good segment number", function() {
//       const template = { media:"foo", duration: 2000, startNumber: 1, timescale: 1000, initialization:"bar" };
//       expect(getSegments(template, 0)).to.eql([{media:"foo",number:1,initialization:"bar"}]);
//       expect(getSegments(template, 3)).to.eql([{media:"foo",number:2,initialization:"bar"}]);
//       expect(getSegments(template, 4)).to.eql([{media:"foo",number:3,initialization:"bar"}]);
//       expect(getSegments(template, 4.1)).to.eql([{media:"foo",number:3,initialization:"bar"}]);
//       expect(getSegments(template, 11)).to.eql([{media:"foo",number:6,initialization:"bar"}]);
//       expect(getSegments(template, 20)).to.eql([{media:"foo",number:11,initialization:"bar"}]);
//     });

//     xit("concats with a buffer size", function() {
//       const template = { media:"foo", duration: 2000, startNumber: 1, timescale: 1000, initialization:"bar" };

//       expect(getSegments(template, 3, 0, 10)).to.eql([
//         {media:"foo",number:2,initialization:"bar"},
//         {media:"foo",number:3,initialization:"bar"},
//         {media:"foo",number:4,initialization:"bar"},
//         {media:"foo",number:5,initialization:"bar"},
//         {media:"foo",number:6,initialization:"bar"},
//       ]);

//       expect(getSegments(template, 3, 2, 10)).to.eql([
//         {media:"foo",number:3,initialization:"bar"},
//         {media:"foo",number:4,initialization:"bar"},
//         {media:"foo",number:5,initialization:"bar"},
//         {media:"foo",number:6,initialization:"bar"},
//       ]);
//     });
//   });
// });
