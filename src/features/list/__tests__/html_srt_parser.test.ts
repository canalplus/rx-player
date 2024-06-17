import { describe, it, expect } from "vitest";
import HTMLTextDisplayer from "../../../main_thread/text_displayer/html";
import srtParser from "../../../parsers/texttracks/srt/html";
import type { IFeaturesObject } from "../../types";
import addHTMLsrtFeature from "../html_srt_parser";

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
