import { describe, it, expect } from "vitest";
import addHTMLttmlFeature from "../../../../../src/features/list/html_ttml_parser.ts";
import type { IFeaturesObject } from "../../../../../src/features/types.ts";
import HTMLTextDisplayer from "../../../../../src/main_thread/text_displayer/html/index.ts";
import ttmlParser from "../../../../../src/parsers/texttracks/ttml/html/index.ts";

describe("Features list - HTML ttml Parser", () => {
  it("should add an HTML ttml Parser in the current features", () => {
    const featureObject = {
      htmlTextTracksParsers: {},
    } as unknown as IFeaturesObject;
    addHTMLttmlFeature(featureObject);
    expect(featureObject).toEqual({
      htmlTextTracksParsers: { ttml: ttmlParser },
      htmlTextDisplayer: HTMLTextDisplayer,
    });
    expect(featureObject.htmlTextTracksParsers.ttml).toBe(ttmlParser);
  });
});
