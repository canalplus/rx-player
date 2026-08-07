import { describe, it, expect } from "vitest";
import addHTMLVTTFeature from "../../../../../src/features/list/html_vtt_parser.ts";
import type { IFeaturesObject } from "../../../../../src/features/types.ts";
import HTMLTextDisplayer from "../../../../../src/main_thread/text_displayer/html/index.ts";
import {
  parseWebVTTMp4,
  parseWebVTTPlainText,
} from "../../../../../src/parsers/texttracks/webvtt/html/index.ts";

describe("Features list - HTML VTT Parser", () => {
  it("should add an HTML VTT Parser in the current features", () => {
    const featureObject = {
      htmlTextTracksParsers: {},
    } as unknown as IFeaturesObject;
    addHTMLVTTFeature(featureObject);
    expect(featureObject).toEqual({
      htmlTextTracksParsers: { vtt: parseWebVTTPlainText, mp4vtt: parseWebVTTMp4 },
      htmlTextDisplayer: HTMLTextDisplayer,
    });
    expect(featureObject.htmlTextTracksParsers.vtt).toBe(parseWebVTTPlainText);
    expect(featureObject.htmlTextTracksParsers.mp4vtt).toBe(parseWebVTTMp4);
  });
});
