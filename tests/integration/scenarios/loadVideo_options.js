/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { expect } from "chai";
import RxPlayer from "../../../src";
import { manifestInfos } from "../../contents/DASH_static_SegmentTimeline";
import sleep from "../../utils/sleep.js";
import /* waitForState, */ {
  waitForLoadedStateAfterLoadVideo,
} from "../../utils/waitForPlayerState";
import XHRMock from "../../utils/request_mock";

describe("loadVideo Options", () => {
  let player;
  let xhrMock;

  beforeEach(() => {
    player = new RxPlayer();
    xhrMock = new XHRMock();
  });

  afterEach(() => {
    player.dispose();
    xhrMock.restore();
  });

  describe("url", () => {
    it("should throw if no url is given", () => {
      expect(() => {
        player.loadVideo();
      }).to.throw();
      expect(() => {
        player.loadVideo({ transport: "dash", autoPlay: true });
      }).to.throw();
    });

    it("should request the URL if one is given", async () => {
      xhrMock.lock();
      player.loadVideo({
        url: manifestInfos.url,
        transport: "dash",
        autoPlay: true,
      });

      await sleep(0);

      expect(xhrMock.getLockedXHR().length).to.equal(1);
      expect(xhrMock.getLockedXHR()[0].url).to.equal(manifestInfos.url);
    });
  });

  describe("transport", () => {
    it("should throw if no transport is given", () => {
      expect(() => {
        player.loadVideo();
      }).to.throw();
      expect(() => {
        player.loadVideo({ url: manifestInfos.url });
      }).to.throw();
      expect(() => {
        player.loadVideo({ url: manifestInfos.url, autoPlay: true });
      }).to.throw();
    });
  });

  describe("autoPlay", () => {
    it("should keep state as LOADED (and not play) if autoPlay is not set", async () => {
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getPlayerState()).to.equal("LOADED");
      expect(player.getPosition()).to.be.below(0.1);
      await sleep(200);
      expect(player.getPlayerState()).to.equal("LOADED");
      expect(player.getPosition()).to.be.below(0.1);
    });

    it("should keep state as LOADED (and not play) if autoPlay is false", async () => {
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
        autoPlay: false,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getPlayerState()).to.equal("LOADED");
      expect(player.getPosition()).to.be.below(0.1);
      await sleep(200);
      expect(player.getPlayerState()).to.equal("LOADED");
      expect(player.getPosition()).to.be.below(0.1);
    });

    it("should set state as LOADED then to PLAYING (and play) if autoPlay is true", async () => {
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
        autoPlay: true,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getPlayerState()).to.equal("PLAYING");
      expect(player.getPosition()).to.be.below(0.1);
      await sleep(500);
      expect(player.getPosition()).to.be.above(0.2);
    });
  });

  describe("startAt", () => {
    describe("non-linear", () => {
      it("should seek at the right position if startAt.position is set", async function () {
        const startAt = 10;
        player.loadVideo({
          transport: manifestInfos.transport,
          url: manifestInfos.url,
          autoPlay: false,
          startAt: { position: startAt },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("LOADED");
        const initialPosition = player.getPosition();
        expect(initialPosition).to.be.closeTo(startAt, 0.5);
        await sleep(500);
        expect(player.getPosition()).to.equal(initialPosition);
      });

      it("should seek at the right position if startAt.wallClockTime is set", async function () {
        const startAt = 10;
        player.loadVideo({
          transport: manifestInfos.transport,
          url: manifestInfos.url,
          autoPlay: false,
          startAt: { wallClockTime: startAt },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("LOADED");
        const initialPosition = player.getPosition();
        expect(initialPosition).to.be.closeTo(startAt, 0.5);
        await sleep(500);
        expect(player.getPosition()).to.equal(initialPosition);
      });

      it("should seek at the right position if startAt.fromFirstPosition is set", async function () {
        const startAt = 10;
        player.loadVideo({
          transport: manifestInfos.transport,
          url: manifestInfos.url,
          autoPlay: false,
          startAt: { fromFirstPosition: startAt },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("LOADED");
        const initialPosition = player.getPosition();
        expect(initialPosition).to.be
          .closeTo(player.getMinimumPosition() + startAt, 0.5);
        await sleep(500);
        expect(player.getPosition()).to.equal(initialPosition);
      });

      it("should seek at the right position if startAt.fromLastPosition is set", async function () {
        const startAt = 10;
        player.loadVideo({
          transport: manifestInfos.transport,
          url: manifestInfos.url,
          autoPlay: false,
          startAt: { fromLastPosition: - startAt },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("LOADED");
        const initialPosition = player.getPosition();
        expect(initialPosition).to.be
          .closeTo(player.getMaximumPosition() - startAt, 0.5);
        await sleep(500);
        expect(player.getPosition()).to.equal(initialPosition);
      });

      it("should seek at the right position if startAt.percentage is set", async function () {
        player.loadVideo({
          transport: manifestInfos.transport,
          url: manifestInfos.url,
          autoPlay: false,
          startAt: { percentage: 30 },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("LOADED");
        const initialPosition = player.getPosition();
        expect(initialPosition).to.be
          .closeTo(player.getMaximumPosition() * 0.3, 0.5);
        await sleep(500);
        expect(player.getPosition()).to.equal(initialPosition);
      });

      it("should seek at the right position then play if startAt.position and autoPlay is set", async function () {
        const startAt = 10;
        player.loadVideo({
          transport: manifestInfos.transport,
          url: manifestInfos.url,
          autoPlay: true,
          startAt: { position: startAt },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("PLAYING");
        const initialPosition = player.getPosition();
        expect(initialPosition).to.be.closeTo(startAt, 0.5);
        await sleep(500);
        expect(player.getPosition()).to.be.above(initialPosition);
      });

      it("should seek at the right position then play if startAt.wallClockTime and autoPlay is set", async function () {
        const startAt = 10;
        player.loadVideo({
          transport: manifestInfos.transport,
          url: manifestInfos.url,
          autoPlay: true,
          startAt: { wallClockTime: startAt },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("PLAYING");
        const initialPosition = player.getPosition();
        expect(initialPosition).to.be.closeTo(startAt, 0.5);
        await sleep(500);
        expect(player.getPosition()).to.be.above(initialPosition);
      });

      it("should seek at the right position then play if startAt.fromFirstPosition and autoPlay is set", async function () {
        const startAt = 10;
        player.loadVideo({
          transport: manifestInfos.transport,
          url: manifestInfos.url,
          autoPlay: true,
          startAt: { fromFirstPosition: startAt },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("PLAYING");
        const initialPosition = player.getPosition();
        expect(initialPosition).to.be
          .closeTo(player.getMinimumPosition() + startAt, 0.5);
        await sleep(500);
        expect(player.getPosition()).to.be.above(initialPosition);
      });

      it("should seek at the right position then play if startAt.fromLastPosition and autoPlay is set", async function () {
        const startAt = 10;
        player.loadVideo({
          transport: manifestInfos.transport,
          url: manifestInfos.url,
          autoPlay: true,
          startAt: { fromLastPosition: - startAt },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("PLAYING");
        const initialPosition = player.getPosition();
        expect(initialPosition).to.be
          .closeTo(player.getMaximumPosition() - startAt, 0.5);
        await sleep(500);
        expect(player.getPosition()).to.be.above(initialPosition);
      });

      it("should seek at the right position then play if startAt.percentage and autoPlay is set", async function () {
        player.loadVideo({
          transport: manifestInfos.transport,
          url: manifestInfos.url,
          autoPlay: true,
          startAt: { percentage: 30 },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("PLAYING");
        const initialPosition = player.getPosition();
        expect(initialPosition).to.be
          .closeTo(player.getMaximumPosition() * 0.3, 0.5);
        await sleep(500);
        expect(player.getPosition()).to.be.above(initialPosition);
      });
    });
  });

  describe("transportOptions", () => {
    describe("representationFilter", () => {
      it("should filter out Representations", async () => {
        const videoRepresentations = manifestInfos
          .periods[0].adaptations.video[0].representations;
        const initialNumberOfRepresentations = videoRepresentations.length;
        expect(initialNumberOfRepresentations).to.be.above(1);
        const representationInTheMiddle = videoRepresentations[
          Math.floor(initialNumberOfRepresentations / 2)
        ];

        let numberOfTimeRepresentationFilterIsCalledForVideo = 0;
        player.loadVideo({
          transport: manifestInfos.transport,
          url: manifestInfos.url,
          transportOptions: {
            representationFilter(representation, infos) {
              if (infos.bufferType === "video") {
                numberOfTimeRepresentationFilterIsCalledForVideo++;
                return representation.bitrate <
                  representationInTheMiddle.bitrate;
              }
              return true;
            },
          },
        });
        await waitForLoadedStateAfterLoadVideo(player);

        expect(numberOfTimeRepresentationFilterIsCalledForVideo)
          .to.equal(initialNumberOfRepresentations);

        const currentVideoTrack = player.getAvailableVideoTracks()
          .find(track => track.active);

        expect(currentVideoTrack.representations).to.have.length(
          Math.floor(initialNumberOfRepresentations / 2)
        );
      });
    });

    describe("segmentLoader", () => {
      let numberOfTimeCustomSegmentLoaderWasCalled = 0;
      let numberOfTimeCustomSegmentLoaderWentThrough = 0;

      beforeEach(() => {
        numberOfTimeCustomSegmentLoaderWasCalled = 0;
        numberOfTimeCustomSegmentLoaderWentThrough = 0;
      });

      const customSegmentLoader = (infos, callbacks) => {
        numberOfTimeCustomSegmentLoaderWasCalled++;

        // we will only use this custom loader for videos segments.
        if (infos.context.type !== "video") {
          callbacks.fallback();
          return;
        }

        numberOfTimeCustomSegmentLoaderWentThrough++;
        const xhr = new XMLHttpRequest();
        const sendingTime = Date.now();

        xhr.onload = (r) => {
          if (200 <= xhr.status && xhr.status < 300) {
            const duration = Date.now() - sendingTime;
            const size = r.total;
            const data = xhr.response;
            callbacks.resolve({ duration, size, data });
          } else {
            const err = new Error("didn't work");
            err.xhr = xhr;
            callbacks.reject(err);
          }
        };

        xhr.onerror = () => {
          const err = new Error("didn't work");
          err.xhr = xhr;
          callbacks.reject(err);
        };

        xhr.open("GET", infos.url);
        xhr.responseType = "arraybuffer";

        const range = infos.context.segment.range;
        if (range) {
          if (range[1] && range[1] !== Infinity) {
            xhr.setRequestHeader("Range", `bytes=${range[0]}-${range[1]}`);
          } else {
            xhr.setRequestHeader("Range", `bytes=${range[0]}-`);
          }
        }

        xhr.send();

        return () => {
          xhr.abort();
        };
      };

      it("should pass through the custom segmentLoader for segment requests", async () => {
        xhrMock.lock();
        let nbVideoSegmentRequests = 0;
        player.loadVideo({
          transport: manifestInfos.transport,
          url: manifestInfos.url,
          transportOptions: { segmentLoader: customSegmentLoader },
        });

        await sleep(1);
        await xhrMock.flush(); // Manifest request
        await sleep(1);
        expect(numberOfTimeCustomSegmentLoaderWasCalled)
          .to.equal(4); // init + media Segment requests
        nbVideoSegmentRequests += xhrMock.getLockedXHR()
          .filter(r => r.url && r.url.includes("ateam-video"))
          .length;
        await xhrMock.flush();
        await sleep(1);
        expect(numberOfTimeCustomSegmentLoaderWasCalled)
          .to.equal(6); // Segment requests
        nbVideoSegmentRequests += xhrMock.getLockedXHR()
          .filter(r => r.url && r.url.includes("ateam-video"))
          .length;
        expect(numberOfTimeCustomSegmentLoaderWentThrough)
          .to.equal(nbVideoSegmentRequests);
        expect(nbVideoSegmentRequests).to.be.above(0);
      });
    });

    describe("manifestLoader", () => {
      let numberOfTimeCustomManifestLoaderWasCalled = 0;

      beforeEach(() => {
        numberOfTimeCustomManifestLoaderWasCalled = 0;
      });

      const customManifestLoader = (url, callbacks) => {
        numberOfTimeCustomManifestLoaderWasCalled++;
        const xhr = new XMLHttpRequest();
        const sendingTime = Date.now();

        xhr.onload = (r) => {
          if (200 <= xhr.status && xhr.status < 300) {
            const duration = Date.now() - sendingTime;
            const size = r.total;
            const data = xhr.response;
            callbacks.resolve({ duration, size, data });
          } else {
            const err = new Error("didn't work");
            err.xhr = xhr;
            callbacks.reject(err);
          }
        };

        xhr.onerror = () => {
          const err = new Error("didn't work");
          err.xhr = xhr;
          callbacks.reject(err);
        };

        xhr.open("GET", url);
        xhr.responseType = "document";

        xhr.send();

        return () => {
          xhr.abort();
        };
      };

      it("should pass through the custom manifestLoader for manifest requests", async () => {
        player.loadVideo({
          transport: manifestInfos.transport,
          url: manifestInfos.url,
          transportOptions: { manifestLoader: customManifestLoader },
        });
        await waitForLoadedStateAfterLoadVideo(player);

        expect(numberOfTimeCustomManifestLoaderWasCalled)
          .to.equal(1);
      });
    });
  });
});
