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

describe("DASH Node Parsers - Initialization", () => {
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

    const parseInitialization = require("../Initialization").default;
    const element1 = new DOMParser()
      .parseFromString("<Foo />", "text/xml")
      .childNodes[0] as Element;
    expect(parseInitialization(element1)).toEqual({});

    const element2 = new DOMParser()
      .parseFromString("<Foo test=\"\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseInitialization(element2)).toEqual({});

    expect(utilsSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    utilsSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("should correctly parse an element with a well-formed `range` attribute", () => {
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

    const parseInitialization = require("../Initialization").default;
    const element1 = new DOMParser()
      .parseFromString("<Foo range=\"a\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseInitialization(element1)).toEqual({ range: [0, 1] });

    expect(utilsSpy).toHaveBeenCalledTimes(1);
    expect(utilsSpy).toHaveBeenCalledWith("a");

    const element2 = new DOMParser()
      .parseFromString("<Foo range=\"\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseInitialization(element2)).toEqual({ range: [0, 1] });

    expect(utilsSpy).toHaveBeenCalledTimes(2);
    expect(utilsSpy).toHaveBeenCalledWith("");

    expect(logSpy).not.toHaveBeenCalled();
    utilsSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("should correctly parse an element with an incorrect `range` attribute", () => {
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

    const parseInitialization = require("../Initialization").default;
    const element1 = new DOMParser()
      .parseFromString("<Foo range=\"a\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseInitialization(element1)).toEqual({});

    expect(utilsSpy).toHaveBeenCalledTimes(1);
    expect(utilsSpy).toHaveBeenCalledWith("a");
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith("DASH: invalid range (\"a\")");

    const element2 = new DOMParser()
      .parseFromString("<Foo range=\"\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseInitialization(element2)).toEqual({});

    expect(utilsSpy).toHaveBeenCalledTimes(2);
    expect(utilsSpy).toHaveBeenCalledWith("");
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith("DASH: invalid range (\"\")");

    utilsSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("should correctly parse an element with a sourceURL attribute", () => {
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

    const parseInitialization = require("../Initialization").default;
    const element1 = new DOMParser()
      .parseFromString("<Foo sourceURL=\"a\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseInitialization(element1)).toEqual({ media: "a" });

    expect(utilsSpy).not.toHaveBeenCalled();

    const element2 = new DOMParser()
      .parseFromString("<Foo sourceURL=\"\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseInitialization(element2)).toEqual({ media: "" });

    expect(utilsSpy).not.toHaveBeenCalled();

    expect(logSpy).not.toHaveBeenCalled();
    utilsSpy.mockRestore();
    logSpy.mockRestore();
  });

  /* tslint:disable max-line-length */
  it("should correctly parse an element with both a sourceURL and range attributes", () => {
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

    const parseInitialization = require("../Initialization").default;
    const element1 = new DOMParser()
      .parseFromString("<Foo sourceURL=\"a\" range=\"4\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseInitialization(element1)).toEqual({ media: "a", range: [0, 1] });

    expect(utilsSpy).toHaveBeenCalledTimes(1);
    expect(utilsSpy).toHaveBeenCalledWith("4");

    expect(logSpy).not.toHaveBeenCalled();
    utilsSpy.mockRestore();
    logSpy.mockRestore();
  });
});
