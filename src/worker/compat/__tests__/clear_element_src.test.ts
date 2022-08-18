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

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import arrayFindIndex from "../../../common/utils/array_find_index";

describe("Compat - clearElementSrc", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should empty the src and remove the Attribute for a given Element", () => {
    const fakeElement = {
      src: "foo",
      removeAttribute() { return null; },
    };
    const clearElementSrc = jest.requireActual("../clear_element_src").default;

    const spyRemoveAttribute = jest.spyOn(fakeElement, "removeAttribute");
    clearElementSrc(fakeElement);
    expect(fakeElement.src).toBe("");
    expect(spyRemoveAttribute).toHaveBeenCalledTimes(1);
    expect(spyRemoveAttribute).toHaveBeenCalledWith("src");
  });

  it("should throw if failed to remove the Attribute for a given Element", () => {
    const fakeElement = {
      src: "foo",
      removeAttribute() { throw new Error("Oups, can't remove attribute."); },
    };
    const clearElementSrc = jest.requireActual("../clear_element_src").default;
    const spyRemoveAttribute = jest.spyOn(fakeElement, "removeAttribute");

    expect(() => clearElementSrc(fakeElement))
      .toThrowError("Oups, can't remove attribute.");
    expect(fakeElement.src).toBe("");
    expect(spyRemoveAttribute).toHaveBeenCalledTimes(1);
  });

  it("should disable text tracks and remove childs", () => {
    const fakeElement = {
      src: "foo",
      removeAttribute() { return null; },
      textTracks: [
        { mode: "showing" },
        { mode: "showing" },
      ],
      childNodes: [
        { nodeName: "audio" },
        { nodeName: "track" },
        { nodeName: "track" },
      ],
      hasChildNodes: () => true,
      removeChild: (node: { nodeName: string }) => {
        const { childNodes } = fakeElement;
        const idx = arrayFindIndex(childNodes, (n) => n.nodeName === node.nodeName);
        childNodes.splice(idx, 1);
      },
    };

    const clearElementSrc = jest.requireActual("../clear_element_src").default;

    const spyRemoveAttribute = jest.spyOn(fakeElement, "removeAttribute");
    const spyHasChildNodes = jest.spyOn(fakeElement, "hasChildNodes");
    const spyRemoveChild = jest.spyOn(fakeElement, "removeChild");

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

  it("should log when failed to remove text track child node", () => {
    const fakeElement = {
      src: "foo",
      removeAttribute() { return null; },
      textTracks: [
        { mode: "showing" },
        { mode: "showing" },
      ],
      childNodes: [
        { nodeName: "audio" },
        { nodeName: "track" },
        { nodeName: "track" },
      ],
      hasChildNodes: () => true,
      removeChild: () => {
        throw new Error();
      },
    };

    const mockLogWarn = jest.fn((message) => message);
    jest.mock("../../../common/log", () => ({
      __esModule: true as const,
      default: { warn: mockLogWarn },
    }));
    const clearElementSrc = jest.requireActual("../clear_element_src").default;

    const spyRemoveAttribute = jest.spyOn(fakeElement, "removeAttribute");
    const spyHasChildNodes = jest.spyOn(fakeElement, "hasChildNodes");
    const spyRemoveChild = jest.spyOn(fakeElement, "removeChild");

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
    expect(mockLogWarn)
      .toHaveBeenCalledWith("Compat: Could not remove text track child from element.");
  });

  it("should not remove audio child node if on firefox and no text tracks", () => {
    const fakeElement = {
      src: "foo",
      removeAttribute() { return null; },
      textTracks: [],
      childNodes: [
        { nodeName: "audio" },
      ],
      hasChildNodes: () => true,
      removeChild: () => null,
    };

    const clearElementSrc = jest.requireActual("../clear_element_src").default;

    const spyRemoveAttribute = jest.spyOn(fakeElement, "removeAttribute");
    const spyHasChildNodes = jest.spyOn(fakeElement, "hasChildNodes");
    const spyRemoveChild = jest.spyOn(fakeElement, "removeChild");

    clearElementSrc(fakeElement);

    expect(fakeElement.src).toBe("");
    expect(fakeElement.childNodes).toEqual([{ nodeName: "audio" }]);
    expect(spyRemoveAttribute).toHaveBeenCalledTimes(1);
    expect(spyRemoveAttribute).toHaveBeenCalledWith("src");
    expect(spyHasChildNodes).toHaveBeenCalledTimes(1);
    expect(spyRemoveChild).not.toHaveBeenCalled();
  });

  it("should not handle text tracks nodes is has no child nodes", () => {
    const fakeElement = {
      src: "foo",
      removeAttribute() { return null; },
      textTracks: [],
      childNodes: [],
      hasChildNodes: () => false,
      removeChild: () => null,
    };

    const clearElementSrc = jest.requireActual("../clear_element_src").default;

    const spyRemoveAttribute = jest.spyOn(fakeElement, "removeAttribute");
    const spyHasChildNodes = jest.spyOn(fakeElement, "hasChildNodes");
    const spyRemoveChild = jest.spyOn(fakeElement, "removeChild");

    clearElementSrc(fakeElement);

    expect(fakeElement.src).toBe("");
    expect(fakeElement.childNodes).toEqual([]);
    expect(spyRemoveAttribute).toHaveBeenCalledTimes(1);
    expect(spyRemoveAttribute).toHaveBeenCalledWith("src");
    expect(spyHasChildNodes).toHaveBeenCalledTimes(1);
    expect(spyRemoveChild).not.toHaveBeenCalled();
  });

  it("should not throw if the textTracks attribute is `null`", () => {
    const fakeElement = {
      src: "foo",
      removeAttribute() { return null; },
      textTracks: null,
      childNodes: [],
      hasChildNodes: () => false,
      removeChild: () => null,
    };

    const clearElementSrc = jest.requireActual("../clear_element_src").default;

    const spyRemoveAttribute = jest.spyOn(fakeElement, "removeAttribute");
    const spyHasChildNodes = jest.spyOn(fakeElement, "hasChildNodes");
    const spyRemoveChild = jest.spyOn(fakeElement, "removeChild");

    clearElementSrc(fakeElement);

    expect(fakeElement.src).toBe("");
    expect(fakeElement.childNodes).toEqual([]);
    expect(spyRemoveAttribute).toHaveBeenCalledTimes(1);
    expect(spyRemoveAttribute).toHaveBeenCalledWith("src");
    expect(spyHasChildNodes).toHaveBeenCalledTimes(0);
    expect(spyRemoveChild).not.toHaveBeenCalled();
  });

  it("should not throw if the textTracks attribute is `undefined`", () => {
    const fakeElement = {
      src: "foo",
      removeAttribute() { return null; },
      textTracks: undefined,
      childNodes: [],
      hasChildNodes: () => false,
      removeChild: () => null,
    };

    const clearElementSrc = jest.requireActual("../clear_element_src").default;

    const spyRemoveAttribute = jest.spyOn(fakeElement, "removeAttribute");
    const spyHasChildNodes = jest.spyOn(fakeElement, "hasChildNodes");
    const spyRemoveChild = jest.spyOn(fakeElement, "removeChild");

    clearElementSrc(fakeElement);

    expect(fakeElement.src).toBe("");
    expect(fakeElement.childNodes).toEqual([]);
    expect(spyRemoveAttribute).toHaveBeenCalledTimes(1);
    expect(spyRemoveAttribute).toHaveBeenCalledWith("src");
    expect(spyHasChildNodes).toHaveBeenCalledTimes(0);
    expect(spyRemoveChild).not.toHaveBeenCalled();
  });
});
