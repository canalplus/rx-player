import { describe, it, expect, vi } from "vitest";
import Logger from "../logger";

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

describe("utils - Logger", () => {
  it('should set a default logger level of "NONE"', () => {
    const logger = new Logger();
    expect(logger.getLevel()).toEqual("NONE");
  });

  it('should be able to change the logger level to "ERROR"', () => {
    const logger = new Logger();
    logger.setLevel("ERROR", "standard");
    expect(logger.getLevel()).toEqual("ERROR");
  });

  it('should be able to change the logger level to "WARNING"', () => {
    const logger = new Logger();
    logger.setLevel("WARNING", "standard");
    expect(logger.getLevel()).toEqual("WARNING");
  });

  it('should be able to change the logger level to "INFO"', () => {
    const logger = new Logger();
    logger.setLevel("INFO", "standard");
    expect(logger.getLevel()).toEqual("INFO");
  });

  it('should be able to change the logger level to "DEBUG"', () => {
    const logger = new Logger();
    logger.setLevel("DEBUG", "standard");
    expect(logger.getLevel()).toEqual("DEBUG");
  });

  it("should be able to update the logger level multiple times", () => {
    const logger = new Logger();
    logger.setLevel("DEBUG", "standard");
    expect(logger.getLevel()).toEqual("DEBUG");
    logger.setLevel("WARNING", "standard");
    expect(logger.getLevel()).toEqual("WARNING");
    logger.setLevel("ERROR", "standard");
    expect(logger.getLevel()).toEqual("ERROR");
    logger.setLevel("INFO", "standard");
    expect(logger.getLevel()).toEqual("INFO");
    logger.setLevel("WARNING", "standard");
    expect(logger.getLevel()).toEqual("WARNING");
    logger.setLevel("ERROR", "standard");
    expect(logger.getLevel()).toEqual("ERROR");
  });

  it('should default unrecognized logger levels to "NONE"', () => {
    const logger = new Logger();
    logger.setLevel("TOTO", "standard");
    expect(logger.getLevel()).toEqual("NONE");
    logger.setLevel("DEBUG", "standard"); // initialize to another thing than "NONE"
    logger.setLevel("TITI", "standard");
    expect(logger.getLevel()).toEqual("NONE");
  });

  it('should never call console.* functions if logger level is set to "NONE"', () => {
    const mockLog = vi.spyOn(console, "log").mockImplementation(vi.fn());
    const mockError = vi.spyOn(console, "error").mockImplementation(vi.fn());
    const mockWarn = vi.spyOn(console, "warn").mockImplementation(vi.fn());
    const mockInfo = vi.spyOn(console, "info").mockImplementation(vi.fn());
    const mockDebug = vi.spyOn(console, "debug").mockImplementation(vi.fn());

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

  it('should only call console.error if logger level is set to "ERROR"', () => {
    const mockLog = vi.spyOn(console, "log").mockImplementation(vi.fn());
    const mockError = vi.spyOn(console, "error").mockImplementation(vi.fn());
    const mockWarn = vi.spyOn(console, "warn").mockImplementation(vi.fn());
    const mockInfo = vi.spyOn(console, "info").mockImplementation(vi.fn());
    const mockDebug = vi.spyOn(console, "debug").mockImplementation(vi.fn());

    const logger = new Logger();
    logger.setLevel("ERROR", "standard");
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

  it('should call console.{error,warn} if logger level is set to "WARNING"', () => {
    const mockLog = vi.spyOn(console, "log").mockImplementation(vi.fn());
    const mockError = vi.spyOn(console, "error").mockImplementation(vi.fn());
    const mockWarn = vi.spyOn(console, "warn").mockImplementation(vi.fn());
    const mockInfo = vi.spyOn(console, "info").mockImplementation(vi.fn());
    const mockDebug = vi.spyOn(console, "debug").mockImplementation(vi.fn());

    const logger = new Logger();
    logger.setLevel("WARNING", "standard");
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

  it('should call console.{error,warn,info} if logger level is set to "INFO"', () => {
    const mockLog = vi.spyOn(console, "log").mockImplementation(vi.fn());
    const mockError = vi.spyOn(console, "error").mockImplementation(vi.fn());
    const mockWarn = vi.spyOn(console, "warn").mockImplementation(vi.fn());
    const mockInfo = vi.spyOn(console, "info").mockImplementation(vi.fn());
    const mockDebug = vi.spyOn(console, "debug").mockImplementation(vi.fn());

    const logger = new Logger();
    logger.setLevel("INFO", "standard");
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

  it('should call console.{error,warn,info, log} if logger level is set to "DEBUG"', () => {
    const mockLog = vi.spyOn(console, "log").mockImplementation(vi.fn());
    const mockError = vi.spyOn(console, "error").mockImplementation(vi.fn());
    const mockWarn = vi.spyOn(console, "warn").mockImplementation(vi.fn());
    const mockInfo = vi.spyOn(console, "info").mockImplementation(vi.fn());
    const mockDebug = vi.spyOn(console, "debug").mockImplementation(vi.fn());

    const logger = new Logger();
    logger.setLevel("DEBUG", "standard");
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

  it('should set a default logger format of "standard"', () => {
    const logger = new Logger();
    expect(logger.getFormat()).toEqual("standard");
  });

  it('should allow setting a format of "full" or "standard"', () => {
    const logger = new Logger();
    expect(logger.getFormat()).toEqual("standard");
    expect(logger.getLevel()).toEqual("NONE");

    logger.setLevel(logger.getLevel(), "full");
    expect(logger.getFormat()).toEqual("full");
    expect(logger.getLevel()).toEqual("NONE");

    logger.setLevel(logger.getLevel(), "standard");
    expect(logger.getFormat()).toEqual("standard");
    expect(logger.getLevel()).toEqual("NONE");
  });

  it('should fallback unknown values to "standard"', () => {
    const logger = new Logger();
    expect(logger.getFormat()).toEqual("standard");

    logger.setLevel(logger.getLevel(), "foo");
    expect(logger.getFormat()).toEqual("standard");

    logger.setLevel(logger.getLevel(), "full");
    expect(logger.getFormat()).toEqual("full");

    logger.setLevel(logger.getLevel(), "foo");
    expect(logger.getFormat()).toEqual("standard");
  });

  it("should be able to change both level and format", () => {
    const logger = new Logger();
    expect(logger.getFormat()).toEqual("standard");
    expect(logger.getLevel()).toEqual("NONE");

    logger.setLevel("foo", "foo");
    expect(logger.getFormat()).toEqual("standard");
    expect(logger.getLevel()).toEqual("NONE");

    logger.setLevel("foo", "full");
    expect(logger.getFormat()).toEqual("full");
    expect(logger.getLevel()).toEqual("NONE");

    logger.setLevel("foo", "foo");
    expect(logger.getFormat()).toEqual("standard");
    expect(logger.getLevel()).toEqual("NONE");

    logger.setLevel("INFO", "foo");
    expect(logger.getFormat()).toEqual("standard");
    expect(logger.getLevel()).toEqual("INFO");

    logger.setLevel("foo", "full");
    expect(logger.getFormat()).toEqual("full");
    expect(logger.getLevel()).toEqual("NONE");

    logger.setLevel("DEBUG", "standard");
    expect(logger.getFormat()).toEqual("standard");
    expect(logger.getLevel()).toEqual("DEBUG");

    logger.setLevel("ERROR", "full");
    expect(logger.getFormat()).toEqual("full");
    expect(logger.getLevel()).toEqual("ERROR");
  });

  it('should format logs with more information when `LogFormat` is set to "full"', () => {
    const logMsgs: unknown[][] = [];
    const errorMsgs: unknown[][] = [];
    const warningMsgs: unknown[][] = [];
    const infoMsgs: unknown[][] = [];
    const debugMsgs: unknown[][] = [];
    const mockLog = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logMsgs.push(args);
    });
    const mockError = vi
      .spyOn(console, "error")
      .mockImplementation((...args: unknown[]) => {
        errorMsgs.push(args);
      });
    const mockWarn = vi
      .spyOn(console, "warn")
      .mockImplementation((...args: unknown[]) => {
        warningMsgs.push(args);
      });
    const mockInfo = vi
      .spyOn(console, "info")
      .mockImplementation((...args: unknown[]) => {
        infoMsgs.push(args);
      });
    const mockDebug = vi
      .spyOn(console, "debug")
      .mockImplementation((...args: unknown[]) => {
        debugMsgs.push(args);
      });

    const logger = new Logger();

    logger.setLevel("DEBUG", "full");
    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(logMsgs).toHaveLength(1);
    expect(logMsgs[0]).toHaveLength(3);
    expect(logMsgs[0][0]).toMatch(/\d+\.\d\d/);
    expect(logMsgs[0][1]).toMatch("[Init]");
    expect(logMsgs[0][2]).toMatch(/Local-Date: \d+/);

    expect(mockError).not.toHaveBeenCalled();
    expect(mockWarn).not.toHaveBeenCalled();
    expect(mockInfo).not.toHaveBeenCalled();
    expect(mockDebug).not.toHaveBeenCalled();

    logger.error("teste", "e r");
    logger.warn("testw", "w a");
    logger.info("testi", "i n");
    logger.debug("testd", "d e");

    expect(mockError).toHaveBeenCalledTimes(1);
    expect(errorMsgs).toHaveLength(1);
    expect(errorMsgs[0]).toHaveLength(4);
    expect(errorMsgs[0][0]).toMatch(/\d+\.\d\d/);
    expect(errorMsgs[0][1]).toMatch("[error]");
    expect(errorMsgs[0][2]).toMatch("teste");
    expect(errorMsgs[0][3]).toMatch("e r");

    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(warningMsgs).toHaveLength(1);
    expect(warningMsgs[0]).toHaveLength(4);
    expect(warningMsgs[0][0]).toMatch(/\d+\.\d\d/);
    expect(warningMsgs[0][1]).toMatch("[warn]");
    expect(warningMsgs[0][2]).toMatch("testw");
    expect(warningMsgs[0][3]).toMatch("w a");

    expect(mockInfo).toHaveBeenCalledTimes(1);
    expect(infoMsgs).toHaveLength(1);
    expect(infoMsgs[0]).toHaveLength(4);
    expect(infoMsgs[0][0]).toMatch(/\d+\.\d\d/);
    expect(infoMsgs[0][1]).toMatch("[info]");
    expect(infoMsgs[0][2]).toMatch("testi");
    expect(infoMsgs[0][3]).toMatch("i n");

    expect(mockDebug).not.toHaveBeenCalled();

    expect(mockLog).toHaveBeenCalledTimes(2);
    expect(logMsgs[1]).toHaveLength(4);
    expect(logMsgs[1][0]).toMatch(/\d+\.\d\d/);
    expect(logMsgs[1][1]).toMatch("[log]");
    expect(logMsgs[1][2]).toMatch("testd");
    expect(logMsgs[1][3]).toMatch("d e");

    mockLog.mockRestore();
    mockError.mockRestore();
    mockWarn.mockRestore();
    mockInfo.mockRestore();
    mockDebug.mockRestore();
  });
});
