import { afterEach, beforeEach, describe, expect, it } from "vitest";
import RxPlayer from "../../../dist/es2017";
import { EMBEDDED_DASH_WASM } from "../../../dist/es2017/__GENERATED_CODE/index.js";
import { MULTI_THREAD } from "../../../dist/es2017/experimental/features/index.js";
import selfInitializingContent from "../../contents/static/DASH_static_SelfInitializing";
import TestWorkerEmbed from "../../embedded_worker_bundle";
import { checkAfterSleepWithBackoff } from "../../utils/checkAfterSleepWithBackoff.js";
import { waitForLoadedStateAfterLoadVideo } from "../../utils/waitForPlayerState";

runSelfInitializingSegmentTests();
runSelfInitializingSegmentTests({ multithread: true });

function runSelfInitializingSegmentTests({ multithread } = {}) {
  let title = "DASH self-initializing segments";
  if (multithread === true) {
    RxPlayer.addFeatures([MULTI_THREAD]);
    title += " with worker";
  }

  describe(title, () => {
    let player;
    let textTrackElement;

    beforeEach(() => {
      player = new RxPlayer();
      textTrackElement = document.createElement("div");
      document.body.appendChild(textTrackElement);
      if (multithread === true) {
        player.attachWorker({
          workerUrl: TestWorkerEmbed,
          dashWasmUrl: EMBEDDED_DASH_WASM,
        });
      }
    });

    afterEach(() => {
      player.dispose();
      textTrackElement.remove();
    });

    it("should load plain text segments without initialization", async () => {
      player.loadVideo({
        url: selfInitializingContent.url,
        transport: selfInitializingContent.transport,
        mode: multithread === true ? "multithread" : "main",
        textTrackMode: "html",
        textTrackElement,
      });
      await waitForLoadedStateAfterLoadVideo(player);

      const textTracks = player.getAvailableTextTracks();
      expect(textTracks).toHaveLength(3);

      await checkTextTrack("en", "The duration-based SegmentTemplate was loaded.");
      await checkTextTrack("fr", "The SegmentTimeline was loaded.");
      await checkTextTrack("de", "The SegmentList was loaded.");

      async function checkTextTrack(language, expectedText) {
        const track = textTracks.find((textTrack) => textTrack.language === language);
        expect(track).not.toBeUndefined();
        player.setTextTrack(track.id);
        await checkAfterSleepWithBackoff({ maxTimeMs: 5000, stepMs: 100 }, () => {
          expect(textTrackElement.textContent).toContain(expectedText);
        });
      }
    });
  });
}
