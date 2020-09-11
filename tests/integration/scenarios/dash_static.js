import { expect } from "chai";
import { stub } from "sinon";
import RxPlayer from "../../../src";
import XHRMock from "../../utils/request_mock";
import sleep from "../../utils/sleep";

import launchTestsForContent from "../utils/launch_tests_for_content.js";
import {
  manifestInfos as segmentTimelineManifestInfos,
  notStartingAt0ManifestInfos,
} from "../../contents/DASH_static_SegmentTimeline";
import {
  manifestInfos as segmentBaseManifestInfos,
} from "../../contents/DASH_static_SegmentBase_multi_codecs";
import brokenCencManifestInfos from "../../contents/DASH_static_broken_cenc_in_MPD";

describe("DASH non-linear content (SegmentTimeline)", function () {
  launchTestsForContent(segmentTimelineManifestInfos);
});

describe("DASH non-linear content multi-codecs (SegmentBase)", function () {
  launchTestsForContent(segmentBaseManifestInfos);
});

describe("DASH non-linear content not starting at 0 (SegmentTimeline)", function () {
  launchTestsForContent(notStartingAt0ManifestInfos);
});

describe.only("DASH content CENC wrong version in MPD", function () {
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
  let xhrMock;
  let stubs = [];
  beforeEach(() => {
  });
  afterEach(() => {
    if (player !== undefined) {
      player.dispose();
      player = undefined;
    }
    if (xhrMock !== undefined) {
      xhrMock.restore();
      xhrMock = undefined;
    }
    stubs.forEach(stub => stub.restore());
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
    xhrMock = new XHRMock();
    xhrMock.lock();
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
    await sleep(50);
    xhrMock.flush(); // MPD request
    await sleep(200);
    xhrMock.flush(); // init segment requests
    await sleep(50);
    expect(generateRequestStub.called).to.equal(true,
                                                "generateRequest was not called");
    expect(foundCencV1).to.equal(true,
                                 "should have found a CENC pssh v1");
    expect(foundOtherCencVersion).to
      .equal(false,
             "should not have found a CENC pssh other than v1");
  });
});
