/**
 * Data worth a little more than 15s of playback audio+video
 *
 * Note: the same actual low-bitrate segments are used for every video tracks to
 * avoid being too heavy.
 */

import flatMap from "../../utils/flatMap.js";
import patchSegmentWithTimeOffset from "../../utils/patchSegmentWithTimeOffset.js";

const baseURL = "http://download.tsi.telecom-paristech.fr/gpac/DASH_CONFORMANCE/TelecomParisTech/mp4-live-periods/";

const audioSegments = [{
  url: baseURL + "mp4-live-periods-aaclc-.mp4",
  data: require("arraybuffer-loader!./media/mp4-live-periods-aaclc-.mp4"),
  content: "video/mp4",
}];
for (let i = 1; i <= 60; i++) {
  audioSegments.push({
    url: baseURL + `mp4-live-periods-aaclc-${i}.m4s`,
    data: () => {
      const buffer = new Uint8Array(
        require("arraybuffer-loader!./media/mp4-live-periods-aaclc-1.m4s")
      );
      return patchSegmentWithTimeOffset(buffer, (i-1) * 440029).buffer;
    },
    content: "video/mp4",
  });
}

const videoQualities = flatMap(
  ["low", "mid", "hd", "full"],
  quality => {
    const videoSegments = [{
      url: baseURL + `mp4-live-periods-h264bl_${quality}-.mp4`,
      data: require(`arraybuffer-loader!./media/mp4-live-periods-h264bl_${quality}-.mp4`),
      content: "video/mp4",
    }];
    for (let i = 1; i <= 60; i++) {
      videoSegments.push({
        url: baseURL + `mp4-live-periods-h264bl_${quality}-${i}.m4s`,
        data: () => {
          const buffer = new Uint8Array(
            require(`arraybuffer-loader!./media/mp4-live-periods-h264bl_${quality}-1.m4s`)
          );
          return patchSegmentWithTimeOffset(buffer, (i-1) * 250000).buffer;
        },
        content: "video/mp4",
      });
    }
    return videoSegments;
  });

export default [
  // Manifest
  {
    url: baseURL + "mp4-live-periods-mpd.mpd",
    data: require("raw-loader!./media/mp4-live-periods-mpd.mpd").default,
    contentType: "application/dash+xml",
  },
  ...audioSegments, // remaining audio segments
  ...videoQualities, // every video segments
];
