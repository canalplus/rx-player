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

const SHORT_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LONG_DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const IMF_FIXDATE_REGEXP =
  /^([A-Za-z]{3}), ([0-9]{2}) ([A-Za-z]{3}) ([0-9]{4}) ([0-9]{2}):([0-9]{2}):([0-9]{2}) GMT$/;
const RFC850_DATE_REGEXP =
  /^([A-Za-z]+), ([0-9]{2})-([A-Za-z]{3})-([0-9]{2}) ([0-9]{2}):([0-9]{2}):([0-9]{2}) GMT$/;
const ASCTIME_DATE_REGEXP =
  /^([A-Za-z]{3}) ([A-Za-z]{3}) ([0-9]{2}| [0-9]) ([0-9]{2}):([0-9]{2}):([0-9]{2}) ([0-9]{4})$/;

/**
 * Parse an HTTP-date as defined by RFC 9110 section 5.6.7.
 *
 * The reference timestamp is used to disambiguate the two-digit year in the
 * obsolete RFC 850 format.
 * @param {string} httpDate
 * @param {number} referenceTimestamp
 * @returns {number|undefined}
 * @see https://www.rfc-editor.org/rfc/rfc9110.html#section-5.6.7
 */
export default function parseHttpDate(
  httpDate: string,
  referenceTimestamp: number,
): number | undefined {
  const imfFixdateMatch = IMF_FIXDATE_REGEXP.exec(httpDate);
  if (imfFixdateMatch !== null) {
    return createTimestamp(
      SHORT_DAY_NAMES.indexOf(imfFixdateMatch[1]),
      Number(imfFixdateMatch[2]),
      MONTH_NAMES.indexOf(imfFixdateMatch[3]),
      Number(imfFixdateMatch[4]),
      Number(imfFixdateMatch[5]),
      Number(imfFixdateMatch[6]),
      Number(imfFixdateMatch[7]),
    );
  }

  const rfc850DateMatch = RFC850_DATE_REGEXP.exec(httpDate);
  if (rfc850DateMatch !== null) {
    const day = Number(rfc850DateMatch[2]);
    const month = MONTH_NAMES.indexOf(rfc850DateMatch[3]);
    const hour = Number(rfc850DateMatch[5]);
    const minute = Number(rfc850DateMatch[6]);
    const second = Number(rfc850DateMatch[7]);
    const year = getRfc850Year(
      Number(rfc850DateMatch[4]),
      month,
      day,
      hour,
      minute,
      second,
      referenceTimestamp,
    );
    if (year === undefined) {
      return undefined;
    }
    return createTimestamp(
      LONG_DAY_NAMES.indexOf(rfc850DateMatch[1]),
      day,
      month,
      year,
      hour,
      minute,
      second,
    );
  }

  const asctimeDateMatch = ASCTIME_DATE_REGEXP.exec(httpDate);
  if (asctimeDateMatch !== null) {
    return createTimestamp(
      SHORT_DAY_NAMES.indexOf(asctimeDateMatch[1]),
      Number(asctimeDateMatch[3]),
      MONTH_NAMES.indexOf(asctimeDateMatch[2]),
      Number(asctimeDateMatch[7]),
      Number(asctimeDateMatch[4]),
      Number(asctimeDateMatch[5]),
      Number(asctimeDateMatch[6]),
    );
  }

  return undefined;
}

/** Resolve the full year of an RFC 850 date according to RFC 9110. */
function getRfc850Year(
  twoDigitYear: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  referenceTimestamp: number,
): number | undefined {
  if (!isFinite(referenceTimestamp) || month < 0) {
    return undefined;
  }

  const referenceDate = new Date(referenceTimestamp);
  const currentYear = referenceDate.getUTCFullYear();
  const candidateYear = Math.floor(currentYear / 100) * 100 + twoDigitYear;
  const candidateTimestamp =
    Date.UTC(candidateYear, month, day, hour, minute, Math.min(second, 59)) +
    (second === 60 ? 1000 : 0);

  referenceDate.setUTCFullYear(currentYear + 50);
  return candidateTimestamp > referenceDate.getTime() ? candidateYear - 100 : candidateYear;
}

/** Create and validate a UTC timestamp from parsed HTTP-date components. */
function createTimestamp(
  dayOfWeek: number,
  day: number,
  month: number,
  year: number,
  hour: number,
  minute: number,
  second: number,
): number | undefined {
  if (
    dayOfWeek < 0 ||
    day < 1 ||
    month < 0 ||
    year < 1900 ||
    hour > 23 ||
    minute > 59 ||
    second > 60
  ) {
    return undefined;
  }

  const normalizedSecond = Math.min(second, 59);
  const timestamp = Date.UTC(year, month, day, hour, minute, normalizedSecond);
  const parsedDate = new Date(timestamp);
  if (
    parsedDate.getUTCDay() !== dayOfWeek ||
    parsedDate.getUTCDate() !== day ||
    parsedDate.getUTCMonth() !== month ||
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCHours() !== hour ||
    parsedDate.getUTCMinutes() !== minute ||
    parsedDate.getUTCSeconds() !== normalizedSecond
  ) {
    return undefined;
  }

  return timestamp + (second === 60 ? 1000 : 0);
}
