const expect = require("chai").expect;
const { parseTimeFragment } = require("../time-fragment.js");

describe("Time fragment", function() {

  describe("parser", function() {

    it("parses Date Objects into Date Objects", function() {
      const now = Date.now();
      expect(parseTimeFragment({
        start: new Date(now),
        end: new Date(now + 1000),
      })).to.eql({
        start: new Date(now),
        end: new Date(now + 1000),
      });
    });

    it("fails with wrong { start, end } interface", function() {
      expect(() => parseTimeFragment({
        start: "foo",
      })).to.throw();
      expect(() => parseTimeFragment({
        end: "foo",
      })).to.throw();
      expect(() => parseTimeFragment({
        start: {},
      })).to.throw();
    });

    xit("defaults to a value if none given", function() {
      expect(parseTimeFragment({
        start: 10,
      })).to.eql({ start: 10, end: Infinity });

      expect(parseTimeFragment({
        end: 10,
      })).to.eql({ start: 0, end: 10 });

      expect(parseTimeFragment({
        start: "0%",
      })).to.eql({
        start: "0%",
        end: "100%",
      });

      expect(parseTimeFragment({
        start: "0%",
      })).to.eql({
        start: "0%",
        end: "100%",
      });
    });

    it("fails if start >= end", function() {
      expect(() => parseTimeFragment({ start: 10, end: 10 })).to.throw();
      expect(() => parseTimeFragment({ start: 10, end: 5 })).to.throw();
    });

    it("fails if start < 0", function() {
      expect(() => parseTimeFragment({ start: -10 })).to.throw();
    });

    xit("parses basic MediaFragments time", function() {
      expect(parseTimeFragment(",10")).to.eql({ start: 0, end: 10 });
      expect(parseTimeFragment("1,10")).to.eql({ start: 1, end: 10 });
      expect(parseTimeFragment("1")).to.eql({ start: 1, end: Infinity });
    });

  });

});
