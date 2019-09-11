const MetaPlaylistDASHSmooth = {
  "type": "MPL",
  "version": "0.1",
  "dynamic": false,
  "contents": [
    {
      "url": "https://www.bok.net/dash/tears_of_steel/cleartext/stream.mpd",
      "startTime": 0,
      "endTime": 734,
      "transport": "dash",
    },
    {
      "url": "https://amssamples.streaming.mediaservices.windows.net/683f7e47-bd83-4427-b0a3-26a6c4547782/BigBuckBunny.ism/manifest",
      "startTime": 734,
      "endTime": 1367,
      "transport": "smooth",
    },
    {
      "url": "https://demo.unified-streaming.com/video/ateam/ateam.ism/ateam.mpd",
      "startTime": 1367,
      "endTime": 1470,
      "transport": "dash",
    },
  ],
};

const MetaPlaylistDASHSmoothBlob =
  new Blob([JSON.stringify(MetaPlaylistDASHSmooth)],
           {type : "application/json"});

export default URL.createObjectURL(MetaPlaylistDASHSmoothBlob);


