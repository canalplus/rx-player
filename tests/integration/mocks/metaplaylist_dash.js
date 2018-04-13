import playListGenerator from "../utils/playlist_generator";

const generateMockMetaPlaylist = (startTime) => {
  const data = [
    {
      url: "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/ateam.mpd",
      transport: "dash",
      duration: 101.568367,
    },
  ];
  const playlist = playListGenerator(data, startTime, 20);
  return {
    manifest: {
      url : "http://metaplaylist",
      data: playlist,
      contentType: "application/json",
    },
  };
};

export default generateMockMetaPlaylist;