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

import { IStyleElements } from "../parse_style_block";

describe("parsers - webvtt - toHTML", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should include payload HTML", () => {
    jest.mock("../convert_payload_to_html", () => ({
      __esModule: true,
      default: () => {
        return [
          document.createElement("b"),
          document.createTextNode("Hello"),
        ];
      },
    }));

    const toHTML = require("../to_html").default;
    const cueObject = {
      start: 0,
      end: 100,
      header: "b",
      payload: ["<body><b></b><p>Hello<p><body>"],
    };

    const classes : IStyleElements = {};

    const { element, start, end } = toHTML(cueObject, { classes  });
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
    jest.mock("../convert_payload_to_html", () => ({
      __esModule: true,
      default: () => {
        return [
          document.createElement("b"),
          document.createTextNode("Hello"),
        ];
      },
    }));

    const toHTML = require("../to_html").default;
    const cueObject = {
      start: 0,
      end: 100,
      header: "b",
      payload: ["<body><b></b><p>Hello<p><body>"],
    };

    const classes : IStyleElements = {
      b: "color:yellow;",
    };

    const { element, start, end } = toHTML(cueObject, { classes  });
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

  it("should include payload HTML and apply correctly global style element", () => {
    jest.mock("../convert_payload_to_html", () => ({
      __esModule: true,
      default: () => {
        return [
          document.createElement("b"),
          document.createTextNode("Hello"),
        ];
      },
    }));

    const toHTML = require("../to_html").default;
    const cueObject = {
      start: 0,
      end: 100,
      header: "b",
      payload: ["<body><b></b><p>Hello<p><body>"],
    };

    const classes : IStyleElements = {};
    const global = "color:yellow;";

    const { element, start, end } = toHTML(cueObject, { classes , global });
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

  it("should apply both the global style element and a given class", () => {
    jest.mock("../convert_payload_to_html", () => ({
      __esModule: true,
      default: () => {
        return [
          document.createElement("b"),
          document.createTextNode("Hello"),
        ];
      },
    }));

    const toHTML = require("../to_html").default;
    const cueObject = {
      start: 0,
      end: 100,
      header: "b",
      payload: ["<body><b></b><p>Hello<p><body>"],
    };

    const classes : IStyleElements = { b: "bar: baz;" };
    const global = "color:yellow;";

    const { element, start, end } = toHTML(cueObject, { classes , global });
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
          "<span style=\"background-color:rgba(0,0,0,0.8);color:white;" +
            "color:yellow;bar: baz;\">" +
            "<b></b>" +
            "Hello" +
          "</span>" +
        "</p>" +
      "</div>");
  });

  it("should return default element if no payload", () => {
    jest.mock("../convert_payload_to_html", () => ({
      __esModule: true,
      default: () => {
        return [];
      },
    }));

    const toHTML = require("../to_html").default;
    const cueObject = {
      start: 0,
      end: 100,
      payload: [],
    };

    const classes : IStyleElements = {};

    const { element, start, end } = toHTML(cueObject, { classes  });
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
