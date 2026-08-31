/* eslint-env node */

const BASE_MEDIA_URL = "/DASH_static_SegmentTimeline/media/dash/";
const PERIOD_COUNT = 100;
const VIDEO_ADAPTATION_COUNT = 4;
const VIDEO_REPRESENTATION_COUNT = 10;
const AUDIO_ADAPTATION_COUNT = 4;
const AUDIO_REPRESENTATION_COUNT = 4;
const TEXT_ADAPTATION_COUNT = 4;
const TEXT_REPRESENTATION_COUNT = 2;
const LANGUAGES = ["en", "fr", "de", "es"];

let periods = "";
for (let periodIndex = 0; periodIndex < PERIOD_COUNT; periodIndex++) {
  let adaptations = "";
  for (
    let adaptationIndex = 0;
    adaptationIndex < AUDIO_ADAPTATION_COUNT;
    adaptationIndex++
  ) {
    let representations = "";
    for (
      let representationIndex = 0;
      representationIndex < AUDIO_REPRESENTATION_COUNT;
      representationIndex++
    ) {
      representations += `
      <Representation id="audio-${periodIndex}-${adaptationIndex}-${representationIndex}" bandwidth="${96000 + representationIndex * 16000}" />`;
    }
    adaptations += `
    <AdaptationSet id="audio-${periodIndex}-${adaptationIndex}" contentType="audio" lang="${LANGUAGES[adaptationIndex]}" mimeType="audio/mp4" codecs="mp4a.40.2" audioSamplingRate="44100">
      <AudioChannelConfiguration schemeIdUri="urn:mpeg:dash:23003:3:audio_channel_configuration:2011" value="2" />
      <SegmentTemplate timescale="44100" initialization="${BASE_MEDIA_URL}ateam-audio=128000.dash" media="${BASE_MEDIA_URL}ateam-audio=128000-$Time$.dash">
        <SegmentTimeline><S t="0" d="177341" /></SegmentTimeline>
      </SegmentTemplate>${representations}
    </AdaptationSet>`;
  }

  for (
    let adaptationIndex = 0;
    adaptationIndex < TEXT_ADAPTATION_COUNT;
    adaptationIndex++
  ) {
    let representations = "";
    for (
      let representationIndex = 0;
      representationIndex < TEXT_REPRESENTATION_COUNT;
      representationIndex++
    ) {
      representations += `
      <Representation id="text-${periodIndex}-${adaptationIndex}-${representationIndex}" bandwidth="256" mimeType="text/vtt" />`;
    }
    adaptations += `
    <AdaptationSet id="text-${periodIndex}-${adaptationIndex}" contentType="text" lang="${LANGUAGES[adaptationIndex]}" subsegmentAlignment="true">
      <Role schemeIdUri="urn:mpeg:dash:role:2011" value="${adaptationIndex % 2 === 0 ? "main" : "alternate"}" />
      <SegmentTemplate timescale="1" media="${BASE_MEDIA_URL}ateam-text-$Time$.dash">
        <SegmentTimeline><S t="0" d="10" /></SegmentTimeline>
      </SegmentTemplate>${representations}
    </AdaptationSet>`;
  }

  for (
    let adaptationIndex = 0;
    adaptationIndex < VIDEO_ADAPTATION_COUNT;
    adaptationIndex++
  ) {
    let representations = "";
    for (
      let representationIndex = 0;
      representationIndex < VIDEO_REPRESENTATION_COUNT;
      representationIndex++
    ) {
      representations += `
        <Representation id="video-${periodIndex}-${adaptationIndex}-${representationIndex}" bandwidth="${400000 + representationIndex * 1000}" width="640" height="360" />`;
    }
    adaptations += `
    <AdaptationSet id="video-${periodIndex}-${adaptationIndex}" contentType="video" mimeType="video/mp4" codecs="avc1.4D401E" segmentAlignment="true">
      <SegmentTemplate timescale="90000" initialization="${BASE_MEDIA_URL}ateam-video=400000.dash" media="${BASE_MEDIA_URL}ateam-video=400000-$Time$.dash">
        <SegmentTimeline><S t="0" d="360360" /></SegmentTimeline>
      </SegmentTemplate>${representations}
    </AdaptationSet>`;
  }

  periods += `
  <Period id="period-${periodIndex}" start="PT${periodIndex * 4}S" duration="PT4S">${adaptations}
  </Period>`;
}

const manifest = `<?xml version="1.0" encoding="utf-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static" mediaPresentationDuration="PT${PERIOD_COUNT * 4}S" minBufferTime="PT1S" profiles="urn:mpeg:dash:profile:isoff-live:2011">${periods}
</MPD>`;

export default [
  {
    url: "/DASH_static_Large_MultiPeriod/manifest.mpd",
    data: manifest,
    contentType: "application/dash+xml",
  },
];
