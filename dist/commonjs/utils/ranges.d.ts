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
interface IRange {
    start: number;
    end: number;
}
/**
 * Clean array ranges from "empty" ranges.
 * That is, range objects which have their start equal to their end.
 * /!\ Mutate the array of ranges.
 * @param {Array<Object>} ranges
 * @returns {Array<Object>}
 */
declare function removeEmptyRanges(ranges: IRange[]): IRange[];
/**
 * /!\ Mutate the array of ranges.
 * @param {Array<Object>} ranges
 * @returns {Array<Object>}
 */
declare function mergeContiguousRanges(ranges: IRange[]): IRange[];
/**
 * True if range1 is considered _after_ range2.
 * @param {Object} range1
 * @param {Object} range2
 * @returns {Boolean}
 */
declare function isAfter(range1: IRange, range2: IRange): boolean;
/**
 * True if range1 is considered _before_ range2.
 * @param {Object} range1
 * @param {Object} range2
 * @returns {Boolean}
 */
declare function isBefore(range1: IRange, range2: IRange): boolean;
/**
 * Returns true if the time given can be considered as part of any of the given
 * ranges.
 * @param {Array.<Object>} ranges
 * @param {number} time
 * @returns {boolean}
 */
declare function isTimeInRanges(ranges: IRange[], time: number): boolean;
/**
 * Returns true if the time given can be considered as part of the given range.
 * @param {Object} range1
 * @param {Number} Time
 * @returns {Boolean}
 */
declare function isTimeInRange({ start, end }: IRange, time: number): boolean;
/**
 * Convert from a TimeRanges object to an array of Ranges.
 * @param {TimeRanges} timeRanges
 * @returns {Array.<Object>}
 */
declare function convertToRanges(timeRanges: TimeRanges): IRange[];
/**
 * Get range object of a specific time in a TimeRanges object.
 * @param {TimeRanges} timeRanges
 * @returns {Object}
 */
declare function getBufferedTimeRange(timeRanges: TimeRanges, time: number): IRange | null;
/**
 * Get range object of a specific time in a `IRange` object.
 * @param {Array.<Object>} ranges
 * @returns {Object}
 */
declare function getRange(ranges: IRange[], time: number): IRange | null;
/**
 * Get gap from a specific time until the start of the next Range.
 * @param {TimeRanges} timeRanges
 * @param {Number} time
 * @returns {Number}
 */
declare function getNextBufferedTimeRangeGap(timeRanges: TimeRanges, time: number): number;
/**
 * @param {TimeRanges} timeRanges
 * @param {Number} time
 * @returns {Object} - Object with two properties:
 *   - outerRanges {Array.<Object>}: every ranges which does not contain the
 *     given time.
 *   - innerRange {Object|null}: the range which contain the given time.
 */
declare function getInnerAndOuterRangesFromBufferedTimeRanges(timeRanges: TimeRanges, time: number): {
    innerRange: IRange | null;
    outerRanges: IRange[];
};
/**
 * @param {Array.<Object>} ranges
 * @param {Number} time
 * @returns {Object} - Object with two properties:
 *   - outerRanges {Array.<Object>}: every ranges which does not contain the
 *     given time.
 *   - innerRange {Object|null}: the range which contain the given time.
 */
declare function getInnerAndOuterRanges(ranges: IRange[], time: number): {
    innerRange: IRange | null;
    outerRanges: IRange[];
};
/**
 * Get "size" (difference between end and start) of the TimeRange containing the
 * given time. 0 if the range is not found.
 * @param {TimeRanges} timeRanges
 * @param {Number} currentTime
 * @returns {Number}
 */
declare function getSizeOfBufferedTimeRange(timeRanges: TimeRanges, currentTime: number): number;
/**
 * Get "currently played" (difference between time given and start) of the
 * range containing the given time. 0 if the range is not found.
 * @param {TimeRanges} timeRanges
 * @param {Number} currentTime
 * @returns {Number}
 */
