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

import {
  MPDError,
  parseBoolean,
  parseByteRange,
  parseDateTime,
  parseDuration,
  parseIntOrBoolean,
  parseScheme,
} from "../utils";

describe("dash parser helpers", function() {

  describe("parseBoolean", () => {
    it("should return true if value is \"true\"", () => {
      expect(parseBoolean("true", "toto")).toEqual([true, null]);
    });

    it("should return false if value is \"false\"", () => {
      expect(parseBoolean("false", "titi")).toEqual([false, null]);
    });

    it("should return false for and an error any other value", () => {
      const parsed1 = parseBoolean("", "ab");
      const parsed2 = parseBoolean("foo", "ba");
      expect(parsed1[0]).toEqual(false);
      expect(parsed2[0]).toEqual(false);
      expect(parsed1[1]).toBeInstanceOf(MPDError);
      expect(parsed2[1]).toBeInstanceOf(MPDError);
      expect(parsed1[1]?.message).toEqual(
        "`ab` property is not a boolean value but \"\"");
      expect(parsed2[1]?.message).toEqual(
        "`ba` property is not a boolean value but \"foo\"");
    });
  });

  describe("parseIntOrBoolean", () => {
    it("should return true if value is \"true\"", () => {
      expect(parseIntOrBoolean("true", "toto")).toEqual([true, null]);
    });

    it("should return false if value is \"false\"", () => {
      expect(parseIntOrBoolean("false", "toto")).toEqual([false, null]);
    });

    it("should return a number for any number", () => {
      expect(parseIntOrBoolean("0", "foob1")).toEqual([0, null]);
      expect(parseIntOrBoolean("10", "foob2")).toEqual([10, null]);
      expect(parseIntOrBoolean("072", "foob3")).toEqual([72, null]);
      expect(parseIntOrBoolean("-698", "foob4")).toEqual([-698, null]);
    });

    it("should return null and an error for any other value", () => {
      const parsed1 = parseIntOrBoolean("", "ab");
      const parsed2 = parseIntOrBoolean("foo", "ba");
      expect(parsed1[0]).toEqual(null);
      expect(parsed2[0]).toEqual(null);
      expect(parsed1[1]).toBeInstanceOf(MPDError);
      expect(parsed2[1]).toBeInstanceOf(MPDError);
      expect(parsed1[1]?.message).toEqual(
        "`ab` property is not a boolean nor an integer but \"\"");
      expect(parsed2[1]?.message).toEqual(
        "`ba` property is not a boolean nor an integer but \"foo\"");
    });
  });

  describe("parseDateTime", () => {
    it("should correctly parse a given date into a timestamp", () => {
      expect(parseDateTime("1970-01-01T00:00:00Z", "a")).toEqual([0, null]);
      expect(parseDateTime("1998-11-22T10:40:50Z", "b")).toEqual([911731250, null]);
      expect(parseDateTime("1960-01-01T00:00:00Z", "c")).toEqual([-315619200, null]);
    });

    it("should return null and an error when the date is not recognized", () => {
      const parsed1 = parseDateTime("foo bar", "ab");
      const parsed2 = parseDateTime("2047-41-52T30:40:50Z", "ba");
      expect(parsed1[0]).toEqual(null);
      expect(parsed2[0]).toEqual(null);
      expect(parsed1[1]).toBeInstanceOf(MPDError);
      expect(parsed2[1]).toBeInstanceOf(MPDError);
      expect(parsed1[1]?.message).toEqual(
        "`ab` is in an invalid date format: \"foo bar\"");
      expect(parsed2[1]?.message).toEqual(
        "`ba` is in an invalid date format: \"2047-41-52T30:40:50Z\"");
    });
  });

  describe("parseDuration", () => {
    it("should correctly parse duration in ISO8061 format", function() {
      expect(parseDuration("P18Y9M4DT11H9M8S", "fooba")).toEqual([591361748, null]);
    });

    it("should correctly parse duration if missing the year", function() {
      expect(parseDuration("P9M4DT11H9M8S", "fooba")).toEqual([23713748, null]);
    });

    it("should correctly parse duration if missing the month", function() {
      expect(parseDuration("P18Y4DT11H9M8S", "fooba")).toEqual([568033748, null]);
    });

    it("should correctly parse duration if missing the day", function() {
      expect(parseDuration("P18Y9MT11H9M8S", "fooba")).toEqual([591016148, null]);
    });

    it("should correctly parse duration if missing the hours", function() {
      expect(parseDuration("P18Y9M4DT9M8S", "fooba")).toEqual([591322148, null]);
    });

    it("should correctly parse duration if missing the minutes", function() {
      expect(parseDuration("P18Y9M4DT11H8S", "fooba")).toEqual([591361208, null]);
    });

    it("should correctly parse duration if missing the seconds", function() {
      expect(parseDuration("P18Y9M4DT11H9M", "fooba")).toEqual([591361740, null]);
    });

    it("should return null and an error if duration not in ISO8061 format", function() {
      const parsed1 = parseDuration("1000", "fooba");
      expect(parsed1[0]).toEqual(null);
      expect(parsed1[1]).toBeInstanceOf(MPDError);
      expect(parsed1[1]?.message).toEqual(
        "`fooba` property has an unrecognized format \"1000\"");
    });
    it("should return 0 and an error if given an empty string", function() {
      const parsed = parseDuration("", "fooba");
      expect(parsed[0]).toEqual(0);
      expect(parsed[1]).toBeInstanceOf(MPDError);
      expect(parsed[1]?.message).toEqual(
        "`fooba` property is empty");
    });

  });

  describe("parseByteRange", () => {
    it("should correctly parse byte range", function() {
      const parsedByteRange = parseByteRange("1-1000", "tots");
      expect(parsedByteRange[0]).not.toEqual(null);
      expect(parsedByteRange[1]).toEqual(null);
      expect((parsedByteRange[0] as [number, number]).length).toEqual(2);
      expect((parsedByteRange[0] as [number, number])[0]).toEqual(1);
      expect((parsedByteRange[0] as [number, number])[1]).toEqual(1000);
    });
    it("should return null and an error if can't parse given byte range", function() {
      const parsed1 = parseByteRange("main", "prop");
      expect(parsed1[0]).toEqual(null);
      expect(parsed1[1]).toBeInstanceOf(MPDError);
      expect(parsed1[1]?.message).toEqual(
        "`prop` property has an unrecognized format \"main\"");
    });
  });

  describe("parseScheme", () => {
    it("should correctly parse an element with no known attribute", () => {
      const element1 = new DOMParser()
        .parseFromString("<Foo />", "text/xml")
        .childNodes[0] as Element;
      expect(parseScheme(element1))
        .toEqual({});

      const element2 = new DOMParser()
        .parseFromString("<Foo test=\"\" />", "text/xml")
        .childNodes[0] as Element;
      expect(parseScheme(element2))
        .toEqual({});
    });

    it("should correctly parse an element with a correct schemeIdUri attribute", () => {
      const element1 = new DOMParser()
        .parseFromString("<Foo schemeIdUri=\"foobar \" />", "text/xml")
        .childNodes[0] as Element;
      expect(parseScheme(element1))
        .toEqual({ schemeIdUri: "foobar " });

      const element2 = new DOMParser()
        .parseFromString("<Foo schemeIdUri=\"\" />", "text/xml")
        .childNodes[0] as Element;
      expect(parseScheme(element2))
        .toEqual({ schemeIdUri: "" });
    });

    it("should correctly parse an element with a correct value attribute", () => {
      const element1 = new DOMParser()
        .parseFromString("<Foo value=\"foobar \" />", "text/xml")
        .childNodes[0] as Element;
      expect(parseScheme(element1))
        .toEqual({ value: "foobar " });

      const element2 = new DOMParser()
        .parseFromString("<Foo value=\"\" />", "text/xml")
        .childNodes[0] as Element;
      expect(parseScheme(element2))
        .toEqual({ value: "" });
    });

    it("should correctly parse an element with both attributes", () => {
      const element = new DOMParser()
        .parseFromString("<Foo schemeIdUri=\"baz\" value=\"foobar \" />", "text/xml")
        .childNodes[0] as Element;
      expect(parseScheme(element))
        .toEqual({ schemeIdUri: "baz", value: "foobar " });
    });
  });
});
