import _ from "lodash";
import { expect } from "chai";
import smi from "raw-loader!./fixtures/captures.smi";
import { parseSami } from "../sami.js";

describe("sami parser", function() {

  it("parses a smi file", function() {
    expect(parseSami(smi, "fr-FR")).to.be.an("array");
  });

  it("has many cues with { start, end, text }", function() {
    const subs = parseSami(smi, "fr-FR");
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
