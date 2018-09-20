import log from "../../../log";

export interface IParsedXStreamInfLine {
  bandwidth: number;

  audioGroup: string | undefined;
  averageBandwidth: number | undefined;
  closedCaptionsGroup: string | undefined;
  codecs: string | undefined;
  frameRate: number | undefined;
  hdcpLevel: string | undefined;
  height: number | undefined;
  subtitlesGroup: string | undefined;
  videoGroup: string | undefined;
  width: number | undefined;
}

/**
 * @param {string} line
 * @returns {Object|null}
 */
export default function parseEXTXStreamInf(line: string): IParsedXStreamInfLine | null {
  let bandwidth: number | undefined;
  let audioGroup: string | undefined;
  let averageBandwidth: number | undefined;
  let closedCaptionsGroup: string | undefined;
  let codecs: string | undefined;
  let frameRate: number | undefined;
  let hdcpLevel: string | undefined;
  let height: number | undefined;
  let subtitlesGroup: string | undefined;
  let videoGroup: string | undefined;
  let width: number | undefined;

  let remainingStr = line.substring(18);

  while (remainingStr.length > 0) {
    const indexOfComma = remainingStr.indexOf(",");

    if (indexOfComma === 0) {
      remainingStr.substring(1);
    } else {
      const nextEqual = remainingStr.indexOf("=");
      if (nextEqual > 0) {
        // there's nothing in a variant without a value
        const key = remainingStr.substring(0, nextEqual);
        const isStringValue = remainingStr[nextEqual + 1] === '"';
        const startOfValue = isStringValue ? nextEqual + 2 : nextEqual + 1;
        const endOfValue =
          remainingStr.substring(startOfValue).indexOf(isStringValue ? '"' : ",") +
          startOfValue;
        const value = remainingStr.substring(startOfValue, endOfValue);
        remainingStr = remainingStr.substring(
          isStringValue ? endOfValue + 2 : endOfValue + 1,
        );
        switch (key) {
          case "BANDWIDTH":
            const parsedBandwidth = parseInt(value, 10);
            if (isNaN(parsedBandwidth)) {
              log.warn("HLS Parser: invalid bandwidth value:", value);
            } else {
              bandwidth = parsedBandwidth;
            }
            break;

          case "AUDIO":
            audioGroup = value;
            break;

          case "AVERAGE-BANDWIDTH":
            const parsedAverageBandwidth = parseInt(value, 10);
            if (isNaN(parsedAverageBandwidth)) {
              log.warn("HLS Parser: invalid average bandwidth value:", value);
            } else {
              averageBandwidth = averageBandwidth;
            }
            break;

          case "CLOSED-CAPTIONS":
            closedCaptionsGroup = value;
            break;

          case "CODECS":
            codecs = value;
            break;

          case "FRAME-RATE":
            //  TODO re-check syntax
            frameRate = Number(value);
            break;

          case "HDCP-LEVEL":
            hdcpLevel = value;
            break;

          case "SUBTITLES":
            subtitlesGroup = value;
            break;

          case "VIDEO":
            videoGroup = value;
            break;

          case "RESOLUTION":
            const resolutionArr = value.split("x");
            if (resolutionArr.length !== 2) {
              log.warn("HLS Parser: invalid resolution value:", value);
            } else {
              const parsedWidth = parseInt(resolutionArr[0], 10);
              if (isNaN(parsedWidth)) {
                log.warn("HLS Parser: invalid width value:", value);
              } else {
                width = parsedWidth;
              }
            }
            const parsedHeight = parseInt(resolutionArr[1], 10);
            if (isNaN(parsedHeight)) {
              log.warn("HLS Parser: invalid height value:", value);
            } else {
              height = parsedHeight;
            }
        }
      }
    }
  }

  if (bandwidth === undefined) {
    log.warn("HLS Parser: invalid variant: no parse-able bandwidth found");
    return null;
  }
  return {
    bandwidth,
    audioGroup,
    averageBandwidth,
    closedCaptionsGroup,
    codecs,
    frameRate,
    hdcpLevel,
    subtitlesGroup,
    videoGroup,
    height,
    width,
  };
}
