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
    const logSpy = jest.spyOn(console, "log").mockImplementation(jest.fn());
    const errorSpy = jest.spyOn(console, "error").mockImplementation(jest.fn());
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(jest.fn());
    const infoSpy = jest.spyOn(console, "info").mockImplementation(jest.fn());
    const debugSpy = jest.spyOn(console, "debug").mockImplementation(jest.fn());

    const logger = new Logger();
    logger.error("test");
    logger.warn("test");
    logger.info("test");
    logger.debug("test");
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(debugSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    infoSpy.mockRestore();
    debugSpy.mockRestore();
  });

  it("should only call console.error if logger level is set to \"ERROR\"", () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(jest.fn());
    const errorSpy = jest.spyOn(console, "error").mockImplementation(jest.fn());
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(jest.fn());
    const infoSpy = jest.spyOn(console, "info").mockImplementation(jest.fn());
    const debugSpy = jest.spyOn(console, "debug").mockImplementation(jest.fn());

    const logger = new Logger();
    logger.setLevel("ERROR");
    logger.error("test");
    logger.warn("test");
    logger.info("test");
    logger.debug("test");
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(debugSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    infoSpy.mockRestore();
    debugSpy.mockRestore();
  });

  it("should call console.{error,warn} if logger level is set to \"WARNING\"", () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(jest.fn());
    const errorSpy = jest.spyOn(console, "error").mockImplementation(jest.fn());
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(jest.fn());
    const infoSpy = jest.spyOn(console, "info").mockImplementation(jest.fn());
    const debugSpy = jest.spyOn(console, "debug").mockImplementation(jest.fn());

    const logger = new Logger();
    logger.setLevel("WARNING");
    logger.error("test");
    logger.warn("test");
    logger.info("test");
    logger.debug("test");
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(debugSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    infoSpy.mockRestore();
    debugSpy.mockRestore();
  });

  it("should call console.{error,warn,info} if logger level is set to \"INFO\"", () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(jest.fn());
    const errorSpy = jest.spyOn(console, "error").mockImplementation(jest.fn());
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(jest.fn());
    const infoSpy = jest.spyOn(console, "info").mockImplementation(jest.fn());
    const debugSpy = jest.spyOn(console, "debug").mockImplementation(jest.fn());

    const logger = new Logger();
    logger.setLevel("INFO");
    logger.error("test");
    logger.warn("test");
    logger.info("test");
    logger.debug("test");
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
    expect(debugSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    infoSpy.mockRestore();
    debugSpy.mockRestore();
  });

  /* eslint-disable max-len */
  it("should call console.{error,warn,info, log} if logger level is set to \"DEBUG\"", () => {
  /* eslint-enable max-len */
    const logSpy = jest.spyOn(console, "log").mockImplementation(jest.fn());
    const errorSpy = jest.spyOn(console, "error").mockImplementation(jest.fn());
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(jest.fn());
    const infoSpy = jest.spyOn(console, "info").mockImplementation(jest.fn());
    const debugSpy = jest.spyOn(console, "debug").mockImplementation(jest.fn());

    const logger = new Logger();
    logger.setLevel("DEBUG");
    logger.error("test");
    logger.warn("test");
    logger.info("test");
    logger.debug("test");
    expect(logSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
    expect(debugSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    infoSpy.mockRestore();
    debugSpy.mockRestore();
  });
});
