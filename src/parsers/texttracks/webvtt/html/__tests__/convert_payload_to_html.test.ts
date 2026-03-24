import { describe, beforeEach, it, expect, vi } from "vitest";
import globalScope from "../../../../../utils/global_scope";
import convertPayloadToHTML from "../convert_payload_to_html";

const mocks = vi.hoisted(() => {
  return {
    createStyledElement: vi.fn(),
  };
});
vi.mock("../create_styled_element", () => ({
  default: mocks.createStyledElement,
}));

describe("parsers - webvtt - convertPayloadToHTML", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.createStyledElement.mockReset();
  });

  const gs = globalScope as {
    DOMParser: unknown;
  };
  it("should return empty payload when input text is empty", () => {
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

    expect(convertPayloadToHTML("", {})).toEqual([]);
    expect(spyParseFromString).toHaveBeenCalledTimes(1);
    expect(mocks.createStyledElement).not.toHaveBeenCalled();
    gs.DOMParser = origDOMParser;
  });

  it("should convert normal input text with no style", () => {
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
    mocks.createStyledElement.mockImplementation((input: Node) => {
      if (input.nodeName === bNode.nodeName) {
        return bNode;
      } else if (input.nodeName === textNode.nodeName) {
        return span;
      }
    });

    const origDOMParser = gs.DOMParser;
    gs.DOMParser = class MockDOMParser {
      public parseFromString() {
        return spyParseFromString();
      }
    };

    expect(convertPayloadToHTML(innerText, {})).toEqual([bNode, span]);
    expect(spyParseFromString).toHaveBeenCalledTimes(1);
    expect(mocks.createStyledElement).toHaveBeenCalledTimes(2);
    gs.DOMParser = origDOMParser;
  });
});
