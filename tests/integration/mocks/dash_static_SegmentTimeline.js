/**
 * Data worth a little more than 15s of playback audio+video
 *
 * Note: the same actual low-bitrate segments are used for every video tracks to
 * avoid being too heavy.
 */

const patchSegmentWithTimeOffset = require("../utils/patchSegmentWithTimeOffset.js");

const baseURL = "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/";

const audioSegments = [
  0, 177341, 353469, 530621, 706749, 883901, 1060029, 1236157, 1413309,
  1589437, 1766589, 1942717, 2119869, 2295997, 2472125, 2649277, 2825405,
  3002557, 3178685, 3355837, 3531965, 3709117, 3885245, 4061373, 4238525,
  4414653,
].map(time => {
  return {
    url: baseURL + `dash/ateam-audio=128000-${time}.dash`,
    data: require(`arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/ateam-audio=128000-${time}.dash`),
    contentType: "audio/mp4",
  };
});

const videoQualities = [400000, 795000, 1193000, 1996000]
  .map(quality => {
    const segments = [
      0, 360360, 720720, 1081080, 1441440, 1801800, 2162160, 2522520, 2882880,
      3243240, 3603600, 3963960, 4324320, 4684680, 5045040, 5405400, 5765760,
      6126120, 6486480, 6846840, 7207200, 7567560, 7927920, 8288280, 8648640,
    ].map(time => {
      return {
        url: baseURL + `dash/ateam-video=${quality}-${time / 90}.dash`,
        data: () => {
          const base = new Uint8Array(
            require(`arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/ateam-video=${quality}-0.dash`)
          );
          return patchSegmentWithTimeOffset(base, time).buffer;
        },
        contentType: "video/mp4",
      };
    });

    segments.push({
      url: baseURL + `dash/ateam-video=${quality}-900000.dash`,
      data: require(`arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/ateam-video=${quality}-9009000.dash`),
      contentType: "video/mp4",
    });

    return {
      init: {
        url: baseURL + `dash/ateam-video=${quality}.dash`,
        data: require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/ateam-video=400000.dash"),
        contentType: "video/mp4",
      },
      segments,
    };
  });

export default {
  manifest: {
    url: baseURL + "ateam.mpd",
    data: require("raw-loader!./fixtures/dash_static_SegmentTimeline/ateam.mpd"),
    contentType: "application/dash+xml",
  },

  audio: [{
    init: {
      url: baseURL + "dash/ateam-audio=128000.dash",
      data: require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/ateam-audio=128000.dash"),
      contentType: "audio/mp4",
    },

    segments: audioSegments,
  }],

  video: videoQualities,
};
