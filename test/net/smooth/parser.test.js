const _ = require("lodash");
const expect = require("chai").expect;
const parser = require("../../../src/net/smooth/parser");

describe("smooth parser", function() {

  it("is has a parseFromString function", function() {
    expect(parser.parseFromString).to.be.a("function");
  });

  it("throws root if not SmoothStreamingMedia", function() {
    expect(function() {
      parser.parseFromString("<foo></foo>");
    }).to.throw("parser: document root should be SmoothStreamingMedia");
  });

  it("check major and minor versions", function() {
    expect(function() {
      parser.parseFromString("<SmoothStreamingMedia></SmoothStreamingMedia>");
    }).to.throw();
    expect(function() {
      parser.parseFromString("<SmoothStreamingMedia MajorVersion=\"1\"></SmoothStreamingMedia>");
    }).to.throw();
    expect(function() {
      parser.parseFromString("<SmoothStreamingMedia MajorVersion=\"2\"></SmoothStreamingMedia>");
    }).to.throw();
    expect(function() {
      parser.parseFromString("<SmoothStreamingMedia MajorVersion=\"2\" MinorVersion=\"3\"></SmoothStreamingMedia>");
    }).to.throw();
    expect(function() {
      parser.parseFromString("<SmoothStreamingMedia MajorVersion=\"2\" MinorVersion=\"0\"></SmoothStreamingMedia>");
    }).to.not.throw();
    expect(function() {
      parser.parseFromString("<SmoothStreamingMedia MajorVersion=\"2\" MinorVersion=\"1\"></SmoothStreamingMedia>");
    }).to.not.throw();
    expect(function() {
      parser.parseFromString("<SmoothStreamingMedia MajorVersion=\"2\" MinorVersion=\"2\"></SmoothStreamingMedia>");
    }).to.not.throw();
  });

  it("parses Duration", function() {
    expect(parser.parseFromString(
      "<SmoothStreamingMedia " +
      "MajorVersion=\"2\" MinorVersion=\"0\" " +
      "Duration=\"1000\" Timescale=\"10\" IsLive=\"TRUE\">" +
      "</SmoothStreamingMedia>"
    ).periods[0].duration).to.equal(100);

    expect(parser.parseFromString(
      "<SmoothStreamingMedia " +
      "MajorVersion=\"2\" MinorVersion=\"0\" " +
      "Duration=\"\" IsLive=\"FALSE\">" +
      "</SmoothStreamingMedia>"
    ).periods[0].duration).to.equal(Infinity);

    expect(parser.parseFromString(
      "<SmoothStreamingMedia " +
      "MajorVersion=\"2\" MinorVersion=\"0\" " +
      "Duration=\"0\" IsLive=\"FALSE\">" +
      "</SmoothStreamingMedia>"
    ).periods[0].duration).to.equal(Infinity);
  });

  it("parses IsLive", function() {
    expect(parser.parseFromString(
      "<SmoothStreamingMedia " +
      "MajorVersion=\"2\" MinorVersion=\"0\" " +
      "Duration=\"1000\" " +
      "IsLive=\"TRUE\">" +
      "</SmoothStreamingMedia>"
    ).profiles).to.match(/isoff-live/);

    expect(parser.parseFromString(
      "<SmoothStreamingMedia MajorVersion=\"2\" MinorVersion=\"0\" Duration=\"\" IsLive=\"FALSE\">" +
      "</SmoothStreamingMedia>"
    ).profiles).not.to.match(/isoff-live/);
  });

  describe("Protection", function() {

    beforeEach(function() {
      this.json = {};
      // this.json = parser.parseFromString(require("raw!test/fixtures/isml.protection.xml"));
      this.smoothProtection = this.json.periods[0].adaptations[0].smoothProtection;
    });

    it("has a smoothProtection attribute", function() {
      expect(this.smoothProtection).to.be.ok;
    });

    it("has hexa keyId", function() {
      expect(this.smoothProtection.keyId).to.be.a("string");
      expect(this.smoothProtection.keyId).to.have.length(32);
    });

    it("has keySystems", function() {
      expect(this.smoothProtection.keySystems).to.be.an("array");
      expect(this.smoothProtection.keySystems).to.have.length(2);
    });

    it("has a playReady keySystem", function() {
      const playReady = _.find(this.smoothProtection.keySystems, { systemId: "9a04f079-9840-4286-ab92-e65be0885f95" });
      expect(playReady).to.be.ok;
      expect(playReady.privateData).to.be.instanceOf(Uint8Array);
    });

    it("has a widevine keySystem", function() {
      const widevine = _.find(this.smoothProtection.keySystems, { systemId: "edef8ba9-79d6-4ace-a3c8-27dcd51d21ed" });
      expect(widevine).to.be.ok;
      expect(widevine.privateData).to.be.instanceOf(Uint8Array);
    });
  });

  describe("Stream", function() {
    beforeEach(function() {
      this.json = {};
      // this.json = parser.parseFromString(require("raw!test/fixtures/isml.xml"), new Date);
    });

    it("has duration", function() {
      expect(this.json.periods[0].duration).is.a("number");
      expect(this.json.periods[0].duration).equal(Infinity);
    });

    it("is live", function() {
      expect(this.json.profiles).to.match(/isoff-live/);
    });

    it("has adaptations grouped by types (audio/video/text)", function() {
      expect(this.json.periods[0].adaptations).to.be.an("array");
      expect(this.json.periods[0].adaptations).to.have.length(5);
    });
  });

});
