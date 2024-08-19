import { describe, beforeEach, it, expect, vi } from "vitest";
import globalScope from "../../../../../utils/global_scope";
import type IConvertPayloadToHTML from "../convert_payload_to_html";

describe("parsers - webvtt - convertPayloadToHTML", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  const gs = globalScope as {
    DOMParser: unknown;
  };
  it("should return empty payload when input text is empty", async () => {
    const spyParseFromString = vi.fn(() => {
      return {
        body: {
          childNodes: [],
        },
      };
    });

    const origDOMParser = gs.DOMParser;
    gs.DOMParser = class MockDOMParser {
      public parseFromString() {
        return spyParseFromString();
      }
    };

    const spy = vi.fn();
    vi.doMock("../create_styled_element", () => ({
      default: spy,
    }));

    const convertPayloadToHTML = (await vi.importActual("../convert_payload_to_html"))
      .default as typeof IConvertPayloadToHTML;
    expect(convertPayloadToHTML("", {})).toEqual([]);
    expect(spyParseFromString).toHaveBeenCalledTimes(1);
    expect(spy).not.toHaveBeenCalled();
    gs.DOMParser = origDOMParser;
  });

  it("should convert normal input text with no style", async () => {
    const innerText = "<b></b>Hello";
    const bNode = document.createElement("b");
    const textNode = document.createTextNode("Hello");
    const spyParseFromString = vi.fn(() => {
      return {
        body: {
          childNodes: [bNode, textNode],
        },
      };
    });

    const span = document.createElement("span");
    span.textContent = "Hello";
    const spyCreateStyledElement = vi.fn((input: Node) => {
      if (input.nodeName === bNode.nodeName) {
        return bNode;
      } else if (input.nodeName === textNode.nodeName) {
        return span;
      }
    });
    vi.doMock("../create_styled_element", () => ({
      default: spyCreateStyledElement,
    }));

    const origDOMParser = gs.DOMParser;
    gs.DOMParser = class MockDOMParser {
      public parseFromString() {
        return spyParseFromString();
      }
    };

    const convertPayloadToHTML = (await vi.importActual("../convert_payload_to_html"))
      .default as typeof IConvertPayloadToHTML;
    expect(convertPayloadToHTML(innerText, {})).toEqual([bNode, span]);
    expect(spyParseFromString).toHaveBeenCalledTimes(1);
    expect(spyCreateStyledElement).toHaveBeenCalledTimes(2);
    gs.DOMParser = origDOMParser;
  });
});
