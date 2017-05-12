module.exports = [
  {
    "name": "BIF Thumbnail Track example",
    "url": "http://hss-vod-aka-test.canal-bis.com/ondemand/test/bif/index.ism/Manifest",
    "transport": "smooth",
    "images": {
      "mimeType": "application/bif",
      "url": "http://dash-vod-aka-test.canal-bis.com/test/bif/index.bif",
    },
  },
  {
    "name": "DASH-IF Live Timeline",
    "url": "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/Manifest.mpd",
    "transport": "dash",
    "live": true,
  },
  {
    "name": "Unified Streaming Live",
    "url": "http://live.unified-streaming.com/loop/loop.isml/loop.mpd?format=mp4&session_id=25020",
    "transport": "dash",
    "live": true,
  },
  {
    "name": "Envivio",
    "url": "http://dash.edgesuite.net/envivio/dashpr/clear/Manifest.mpd",
    "transport": "dash",
  },
  {
    "name": "BaseURL support",
    "url": "http://194.4.235.2/live/disk/c8-hd/dash_aac_1080p50/c8-hd.mpd",
    "transport": "dash",
  },
];
