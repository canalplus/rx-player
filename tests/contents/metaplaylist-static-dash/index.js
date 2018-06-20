import {
  URLs,
  manifestInfos as staticManifestInfos,
} from "../DASH_static_SegmentTimeline";

function generateURLs(startTime, timeShiftBufferDepth) {
  const data = [
    {
      url: staticManifestInfos.url,
      transport: "dash",
      duration: 101.568367,
    },
  ];
  const attributes = { timeShiftBufferDepth };
  const playlist = playListGenerator(data, startTime, 20, attributes);
  return [
    {
      url : "http://metaplaylist",
      data: playlist,
      contentType: "application/json",
    },
    ...URLs,
  ];
}

const manifestInfos = {
  url: "http://metaplaylist",
  transport: "metaplaylist",
  isLive: true,
};

export {
  generateURLs,
  manifestInfos,
};

/**
 * Loop a series of contents from a given start time, to build a metaplaylist.
 * @param {Array<Object>} baseContents // in format [{url, duration}, ...]
 * @param {number} baseTime // in format timestamp e.g 1516961850
 * @param {number} occurences // number of loops to reproduce
 * @param {Object} mplAttributes // metaplaylist root attributes
 */
function playListGenerator(
  baseContents,
  baseTime,
  occurences,
  mplAttributes
) {
  function generateContentLoop(datas, times) {
    const contents = [];
    const durations = datas
      .map((data) => data.endTime - data.startTime);
    const totalDuration = durations.reduce((a, b) => a + b, 0);

    for (let i = 0; i <= times - 1; i++) {
      for (let k = 0; k <= datas.length - 1; k++) {
        contents.push(
          {
            url: datas[k].url,
            startTime: datas[k].startTime + (totalDuration * (i)),
            endTime: datas[k].endTime + (totalDuration * (i)),
            transport: datas[k].transport,
            textTracks: datas[k].textTracks,
          }
        );
      }
    }
    return contents;
  }

  const playlist = [];
  for (let i = 0; i < baseContents.length; i++) {
    const beforeContent =
      (playlist.length !== 0) ? playlist[playlist.length - 1] : undefined;
    const url = baseContents[i].url;
    const transport = baseContents[i].transport;
    const startTime = beforeContent ? beforeContent.endTime : (baseTime + 0);
    const duration = baseContents[i].duration;
    const endTime = startTime + duration;
    const textTracks = baseContents[i].textTracks;
    playlist.push({
      url,
      startTime,
      endTime,
      transport,
      textTracks,
    });
  }
  const contentLoop = generateContentLoop(playlist, occurences);
  const generatedAt = Date.now();
  const mplVersion = "1";
  const metaplaylist = {
    metadata: {
      name: "Test MetaPlaylist",
      mplVersion,
      generatedAt,
    },
    contents: contentLoop,
    attributes: mplAttributes,
    overlays: [],
  };
  return JSON.stringify(metaplaylist);
}
