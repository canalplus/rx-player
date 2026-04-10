import { describe, it, expect } from "vitest";
import addHtmlTextBuffer from "../../../../../src/features/list/html_text_buffer.ts";
import type { IFeaturesObject } from "../../../../../src/features/types.ts";
import HTMLTextDisplayer from "../../../../../src/main_thread/text_displayer/html/index.ts";

describe("Features list - html Text Buffer", () => {
  it("should add an html Text Buffer in the current features", () => {
    const featureObject = {} as unknown as IFeaturesObject;
    addHtmlTextBuffer(featureObject);
    expect(featureObject).toEqual({ htmlTextDisplayer: HTMLTextDisplayer });
    expect(featureObject.htmlTextDisplayer).toBe(HTMLTextDisplayer);
  });
});
