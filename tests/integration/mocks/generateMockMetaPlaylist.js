import playListGenerator from "../utils/metaplaylistGenerator";

const generateMockMetaPlaylist = (startTime, timeShiftBufferDepth) => {
  const data = [
    {
      url: "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/ateam.mpd",
      transport: "dash",
      duration: 101.568367,
    },
  ];
  const attributes = {
    timeShiftBufferDepth,
  };
  const playlist = playListGenerator(data, startTime, 20, attributes);
  return {
    manifest: {
      url : "http://metaplaylist",
      data: playlist,
      contentType: "application/json",
    },
  };
};

export default generateMockMetaPlaylist;