import { describe, expect, it } from "vitest";
import parseHttpDate from "../../../../src/utils/parse_http_date.ts";

const REFERENCE_TIMESTAMP = Date.UTC(2026, 0, 1, 0, 0, 0);

describe("utils - parseHttpDate", () => {
  it("should parse an IMF-fixdate", () => {
    expect(
      parseHttpDate("Sun, 06 Nov 1994 08:49:37 GMT", REFERENCE_TIMESTAMP),
    ).toBe(Date.UTC(1994, 10, 6, 8, 49, 37));
  });

  it("should parse an obsolete RFC 850 date", () => {
    expect(
      parseHttpDate("Sunday, 06-Nov-94 08:49:37 GMT", REFERENCE_TIMESTAMP),
    ).toBe(Date.UTC(1994, 10, 6, 8, 49, 37));
  });

  it("should parse an obsolete asctime date as UTC", () => {
    expect(parseHttpDate("Sun Nov  6 08:49:37 1994", REFERENCE_TIMESTAMP)).toBe(
      Date.UTC(1994, 10, 6, 8, 49, 37),
    );
  });

  it("should parse a two-digit asctime day", () => {
    expect(parseHttpDate("Wed Nov 16 08:49:37 1994", REFERENCE_TIMESTAMP)).toBe(
      Date.UTC(1994, 10, 16, 8, 49, 37),
    );
  });

  it("should accept a leap second", () => {
    expect(
      parseHttpDate("Sat, 31 Dec 2016 23:59:60 GMT", REFERENCE_TIMESTAMP),
    ).toBe(Date.UTC(2017, 0, 1, 0, 0, 0));
  });

  it("should keep an RFC 850 date exactly 50 years in the future", () => {
    expect(
      parseHttpDate("Wednesday, 01-Jan-76 00:00:00 GMT", REFERENCE_TIMESTAMP),
    ).toBe(Date.UTC(2076, 0, 1, 0, 0, 0));
  });

  it("should interpret an RFC 850 date over 50 years ahead as being in the past", () => {
    expect(
      parseHttpDate("Friday, 02-Jan-76 00:00:00 GMT", REFERENCE_TIMESTAMP),
    ).toBe(Date.UTC(1976, 0, 2, 0, 0, 0));
  });

  const invalidDates = [
    "1994-11-06",
    "sun, 06 Nov 1994 08:49:37 GMT",
    "Sun, 06 Nov 1994 08:49:37 gmt",
    "Sun,  06 Nov 1994 08:49:37 GMT",
    "Sun, 06 Nov 1994 08:49:37 GMT ",
    "Mon, 06 Nov 1994 08:49:37 GMT",
    "Thu, 29 Feb 1900 08:49:37 GMT",
    "Sun, 06 Foo 1994 08:49:37 GMT",
    "Sun, 06 Nov 1894 08:49:37 GMT",
    "Sun, 06 Nov 1994 24:49:37 GMT",
    "Sun, 06 Nov 1994 08:60:37 GMT",
    "Sun, 06 Nov 1994 08:49:61 GMT",
    "Sun Nov 6 08:49:37 1994",
    "Sun, 06-Nov-94 08:49:37 GMT",
  ];

  for (const invalidDate of invalidDates) {
    it(`should reject invalid HTTP-date: ${invalidDate}`, () => {
      expect(parseHttpDate(invalidDate, REFERENCE_TIMESTAMP)).toBeUndefined();
    });
  }
});
