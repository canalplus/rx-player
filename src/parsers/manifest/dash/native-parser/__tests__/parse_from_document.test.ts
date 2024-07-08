import { describe, it, expect } from "vitest";
import type { IManifest } from "../../../../../manifest";
import parseFromDocument from "../index";

describe("parseFromDocument", () => {
  function setDocumentFromString(str: string): Document {
    return new DOMParser().parseFromString(str, "application/xml");
  }

  it("throws root if not MPD", function () {
    const doc = setDocumentFromString("<foo></foo>");

    expect(function () {
      parseFromDocument(doc, {
        url: "",
        externalClockOffset: 10,
        unsafelyBaseOnPreviousManifest: null,
      });
    }).toThrow("document root should be MPD");
    expect(function () {
      const prevManifest = {} as unknown as IManifest;
      parseFromDocument(doc, {
        url: "",
        unsafelyBaseOnPreviousManifest: prevManifest,
      });
    }).toThrow("document root should be MPD");
  });
});
