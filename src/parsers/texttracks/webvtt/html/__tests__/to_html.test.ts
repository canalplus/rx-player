import { describe, beforeEach, it, expect, vi } from "vitest";
import type { IStyleElements } from "../parse_style_block";
import type IToHtml from "../to_html";

describe("parsers - webvtt - toHTML", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should include payload HTML", async () => {
    vi.doMock("../convert_payload_to_html", () => ({
      default: () => {
        return [document.createElement("b"), document.createTextNode("Hello")];
      },
    }));

    const toHTML = (await vi.importActual("../to_html")).default as typeof IToHtml;
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

  it("should include payload HTML and apply correclty style class element", async () => {
    vi.doMock("../convert_payload_to_html", () => ({
      default: () => {
        return [document.createElement("b"), document.createTextNode("Hello")];
      },
    }));

    const toHTML = (await vi.importActual("../to_html")).default as typeof IToHtml;
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

  it("should include payload HTML and apply correctly global style element", async () => {
    vi.doMock("../convert_payload_to_html", () => ({
      default: () => {
        return [document.createElement("b"), document.createTextNode("Hello")];
      },
    }));

    const toHTML = (await vi.importActual("../to_html")).default as typeof IToHtml;
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

  it("should apply both the global style element and a given class", async () => {
    vi.doMock("../convert_payload_to_html", () => ({
      default: () => {
        return [document.createElement("b"), document.createTextNode("Hello")];
      },
    }));

    const toHTML = (await vi.importActual("../to_html")).default as typeof IToHtml;
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

  it("should return default element if no payload", async () => {
    vi.doMock("../convert_payload_to_html", () => ({
      default: () => {
        return [];
      },
    }));

    const toHTML = (await vi.importActual("../to_html")).default as typeof IToHtml;
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
