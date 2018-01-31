export default [
  {
    "name": "DASH multiperiod",
    "url": "https://download.tsi.telecom-paristech.fr/gpac/DASH_CONFORMANCE/TelecomParisTech/mp4-live-periods/mp4-live-periods-mpd.mpd",
    "transport": "dash",
    "live": false,
  },
  {
    "name": "BIF Thumbnail Track example",
    "url": "http://hss-vod-aka-test.canal-bis.com/ondemand/test/bif/index.ism/Manifest",
    "transport": "smooth",
    "supplementaryImageTracks": {
      "mimeType": "application/bif",
      "url": "http://dash-vod-aka-test.canal-bis.com/test/bif/index.bif",
    },
  },
  {
    "name": "DASH-IF SegmentTimeline",
    "url": "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/Manifest.mpd",
    "transport": "dash",
    "live": true,
  },
  {
    "name": "DASH-IF SegmentTemplate",
    "url": "http://vm2.dashif.org/livesim-dev/periods_1/testpic_2s/Manifest.mpd",
    "transport": "dash",
    "live": true,
  },
  {
    "name": "Big Buck Bunny Wowza",
    "url": "https://wowzaec2demo.streamlock.net/live/_definst_/bigbuckbunny/manifest_mpm4sav_mvtime_w925796611.mpd",
    "transport": "dash",
    "live": true,
  },
  {
    "name": "Unified Streaming - Timeline - A-Team",
    "url": "http://demo.unified-streaming.com/video/ateam/ateam.ism/ateam.mpd",
    "transport": "dash",
  },
  {
    "name": "Smooth Ingest",
    "url": "http://b028.wpc.azureedge.net/80B028/Samples/a38e6323-95e9-4f1f-9b38-75eba91704e4/5f2ce531-d508-49fb-8152-647eba422aec.ism/manifest",
    "transport": "smooth",
    "live": true,
  },
];
