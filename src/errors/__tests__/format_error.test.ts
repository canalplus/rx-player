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
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

describe("errors - formatError", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should just return the error if it is a Custom Error", () => {
    jest.mock("../is_known_error", () => ({ __esModule: true as const,
                                            default: () => true }));
    const formatError = jest.requireActual("../format_error").default;
    const error1 = new Error("Aaaaaa");
    expect(formatError(error1, { defaultCode: "toto",
                                 defaultReason: "a" })).toBe(error1);
  });

  it("should stringify error if it is an Error but not a Custom Error", () => {
    jest.mock("../is_known_error", () => ({ __esModule: true as const,
                                            default: () => false }));
    const OtherError = jest.requireActual("../other_error").default;
    const formatError = jest.requireActual("../format_error").default;
    const error1 = new Error("Abcdef");
    const formattedError = formatError(error1, { defaultCode: "toto",
                                                 defaultReason: "a" });
    expect(formattedError).toBeInstanceOf(OtherError);
    expect(formattedError.message).toBe("OtherError (toto) Error: Abcdef");
    expect(formattedError.code).toBe("toto");
  });

  it("should stringify error if it is an Error but not a Custom Error", () => {
    jest.mock("../is_known_error", () => ({ __esModule: true as const,
                                            default: () => false }));
    const OtherError = jest.requireActual("../other_error").default;
    const formatError = jest.requireActual("../format_error").default;
    const error1 = {};
    const formattedError = formatError(error1, { defaultCode: "toto",
                                                 defaultReason: "a" });
    expect(formattedError).toBeInstanceOf(OtherError);
    expect(formattedError.message).toBe("OtherError (toto) a");
    expect(formattedError.code).toBe("toto");
  });
});
