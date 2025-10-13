const MetaPlaylistDASHSmooth = {
  type: "MPL",
  version: "0.1",
  dynamic: false,
  contents: [
    {
      url: "https://www.bok.net/dash/tears_of_steel/cleartext/stream.mpd",
      startTime: 0,
      endTime: 733.3,
      transport: "dash",
    },
    {
      url: "https://playready.directtaps.net/smoothstreaming/SSWSS720H264/SuperSpeedway_720.ism/Manifest",
      startTime: 733.3,
      endTime: 853.3,
      transport: "smooth",
    },
  ],
} as const;

const MetaPlaylistDASHSmoothBlob = new Blob([JSON.stringify(MetaPlaylistDASHSmooth)], {
  type: "application/json",
});

export default URL.createObjectURL(MetaPlaylistDASHSmoothBlob);
