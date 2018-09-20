import MetaPlaylistDASHSmoothURL from "./metaplaylist_url";

export interface IDrmInfo {
  licenseServerUrl: string;
  drm: string;
  serverCertificateUrl?: string | null;
  customKeySystem?: string | null;
}

export interface IDefaultContent {
  name: string;
  url: string;
  transport: string;
  live: boolean;
  drmInfos?: IDrmInfo[];
}

const DEFAULT_CONTENTS: IDefaultContent[] = [
  {
    name: "HLS Demo 1 BitMovin",
    url: "https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s-fmp4/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8",
    transport: "hls",
    live: false,
  },
  {
    name: "HLS Demo 2 Google",
    url: "https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8",
    transport: "hls",
    live: false,
  },
  {
    name: "Tears of Steel (clear)",
    url: "https://www.bok.net/dash/tears_of_steel/cleartext/stream.mpd",
    transport: "dash",
    live: false,
  },
  {
    name: "Axinom CMAF multiple Audio and Text tracks Tears of steel",
    url: "https://media.axprod.net/TestVectors/Cmaf/clear_1080p_h264/manifest.mpd",
    transport: "dash",
    live: false,
  },
  {
    name: "Multiple audio language",
    url: "https://dash.akamaized.net/dash264/TestCasesIOP41/MultiTrack/alternative_content/6/manifest_alternative_lang.mpd",
    transport: "dash",
    live: false,
  },
  {
    name: "DASH-IF - Trickmode",
    url: "https://dash.akamaized.net/dash264/TestCases/9b/qualcomm/1/MultiRate.mpd",
    transport: "dash",
    live: false,
  },
  {
    name: "DASH-IF - Multi-Subtitles",
    url: "https://livesim.dashif.org/dash/vod/testpic_2s/multi_subs.mpd",
    transport: "dash",
    live: false,
  },
  {
    name: "DASH-IF - Audio-only",
    url: "https://dash.akamaized.net/dash264/TestCases/3a/fraunhofer/aac-lc_stereo_without_video/Sintel/sintel_audio_only_aaclc_stereo_sidx.mpd",
    transport: "dash",
    live: false,
  },
  {
    name: "DASH IF - SegmentTemplate",
    url: "https://livesim.dashif.org/livesim/testpic_2s/Manifest.mpd",
    transport: "dash",
    live: true,
  },
  {
    name: "DASH IF - SegmentTimeline",
    url: "https://livesim.dashif.org/livesim/segtimeline_1/testpic_2s/Manifest.mpd",
    transport: "dash",
    live: true,
  },
  {
    name: "Super SpeedWay",
    url: "https://playready.directtaps.net/smoothstreaming/SSWSS720H264/SuperSpeedway_720.ism/Manifest",
    transport: "smooth",
    live: false,
  },
  {
    name: "Big Buck Bunny",
    url: "https://amssamples.streaming.mediaservices.windows.net/683f7e47-bd83-4427-b0a3-26a6c4547782/BigBuckBunny.ism/manifest",
    transport: "smooth",
    live: false,
  },
  {
    name: "Taxi 3 SoundTrack (Audio-Only)",
    url: "https://playready.directtaps.net/smoothstreaming/ISMAAACLC/Taxi3_AACLC.ism/Manifest",
    transport: "smooth",
    live: false,
  },
  {
    name: "Multi-Period (5 Periods of 2 min)",
    url: "https://download.tsi.telecom-paristech.fr/gpac/DASH_CONFORMANCE/TelecomParisTech/mp4-live-periods/mp4-live-periods-mpd.mpd",
    transport: "dash",
    live: false,
  },
  {
    name: "Big Buck Bunny WEBM",
    url: "https://upload.wikimedia.org/wikipedia/commons/transcoded/8/88/Big_Buck_Bunny_alt.webm/Big_Buck_Bunny_alt.webm.360p.webm",
    transport: "directfile",
    live: false,
  },
  {
    name: "Big Buck Bunny MP4",
    url: "http://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4",
    transport: "directfile",
    live: false,
  },
  {
    name: "Wikipedia test OGG (AUDIO ONLY)",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/f2/Median_test.ogg",
    transport: "directfile",
    live: false,
  },
  {
    name: "Google - Sintel webm only",
    url: "https://storage.googleapis.com/shaka-demo-assets/sintel-webm-only/dash.mpd",
    transport: "dash",
    live: false,
  },
  {
    name: "Multi Video Tracks",
    url: "https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd",
    transport: "dash",
    live: false,
  },
  {
    name: "Mix of DASH and Smooth VOD Contents",
    url: MetaPlaylistDASHSmoothURL,
    transport: "metaplaylist",
    live: false,
  },
];
export default DEFAULT_CONTENTS;
