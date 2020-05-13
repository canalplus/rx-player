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

/* tslint:disable no-unsafe-any */
describe("DASH Node Parsers - SegmentURL", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should correctly parse an element with no known attribute", () => {
    const log = { __esModule: true,
                  default: { warn: () => null } };
    jest.mock("../../../../../log", () => log);
    const logSpy = jest.spyOn(log.default, "warn");

    const parseSegmentURL = require("../SegmentURL").default;
    const element1 = new DOMParser()
      .parseFromString("<Foo />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element1)).toEqual([{}, []]);

    const element2 = new DOMParser()
      .parseFromString("<Foo test=\"\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element2)).toEqual([{}, []]);

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  /* tslint:disable max-line-length */
  it("should correctly parse an element with a well-formed `mediaRange` attribute", () => {
  /* tslint:enable max-line-length */
    const log = { __esModule: true,
                  default: { warn: () => null } };
    jest.mock("../../../../../log", () => log);
    const logSpy = jest.spyOn(log.default, "warn");

    const parseSegmentURL = require("../SegmentURL").default;
    const element1 = new DOMParser()
      .parseFromString("<Foo mediaRange=\"10-100\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element1)).toEqual([{ mediaRange: [10, 100] }, []]);

    const element2 = new DOMParser()
      .parseFromString("<Foo mediaRange=\"0-1\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element2)).toEqual([{ mediaRange: [0, 1] }, []]);

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("should correctly parse an element with an incorrect `mediaRange` attribute", () => {
    const log = { __esModule: true,
                  default: { warn: () => null } };
    jest.mock("../../../../../log", () => log);
    const logSpy = jest.spyOn(log.default, "warn").mockImplementation(jest.fn());

    const parseSegmentURL = require("../SegmentURL").default;
    const MPDError = require("../utils").MPDError;
    const element1 = new DOMParser()
      .parseFromString("<Foo mediaRange=\"a\" />", "text/xml")
      .childNodes[0] as Element;
    const error1 = new MPDError(
      "`mediaRange` property has an unrecognized format \"a\""
    );
    expect(parseSegmentURL(element1)).toEqual([{}, [error1]]);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(error1.message);

    const element2 = new DOMParser()
      .parseFromString("<Foo mediaRange=\"\" />", "text/xml")
      .childNodes[0] as Element;
    const error2 = new MPDError(
      "`mediaRange` property has an unrecognized format \"\""
    );
    expect(parseSegmentURL(element2)).toEqual([{}, [error2]]);

    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith(error2.message);

    logSpy.mockRestore();
  });

  /* tslint:disable max-line-length */
  it("should correctly parse an element with a well-formed `indexRange` attribute", () => {
  /* tslint:enable max-line-length */
    const log = {
      __esModule: true,
      default: { warn: () => null },
    };
    jest.mock("../../../../../log", () => log);
    const logSpy = jest.spyOn(log.default, "warn");

    const parseSegmentURL = require("../SegmentURL").default;
    const element1 = new DOMParser()
      .parseFromString("<Foo indexRange=\"0-100\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element1)).toEqual([{ indexRange: [0, 100] }, []]);

    const element2 = new DOMParser()
      .parseFromString("<Foo indexRange=\"72-47\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element2)).toEqual([{ indexRange: [72, 47] }, []]);

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("should correctly parse an element with an incorrect `indexRange` attribute", () => {
    const log = { __esModule: true,
                  default: { warn: () => null } };
    jest.mock("../../../../../log", () => log);
    const logSpy = jest.spyOn(log.default, "warn").mockImplementation(jest.fn());

    const parseSegmentURL = require("../SegmentURL").default;
    const MPDError = require("../utils").MPDError;
    const element1 = new DOMParser()
      .parseFromString("<Foo indexRange=\"a\" />", "text/xml")
      .childNodes[0] as Element;
    const error1 = new MPDError(
      "`indexRange` property has an unrecognized format \"a\""
    );
    expect(parseSegmentURL(element1)).toEqual([{}, [error1]]);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(error1.message);

    const element2 = new DOMParser()
      .parseFromString("<Foo indexRange=\"\" />", "text/xml")
      .childNodes[0] as Element;
    const error2 = new MPDError(
      "`indexRange` property has an unrecognized format \"\""
    );
    expect(parseSegmentURL(element2)).toEqual([{}, [error2]]);

    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith(error2.message);

    logSpy.mockRestore();
  });

  it("should correctly parse an element with a media attribute", () => {
    const log = { __esModule: true,
                  default: { warn: () => null } };
    jest.mock("../../../../../log", () => log);
    const logSpy = jest.spyOn(log.default, "warn");

    const parseSegmentURL = require("../SegmentURL").default;
    const element1 = new DOMParser()
      .parseFromString("<Foo media=\"a\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element1)).toEqual([{ media: "a" }, []]);

    const element2 = new DOMParser()
      .parseFromString("<Foo media=\"\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element2)).toEqual([{ media: "" }, []]);

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("should correctly parse an element with a index attribute", () => {
    const log = { __esModule: true,
                  default: { warn: () => null } };
    jest.mock("../../../../../log", () => log);
    const logSpy = jest.spyOn(log.default, "warn");

    const parseSegmentURL = require("../SegmentURL").default;
    const element1 = new DOMParser()
      .parseFromString("<Foo index=\"a\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element1)).toEqual([{ index: "a" }, []]);

    const element2 = new DOMParser()
      .parseFromString("<Foo index=\"\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseSegmentURL(element2)).toEqual([{ index: "" }, []]);

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
/* tslint:enable no-unsafe-any */
