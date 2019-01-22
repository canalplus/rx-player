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

import { IStyleElements } from "../../html/parse_style_block";

describe("parsers - webvtt - toHTML", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should include payload HTML", () => {
    jest.mock("../../html/convert_payload_to_html", () => ({
      default: () => {
        return [
          document.createElement("b"),
          document.createTextNode("Hello"),
        ];
      },
    }));

    const toHTML = require("../../html/to_html").default;
    const cueObject = {
      start: 0,
      end: 100,
      header: "b",
      payload: ["<body><b></b><p>Hello<p><body>"],
    };

    const styleElements: IStyleElements = {};

    const { element, start, end } = toHTML(cueObject, { styleElements });
    expect(start).toBe(0);
    expect(end).toBe(100);
    expect(element.outerHTML).toBe(
      "<div style=" +
        "\"width:100%;" +
        "height:100%;" +
        "display:flex;" +
        "flex-direction:column;" +
        "justify-content:flex-end;" +
        "align-items:center;\">" +
        "<p style=\"text-align:center\">" +
          "<span style=\"background-color:rgba(0,0,0,0.8);color:white;\">" +
            "<b></b>" +
            "Hello" +
          "</span>" +
        "</p>" +
      "</div>");
  });

  it("should include payload HTML and apply correclty style class element", () => {
    jest.mock("../../html/convert_payload_to_html", () => ({
      default: () => {
        return [
          document.createElement("b"),
          document.createTextNode("Hello"),
        ];
      },
    }));

    const toHTML = require("../../html/to_html").default;
    const cueObject = {
      start: 0,
      end: 100,
      header: "b",
      payload: ["<body><b></b><p>Hello<p><body>"],
    };

    const styleElements: IStyleElements = {
      b: "color:yellow;",
    };

    const { element, start, end } = toHTML(cueObject, { styleElements });
    expect(start).toBe(0);
    expect(end).toBe(100);
    expect(element.outerHTML).toBe(
      "<div style=" +
        "\"width:100%;" +
        "height:100%;" +
        "display:flex;" +
        "flex-direction:column;" +
        "justify-content:flex-end;" +
        "align-items:center;\">" +
        "<p style=\"text-align:center\">" +
          "<span style=\"background-color:rgba(0,0,0,0.8);color:white;color:yellow;\">" +
            "<b></b>" +
            "Hello" +
          "</span>" +
        "</p>" +
      "</div>");
  });

  it("should include payload HTML and apply correclty global style element", () => {
    jest.mock("../../html/convert_payload_to_html", () => ({
      default: () => {
        return [
          document.createElement("b"),
          document.createTextNode("Hello"),
        ];
      },
    }));

    const toHTML = require("../../html/to_html").default;
    const cueObject = {
      start: 0,
      end: 100,
      header: "b",
      payload: ["<body><b></b><p>Hello<p><body>"],
    };

    const styleElements: IStyleElements = {};
    const globalStyle = "color:yellow;";

    const { element, start, end } = toHTML(cueObject, { styleElements, globalStyle });
    expect(start).toBe(0);
    expect(end).toBe(100);
    expect(element.outerHTML).toBe(
      "<div style=" +
        "\"width:100%;" +
        "height:100%;" +
        "display:flex;" +
        "flex-direction:column;" +
        "justify-content:flex-end;" +
        "align-items:center;\">" +
        "<p style=\"text-align:center\">" +
          "<span style=\"background-color:rgba(0,0,0,0.8);color:white;color:yellow;\">" +
            "<b></b>" +
            "Hello" +
          "</span>" +
        "</p>" +
      "</div>");
  });

  it("should return default element if no payload", () => {
    jest.mock("../../html/convert_payload_to_html", () => ({
      default: () => {
        return [];
      },
    }));

    const toHTML = require("../../html/to_html").default;
    const cueObject = {
      start: 0,
      end: 100,
      payload: [],
    };

    const styleElements: IStyleElements = {};

    const { element, start, end } = toHTML(cueObject, { styleElements });
    expect(start).toBe(0);
    expect(end).toBe(100);
    expect(element.outerHTML).toBe(
      "<div style=" +
        "\"width:100%;" +
        "height:100%;" +
        "display:flex;" +
        "flex-direction:column;" +
        "justify-content:flex-end;" +
        "align-items:center;\">" +
        "<p style=\"text-align:center\">" +
          "<span style=\"background-color:rgba(0,0,0,0.8);color:white;\">" +
          "</span>" +
        "</p>" +
      "</div>");
  });
});
