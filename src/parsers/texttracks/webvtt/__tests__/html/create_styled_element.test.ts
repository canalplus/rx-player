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

import createStyledElement from "../../html/create_styled_element";

describe("parsers - webvtt - createStyledElement", () => {
  it("should apply style for authorized elements", () => {
    const node = document.createElement("div");

    const authorizedNodeNames = ["u", "i", "b", "c"];

    authorizedNodeNames.forEach((nodeName) => {
      const _node = document.createElement(nodeName);
      node.appendChild(_node);
    });

    const styleElements = {
      u: "color: yellow",
      i: "color: green",
      b: "color: red",
      c: "color: blue",
    };

    const element = createStyledElement(node, styleElements);
    expect(element.outerHTML).toEqual(
      "<span>" +
        "<u style=\"color: yellow\"></u>" +
        "<i style=\"color: green\"></i>" +
        "<b style=\"color: red\"></b>" +
        "<span style=\"color: blue\"></span>" +
      "</span>"
    );
  });

  it("should not apply style for authorized elements", () => {
    const node = document.createElement("div");

    const authorizedNodeNames = ["u", "i", "b", "c"];

    authorizedNodeNames.forEach((nodeName) => {
      const _node = document.createElement(nodeName);
      node.appendChild(_node);
    });

    const styleElements = {};

    const element = createStyledElement(node, styleElements);
    expect(element.outerHTML).toEqual(
      "<span>" +
        "<u></u>" +
        "<i></i>" +
        "<b></b>" +
        "<span></span>" +
      "</span>"
    );
  });

  it("should not apply style for text elements", () => {
    const node = document.createElement("div");

    const textNode = document.createTextNode("Hello");
    node.appendChild(textNode);

    const styleElements = {
      "#text": "color: yellow",
    };

    const element = createStyledElement(node, styleElements);
    expect(element.outerHTML).toEqual(
      "<span>" +
        "<span>Hello</span>" +
      "</span>"
    );
  });

  it("should turn empty text node into span", () => {
    const node = document.createElement("div");

    const textNode = document.createTextNode("");
    node.appendChild(textNode);

    const element = createStyledElement(node, {});
    expect(element.outerHTML).toEqual(
      "<span>" +
        "<span></span>" +
      "</span>"
    );
  });

  it("should add <br/> tags for text elements", () => {
    const node = document.createElement("div");

    const textNode = document.createTextNode("Hello\nWorld!");
    node.appendChild(textNode);
    const element = createStyledElement(node, {});
    expect(element.outerHTML).toEqual(
      "<span>" +
        "<span>Hello" +
        "<br>" +
        "World!</span>" +
      "</span>"
    );
  });

  it("should create span for unknown nodes", () => {
    const node = document.createElement("svg");
    const styleElements = {};

    const element = createStyledElement(node, styleElements);
    expect(element.outerHTML).toEqual("<span></span>");
  });

  it("should convert authorized node and his children", () => {
    const node = document.createElement("b");
    const childNode = document.createElement("b");
    node.appendChild(childNode);
    const styleElements = {};

    const element = createStyledElement(node, styleElements);
    expect(element.outerHTML).toEqual(
      "<b>" +
        "<b></b>" +
      "</b>"
    );
  });
});
