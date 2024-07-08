import { describe, it, expect } from "vitest";
import HTMLTextDisplayer from "../../../main_thread/text_displayer/html";
import type { IFeaturesObject } from "../../types";
import addHtmlTextBuffer from "../html_text_buffer";

describe("Features list - html Text Buffer", () => {
  it("should add an html Text Buffer in the current features", () => {
    const featureObject = {} as unknown as IFeaturesObject;
    addHtmlTextBuffer(featureObject);
    expect(featureObject).toEqual({ htmlTextDisplayer: HTMLTextDisplayer });
    expect(featureObject.htmlTextDisplayer).toBe(HTMLTextDisplayer);
  });
});
