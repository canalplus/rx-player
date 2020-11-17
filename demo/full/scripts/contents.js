import MetaPlaylistDASHSmoothURL from "./metaplaylist_url";

export default [
  {
    "name": "Tears of Steel (clear)",
    "url": "https://www.bok.net/dash/tears_of_steel/cleartext/stream.mpd",
    "transport": "dash",
    "live": false,
  },
  {
    "name": "Tears of Steel (DRM Widevine)",
    "url": "https://demo.unified-streaming.com/video/tears-of-steel/tears-of-steel-dash-widevine.ism/.mpd",
    "transport": "dash",
    "live": false,
    "drmInfos": [{
      "licenseServerUrl": "https://cwip-shaka-proxy.appspot.com/no_auth",
      "drm": "Widevine",
    }],
  },
  {
    "name": "Tears of Steel (DRM PlayReady)",
    "url": "https://demo.unified-streaming.com/video/tears-of-steel/tears-of-steel-dash-playready.ism/.mpd",
    "transport": "dash",
    "live": false,
    "drmInfos": [{
      "licenseServerUrl": "https://test.playready.microsoft.com/service/rightsmanager.asmx?PlayRight=1&UseSimpleNonPersistentLicense=1",
      "drm": "Playready",
    }],
  },
  {
    "name": "BBC - presentationTimeOffset on audio and video",
    "url": "http://rdmedia.bbc.co.uk/dash/ondemand/testcard/1/client_manifest-pto_both-events.mpd",
    "transport": "dash",
    "live": false,
  },
  {
    "name": "DASH-IF - Multi-Subtitles",
    "url": "https://livesim.dashif.org/dash/vod/testpic_2s/multi_subs.mpd",
    "transport": "dash",
    "live": false,
  },
  {
    "name": "BBC - Testcard Audio-only",
    "url": "http://rdmedia.bbc.co.uk/dash/ondemand/testcard/1/client_manifest-audio.mpd",
    "transport": "dash",
    "live": false,
  },
  {
    "name": "DASH-IF - Audio-only",
    "url": "https://dash.akamaized.net/dash264/TestCases/3a/fraunhofer/aac-lc_stereo_without_video/Sintel/sintel_audio_only_aaclc_stereo_sidx.mpd",
    "transport": "dash",
    "live": false,
  },
  {
    "name": "DASH IF - SegmentTemplate",
    "url": "https://livesim.dashif.org/livesim/testpic_2s/Manifest.mpd",
    "transport": "dash",
    "live": true,
  },
  {
    "name": "DASH IF - SegmentTimeline",
    "url": "https://livesim.dashif.org/livesim/segtimeline_1/testpic_2s/Manifest.mpd",
    "transport": "dash",
    "live": true,
  },
  {
    "name": "Envivio - DASH",
    "url": "http://dash.edgesuite.net/envivio/EnvivioDash3/manifest.mpd",
    "transport": "dash",
  },
  {
    "name": "Unified Streaming - Timeline - A-Team",
    "url": "https://demo.unified-streaming.com/video/ateam/ateam.ism/ateam.mpd",
    "transport": "dash",
  },
  {
    "name": "Super SpeedWay",
    "url": "https://playready.directtaps.net/smoothstreaming/SSWSS720H264/SuperSpeedway_720.ism/Manifest",
    "transport": "smooth",
  },
  {
    "name": "Big Buck Bunny",
    "url": "https://amssamples.streaming.mediaservices.windows.net/683f7e47-bd83-4427-b0a3-26a6c4547782/BigBuckBunny.ism/manifest",
    "transport": "smooth",
  },
  // {
  //   "name": "Microsoft: XBoxOne Ad",
  //   "url": "https://profficialsite.origin.mediaservices.windows.net/9cc5e871-68ec-42c2-9fc7-fda95521f17d/dayoneplayready.ism/manifest",
  //   "transport": "smooth",
  //   "live": false,
  //   "drmInfos": [{
  //     "licenseServerUrl": "https://test.playready.microsoft.com/service/rightsmanager.asmx?PlayRight=1&UseSimpleNonPersistentLicense=1",
  //     "drm": "Playready",
  //   }],
  // },
  {
    "name": "Smooth Ingest",
    "url": "https://b028.wpc.azureedge.net/80B028/Samples/a38e6323-95e9-4f1f-9b38-75eba91704e4/5f2ce531-d508-49fb-8152-647eba422aec.ism/manifest",
    "transport": "smooth",
    "live": true,
  },
  {
    "name": "Taxi 3 SoundTrack (Audio-Only)",
    "url": "https://playready.directtaps.net/smoothstreaming/ISMAAACLC/Taxi3_AACLC.ism/Manifest",
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
    "url": "https://upload.wikimedia.org/wikipedia/commons/transcoded/8/88/Big_Buck_Bunny_alt.webm/Big_Buck_Bunny_alt.webm.360p.webm",
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
  {
    "name": "Google - Sintel webm only",
    "url": "https://storage.googleapis.com/shaka-demo-assets/sintel-webm-only/dash.mpd",
    "transport": "dash",
    "live": false,
  },
  {
    "name": "Multi Video Tracks",
    "url": "https://utils.ssl.cdn.cra.cz/dash/1/manifest.mpd",
    "transport": "dash",
    "live": false,
  },
  {
    "name": "Mix of DASH and Smooth VOD Contents",
    "url": MetaPlaylistDASHSmoothURL,
    "transport": "metaplaylist",
  },
];
