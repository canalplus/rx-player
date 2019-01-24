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
      expect(parseBoolean("true")).toEqual(true);
    });

    it("should return false if value is \"false\"", () => {
      expect(parseBoolean("false")).toEqual(false);
    });

    it("should return false for any other value", () => {
      expect(parseBoolean("")).toEqual(false);
      expect(parseBoolean("foo")).toEqual(false);
    });
  });

  describe("parseIntOrBoolean", () => {
    it("should return true if value is \"true\"", () => {
      expect(parseIntOrBoolean("true")).toEqual(true);
    });

    it("should return false if value is \"false\"", () => {
      expect(parseIntOrBoolean("false")).toEqual(false);
    });

    it("should return a number for any number", () => {
      expect(parseIntOrBoolean("0")).toEqual(0);
      expect(parseIntOrBoolean("10")).toEqual(10);
      expect(parseIntOrBoolean("072")).toEqual(72);
      expect(parseIntOrBoolean("-698")).toEqual(-698);
    });

    it("should return NaN for any other value", () => {
      expect(parseIntOrBoolean("")).toEqual(NaN);
      expect(parseIntOrBoolean("foo")).toEqual(NaN);
    });
  });

  describe("parseDateTime", () => {
    it("should correctly parse a given date into a timestamp", () => {
      expect(parseDateTime("1970-01-01T00:00:00Z")).toEqual(0);
      expect(parseDateTime("1998-11-22T10:40:50Z")).toEqual(911731250);
      expect(parseDateTime("1960-01-01T00:00:00Z")).toEqual(-315619200);
    });

    it("should return NaN when the date is not recognized", () => {
      expect(parseDateTime("foo bar")).toEqual(NaN);
      expect(parseDateTime("2047-41-52T30:40:50Z")).toEqual(NaN);
    });
  });

  describe("parseDuration", () => {
    it("should translate an empty string to 0", () => {
      expect(parseDuration("")).toEqual(0);
    });

    it("should correctly parse duration in ISO8061 format", function() {
      expect(parseDuration("P18Y9M4DT11H9M8S")).toBe(591361748);
    });

    it("should correctly parse duration if missing the year", function() {
      expect(parseDuration("P9M4DT11H9M8S")).toBe(23713748);
    });

    it("should correctly parse duration if missing the month", function() {
      expect(parseDuration("P18Y4DT11H9M8S")).toBe(568033748);
    });

    it("should correctly parse duration if missing the day", function() {
      expect(parseDuration("P18Y9MT11H9M8S")).toBe(591016148);
    });

    it("should correctly parse duration if missing the hours", function() {
      expect(parseDuration("P18Y9M4DT9M8S")).toBe(591322148);
    });

    it("should correctly parse duration if missing the minutes", function() {
      expect(parseDuration("P18Y9M4DT11H8S")).toBe(591361208);
    });

    it("should correctly parse duration if missing the seconds", function() {
      expect(parseDuration("P18Y9M4DT11H9M")).toBe(591361740);
    });

    it("should throw if duration not in ISO8061 format", function() {
      expect(() => parseDuration("1000")).toThrow();
    });
  });

  describe("parseByteRange", () => {
    it("should correctly parse byte range", function() {
      const parsedByteRange = parseByteRange("1-1000");
      expect(parsedByteRange).not.toBe(null);
      expect((parsedByteRange as [number, number]).length).toBe(2);
      expect((parsedByteRange as [number, number])[0]).toBe(1);
      expect((parsedByteRange as [number, number])[1]).toBe(1000);
    });
    it("should return null if can't parse given byte range", function() {
      expect(parseByteRange("main")).toBe(null);
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
