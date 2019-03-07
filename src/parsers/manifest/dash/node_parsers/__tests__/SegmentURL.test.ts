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

describe("DASH Node Parsers - SegmentURL", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should correctly parse an element with no known attribute", () => {
    const utils = {
      __esModule: true,
      parseByteRange: () => [0, 1],
    };
    const log = {
      __esModule: true,
      default: { warn: () => null },
    };
    jest.mock("../utils", () => utils);
    jest.mock("../../../../../log", () => log);
    const utilsSpy = jest.spyOn(utils, "parseByteRange");
    const logSpy = jest.spyOn(log.default, "warn");

    const parseSegmentURL = require("../SegmentURL").default;
    const element1 = new DOMParser()
      .parseFromString("<Foo />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element1)).toEqual({});

    const element2 = new DOMParser()
      .parseFromString("<Foo test=\"\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element2)).toEqual({});

    expect(utilsSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    utilsSpy.mockRestore();
    logSpy.mockRestore();
  });

  /* tslint:disable max-line-length */
  it("should correctly parse an element with a well-formed `mediaRange` attribute", () => {
  /* tslint:enable max-line-length */
    const utils = {
      __esModule: true,
      parseByteRange: () => [0, 1],
    };
    const log = {
      __esModule: true,
      default: { warn: () => null },
    };
    jest.mock("../utils", () => utils);
    jest.mock("../../../../../log", () => log);
    const utilsSpy = jest.spyOn(utils, "parseByteRange");
    const logSpy = jest.spyOn(log.default, "warn");

    const parseSegmentURL = require("../SegmentURL").default;
    const element1 = new DOMParser()
      .parseFromString("<Foo mediaRange=\"a\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element1)).toEqual({ mediaRange: [0, 1] });

    expect(utilsSpy).toHaveBeenCalledTimes(1);
    expect(utilsSpy).toHaveBeenCalledWith("a");

    const element2 = new DOMParser()
      .parseFromString("<Foo mediaRange=\"\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element2)).toEqual({ mediaRange: [0, 1] });

    expect(utilsSpy).toHaveBeenCalledTimes(2);
    expect(utilsSpy).toHaveBeenCalledWith("");

    expect(logSpy).not.toHaveBeenCalled();
    utilsSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("should correctly parse an element with an incorrect `mediaRange` attribute", () => {
    const utils = {
      __esModule: true,
      parseByteRange: () => null,
    };
    const log = {
      __esModule: true,
      default: { warn: () => null },
    };
    jest.mock("../utils", () => utils);
    jest.mock("../../../../../log", () => log);
    const utilsSpy = jest.spyOn(utils, "parseByteRange");
    const logSpy = jest.spyOn(log.default, "warn").mockImplementation(jest.fn());

    const parseSegmentURL = require("../SegmentURL").default;
    const element1 = new DOMParser()
      .parseFromString("<Foo mediaRange=\"a\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element1)).toEqual({});

    expect(utilsSpy).toHaveBeenCalledTimes(1);
    expect(utilsSpy).toHaveBeenCalledWith("a");
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith("DASH: invalid mediaRange (\"a\")");

    const element2 = new DOMParser()
      .parseFromString("<Foo mediaRange=\"\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element2)).toEqual({});

    expect(utilsSpy).toHaveBeenCalledTimes(2);
    expect(utilsSpy).toHaveBeenCalledWith("");
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith("DASH: invalid mediaRange (\"\")");

    utilsSpy.mockRestore();
    logSpy.mockRestore();
  });

  /* tslint:disable max-line-length */
  it("should correctly parse an element with a well-formed `indexRange` attribute", () => {
  /* tslint:enable max-line-length */
    const utils = {
      __esModule: true,
      parseByteRange: () => [0, 1],
    };
    const log = {
      __esModule: true,
      default: { warn: () => null },
    };
    jest.mock("../utils", () => utils);
    jest.mock("../../../../../log", () => log);
    const utilsSpy = jest.spyOn(utils, "parseByteRange");
    const logSpy = jest.spyOn(log.default, "warn");

    const parseSegmentURL = require("../SegmentURL").default;
    const element1 = new DOMParser()
      .parseFromString("<Foo indexRange=\"a\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element1)).toEqual({ indexRange: [0, 1] });

    expect(utilsSpy).toHaveBeenCalledTimes(1);
    expect(utilsSpy).toHaveBeenCalledWith("a");

    const element2 = new DOMParser()
      .parseFromString("<Foo indexRange=\"\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element2)).toEqual({ indexRange: [0, 1] });

    expect(utilsSpy).toHaveBeenCalledTimes(2);
    expect(utilsSpy).toHaveBeenCalledWith("");

    expect(logSpy).not.toHaveBeenCalled();
    utilsSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("should correctly parse an element with an incorrect `indexRange` attribute", () => {
    const utils = {
      __esModule: true,
      parseByteRange: () => null,
    };
    const log = {
      __esModule: true,
      default: { warn: () => null },
    };
    jest.mock("../utils", () => utils);
    jest.mock("../../../../../log", () => log);
    const utilsSpy = jest.spyOn(utils, "parseByteRange");
    const logSpy = jest.spyOn(log.default, "warn").mockImplementation(jest.fn());

    const parseSegmentURL = require("../SegmentURL").default;
    const element1 = new DOMParser()
      .parseFromString("<Foo indexRange=\"a\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element1)).toEqual({});

    expect(utilsSpy).toHaveBeenCalledTimes(1);
    expect(utilsSpy).toHaveBeenCalledWith("a");
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith("DASH: invalid indexRange (\"a\")");

    const element2 = new DOMParser()
      .parseFromString("<Foo indexRange=\"\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element2)).toEqual({});

    expect(utilsSpy).toHaveBeenCalledTimes(2);
    expect(utilsSpy).toHaveBeenCalledWith("");
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith("DASH: invalid indexRange (\"\")");

    utilsSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("should correctly parse an element with a media attribute", () => {
    const utils = {
      __esModule: true,
      parseByteRange: () => [0, 1],
    };
    const log = {
      __esModule: true,
      default: { warn: () => null },
    };
    jest.mock("../utils", () => utils);
    jest.mock("../../../../../log", () => log);
    const utilsSpy = jest.spyOn(utils, "parseByteRange");
    const logSpy = jest.spyOn(log.default, "warn");

    const parseSegmentURL = require("../SegmentURL").default;
    const element1 = new DOMParser()
      .parseFromString("<Foo media=\"a\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element1)).toEqual({ media: "a" });

    expect(utilsSpy).not.toHaveBeenCalled();

    const element2 = new DOMParser()
      .parseFromString("<Foo media=\"\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element2)).toEqual({ media: "" });

    expect(utilsSpy).not.toHaveBeenCalled();

    expect(logSpy).not.toHaveBeenCalled();
    utilsSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("should correctly parse an element with a index attribute", () => {
    const utils = {
      __esModule: true,
      parseByteRange: () => [0, 1],
    };
    const log = {
      __esModule: true,
      default: { warn: () => null },
    };
    jest.mock("../utils", () => utils);
    jest.mock("../../../../../log", () => log);
    const utilsSpy = jest.spyOn(utils, "parseByteRange");
    const logSpy = jest.spyOn(log.default, "warn");

    const parseSegmentURL = require("../SegmentURL").default;
    const element1 = new DOMParser()
      .parseFromString("<Foo index=\"a\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element1)).toEqual({ index: "a" });

    expect(utilsSpy).not.toHaveBeenCalled();

    const element2 = new DOMParser()
      .parseFromString("<Foo index=\"\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element2)).toEqual({ index: "" });

    expect(utilsSpy).not.toHaveBeenCalled();

    expect(logSpy).not.toHaveBeenCalled();
    utilsSpy.mockRestore();
    logSpy.mockRestore();
  });
});
