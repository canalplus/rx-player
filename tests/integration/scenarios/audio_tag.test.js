import { describe, beforeEach, afterEach, it, expect } from "vitest";
import RxPlayer from "../../../dist/es2017";
import { MULTI_THREAD } from "../../../dist/es2017/features/list/index.js";
import { EMBEDDED_DASH_WASM } from "../../../dist/es2017/__GENERATED_CODE/index.js";
import TestWorkerEmbed from "../../embedded_worker_bundle";
import {
  audioOnlyManifestInfos,
  audioVideoManifestInfos,
} from "../../contents/static/DASH_static_audio_tag";
import { checkAfterSleepWithBackoff } from "../../utils/checkAfterSleepWithBackoff.js";
import { lockLowestBitrates } from "../../utils/bitrates";
import { waitForLoadedStateAfterLoadVideo } from "../../utils/waitForPlayerState";

runAudioTagTests();
runAudioTagTests({ multithread: true });

function runAudioTagTests({ multithread } = {}) {
  let title = "playback through an audio element";
  if (multithread === true) {
    RxPlayer.addFeatures([MULTI_THREAD]);
    title = "playback through an audio element with worker";
  }

  describe(title, function () {
    let audioElement;
    let player;

    beforeEach(() => {
      audioElement = document.createElement("audio");
      document.body.appendChild(audioElement);
      player = new RxPlayer({ videoElement: audioElement });
      if (multithread === true) {
        player.attachWorker({
          workerUrl: TestWorkerEmbed,
          dashWasmUrl: EMBEDDED_DASH_WASM,
        });
      }
    });

    afterEach(() => {
      player.dispose();
      audioElement.remove();
    });

    it("should play audio-only content on an audio element", async function () {
      lockLowestBitrates(player);
      player.loadVideo({
        url: audioOnlyManifestInfos.url,
        transport: audioOnlyManifestInfos.transport,
        autoPlay: true,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getVideoElement().nodeName).to.equal("AUDIO");

      await player.play();
      await checkAfterSleepWithBackoff({ stepMs: 100, maxTimeMs: 10000 }, () => {
        assertAudioElementIsReadyForPlayback(player);
      });
    });

    it("should ignore video data and play audio on an audio element", async function () {
      lockLowestBitrates(player);
      const requestedSegments = [];
      const videoInitSegmentUrl =
        audioVideoManifestInfos.periods[0].adaptations.video[0].representations[0].index
          .init.url;

      if (multithread === true) {
        const workerInterface = player.getWorkerInterface();
        expect(workerInterface).not.toBeNull();
        workerInterface.addMessageListener("segment-loader", (info) => {
          requestedSegments.push(info.url);
        });
      }

      player.loadVideo({
        url: audioVideoManifestInfos.url,
        transport: audioVideoManifestInfos.transport,
        autoPlay: true,
        segmentLoader: {
          fn: (info, callbacks) => {
            requestedSegments.push(info.url);
            callbacks.fallback();
          },
          workerId: "default-segment-loader",
        },
      });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getVideoElement().nodeName).to.equal("AUDIO");
      expect(requestedSegments).not.toContain(videoInitSegmentUrl);

      await player.play();
      await checkAfterSleepWithBackoff({ stepMs: 100, maxTimeMs: 10000 }, () => {
        assertAudioElementIsReadyForPlayback(player);
        expect(requestedSegments).not.toContain(videoInitSegmentUrl);
      });
    });
  });
}

function assertAudioElementIsReadyForPlayback(player) {
  const mediaElement = player.getVideoElement();
  expect(player.isPaused()).to.equal(false);
  expect(player.getCurrentBufferGap()).to.be.above(0);
  expect(mediaElement.buffered.length).to.be.above(0);

  const position = player.getPosition();
  if (position > 0) {
    expect(mediaElement.buffered.start(0)).to.be.below(position);
  } else {
    // Headless Firefox on CI can keep the audio element's clock at 0 despite
    // having enough buffered data to start playback, so don't over-specify it.
    expect(mediaElement.readyState).to.be.at.least(1);
  }
}
