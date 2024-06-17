import { describe, it, expect } from "vitest";
import HTMLTextDisplayer from "../../../main_thread/text_displayer/html";
import ttmlParser from "../../../parsers/texttracks/ttml/html";
import type { IFeaturesObject } from "../../types";
import addHTMLttmlFeature from "../html_ttml_parser";

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