declare function getPlayedSizeOfBufferedTimeRange(timeRanges: TimeRanges, currentTime: number): number;
/**
 * Get "left to play" (difference between end and time given) of the range
 * containing the given time. Infinity if the range is not found.
 * @param {TimeRanges} timeRanges
 * @param {Number} currentTime
 * @returns {Number}
 */
declare function getLeftSizeOfBufferedTimeRange(timeRanges: TimeRanges, currentTime: number): number;
/**
 * Get "size" (difference between end and start) of the range containing the
 * given time. 0 if the range is not found.
 * @param {Array.<Object>} ranges
 * @param {Number} currentTime
 * @returns {Number}
 */
declare function getSizeOfRange(ranges: IRange[], currentTime: number): number;
/**
 * Get "currently played" (difference between time given and start) of the
 * range containing the given time. 0 if the range is not found.
 * @param {Array.<Object>} ranges
 * @param {Number} currentTime
 * @returns {Number}
 */
declare function getPlayedSizeOfRange(ranges: IRange[], currentTime: number): number;
/**
 * Get "left to play" (difference between end and time given) of the range
 * containing the given time. Infinity if the range is not found.
 * @param {Array.<Object>} ranges
 * @param {Number} currentTime
 * @returns {Number}
 */
declare function getLeftSizeOfRange(ranges: IRange[], currentTime: number): number;
/**
 * Insert a range object into an array of ranges objects, at the right place.
 * /!\ Mutate the array of ranges.
 * @param {Array.<Object>} ranges
 * @param {Object} rangeToAddArg
 * @returns {Array.<Object>}
 */
declare function insertInto(ranges: IRange[], rangeToAddArg: IRange): IRange[];
/**
 * Returns only the intersection between the two ranges, from the first
 * ranges argument given.
 * @param {Array.<Range>} ranges1
 * @param {Array.<Range>} ranges2
 * @returns {Array.<Range>}
 */
declare function keepRangeIntersection(ranges1: IRange[], ranges2: IRange[]): IRange[];
/**
 * Exclude from the `baseRanges` everything that is in `rangesToExclude`.
 * Example:
 *
 * Let's say we have the following base ranges:
 *       |==========|        |===============| |======|    |==========|
 *
 * From which we want to "exclude" the following ranges:
 *          |=========| |==|        |===|  |=====|
 *
 * We will obtain the first ranges from which we remove the second ranges:
 * -----------------------------------------------------------------------
 *       |==========|        |===============| |======|    |==========|
 *          |=========| |==|        |===|  |=====|
 * _______________________________________________________________________
 *                                     |
 *                                     |
 *                                     V
 * -----------------------------------------------------------------------
 *       |==|                |======|   |==|     |====|    |==========|
 * -----------------------------------------------------------------------
 *
 * @param {Array.<Object} baseRanges
 * @param {Array.<Object} rangesToExclude
 * @return {Array.<Object>}
 */
declare function excludeFromRanges(baseRanges: IRange[], rangesToExclude: IRange[]): IRange[];
/**
 * Returns `true` if the given `time` is available in the TimeRanges object
 * given.
 * Returns `false` otherwise.
 * @param {TimeRanges} ranges
 * @param {Number} time
 * @returns {boolean}
 */
declare function isTimeInTimeRanges(ranges: TimeRanges, time: number): boolean;
export { convertToRanges, excludeFromRanges, getInnerAndOuterRangesFromBufferedTimeRanges, getInnerAndOuterRanges, getLeftSizeOfRange, getNextBufferedTimeRangeGap, getSizeOfBufferedTimeRange, getPlayedSizeOfBufferedTimeRange, getLeftSizeOfBufferedTimeRange, getPlayedSizeOfRange, getBufferedTimeRange, getRange, getSizeOfRange, insertInto, IRange, isAfter, isBefore, isTimeInTimeRanges, isTimeInRange, isTimeInRanges, keepRangeIntersection, mergeContiguousRanges, removeEmptyRanges, };
