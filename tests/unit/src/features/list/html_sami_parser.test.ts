import { describe, it, expect } from "vitest";
import addHTMLsamiFeature from "../../../../../src/features/list/html_sami_parser.ts";
import type { IFeaturesObject } from "../../../../../src/features/types.ts";
import HTMLTextDisplayer from "../../../../../src/main_thread/text_displayer/html/index.ts";
import samiParser from "../../../../../src/parsers/texttracks/sami/html.ts";

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
