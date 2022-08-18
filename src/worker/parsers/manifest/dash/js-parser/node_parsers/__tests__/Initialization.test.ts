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

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

describe("DASH Node Parsers - Initialization", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should correctly parse an element with no known attribute", () => {
    const log = { __esModule: true as const,
                  default: { warn: () => null } };
    jest.mock("../../../../../../../common/log", () => log);
    const mockLog = jest.spyOn(log.default, "warn");

    const parseInitialization = jest.requireActual("../Initialization").default;
    const element1 = new DOMParser()
      .parseFromString("<Foo />", "text/xml")
      .childNodes[0] as Element;
    expect(parseInitialization(element1)).toEqual([{}, []]);

    const element2 = new DOMParser()
      .parseFromString("<Foo test=\"\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseInitialization(element2)).toEqual([{}, []]);

    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });

  it("should correctly parse an element with a well-formed `range` attribute", () => {
    const log = { __esModule: true as const,
                  default: { warn: () => null } };
    jest.mock("../../../../../../../common/log", () => log);
    const mockLog = jest.spyOn(log.default, "warn");

    const parseInitialization = jest.requireActual("../Initialization").default;
    const element1 = new DOMParser()
      .parseFromString("<Foo range=\"0-1\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseInitialization(element1)).toEqual([{ range: [0, 1] }, []]);

    const element2 = new DOMParser()
      .parseFromString("<Foo range=\"100-1000\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseInitialization(element2)).toEqual([{ range: [100, 1000] }, []]);

    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });

  it("should correctly parse an element with an incorrect `range` attribute", () => {
    const log = { __esModule: true as const,
                  default: { warn: () => null } };
    jest.mock("../../../../../../../common/log", () => log);
    const mockLog = jest.spyOn(log.default, "warn").mockImplementation(jest.fn());

    const parseInitialization = jest.requireActual("../Initialization").default;
    const MPDError = jest.requireActual("../utils").MPDError;
    const element1 = new DOMParser()
      .parseFromString("<Foo range=\"a\" />", "text/xml")
      .childNodes[0] as Element;
    const error1 = new MPDError("`range` property has an unrecognized format \"a\"");
    expect(parseInitialization(element1)).toEqual([{}, [error1]]);

    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith(error1.message);

    const element2 = new DOMParser()
      .parseFromString("<Foo range=\"\" />", "text/xml")
      .childNodes[0] as Element;
    const error2 = new MPDError("`range` property has an unrecognized format \"\"");
    expect(parseInitialization(element2)).toEqual([{}, [error2]]);

    expect(mockLog).toHaveBeenCalledTimes(2);
    expect(mockLog).toHaveBeenCalledWith(error2.message);

    mockLog.mockRestore();
  });

  it("should correctly parse an element with a sourceURL attribute", () => {
    const log = { __esModule: true as const,
                  default: { warn: () => null } };
    jest.mock("../../../../../../../common/log", () => log);
    const mockLog = jest.spyOn(log.default, "warn");

    const parseInitialization = jest.requireActual("../Initialization").default;
    const element1 = new DOMParser()
      .parseFromString("<Foo sourceURL=\"a\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseInitialization(element1)).toEqual([{ media: "a" }, []]);

    const element2 = new DOMParser()
      .parseFromString("<Foo sourceURL=\"\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseInitialization(element2)).toEqual([{ media: "" }, []]);

    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });

  /* eslint-disable max-len */
  it("should correctly parse an element with both a sourceURL and range attributes", () => {
  /* eslint-enable max-len */
    const log = { __esModule: true as const,
                  default: { warn: () => null } };
    jest.mock("../../../../../../../common/log", () => log);
    const mockLog = jest.spyOn(log.default, "warn");

    const parseInitialization = jest.requireActual("../Initialization").default;
    const element1 = new DOMParser()
      .parseFromString("<Foo sourceURL=\"a\" range=\"4-10\" />", "text/xml")
      .childNodes[0] as Element;
    expect(parseInitialization(element1)).toEqual([ { media: "a", range: [4, 10] },
                                                    [] ]);

    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });
});
