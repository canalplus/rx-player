import { describe, it, expect } from "vitest";
import HTMLTextDisplayer from "../../../main_thread/text_displayer/html";
import {
  parseWebVTTMp4,
  parseWebVTTPlainText,
} from "../../../parsers/texttracks/webvtt//html";
import type { IFeaturesObject } from "../../types";
import addHTMLVTTFeature from "../html_vtt_parser";

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
