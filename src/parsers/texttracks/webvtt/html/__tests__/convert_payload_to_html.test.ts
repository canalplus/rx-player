/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

describe("parsers - webvtt - convertPayloadToHTML", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  const win = window as {
    DOMParser : unknown;
  };
  it("should return empty payload when input text is empty", () => {
    const spyParseFromString = jest.fn(() => {
      return {
        body: {
          childNodes: [],
        },
      };
    });

    const origDOMParser = win.DOMParser;
    win.DOMParser = class MockDOMParser {
      constructor() {
        // Useless constructor in mock
      }
      public parseFromString() {
        return spyParseFromString();
      }
    };

    const spy = jest.fn();
    jest.mock("../create_styled_element", () => ({
      __esModule: true as const,
      default: spy,
    }));

    const convertPayloadToHTML = require("../convert_payload_to_html").default;
    expect(convertPayloadToHTML("", {})).toEqual([]);
    expect(spyParseFromString).toHaveBeenCalledTimes(1);
    expect(spy).not.toHaveBeenCalled();
    win.DOMParser = origDOMParser;
  });

  it("should convert normal input text with no style", () => {
    const innerText = "<b></b>Hello";
    const bNode = document.createElement("b");
    const textNode = document.createTextNode("Hello");
    const spyParseFromString = jest.fn(() => {
      return {
        body: {
          childNodes: [bNode, textNode],
        },
      };
    });

    const span = document.createElement("span");
    span.textContent = "Hello";
    const spyCreateStyledElement = jest.fn((input: Node) => {
      if (input.nodeName === bNode.nodeName) {
        return bNode;
      } else if (input.nodeName === textNode.nodeName) {
        return span;
      }
    });
    jest.mock("../create_styled_element", () => ({
      __esModule: true as const,
      default: spyCreateStyledElement,
    }));

    const origDOMParser = win.DOMParser;
    win.DOMParser = class MockDOMParser {
      constructor() {
        // Useless constructor in mock
      }
      public parseFromString() {
        return spyParseFromString();
      }
    };

    const convertPayloadToHTML = require("../convert_payload_to_html").default;
    expect(convertPayloadToHTML(innerText, {})).toEqual([bNode, span]);
    expect(spyParseFromString).toHaveBeenCalledTimes(1);
    expect(spyCreateStyledElement).toHaveBeenCalledTimes(2);
    win.DOMParser = origDOMParser;
  });
});
