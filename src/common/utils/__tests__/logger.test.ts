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

/**
 * This file contains functions helping with TimeRanges management.
 *
 * For simplicity/performance reasons, many of those work with a simplified
 * "Range" object, which is an object with two keys:
 *   - start {Number}
 *   - end {Number}
 *
 * Those two corresponds to what is returned by the start and end methods of a
 * TimeRanges Object.
 *
 * You can convert from TimeRanges to Range object(s) with the getRange/
 * convertToRanges methods.
 */

import Logger from "../logger";

describe("utils - Logger", () => {
  it("should set a default logger level of \"NONE\"", () => {
    const logger = new Logger();
    expect(logger.getLevel()).toEqual("NONE");
  });

  it("should be able to change the logger level to \"ERROR\"", () => {
    const logger = new Logger();
    logger.setLevel("ERROR");
    expect(logger.getLevel()).toEqual("ERROR");
  });

  it("should be able to change the logger level to \"WARNING\"", () => {
    const logger = new Logger();
    logger.setLevel("WARNING");
    expect(logger.getLevel()).toEqual("WARNING");
  });

  it("should be able to change the logger level to \"INFO\"", () => {
    const logger = new Logger();
    logger.setLevel("INFO");
    expect(logger.getLevel()).toEqual("INFO");
  });

  it("should be able to change the logger level to \"DEBUG\"", () => {
    const logger = new Logger();
    logger.setLevel("DEBUG");
    expect(logger.getLevel()).toEqual("DEBUG");
  });

  it("should be able to update the logger level multiple times", () => {
    const logger = new Logger();
    logger.setLevel("DEBUG");
    expect(logger.getLevel()).toEqual("DEBUG");
    logger.setLevel("WARNING");
    expect(logger.getLevel()).toEqual("WARNING");
    logger.setLevel("ERROR");
    expect(logger.getLevel()).toEqual("ERROR");
    logger.setLevel("INFO");
    expect(logger.getLevel()).toEqual("INFO");
    logger.setLevel("WARNING");
    expect(logger.getLevel()).toEqual("WARNING");
    logger.setLevel("ERROR");
    expect(logger.getLevel()).toEqual("ERROR");
  });

  it("should default unrecognized logger levels to \"NONE\"", () => {
    const logger = new Logger();
    logger.setLevel("TOTO");
    expect(logger.getLevel()).toEqual("NONE");
    logger.setLevel("DEBUG"); // initialize to another thing than "NONE"
    logger.setLevel("TITI");
    expect(logger.getLevel()).toEqual("NONE");
  });

  it("should never call console.* functions if logger level is set to \"NONE\"", () => {
    const mockLog = jest.spyOn(console, "log").mockImplementation(jest.fn());
    const mockError = jest.spyOn(console, "error").mockImplementation(jest.fn());
    const mockWarn = jest.spyOn(console, "warn").mockImplementation(jest.fn());
    const mockInfo = jest.spyOn(console, "info").mockImplementation(jest.fn());
    const mockDebug = jest.spyOn(console, "debug").mockImplementation(jest.fn());

    const logger = new Logger();
    logger.error("test");
    logger.warn("test");
    logger.info("test");
    logger.debug("test");
    expect(mockLog).not.toHaveBeenCalled();
    expect(mockError).not.toHaveBeenCalled();
    expect(mockWarn).not.toHaveBeenCalled();
    expect(mockInfo).not.toHaveBeenCalled();
    expect(mockDebug).not.toHaveBeenCalled();
    mockLog.mockRestore();
    mockError.mockRestore();
    mockWarn.mockRestore();
    mockInfo.mockRestore();
    mockDebug.mockRestore();
  });

  it("should only call console.error if logger level is set to \"ERROR\"", () => {
    const mockLog = jest.spyOn(console, "log").mockImplementation(jest.fn());
    const mockError = jest.spyOn(console, "error").mockImplementation(jest.fn());
    const mockWarn = jest.spyOn(console, "warn").mockImplementation(jest.fn());
    const mockInfo = jest.spyOn(console, "info").mockImplementation(jest.fn());
    const mockDebug = jest.spyOn(console, "debug").mockImplementation(jest.fn());

    const logger = new Logger();
    logger.setLevel("ERROR");
    logger.error("test");
    logger.warn("test");
    logger.info("test");
    logger.debug("test");
    expect(mockLog).not.toHaveBeenCalled();
    expect(mockError).toHaveBeenCalled();
    expect(mockWarn).not.toHaveBeenCalled();
    expect(mockInfo).not.toHaveBeenCalled();
    expect(mockDebug).not.toHaveBeenCalled();
    mockLog.mockRestore();
    mockError.mockRestore();
    mockWarn.mockRestore();
    mockInfo.mockRestore();
    mockDebug.mockRestore();
  });

  it("should call console.{error,warn} if logger level is set to \"WARNING\"", () => {
    const mockLog = jest.spyOn(console, "log").mockImplementation(jest.fn());
    const mockError = jest.spyOn(console, "error").mockImplementation(jest.fn());
    const mockWarn = jest.spyOn(console, "warn").mockImplementation(jest.fn());
    const mockInfo = jest.spyOn(console, "info").mockImplementation(jest.fn());
    const mockDebug = jest.spyOn(console, "debug").mockImplementation(jest.fn());

    const logger = new Logger();
    logger.setLevel("WARNING");
    logger.error("test");
    logger.warn("test");
    logger.info("test");
    logger.debug("test");
    expect(mockLog).not.toHaveBeenCalled();
    expect(mockError).toHaveBeenCalled();
    expect(mockWarn).toHaveBeenCalled();
    expect(mockInfo).not.toHaveBeenCalled();
    expect(mockDebug).not.toHaveBeenCalled();
    mockLog.mockRestore();
    mockError.mockRestore();
    mockWarn.mockRestore();
    mockInfo.mockRestore();
    mockDebug.mockRestore();
  });

  it("should call console.{error,warn,info} if logger level is set to \"INFO\"", () => {
    const mockLog = jest.spyOn(console, "log").mockImplementation(jest.fn());
    const mockError = jest.spyOn(console, "error").mockImplementation(jest.fn());
    const mockWarn = jest.spyOn(console, "warn").mockImplementation(jest.fn());
    const mockInfo = jest.spyOn(console, "info").mockImplementation(jest.fn());
    const mockDebug = jest.spyOn(console, "debug").mockImplementation(jest.fn());

    const logger = new Logger();
    logger.setLevel("INFO");
    logger.error("test");
    logger.warn("test");
    logger.info("test");
    logger.debug("test");
    expect(mockLog).not.toHaveBeenCalled();
    expect(mockError).toHaveBeenCalled();
    expect(mockWarn).toHaveBeenCalled();
    expect(mockInfo).toHaveBeenCalled();
    expect(mockDebug).not.toHaveBeenCalled();
    mockLog.mockRestore();
    mockError.mockRestore();
    mockWarn.mockRestore();
    mockInfo.mockRestore();
    mockDebug.mockRestore();
  });

  /* eslint-disable max-len */
  it("should call console.{error,warn,info, log} if logger level is set to \"DEBUG\"", () => {
  /* eslint-enable max-len */
    const mockLog = jest.spyOn(console, "log").mockImplementation(jest.fn());
    const mockError = jest.spyOn(console, "error").mockImplementation(jest.fn());
    const mockWarn = jest.spyOn(console, "warn").mockImplementation(jest.fn());
    const mockInfo = jest.spyOn(console, "info").mockImplementation(jest.fn());
    const mockDebug = jest.spyOn(console, "debug").mockImplementation(jest.fn());

    const logger = new Logger();
    logger.setLevel("DEBUG");
    logger.error("test");
    logger.warn("test");
    logger.info("test");
    logger.debug("test");
    expect(mockLog).toHaveBeenCalled();
    expect(mockError).toHaveBeenCalled();
    expect(mockWarn).toHaveBeenCalled();
    expect(mockInfo).toHaveBeenCalled();
    expect(mockDebug).not.toHaveBeenCalled();
    mockLog.mockRestore();
    mockError.mockRestore();
    mockWarn.mockRestore();
    mockInfo.mockRestore();
    mockDebug.mockRestore();
  });
});
