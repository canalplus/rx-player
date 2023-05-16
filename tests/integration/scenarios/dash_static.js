import { expect } from "chai";
import { stub } from "sinon";
import RxPlayer from "../../../dist/es2017";
import launchTestsForContent from "../utils/launch_tests_for_content.js";
import sleep from "../../utils/sleep.js";
import waitForPlayerState from "../../utils/waitForPlayerState";
import {
  manifestInfos as segmentTimelineManifestInfos,
  notStartingAt0ManifestInfos,
  segmentTemplateInheritanceASRep,
  segmentTemplateInheritancePeriodAS,
} from "../../contents/DASH_static_SegmentTimeline";
import brokenCencManifestInfos from "../../contents/DASH_static_broken_cenc_in_MPD";
import {
  brokenSidxManifestInfos,
  multiCodecsManifestInfos as segmentBaseMultiCodecsInfos,
} from "../../contents/DASH_static_SegmentBase";
import {
  manifestInfos as numberBasedTimelineManifestInfos,
} from "../../contents/DASH_static_number_based_SegmentTimeline";

describe("DASH non-linear content (SegmentTimeline)", function () {
  launchTestsForContent(segmentTimelineManifestInfos);
});

describe("DASH non-linear content multi-codecs (SegmentBase)", function () {
  launchTestsForContent(segmentBaseMultiCodecsInfos);
});

describe("DASH non-linear content not starting at 0 (SegmentTimeline)", function () {
  launchTestsForContent(notStartingAt0ManifestInfos);
});

describe("DASH non-linear content with SegmentTemplate inheritance (Period-AdaptationSet)", function () {
  launchTestsForContent(segmentTemplateInheritancePeriodAS);
});

describe("DASH non-linear content with SegmentTemplate inheritance (AdaptationSet-Representation)", function () {
  launchTestsForContent(segmentTemplateInheritanceASRep);
});

describe("DASH content CENC wrong version in MPD", function () {
  /**
   * Translate groups of 4 big-endian bytes to Integer.
   * @param {Uint8Array} bytes
   * @param {Number} offset - The offset (from the start of the given array)
   * @returns {Number}
   */
  function be4toi(bytes, offset) {
    return ((bytes[offset + 0] * 0x1000000) +
            (bytes[offset + 1] * 0x0010000) +
            (bytes[offset + 2] * 0x0000100) +
            (bytes[offset + 3]));
  }
  let player;
  let stubs = [];
  beforeEach(() => {
  });
  afterEach(() => {
    if (player !== undefined) {
      player.dispose();
      player = undefined;
    }
    stubs.forEach(declaredStub => declaredStub.restore());
    stubs = [];
  });
  it("should filter out CENC pssh with a wrong version", async function() {
    if (window.MediaKeySession === undefined ||
        window.MediaKeySession === null)
    {
      /* eslint-disable no-console */
      console.warn("Cannot test with a wrong CENC version: no MediaKeySession implementation on this browser");
      /* eslint-enable no-console */
      return;
    }
    let foundCencV1 = false;
    let foundOtherCencVersion = false;
    player = new RxPlayer();
    const generateRequestStub = stub(window.MediaKeySession.prototype, "generateRequest")
      .callsFake((_initDataType, initData) => {
        let offset = 0;
        while (offset < initData.length) {
          const size = be4toi(initData, offset);
          if (be4toi(initData, offset + 4) === 0x70737368) {
            // CENC system id
            if (initData[offset + 12] === 0x10 &&
                initData[offset + 13] === 0x77 &&
                initData[offset + 14] === 0xEF &&
                initData[offset + 15] === 0xEC &&
                initData[offset + 16] === 0xC0 &&
                initData[offset + 17] === 0xB2 &&
                initData[offset + 18] === 0x4D &&
                initData[offset + 19] === 0x02 &&
                initData[offset + 20] === 0xAC &&
                initData[offset + 21] === 0xE3 &&
                initData[offset + 22] === 0x3C &&
                initData[offset + 23] === 0x1E &&
                initData[offset + 24] === 0x52 &&
                initData[offset + 25] === 0xE2 &&
                initData[offset + 26] === 0xFB &&
                initData[offset + 27] === 0x4B)
            {
              const version = initData[offset + 8];
              if (version === 1) {
                foundCencV1 = true;
              } else {
                foundOtherCencVersion = true;
              }
            }
          }
          offset += size;
        }
        return Promise.resolve();
      });
    stubs.push(generateRequestStub);

    player.loadVideo({ transport: brokenCencManifestInfos.transport,
                       url: brokenCencManifestInfos.url,
                       keySystems: [
                         {
                           type: "org.w3.clearkey",
                           getLicense() {
                             throw new Error("Should not have been called.");
                           },
                         },
                         {
                           type: "com.widevine.alpha",
                           getLicense() {
                             throw new Error("Should not have been called.");
                           },
                         },
                         {
                           type: "com.microsoft.playready",
                           getLicense() {
                             throw new Error("Should not have been called.");
                           },
                         },
                       ] });
    await sleep(200);
    expect(generateRequestStub.called).to.equal(true,
                                                "generateRequest was not called");
    expect(foundCencV1).to.equal(true,
                                 "should have found a CENC pssh v1");
    expect(foundOtherCencVersion).to
      .equal(false,
             "should not have found a CENC pssh other than v1");
  });
});

