import { afterEach, beforeEach, describe, expect, it } from "vitest";
import RxPlayer from "../../../dist/es2017";
import { MULTI_THREAD } from "../../../dist/es2017/experimental/features/index.js";
import { EMBEDDED_DASH_WASM } from "../../../dist/es2017/__GENERATED_CODE/index.js";
import thumbnailInfos from "../../contents/static/DASH_static_SegmentTimeline/thumbnails.js";
import TestWorkerEmbed from "../../embedded_worker_bundle";
import { checkAfterSleepWithBackoff } from "../../utils/checkAfterSleepWithBackoff.js";
import sleep from "../../utils/sleep.js";
import { waitForLoadedStateAfterLoadVideo } from "../../utils/waitForPlayerState";

function createContainer() {
  const elt = document.createElement("div");
  elt.style.width = "320px";
  elt.style.height = "180px";
  document.body.appendChild(elt);
  return elt;
}

function expectRenderedThumbnail(container) {
  expect(container.childElementCount).toBe(1);
  expect(container.firstElementChild).not.toBeNull();
  expect(container.firstElementChild.className).toBe("__rx-thumbnail__");
  expect(container.firstElementChild.tagName).toBe("CANVAS");
  expect(container.firstElementChild.width).toBe(320);
  expect(container.firstElementChild.height).toBe(180);
}

runDashRenderThumbnailTests();
runDashRenderThumbnailTests({ multithread: true });

function runDashRenderThumbnailTests({ multithread } = {}) {
  let title = "DASH renderThumbnail";
  if (multithread === true) {
    RxPlayer.addFeatures([MULTI_THREAD]);
    title = "DASH renderThumbnail with worker";
  }

  describe(title, () => {
    let player;
    let container1;
    let container2;

    beforeEach(() => {
      player = new RxPlayer();
      if (multithread === true) {
        player.attachWorker({
          workerUrl: TestWorkerEmbed,
          dashWasmUrl: EMBEDDED_DASH_WASM,
        });
      }
      container1 = createContainer();
      container2 = createContainer();
    });

    afterEach(() => {
      player.dispose();
      container1.remove();
      container2.remove();
    });

    it("should fetch and render DASH thumbnails", async () => {
      player.loadVideo({
        url: thumbnailInfos.url,
        transport: "dash",
        mode: multithread === true ? "multithread" : "main",
      });
      await waitForLoadedStateAfterLoadVideo(player);

      expect(player.getAvailableThumbnailTracks({ time: 0.5 })).toEqual([
        {
          id: "thumbnails_320x180",
          width: 320,
          height: 180,
          mimeType: "image/jpeg",
        },
      ]);

      await player.renderThumbnail({
        container: container1,
        time: 0.5,
      });

      expectRenderedThumbnail(container1);
    });

    it("should abort the previous render when requesting another thumbnail on the same container", async () => {
      player.loadVideo({
        url: thumbnailInfos.url,
        transport: "dash",
        mode: multithread === true ? "multithread" : "main",
      });
      await waitForLoadedStateAfterLoadVideo(player);

      const firstPromise = player.renderThumbnail({
        container: container1,
        time: 0.5,
      });
      const secondPromise = player.renderThumbnail({
        container: container1,
        time: 12,
      });

      await expect(firstPromise).rejects.toMatchObject({ code: "ABORTED" });
      await expect(secondPromise).resolves.toBeUndefined();

      await checkAfterSleepWithBackoff({ maxTimeMs: 1000, stepMs: 50 }, () => {
        expectRenderedThumbnail(container1);
      });
    });

    it("should keep or clear the previous thumbnail on error depending on keepPreviousThumbnailOnError", async () => {
      player.loadVideo({
        url: thumbnailInfos.url,
        transport: "dash",
        mode: multithread === true ? "multithread" : "main",
      });
      await waitForLoadedStateAfterLoadVideo(player);

      await player.renderThumbnail({
        container: container1,
        time: 0.5,
      });
      expectRenderedThumbnail(container1);

      await expect(
        player.renderThumbnail({
          container: container1,
          time: 200,
          keepPreviousThumbnailOnError: true,
        }),
      ).rejects.toMatchObject({ code: "NO_THUMBNAIL" });
      expectRenderedThumbnail(container1);

      await expect(
        player.renderThumbnail({
          container: container1,
          time: 200,
        }),
      ).rejects.toMatchObject({ code: "NO_THUMBNAIL" });
      expect(container1.childElementCount).toBe(0);
    });

    it("should not cancel a shared thumbnail request when aborting only one container", async () => {
      player.loadVideo({
        url: thumbnailInfos.url,
        transport: "dash",
        mode: multithread === true ? "multithread" : "main",
      });
      await waitForLoadedStateAfterLoadVideo(player);

      const firstPromise = player.renderThumbnail({
        container: container1,
        time: 0.5,
      });
      const secondPromise = player.renderThumbnail({
        container: container2,
        time: 0.5,
      });

      // In worker mode, let both renderThumbnail calls cross the worker
      // boundary before aborting the first container's request.
      await sleep(0);

      const replacementPromise = player.renderThumbnail({
        container: container1,
        time: 12,
      });

      await expect(firstPromise).rejects.toMatchObject({ code: "ABORTED" });
      await expect(secondPromise).resolves.toBeUndefined();
      await expect(replacementPromise).resolves.toBeUndefined();

      await checkAfterSleepWithBackoff({ maxTimeMs: 1000, stepMs: 50 }, () => {
        expectRenderedThumbnail(container1);
        expectRenderedThumbnail(container2);
      });
    });
  });
}
