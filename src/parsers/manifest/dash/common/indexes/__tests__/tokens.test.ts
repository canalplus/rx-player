import { describe, it, expect } from "vitest";
import { createDashUrlDetokenizer, replaceRepresentationDASHTokens } from "../tokens";

describe("dash parser tokens helpers", function () {
  describe("createDashUrlDetokenizer", () => {
    it("should correctly parse time token", function () {
      expect(createDashUrlDetokenizer(1000, undefined)("Example_Token_$Time$")).toBe(
        "Example_Token_1000",
      );
    });
    it("should correctly parse number token", function () {
      expect(createDashUrlDetokenizer(1000, 3)("Example_Token_$Number$")).toBe(
        "Example_Token_3",
      );
    });
    it("should correctly parse both time and number token", function () {
      expect(createDashUrlDetokenizer(1000, 3)("Example_Token_$Number$_$Time$")).toBe(
        "Example_Token_3_1000",
      );
    });
    it("should not replace undefined tokens", function () {
      expect(createDashUrlDetokenizer(1000, 3)("Example_Token_$Nmber$_$ime$")).toBe(
        "Example_Token_$Nmber$_$ime$",
      );
    });
    it("should return segment name if no token", function () {
      expect(createDashUrlDetokenizer(undefined, undefined)("Example_Token")).toBe(
        "Example_Token",
      );
    });
  });

  describe("replaceRepresentationDASHTokens", () => {
    it("should correctly parse ID token", function () {
      expect(
        replaceRepresentationDASHTokens("Example_$RepresentationID$", "fakeId"),
      ).toBe("Example_fakeId");
    });
    it("should correctly parse bitrate token", function () {
      expect(replaceRepresentationDASHTokens("Example_$Bandwidth$", "", 3000)).toBe(
        "Example_3000",
      );
    });
    it("should return segment name if no token", function () {
      expect(replaceRepresentationDASHTokens("Example_Token")).toBe("Example_Token");
    });
  });
});
