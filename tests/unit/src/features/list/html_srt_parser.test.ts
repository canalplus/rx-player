import { describe, it, expect } from "vitest";
import addHTMLsrtFeature from "../../../../../src/features/list/html_srt_parser.ts";
import type { IFeaturesObject } from "../../../../../src/features/types.ts";
import HTMLTextDisplayer from "../../../../../src/main_thread/text_displayer/html/index.ts";
import srtParser from "../../../../../src/parsers/texttracks/srt/html.ts";

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
