import { describe, beforeEach, it, expect, vi } from "vitest";
import arrayFindIndex from "../../utils/array_find_index";
import type { IMediaElement } from "../browser_compatibility_types";
import type IClearElementSrc from "../clear_element_src";

describe("Compat - clearElementSrc", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should empty the src and remove the Attribute for a given Element", async () => {
    const fakeElement = {
      src: "foo",
      removeAttribute() {
        return null;
      },
    } as unknown as IMediaElement;
    const clearElementSrc = (await vi.importActual("../clear_element_src"))
      .default as typeof IClearElementSrc;

    const spyRemoveAttribute = vi.spyOn(fakeElement, "removeAttribute");
    clearElementSrc(fakeElement);
    expect(fakeElement.src).toBe("");
    expect(spyRemoveAttribute).toHaveBeenCalledTimes(1);
    expect(spyRemoveAttribute).toHaveBeenCalledWith("src");
  });

  it("should throw if failed to remove the Attribute for a given Element", async () => {
    const fakeElement = {
      src: "foo",
      removeAttribute() {
        throw new Error("Oups, can't remove attribute.");
      },
    } as unknown as IMediaElement;
    const clearElementSrc = (await vi.importActual("../clear_element_src"))
      .default as typeof IClearElementSrc;
    const spyRemoveAttribute = vi.spyOn(fakeElement, "removeAttribute");

    expect(() => clearElementSrc(fakeElement)).toThrowError(
      "Oups, can't remove attribute.",
    );
    expect(fakeElement.src).toBe("");
    expect(spyRemoveAttribute).toHaveBeenCalledTimes(1);
  });

  it("should disable text tracks and remove childs", async () => {
    const fakeElement = {
      src: "foo",
      removeAttribute() {
        return null;
      },
      textTracks: [{ mode: "showing" }, { mode: "showing" }],
      childNodes: [{ nodeName: "audio" }, { nodeName: "track" }, { nodeName: "track" }],
      hasChildNodes: () => true,
      removeChild: (node: Node) => {
        const childNodes = fakeElement.childNodes as Node[];
        const idx = arrayFindIndex(childNodes, (n) => n.nodeName === node.nodeName);
        childNodes.splice(idx, 1);
      },
    } as unknown as IMediaElement;

    const clearElementSrc = (await vi.importActual("../clear_element_src"))
      .default as typeof IClearElementSrc;

    const spyRemoveAttribute = vi.spyOn(fakeElement, "removeAttribute");
    const spyHasChildNodes = vi.spyOn(fakeElement, "hasChildNodes");
    const spyRemoveChild = vi.spyOn(fakeElement, "removeChild");

    clearElementSrc(fakeElement);

    expect(fakeElement.src).toBe("");
    expect(fakeElement.textTracks[0].mode).toBe("disabled");
    expect(fakeElement.textTracks[1].mode).toBe("disabled");
    expect(fakeElement.childNodes).toEqual([{ nodeName: "audio" }]);
    expect(spyRemoveAttribute).toHaveBeenCalledTimes(1);
    expect(spyRemoveAttribute).toHaveBeenCalledWith("src");
    expect(spyHasChildNodes).toHaveBeenCalledTimes(1);
    expect(spyRemoveChild).toHaveBeenCalledTimes(2);
    expect(spyRemoveChild).toHaveBeenCalledWith({ nodeName: "track" });
  });

  it("should log when failed to remove text track child node", async () => {
    const fakeElement = {
      src: "foo",
      removeAttribute() {
        return null;
      },
      textTracks: [{ mode: "showing" }, { mode: "showing" }],
      childNodes: [{ nodeName: "audio" }, { nodeName: "track" }, { nodeName: "track" }],
      hasChildNodes: () => true,
      removeChild: () => {
        throw new Error();
      },
    } as unknown as IMediaElement;

    const mockLogWarn = vi.fn((message: unknown) => message);
    vi.doMock("../../log", () => ({
      default: { warn: mockLogWarn },
    }));
    const clearElementSrc = (await vi.importActual("../clear_element_src"))
      .default as typeof IClearElementSrc;

    const spyRemoveAttribute = vi.spyOn(fakeElement, "removeAttribute");
    const spyHasChildNodes = vi.spyOn(fakeElement, "hasChildNodes");
    const spyRemoveChild = vi.spyOn(fakeElement, "removeChild");

    clearElementSrc(fakeElement);

    expect(fakeElement.src).toBe("");
    expect(fakeElement.textTracks[0].mode).toBe("disabled");
    expect(fakeElement.textTracks[1].mode).toBe("disabled");
    expect(fakeElement.childNodes).toEqual([
      { nodeName: "audio" },
      { nodeName: "track" },
      { nodeName: "track" },
    ]);
    expect(spyRemoveAttribute).toHaveBeenCalledTimes(1);
    expect(spyRemoveAttribute).toHaveBeenCalledWith("src");
    expect(spyHasChildNodes).toHaveBeenCalledTimes(1);
    expect(spyRemoveChild).toHaveBeenCalledTimes(2);
    expect(mockLogWarn).toHaveBeenCalledTimes(2);
    expect(mockLogWarn).toHaveBeenCalledWith(
      "Compat: Could not remove text track child from element.",
    );
  });

  it("should not remove audio child node if on firefox and no text tracks", async () => {
    const fakeElement = {
      src: "foo",
      removeAttribute() {
        return null;
      },
      textTracks: [],
      childNodes: [{ nodeName: "audio" }],
      hasChildNodes: () => true,
      removeChild: () => null,
    } as unknown as IMediaElement;

    const clearElementSrc = (await vi.importActual("../clear_element_src"))
      .default as typeof IClearElementSrc;

    const spyRemoveAttribute = vi.spyOn(fakeElement, "removeAttribute");
    const spyHasChildNodes = vi.spyOn(fakeElement, "hasChildNodes");
    const spyRemoveChild = vi.spyOn(fakeElement, "removeChild");

    clearElementSrc(fakeElement);

    expect(fakeElement.src).toBe("");
    expect(fakeElement.childNodes).toEqual([{ nodeName: "audio" }]);
    expect(spyRemoveAttribute).toHaveBeenCalledTimes(1);
    expect(spyRemoveAttribute).toHaveBeenCalledWith("src");
    expect(spyHasChildNodes).toHaveBeenCalledTimes(1);
    expect(spyRemoveChild).not.toHaveBeenCalled();
  });

  it("should not handle text tracks nodes is has no child nodes", async () => {
    const fakeElement = {
      src: "foo",
      removeAttribute() {
        return null;
      },
      textTracks: [],
      childNodes: [],
      hasChildNodes: () => false,
      removeChild: () => null,
    } as unknown as IMediaElement;

    const clearElementSrc = (await vi.importActual("../clear_element_src"))
      .default as typeof IClearElementSrc;

    const spyRemoveAttribute = vi.spyOn(fakeElement, "removeAttribute");
    const spyHasChildNodes = vi.spyOn(fakeElement, "hasChildNodes");
    const spyRemoveChild = vi.spyOn(fakeElement, "removeChild");

    clearElementSrc(fakeElement);

    expect(fakeElement.src).toBe("");
    expect(fakeElement.childNodes).toEqual([]);
    expect(spyRemoveAttribute).toHaveBeenCalledTimes(1);
    expect(spyRemoveAttribute).toHaveBeenCalledWith("src");
    expect(spyHasChildNodes).toHaveBeenCalledTimes(1);
    expect(spyRemoveChild).not.toHaveBeenCalled();
  });

  it("should not throw if the textTracks attribute is `null`", async () => {
    const fakeElement = {
      src: "foo",
      removeAttribute() {
        return null;
      },
      textTracks: null,
      childNodes: [],
      hasChildNodes: () => false,
      removeChild: () => null,
    } as unknown as IMediaElement;

    const clearElementSrc = (await vi.importActual("../clear_element_src"))
      .default as typeof IClearElementSrc;

    const spyRemoveAttribute = vi.spyOn(fakeElement, "removeAttribute");
    const spyHasChildNodes = vi.spyOn(fakeElement, "hasChildNodes");
    const spyRemoveChild = vi.spyOn(fakeElement, "removeChild");

    clearElementSrc(fakeElement);

    expect(fakeElement.src).toBe("");
    expect(fakeElement.childNodes).toEqual([]);
    expect(spyRemoveAttribute).toHaveBeenCalledTimes(1);
    expect(spyRemoveAttribute).toHaveBeenCalledWith("src");
    expect(spyHasChildNodes).toHaveBeenCalledTimes(0);
    expect(spyRemoveChild).not.toHaveBeenCalled();
  });

  it("should not throw if the textTracks attribute is `undefined`", async () => {
    const fakeElement = {
      src: "foo",
      removeAttribute() {
        return null;
      },
      textTracks: undefined,
      childNodes: [],
      hasChildNodes: () => false,
      removeChild: () => null,
    } as unknown as IMediaElement;

    const clearElementSrc = (await vi.importActual("../clear_element_src"))
      .default as typeof IClearElementSrc;

    const spyRemoveAttribute = vi.spyOn(fakeElement, "removeAttribute");
    const spyHasChildNodes = vi.spyOn(fakeElement, "hasChildNodes");
    const spyRemoveChild = vi.spyOn(fakeElement, "removeChild");

    clearElementSrc(fakeElement);

    expect(fakeElement.src).toBe("");
    expect(fakeElement.childNodes).toEqual([]);
    expect(spyRemoveAttribute).toHaveBeenCalledTimes(1);
    expect(spyRemoveAttribute).toHaveBeenCalledWith("src");
    expect(spyHasChildNodes).toHaveBeenCalledTimes(0);
    expect(spyRemoveChild).not.toHaveBeenCalled();
  });
});
