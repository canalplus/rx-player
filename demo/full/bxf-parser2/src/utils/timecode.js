/**
 * Parse time code in format HH:MN:SS:I
 * @param {string} TCStr
 * @param {string} baseTime
 */
export function parsedTimeCode(TCStr, baseTime) {
  const splittedTC = TCStr.split(":");
  if (splittedTC[3]) {
    const hours = parseInt(splittedTC[0], 10);
    const minutes = parseInt(splittedTC[1], 10);
    const seconds = parseInt(splittedTC[2], 10);
    const milli = parseInt(splittedTC[3], 10) / baseTime;
    if (isNaN(milli) || isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
      return undefined;
    }
    return hours * 60 * 60 + minutes * 60 + seconds + milli;
  }
}