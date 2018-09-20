import log from "../../../log";

export interface IExtXStart {
  timeOffset: number;
  precise: boolean;
}

/**
 * @param {string} line
 * @returns {Object|null}
 */
export default function parseEXTXStart(line: string): IExtXStart | null {
  let timeOffset: number | undefined;
  let precise: boolean | undefined;

  const keyValues: string[] = line.substring(13).split(",");
  for (let i = 0; i < keyValues.length; i++) {
    const keyValue = keyValues[i];
    const index = keyValue.indexOf("=");
    if (index > 0) {
      const key = keyValue.substring(0, index);
      const value = keyValue.substring(index + 1);

      if (key === "TIME-OFFSET") {
        const parsedTimeOffset = parseFloat(value);
        if (isNaN(parsedTimeOffset)) {
          log.warn("HLS Parser: invalid timeOffset value:", value);
        } else {
          timeOffset = parsedTimeOffset;
        }
      } else if (key === "PRECISE") {
        precise = value === "YES";
      }
    }
  }

  if (timeOffset === undefined) {
    log.warn("HLS Parser: invalid #EXT-X-START: no TIME-OFFSET");
    return null;
  }

  return { timeOffset, precise: precise ?? false };
}
