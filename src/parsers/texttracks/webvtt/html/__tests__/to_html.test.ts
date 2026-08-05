import { describe, beforeEach, it, expect, vi, afterEach } from "vitest";
import type { IStyleElements } from "../../parse_style_block.ts";
import toHTML from "../to_html.ts";

const mocks = vi.hoisted(() => {
  return {
    convertPayloadToHTML: vi.fn(),
  };
});
vi.mock("../convert_payload_to_html", () => ({
  default: mocks.convertPayloadToHTML,
}));

describe("parsers - webvtt - toHTML", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    mocks.convertPayloadToHTML.mockReset();
  });

  it("should include payload HTML", () => {
    mocks.convertPayloadToHTML.mockImplementation(() => [
      document.createElement("b"),
      document.createTextNode("Hello"),
    ]);

    const cueObject = {
      start: 0,
      end: 100,
      header: "b",
      payload: ["<body><b></b><p>Hello<p><body>"],
      settings: {},
    };

    const classes: IStyleElements = {};

    const { element, start, end } = toHTML(cueObject, { classes });
    expect(start).toBe(0);
    expect(end).toBe(100);
    expect(element.outerHTML).toBe(
      "<div style=" +
        '"width:100%;' +
        "height:100%;" +
        "display:flex;" +
        "flex-direction:column;" +
        "justify-content:flex-end;" +
        'align-items:center;">' +
        '<p style="text-align:center">' +
        '<span style="background-color:rgba(0,0,0,0.8);color:white;">' +
        "<b></b>" +
        "Hello" +
        "</span>" +
        "</p>" +
        "</div>",
    );
  });

  it("should include payload HTML and apply correclty style class element", () => {
    mocks.convertPayloadToHTML.mockImplementation(() => [
      document.createElement("b"),
      document.createTextNode("Hello"),
    ]);

    const cueObject = {
      start: 0,
      end: 100,
      header: "b",
      payload: ["<body><b></b><p>Hello<p><body>"],
      settings: {},
    };

    const classes: IStyleElements = {
      b: "color:yellow;",
    };

    const { element, start, end } = toHTML(cueObject, { classes });
    expect(start).toBe(0);
    expect(end).toBe(100);
    expect(element.outerHTML).toBe(
      "<div style=" +
        '"width:100%;' +
        "height:100%;" +
        "display:flex;" +
        "flex-direction:column;" +
        "justify-content:flex-end;" +
        'align-items:center;">' +
        '<p style="text-align:center">' +
        '<span style="background-color:rgba(0,0,0,0.8);color:white;color:yellow;">' +
        "<b></b>" +
        "Hello" +
        "</span>" +
        "</p>" +
        "</div>",
    );
  });

  it("should include payload HTML and apply correctly global style element", () => {
    mocks.convertPayloadToHTML.mockImplementation(() => [
      document.createElement("b"),
      document.createTextNode("Hello"),
    ]);

    const cueObject = {
      start: 0,
      end: 100,
      header: "b",
      payload: ["<body><b></b><p>Hello<p><body>"],
      settings: {},
    };

    const classes: IStyleElements = {};
    const global = "color:yellow;";

    const { element, start, end } = toHTML(cueObject, { classes, global });
    expect(start).toBe(0);
    expect(end).toBe(100);
    expect(element.outerHTML).toBe(
      "<div style=" +
        '"width:100%;' +
        "height:100%;" +
        "display:flex;" +
        "flex-direction:column;" +
        "justify-content:flex-end;" +
        'align-items:center;">' +
        '<p style="text-align:center">' +
        '<span style="background-color:rgba(0,0,0,0.8);color:white;color:yellow;">' +
        "<b></b>" +
        "Hello" +
        "</span>" +
        "</p>" +
        "</div>",
    );
  });

  it("should apply both the global style element and a given class", () => {
    mocks.convertPayloadToHTML.mockImplementation(() => [
      document.createElement("b"),
      document.createTextNode("Hello"),
    ]);

    const cueObject = {
      start: 0,
      end: 100,
      header: "b",
      payload: ["<body><b></b><p>Hello<p><body>"],
      settings: {},
    };

    const classes: IStyleElements = { b: "bar: baz;" };
    const global = "color:yellow;";

    const { element, start, end } = toHTML(cueObject, { classes, global });
    expect(start).toBe(0);
    expect(end).toBe(100);
    expect(element.outerHTML).toBe(
      "<div style=" +
        '"width:100%;' +
        "height:100%;" +
        "display:flex;" +
        "flex-direction:column;" +
        "justify-content:flex-end;" +
        'align-items:center;">' +
        '<p style="text-align:center">' +
        '<span style="background-color:rgba(0,0,0,0.8);color:white;' +
        'color:yellow;bar: baz;">' +
        "<b></b>" +
        "Hello" +
        "</span>" +
        "</p>" +
        "</div>",
    );
  });

  it("should return default element if no payload", () => {
    mocks.convertPayloadToHTML.mockImplementation(() => []);

    const cueObject = {
      start: 0,
      end: 100,
      payload: [],
      settings: {},
    };

    const classes: IStyleElements = {};

    const { element, start, end } = toHTML(cueObject, { classes });
    expect(start).toBe(0);
    expect(end).toBe(100);
    expect(element.outerHTML).toBe(
      "<div style=" +
        '"width:100%;' +
        "height:100%;" +
        "display:flex;" +
        "flex-direction:column;" +
        "justify-content:flex-end;" +
        'align-items:center;">' +
        '<p style="text-align:center">' +
        '<span style="background-color:rgba(0,0,0,0.8);color:white;">' +
        "</span>" +
        "</p>" +
        "</div>",
    );
  });
});
