import { describe, it, expect } from "vitest";
import HTMLTextDisplayer from "../../../main_thread/text_displayer/html";
import samiParser from "../../../parsers/texttracks/sami/html";
import type { IFeaturesObject } from "../../types";
import addHTMLsamiFeature from "../html_sami_parser";

describe("Features list - HTML sami Parser", () => {
  it("should add an HTML sami Parser in the current features", () => {
    const featureObject = {
      htmlTextTracksParsers: {},
    } as unknown as IFeaturesObject;
    addHTMLsamiFeature(featureObject);
    expect(featureObject).toEqual({
      htmlTextTracksParsers: { sami: samiParser },
      htmlTextDisplayer: HTMLTextDisplayer,
    });
    expect(featureObject.htmlTextTracksParsers.sami).toBe(samiParser);
    expect(featureObject.htmlTextDisplayer).toBe(HTMLTextDisplayer);
  });
});
