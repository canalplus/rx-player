import { expect } from "chai";
import sinon from "sinon";
import RxPlayer from "../../../src";
import { mockManifestRequest } from "../utils/mock_requests.js";
import sleep from "../utils/sleep.js";
import Mock from "../mocks/dash-if_segment-timeline.js";

describe("dash live SegmentTimeline content", function () {
  let player;
  let fakeServer;

  beforeEach(() => {
    player = new RxPlayer();
    fakeServer = sinon.createFakeServer();
  });

  afterEach(() => {
    player.dispose();
    fakeServer.restore();
  });

  it("should fetch and parse the manifest", async function () {
    mockManifestRequest(fakeServer, Mock);
    player.loadVideo({ url: Mock.manifest.url, transport: "dash" });
    expect(fakeServer.requests.length).to.equal(1);
    await sleep(10);
    fakeServer.respond();
    await sleep(10);

    const manifest = player.getManifest();
    expect(manifest).not.to.equal(null);
    expect(typeof manifest).to.equal("object");
    expect(manifest.getDuration()).to.equal(Infinity);
    expect(manifest.transport).to.equal("dash");
    expect(typeof manifest.id).to.equal("string");
    expect(manifest.isLive).to.equal(true);
    expect(manifest.suggestedPresentationDelay).to.equal(10);
    expect(manifest.timeShiftBufferDepth).to.equal(300);
    expect(manifest.getUrl()).to.equal(Mock.manifest.url);
    expect(manifest.availabilityStartTime).to.equal(0);

    const adaptations = manifest.adaptations;

    expect(adaptations.audio.length).to.equal(1);
    expect(!!adaptations.audio[0].isAudioDescription).to.equal(false);
    expect(adaptations.audio[0].language).to.equal("eng");
    expect(adaptations.audio[0].normalizedLanguage).to.equal("eng");
    expect(adaptations.audio[0].type).to.equal("audio");
    expect(typeof adaptations.audio[0].id).to.equal("string");
    expect(adaptations.audio[0].id).to.not.equal(adaptations.video[0].id);
    expect(adaptations.audio[0].representations.length).to.equal(1);
    expect(adaptations.audio[0].getAvailableBitrates()).to.eql([48000]);

    expect(adaptations.video.length).to.equal(1);
    expect(adaptations.video[0].type).to.equal("video");
    expect(adaptations.video[0].getAvailableBitrates()).to.eql([300000]);

    const audioRepresentation = adaptations.audio[0].representations[0];
    expect(audioRepresentation.bitrate).to.equal(48000);
    expect(audioRepresentation.codec).to.equal("mp4a.40.2");
    expect(audioRepresentation.id).to.equal("A48");
    expect(audioRepresentation.mimeType).to.equal("audio/mp4");
    expect(typeof audioRepresentation.index).to.equal("object");

    const audioRepresentationIndex = audioRepresentation.index;
    const initAudioSegment = audioRepresentationIndex.getInitSegment();
    expect(initAudioSegment.media).to.equal("https://wowzaec2demo.streamlock.net/live/_definst_/bigbuckbunny/chunk_ctaudio_cfm4s_ridp0aa0br96257_cinit_w925796611_mpd.m4s");
    expect(initAudioSegment.id).to.equal("init");
    expect(initAudioSegment.mediaURL).to
      .equal("http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/init.mp4");

    const nextAudioSegment1 = audioRepresentationIndex
      .getSegments(1527507762, 5);
    expect(nextAudioSegment1.length).to.equal(1);
    expect(nextAudioSegment1[0].duration).to.equal(288768);
    expect(nextAudioSegment1[0].id).to.equal("73320372578304");
    expect(nextAudioSegment1[0].isInit).to.equal(false);
    expect(nextAudioSegment1[0].media).to.equal("https://wowzaec2demo.streamlock.net/live/_definst_/bigbuckbunny/chunk_ctaudio_cfm4s_ridp0aa0br96257_cs145136233968_w925796611_mpd.m4s");
    expect(nextAudioSegment1[0].time).to.equal(73320372578304);
    expect(nextAudioSegment1[0].timescale).to.equal(48000);
    expect(nextAudioSegment1[0].mediaURL).to
      .equal("http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320372578304.m4s");

    const nextAudioSegment2 = audioRepresentationIndex
      .getSegments(1527507762, 11);
    expect(nextAudioSegment2.length).to.equal(2);
    expect(nextAudioSegment2[1].duration).to.equal(287744);
    expect(nextAudioSegment2[1].id).to.equal("73320372867072");
    expect(nextAudioSegment2[1].isInit).to.equal(false);
    expect(nextAudioSegment2[1].media).to.equal("https://wowzaec2demo.streamlock.net/live/_definst_/bigbuckbunny/chunk_ctaudio_cfm4s_ridp0aa0br96257_cs145136713200_w925796611_mpd.m4s");
    expect(nextAudioSegment2[1].time).to.equal(73320372867072);
    expect(nextAudioSegment2[1].timescale).to.equal(48000);
    expect(nextAudioSegment2[1].mediaURL).to
      .equal("http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320372867072.m4s");

    expect(audioRepresentationIndex.getSegments(1527507762, 294).length)
      .to.equal(49);
    expect(audioRepresentationIndex.getSegments(1527507762, 295).length)
      .to.equal(50);
    expect(
      audioRepresentationIndex.getSegments(1527507762, 300000000000).length
    ).to.equal(50);

    const videoRepresentation = adaptations.video[0].representations[0];
    expect(videoRepresentation.bitrate).to.equal(300000);
    expect(videoRepresentation.codec).to.equal("avc1.64001e");
    expect(videoRepresentation.id).to.equal("V300");
    expect(videoRepresentation.height).to.equal(360);
    expect(videoRepresentation.width).to.equal(640);
    expect(videoRepresentation.mimeType).to.equal("video/mp4");
    expect(typeof videoRepresentation.index).to.equal("object");

    const videoRepresentationIndex = videoRepresentation.index;
    const initVideoSegment = videoRepresentationIndex.getInitSegment();
    expect(initVideoSegment.media).to.equal("https://wowzaec2demo.streamlock.net/live/_definst_/bigbuckbunny/chunk_ctvideo_cfm4s_ridp0va0br601392_cinit_w925796611_mpd.m4s");

    const initVideoSegment = videoRepresentationIndex.getInitSegment();
    expect(initVideoSegment.id).to.equal("init");
    expect(initVideoSegment.mediaURL).to
      .equal("http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/init.mp4");

    const nextVideoSegment1 = videoRepresentationIndex
      .getSegments(1527507762, 5);
    expect(nextVideoSegment1.length).to.equal(1);
    expect(nextVideoSegment1[0].duration).to.equal(540000);
    expect(nextVideoSegment1[0].id).to.equal("137475698580000");
    expect(nextVideoSegment1[0].isInit).to.equal(false);
    expect(nextVideoSegment1[0].media).to.equal("https://wowzaec2demo.streamlock.net/live/_definst_/bigbuckbunny/chunk_ctvideo_cfm4s_ridp0va0br601392_cs272130436800_w925796611_mpd.m4s");
    expect(nextVideoSegment1[0].time).to.equal(137475698580000);
    expect(nextVideoSegment1[0].timescale).to.equal(90000);
    expect(nextVideoSegment1[0].mediaURL).to
      .equal("http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/t137475698580000.m4s");

    const nextVideoSegment2 = videoRepresentationIndex
      .getSegments(1527507762, 11);
    expect(nextVideoSegment2.length).to.equal(2);
    expect(nextVideoSegment2[1].duration).to.equal(540000);
    expect(nextVideoSegment2[1].id).to.equal("137475699120000");
    expect(nextVideoSegment2[1].isInit).to.equal(false);
    expect(nextVideoSegment2[1].media).to.equal("https://wowzaec2demo.streamlock.net/live/_definst_/bigbuckbunny/chunk_ctvideo_cfm4s_ridp0va0br601392_cs272131336800_w925796611_mpd.m4s");
    expect(nextVideoSegment2[1].time).to.equal(137475699120000);
    expect(nextVideoSegment2[1].timescale).to.equal(90000);
    expect(nextVideoSegment2[1].mediaURL).to
      .equal("http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/t137475699120000.m4s");

    expect(videoRepresentationIndex.getSegments(1527507762, 294).length)
      .to.equal(49);
    expect(videoRepresentationIndex.getSegments(1527507762, 295).length)
      .to.equal(50);
    expect(
      videoRepresentationIndex.getSegments(1527507762, 300000000000).length
    ).to.equal(50);

    expect(fakeServer.requests.length).to.equal(3);
    const requestsDone = [
      fakeServer.requests[1].url,
      fakeServer.requests[2].url,
    ];
    expect(requestsDone).to.include(Mock.audio[0].init.url);
    expect(requestsDone).to.include(Mock.video[0].init.url);

    // TODO Do the init segment and the first needed segment in parallel
    // expect(fakeServer.requests.length).to.equal(5);

    // const requestsDone = [
    //   fakeServer.requests[1].url,
    //   fakeServer.requests[2].url,
    //   fakeServer.requests[3].url,
    //   fakeServer.requests[4].url,
    // ];

    // expect(requestsDone).to.include(Mock.audio[0].init.url);
    // expect(requestsDone).to.include(Mock.video[0].init.url);

    // let audioSegmentsDownloaded = 0;
    // let videoSegmentsDownloaded = 0;

    // const audioSegmentsUrl = Mock.audio[0].segments.map(s => s.url);
    // const videoSegmentsUrl = Mock.video[0].segments.map(s => s.url);
    // for (let i = 0; i < requestsDone.length; i++) {
    //   const url = requestsDone[i];
    //   if (audioSegmentsUrl.includes(url)) {
    //     audioSegmentsDownloaded++;
    //   }

    //   if (videoSegmentsUrl.includes(url)) {
    //     videoSegmentsDownloaded++;
    //   }
    // }

    // expect(audioSegmentsDownloaded).to.equal(1);
    // expect(videoSegmentsDownloaded).to.equal(1);
  });

  it("should list the right bitrates", async function () {
    mockManifestRequest(fakeServer, Mock);
    player.loadVideo({ url: Mock.manifest.url, transport: "dash" });

    await sleep(5);
    fakeServer.respond();
    await sleep(5);

    expect(player.getAvailableAudioBitrates()).to.eql([48000]);
    expect(player.getAvailableVideoBitrates()).to.eql([300000]);
  });

  it("should list the right languages", async function () {
    mockManifestRequest(fakeServer, Mock);
    player.loadVideo({ url: Mock.manifest.url, transport: "dash" });

    await sleep(5);
    fakeServer.respond();
    await sleep(5);

    const audioTracks = player.getAvailableAudioTracks();
    const textTracks = player.getAvailableTextTracks();

    expect(audioTracks.length).to.equal(1);
    expect(audioTracks[0].language).to.equal("eng");
    expect(audioTracks[0].normalized).to.equal("eng");
    expect(audioTracks[0].audioDescription).to.equal(false);
    expect(typeof audioTracks[0].id).to.equal("string");
    expect(audioTracks[0].id).to.not.equal("");
    expect(audioTracks[0].active).to.equal(true);

    expect(textTracks.length).to.equal(0);
  });
});
