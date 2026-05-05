import { describe, it, expect } from "vitest";
import HTMLTextDisplayer from "../../../main_thread/text_displayer/html/index.ts";
import srtParser from "../../../parsers/texttracks/srt/html.ts";
import type { IFeaturesObject } from "../../types.ts";
import addHTMLsrtFeature from "../html_srt_parser.ts";

describe("Features list - HTML srt Parser", () => {
  it("should add an HTML srt Parser in the current features", () => {
    const featureObject = {
      htmlTextTracksParsers: {},
    } as unknown as IFeaturesObject;
    addHTMLsrtFeature(featureObject);
    expect(featureObject).toEqual({
      htmlTextTracksParsers: { srt: srtParser },
      htmlTextDisplayer: HTMLTextDisplayer,
    });
    expect(featureObject.htmlTextTracksParsers.srt).toBe(srtParser);
  });
});
