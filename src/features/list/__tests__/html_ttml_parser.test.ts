import { describe, it, expect } from "vitest";
import HTMLTextDisplayer from "../../../main_thread/text_displayer/html/index.ts";
import ttmlParser from "../../../parsers/texttracks/ttml/html/index.ts";
import type { IFeaturesObject } from "../../types.ts";
import addHTMLttmlFeature from "../html_ttml_parser.ts";

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