describe("DASH non-linear content with a \"broken\" sidx", function() {
  it("should fix the broken byte-range of the last segment with the right option", async function() {
    this.timeout(20 * 1000);

    function isBrokenVideoSegment(url) {
      const segmentExpectedUrlEnd = "v-0144p-0100k-libx264_broken_sidx.mp4";
      return typeof url === "string" &&
             url.substring(url.length - segmentExpectedUrlEnd.length) ===
               segmentExpectedUrlEnd;
    }

    const player = new RxPlayer();

    const requestedManifests = [];
    const requestedSegments = [];
    const manifestLoader = (man, callbacks) => {
      requestedManifests.push(man.url);
      callbacks.fallback();
    };
    const segmentLoader = (info, callbacks) => {
      requestedSegments.push(info);
      callbacks.fallback();
    };

    player.setWantedBufferAhead(1);

    // Play a first time without the option
    player.loadVideo({
      url: brokenSidxManifestInfos.url,
      transport: brokenSidxManifestInfos.transport,
      checkMediaSegmentIntegrity: true,
      autoPlay: false,
      manifestLoader,
      segmentLoader,
    });
    await waitForPlayerState(player, "LOADED");

    requestedSegments.length = 0;
    player.seekTo(player.getMaximumPosition() - 1);
    await sleep(10);
    player.setWantedBufferAhead(30);
    await sleep(50);

    expect(requestedSegments.length).to.be.at.least(2);
    const foundTruncatedVideoSegment = requestedSegments
      .some(seg => {
        return isBrokenVideoSegment(seg.url) &&
               seg.byteRanges.some(byteRange =>
                 byteRange[0] === 696053 &&
                 byteRange[1] === 746228);
      });
    expect(foundTruncatedVideoSegment)
      .to.equal(true,
                "should have requested the video segment with a bad range initially");

    player.setWantedBufferAhead(1);

    // Play a second time with the option
    player.loadVideo({
      url: brokenSidxManifestInfos.url,
      transport: brokenSidxManifestInfos.transport,
      checkMediaSegmentIntegrity: true,
      __priv_patchLastSegmentInSidx: true,
      autoPlay: false,
      manifestLoader,
      segmentLoader,
    });
    await waitForPlayerState(player, "LOADED");

    requestedSegments.length = 0;
    player.seekTo(player.getMaximumPosition() - 1);
    await sleep(10);
    player.setWantedBufferAhead(30);
    await sleep(50);

    expect(requestedSegments.length).to.be.at.least(2);
    const foundFixedVideoSegment = requestedSegments
      .some(seg => {
        return isBrokenVideoSegment(seg.url) &&
               seg.byteRanges.some(byteRange =>
                 byteRange[0] === 696053 &&
                 byteRange[1] === Infinity);
      });

    expect(foundFixedVideoSegment)
      .to.equal(true,
                "should have fixed the video segment with a bad range");
    player.dispose();
  });
});

describe("DASH non-linear content with number-based SegmentTimeline", function () {
  let player;
  beforeEach(() => {
    player = new RxPlayer();
  });

  afterEach(() => {
    player.dispose();
  });

  it("should correctly parse DASH number-based SegmentTimeline", async function () {
    const requestedManifests = [];
    const requestedSegments = [];
    const manifestLoader = (man, callbacks) => {
      requestedManifests.push(man.url);
      callbacks.fallback();
    };
    const segmentLoader = (info, callbacks) => {
      requestedSegments.push(info.url);
      callbacks.fallback();
    };
    player.loadVideo({
      url: numberBasedTimelineManifestInfos.url,
      transport: numberBasedTimelineManifestInfos.transport,
      manifestLoader,
      segmentLoader,
    });

    expect(requestedManifests).to.have.length(1);
    expect(requestedSegments).to.be.empty;
    expect(requestedManifests[0])
      .to.equal(numberBasedTimelineManifestInfos.url);
    expect(player.getPlayerState()).to.equal("LOADING");

    await sleep(100);

    // segment requests should be pending
    expect(requestedSegments.length).to.be.at.least(1);
    expect(requestedSegments).to
      .include("http://127.0.0.1:3000/DASH_static_number_based_SegmentTimeline/media/video_190_avc-1.mp4");
    expect(requestedSegments).to
      .include("http://127.0.0.1:3000/DASH_static_number_based_SegmentTimeline/media/audio_64_aaclc_fra-1.ts");
  });
});
