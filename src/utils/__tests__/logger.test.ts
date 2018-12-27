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

import { expect } from "chai";
import * as sinon from "sinon";
import Logger from "../logger";

describe("utils - Logger", () => {
  before(() => {
  });
  it("should set a default logger level of \"NONE\"", () => {
    const logger = new Logger();
    expect(logger.getLevel()).to.eql("NONE");
  });

  it("should be able to change the logger level to \"ERROR\"", () => {
    const logger = new Logger();
    logger.setLevel("ERROR");
    expect(logger.getLevel()).to.eql("ERROR");
  });

  it("should be able to change the logger level to \"WARNING\"", () => {
    const logger = new Logger();
    logger.setLevel("WARNING");
    expect(logger.getLevel()).to.eql("WARNING");
  });

  it("should be able to change the logger level to \"INFO\"", () => {
    const logger = new Logger();
    logger.setLevel("INFO");
    expect(logger.getLevel()).to.eql("INFO");
  });

  it("should be able to change the logger level to \"DEBUG\"", () => {
    const logger = new Logger();
    logger.setLevel("DEBUG");
    expect(logger.getLevel()).to.eql("DEBUG");
  });

  it("should be able to update the logger level multiple times", () => {
    const logger = new Logger();
    logger.setLevel("DEBUG");
    expect(logger.getLevel()).to.eql("DEBUG");
    logger.setLevel("WARNING");
    expect(logger.getLevel()).to.eql("WARNING");
    logger.setLevel("ERROR");
    expect(logger.getLevel()).to.eql("ERROR");
    logger.setLevel("INFO");
    expect(logger.getLevel()).to.eql("INFO");
    logger.setLevel("WARNING");
    expect(logger.getLevel()).to.eql("WARNING");
    logger.setLevel("ERROR");
    expect(logger.getLevel()).to.eql("ERROR");
  });

  it("should default unrecognized logger levels to \"NONE\"", () => {
    const logger = new Logger();
    logger.setLevel("TOTO");
    expect(logger.getLevel()).to.eql("NONE");
    logger.setLevel("DEBUG"); // initialize to another thing than "NONE"
    logger.setLevel("TITI");
    expect(logger.getLevel()).to.eql("NONE");
  });

  it("should never call console.* functions if logger level is set to \"NONE\"", () => {
    const consoleLogSpy = sinon.stub(console, "log");
    const consoleErrorSpy = sinon.stub(console, "error");
    const consoleWarnSpy = sinon.stub(console, "warn");
    const consoleInfoSpy = sinon.stub(console, "info");
    const consoleDebugSpy = sinon.stub(console, "debug");

    const logger = new Logger();
    logger.error("test");
    logger.warn("test");
    logger.info("test");
    logger.debug("test");
    expect(consoleLogSpy.called).to.eql(false);
    expect(consoleErrorSpy.called).to.eql(false);
    expect(consoleWarnSpy.called).to.eql(false);
    expect(consoleInfoSpy.called).to.eql(false);
    expect(consoleDebugSpy.called).to.eql(false);

    consoleLogSpy.restore();
    consoleErrorSpy.restore();
    consoleWarnSpy.restore();
    consoleInfoSpy.restore();
    consoleDebugSpy.restore();
  });

  it("should only call console.error if logger level is set to \"ERROR\"", () => {
    const consoleLogSpy = sinon.stub(console, "log");
    const consoleErrorSpy = sinon.stub(console, "error");
    const consoleWarnSpy = sinon.stub(console, "warn");
    const consoleInfoSpy = sinon.stub(console, "info");
    const consoleDebugSpy = sinon.stub(console, "debug");

    const logger = new Logger();
    logger.setLevel("ERROR");
    logger.error("test");
    logger.warn("test");
    logger.info("test");
    logger.debug("test");
    expect(consoleLogSpy.called).to.eql(false);
    expect(consoleErrorSpy.called).to.eql(true);
    expect(consoleWarnSpy.called).to.eql(false);
    expect(consoleInfoSpy.called).to.eql(false);
    expect(consoleDebugSpy.called).to.eql(false);

    consoleLogSpy.restore();
    consoleErrorSpy.restore();
    consoleWarnSpy.restore();
    consoleInfoSpy.restore();
    consoleDebugSpy.restore();
  });

  it("should call console.{error,warn} if logger level is set to \"WARNING\"", () => {
    const consoleLogSpy = sinon.stub(console, "log");
    const consoleErrorSpy = sinon.stub(console, "error");
    const consoleWarnSpy = sinon.stub(console, "warn");
    const consoleInfoSpy = sinon.stub(console, "info");
    const consoleDebugSpy = sinon.stub(console, "debug");

    const logger = new Logger();
    logger.setLevel("WARNING");
    logger.error("test");
    logger.warn("test");
    logger.info("test");
    logger.debug("test");
    expect(consoleLogSpy.called).to.eql(false);
    expect(consoleErrorSpy.called).to.eql(true);
    expect(consoleWarnSpy.called).to.eql(true);
    expect(consoleInfoSpy.called).to.eql(false);
    expect(consoleDebugSpy.called).to.eql(false);

    consoleLogSpy.restore();
    consoleErrorSpy.restore();
    consoleWarnSpy.restore();
    consoleInfoSpy.restore();
    consoleDebugSpy.restore();
  });

  it("should call console.{error,warn,info} if logger level is set to \"INFO\"", () => {
    const consoleLogSpy = sinon.stub(console, "log");
    const consoleErrorSpy = sinon.stub(console, "error");
    const consoleWarnSpy = sinon.stub(console, "warn");
    const consoleInfoSpy = sinon.stub(console, "info");
    const consoleDebugSpy = sinon.stub(console, "debug");

    const logger = new Logger();
    logger.setLevel("INFO");
    logger.error("test");
    logger.warn("test");
    logger.info("test");
    logger.debug("test");
    expect(consoleLogSpy.called).to.eql(false);
    expect(consoleErrorSpy.called).to.eql(true);
    expect(consoleWarnSpy.called).to.eql(true);
    expect(consoleInfoSpy.called).to.eql(true);
    expect(consoleDebugSpy.called).to.eql(false);

    consoleLogSpy.restore();
    consoleErrorSpy.restore();
    consoleWarnSpy.restore();
    consoleInfoSpy.restore();
    consoleDebugSpy.restore();
  });

  /* tslint:disable max-line-length */
  it("should call console.{error,warn,info, log} if logger level is set to \"DEBUG\"", () => {
  /* tslint:enable max-line-length */
    const consoleLogSpy = sinon.stub(console, "log");
    const consoleErrorSpy = sinon.stub(console, "error");
    const consoleWarnSpy = sinon.stub(console, "warn");
    const consoleInfoSpy = sinon.stub(console, "info");
    const consoleDebugSpy = sinon.stub(console, "debug");

    const logger = new Logger();
    logger.setLevel("DEBUG");
    logger.error("test");
    logger.warn("test");
    logger.info("test");
    logger.debug("test");
    expect(consoleLogSpy.called).to.eql(true);
    expect(consoleErrorSpy.called).to.eql(true);
    expect(consoleWarnSpy.called).to.eql(true);
    expect(consoleInfoSpy.called).to.eql(true);
    expect(consoleDebugSpy.called).to.eql(false);

    consoleLogSpy.restore();
    consoleErrorSpy.restore();
    consoleWarnSpy.restore();
    consoleInfoSpy.restore();
    consoleDebugSpy.restore();
  });
});
