export default [
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
    "name": "DASH-IF Multi-Subtitles",
    "url": "http://vm2.dashif.org/dash/vod/testpic_2s/multi_subs.mpd",
    "transport": "dash",
    "live": true,
  },
  {
    "name": "IRTDash Subtitles",
    "url": "http://irtdashreference-i.akamaihd.net/dash/live/901161/bfs/manifestARD.mpd",
    "transport": "dash",
    "live": true,
  },
  {
    "name": "Elephant Dream Subtitles",
    "url": "http://dash.edgesuite.net/akamai/test/caption_test/ElephantsDream/elephants_dream_480p_heaac5_1.mpd",
    "transport": "dash",
    "live": true,
  },
  {
    "name": "Testcard Audio-only",
    "url": "http://rdmedia.bbc.co.uk/dash/ondemand/testcard/1/client_manifest-audio.mpd",
    "transport": "dash",
    "live": true,
  },
  {
    "name": "DASH-IF Audio-only",
    "url": "http://vm2.dashif.org/livesim/testpic_2s/audio.mpd",
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
    "name": "Envivio DASH",
    "url": "http://dash.edgesuite.net/envivio/EnvivioDash3/manifest.mpd",
    "transport": "dash",
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
  {
    "name": "Super SpeedWay",
    "url": "http://playready.directtaps.net/smoothstreaming/SSWSS720H264/SuperSpeedway_720.ism/Manifest",
    "transport": "smooth",
  },
  {
    "name": "Taxi 3 SoundTrack (Audio-Only)",
    "url": "http://playready.directtaps.net/smoothstreaming/ISMAAACLC/Taxi3_AACLC.ism/Manifest",
    "transport": "smooth",
  },
  {
    "name": "Multi-Period (5 Periods of 2 min)",
    "url": "https://download.tsi.telecom-paristech.fr/gpac/DASH_CONFORMANCE/TelecomParisTech/mp4-live-periods/mp4-live-periods-mpd.mpd",
    "transport": "dash",
    "live": false,
  },
  {
    "name": "Big Buck Bunny WEBM",
    "url": "http://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4",
    "transport": "directfile",
    "live": false,
  },
  {
    "name": "Big Buck Bunny MP4",
    "url": "http://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4",
    "transport": "directfile",
    "live": false,
  },
  {
    "name": "Wikipedia test OGG (AUDIO ONLY)",
    "url": "https://upload.wikimedia.org/wikipedia/commons/f/f2/Median_test.ogg",
    "transport": "directfile",
    "live": false,
  },
];
